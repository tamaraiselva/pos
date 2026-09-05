const mongoose = require("mongoose");
const Sale = require("../models/Sale");
const Product = require("../models/Product");
const Return = require("../models/Return");
const InventoryLog = require("../models/InventoryLog");
const ApiError = require("../utils/ApiError");

const { runInTransaction } = require("../utils/transactionHelper");

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Processes a return atomically: restocks the returned quantity, computes the
 * refund from the ORIGINAL sale line's per-unit price/tax/discount, and marks
 * returnedQty on the sale without ever mutating its original line values —
 * the original invoice stays exactly as it was issued.
 */
async function createReturn({ saleId, items, reason, processedBy }) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new ApiError(400, "Return must include at least one item");
  }

  const sale = await Sale.findById(saleId);
  if (!sale) throw new ApiError(404, "Original sale not found");

  let createdReturn;

  await runInTransaction(async (session) => {
    const opts = session ? { session } : {};
    const returnItems = [];
    let totalRefund = 0;
    const lineUpdates = []; // { index, newReturnedQty }

    for (const req of items) {
      const lineIndex = sale.items.findIndex((li) => li.product.toString() === req.productId);
      if (lineIndex === -1) {
        throw new ApiError(400, `Product ${req.productId} was not part of this sale`);
      }
      const line = sale.items[lineIndex];
      const qty = Number(req.qty);
      const maxReturnable = line.qty - line.returnedQty;

      if (!qty || qty < 1 || qty > maxReturnable) {
        throw new ApiError(
          400,
          `Cannot return ${qty} of "${line.name}" — only ${maxReturnable} available to return`
        );
      }

      const perUnitTotal = line.lineTotal / line.qty;
      const refundAmount = round2(perUnitTotal * qty);
      totalRefund = round2(totalRefund + refundAmount);

      const updatedProduct = await Product.findOneAndUpdate(
        { _id: line.product },
        { $inc: { stockQty: qty } },
        { new: true, ...opts }
      );
      if (!updatedProduct) {
        throw new ApiError(404, `Product "${line.name}" no longer exists`);
      }

      returnItems.push({ product: line.product, name: line.name, qty, refundAmount });
      lineUpdates.push({ index: lineIndex, newReturnedQty: line.returnedQty + qty, productId: line.product, updatedStock: updatedProduct.stockQty });
    }

    const [ret] = await Return.create(
      [
        {
          sale: sale._id,
          invoiceNumber: sale.invoiceNumber,
          items: returnItems,
          totalRefund,
          reason: reason || "",
          processedBy,
        },
      ],
      opts
    );

    await InventoryLog.insertMany(
      lineUpdates.map((u) => ({
        product: u.productId,
        changeQty: returnItems.find((ri) => ri.product.equals(u.productId)).qty,
        reason: "return",
        refId: ret._id,
        balanceAfter: u.updatedStock,
        createdBy: processedBy,
      })),
      opts
    );

    for (const u of lineUpdates) {
      sale.items[u.index].returnedQty = u.newReturnedQty;
    }
    const allReturned = sale.items.every((li) => li.returnedQty >= li.qty);
    const anyReturned = sale.items.some((li) => li.returnedQty > 0);
    sale.status = allReturned ? "returned" : anyReturned ? "partially_returned" : "completed";

    await sale.save(opts);

    createdReturn = ret;
  });

  return createdReturn;
}

module.exports = { createReturn };
