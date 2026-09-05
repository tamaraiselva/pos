const mongoose = require("mongoose");
const Product = require("../models/Product");
const Sale = require("../models/Sale");
const InventoryLog = require("../models/InventoryLog");
const ApiError = require("../utils/ApiError");
const nextInvoiceNumber = require("../utils/invoiceNumber");
const { runInTransaction } = require("../utils/transactionHelper");

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Creates a sale atomically: validates stock, decrements it with a race-safe
 * conditional update per line item, and writes Sale + InventoryLog together
 * in one transaction so a partial failure can never leave stock and sales
 * records out of sync. See docs/CONCURRENCY.md for the full rationale.
 */
async function createSale({ items, paymentMethod, customer, cashierId }) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new ApiError(400, "Sale must include at least one item");
  }

  const productIds = items.map((i) => i.productId);
  const products = await Product.find({ _id: { $in: productIds }, isActive: true });
  const productById = new Map(products.map((p) => [p._id.toString(), p]));

  for (const item of items) {
    if (!productById.has(item.productId)) {
      throw new ApiError(404, `Product not found: ${item.productId}`);
    }
    if (!item.qty || item.qty < 1) {
      throw new ApiError(400, "Each item must have qty >= 1");
    }
  }

  let sale;

  await runInTransaction(async (session) => {
    const opts = session ? { session } : {};
    const saleItems = [];
    let subtotal = 0;
    let discountTotal = 0;
    let taxTotal = 0;
    let grandTotal = 0;
    const stockUpdates = [];

    for (const item of items) {
      const product = productById.get(item.productId);
      const qty = Number(item.qty);
      const discountPercent = Math.max(0, Math.min(100, Number(item.discountPercent || 0)));

      // Atomic, race-safe: only succeeds if enough stock remains at the moment of decrement.
      const updated = await Product.findOneAndUpdate(
        { _id: product._id, stockQty: { $gte: qty } },
        { $inc: { stockQty: -qty } },
        { new: true, ...opts }
      );

      if (!updated) {
        throw new ApiError(409, `Insufficient stock for "${product.name}"`);
      }

      // discountPercent is the applied rate (e.g. an old-stock clearance of 1-10%);
      // discount is the resulting dollar amount, computed here server-side and
      // never trusted from the client.
      const discount = round2(product.sellingPrice * qty * (discountPercent / 100));
      const lineSubtotal = round2(product.sellingPrice * qty - discount);
      const lineTax = round2(Math.max(0, lineSubtotal) * (product.taxPercent / 100));
      const lineTotal = round2(Math.max(0, lineSubtotal) + lineTax);

      subtotal = round2(subtotal + product.sellingPrice * qty);
      discountTotal = round2(discountTotal + discount);
      taxTotal = round2(taxTotal + lineTax);
      grandTotal = round2(grandTotal + lineTotal);

      saleItems.push({
        product: product._id,
        name: product.name,
        sku: product.sku,
        qty,
        price: product.sellingPrice,
        taxPercent: product.taxPercent,
        discountPercent,
        discount,
        lineTotal,
      });

      stockUpdates.push({ product, balanceAfter: updated.stockQty });
    }

    const invoiceNumber = await nextInvoiceNumber(session);

    const [createdSale] = await Sale.create(
      [
        {
          invoiceNumber,
          cashier: cashierId,
          customer: customer || {},
          items: saleItems,
          subtotal,
          discountTotal,
          taxTotal,
          grandTotal,
          paymentMethod,
        },
      ],
      opts
    );

    await InventoryLog.insertMany(
      stockUpdates.map(({ product, balanceAfter }) => ({
        product: product._id,
        changeQty: -saleItems.find((i) => i.product.equals(product._id)).qty,
        reason: "sale",
        refId: createdSale._id,
        balanceAfter,
        createdBy: cashierId,
      })),
      opts
    );

    sale = createdSale;
  });

  return sale;
}

module.exports = { createSale };
