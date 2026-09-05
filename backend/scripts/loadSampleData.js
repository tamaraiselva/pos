/**
 * OPTIONAL: loads a sample product catalog (28 products) and 60 days of backdated
 * historical sales, so AI Sales Insights/Forecast/Recommendations have real data to
 * analyze when demoing the app. Never run automatically and never required for the
 * app to function — the app works from an empty catalog too, with real products
 * added through the admin UI.
 *
 * This does NOT touch the User collection at all (create/edit accounts via
 * `node scripts/createAdmin.js` or the Users page). It requires at least one user
 * to already exist, so historical sales have a cashier to attribute to.
 *
 * Safe to re-run: it wipes Products/Sales/Returns/InventoryLogs/AIQueryLogs (not Users) first.
 */
require("dotenv").config();
const mongoose = require("mongoose");

const User = require("../models/User");
const Product = require("../models/Product");
const Sale = require("../models/Sale");
const Return = require("../models/Return");
const InventoryLog = require("../models/InventoryLog");
const AIQueryLog = require("../models/AIQueryLog");
const Counter = require("../models/Counter");
const { applyOldStockDiscounts } = require("../services/oldStockService");

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick(arr) {
  return arr[randInt(0, arr.length - 1)];
}
function weightedPaymentMethod() {
  const r = Math.random();
  if (r < 0.4) return "cash";
  if (r < 0.75) return "upi";
  return "card";
}

const PRODUCTS = [
  // Beverages
  { name: "Colombian Coffee Beans 250g", category: "Beverages", sellingPrice: 349, purchasePrice: 220, taxPercent: 5, stockQty: 40, minStockLevel: 10 },
  { name: "Green Tea Bags (25ct)", category: "Beverages", sellingPrice: 199, purchasePrice: 120, taxPercent: 5, stockQty: 60, minStockLevel: 15 },
  { name: "Orange Juice 1L", category: "Beverages", sellingPrice: 129, purchasePrice: 80, taxPercent: 12, stockQty: 5, minStockLevel: 12 },
  { name: "Sparkling Water 500ml", category: "Beverages", sellingPrice: 59, purchasePrice: 32, taxPercent: 12, stockQty: 90, minStockLevel: 20 },
  { name: "Cola Can 330ml", category: "Beverages", sellingPrice: 45, purchasePrice: 25, taxPercent: 18, stockQty: 120, minStockLevel: 30 },
  { name: "Energy Drink 250ml", category: "Beverages", sellingPrice: 99, purchasePrice: 60, taxPercent: 18, stockQty: 0, minStockLevel: 15 },
  // Snacks
  { name: "Potato Chips Classic 150g", category: "Snacks", sellingPrice: 89, purchasePrice: 55, taxPercent: 12, stockQty: 75, minStockLevel: 20 },
  { name: "Chocolate Cookies 200g", category: "Snacks", sellingPrice: 149, purchasePrice: 95, taxPercent: 12, stockQty: 3, minStockLevel: 10 },
  { name: "Roasted Almonds 200g", category: "Snacks", sellingPrice: 299, purchasePrice: 190, taxPercent: 5, stockQty: 35, minStockLevel: 8 },
  { name: "Popcorn Butter 100g", category: "Snacks", sellingPrice: 69, purchasePrice: 40, taxPercent: 12, stockQty: 50, minStockLevel: 15 },
  { name: "Trail Mix 250g", category: "Snacks", sellingPrice: 249, purchasePrice: 160, taxPercent: 5, stockQty: 28, minStockLevel: 10 },
  { name: "Corn Nachos 180g", category: "Snacks", sellingPrice: 109, purchasePrice: 65, taxPercent: 12, stockQty: 8, minStockLevel: 12 },
  // Dairy
  { name: "Full Cream Milk 1L", category: "Dairy", sellingPrice: 68, purchasePrice: 50, taxPercent: 0, stockQty: 45, minStockLevel: 20 },
  { name: "Greek Yogurt 400g", category: "Dairy", sellingPrice: 159, purchasePrice: 100, taxPercent: 5, stockQty: 30, minStockLevel: 10 },
  { name: "Cheddar Cheese Block 200g", category: "Dairy", sellingPrice: 249, purchasePrice: 165, taxPercent: 12, stockQty: 22, minStockLevel: 8 },
  { name: "Butter 100g", category: "Dairy", sellingPrice: 89, purchasePrice: 60, taxPercent: 5, stockQty: 40, minStockLevel: 12 },
  { name: "Paneer 200g", category: "Dairy", sellingPrice: 99, purchasePrice: 65, taxPercent: 5, stockQty: 2, minStockLevel: 10 },
  // Bakery
  { name: "Whole Wheat Bread", category: "Bakery", sellingPrice: 55, purchasePrice: 35, taxPercent: 0, stockQty: 25, minStockLevel: 10 },
  { name: "Croissant (pack of 4)", category: "Bakery", sellingPrice: 189, purchasePrice: 120, taxPercent: 5, stockQty: 18, minStockLevel: 8 },
  { name: "Chocolate Muffin", category: "Bakery", sellingPrice: 79, purchasePrice: 45, taxPercent: 5, stockQty: 33, minStockLevel: 10 },
  { name: "Bagel Plain (pack of 6)", category: "Bakery", sellingPrice: 159, purchasePrice: 95, taxPercent: 5, stockQty: 14, minStockLevel: 8 },
  { name: "Birthday Cake 500g", category: "Bakery", sellingPrice: 449, purchasePrice: 280, taxPercent: 5, stockQty: 6, minStockLevel: 5 },
  // Household
  { name: "Dish Soap 500ml", category: "Household", sellingPrice: 99, purchasePrice: 60, taxPercent: 18, stockQty: 55, minStockLevel: 15 },
  { name: "Paper Towels (2 rolls)", category: "Household", sellingPrice: 129, purchasePrice: 80, taxPercent: 18, stockQty: 48, minStockLevel: 15 },
  { name: "Laundry Detergent 1kg", category: "Household", sellingPrice: 299, purchasePrice: 190, taxPercent: 18, stockQty: 20, minStockLevel: 10 },
  { name: "Trash Bags (30ct)", category: "Household", sellingPrice: 149, purchasePrice: 90, taxPercent: 18, stockQty: 4, minStockLevel: 10 },
  { name: "Air Freshener Spray", category: "Household", sellingPrice: 179, purchasePrice: 110, taxPercent: 18, stockQty: 26, minStockLevel: 8 },
  { name: "Hand Sanitizer 250ml", category: "Household", sellingPrice: 119, purchasePrice: 70, taxPercent: 18, stockQty: 60, minStockLevel: 20 },
];

function skuFor(name, idx) {
  const base = name
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 6);
  return `${base}-${String(idx + 1).padStart(3, "0")}`;
}

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB.");

  const cashier = (await User.findOne({ role: "cashier", isActive: true })) || (await User.findOne({ isActive: true }));
  if (!cashier) {
    console.error(
      "No user found. Create one first: node scripts/createAdmin.js --name \"...\" --email ... --password ... " +
        "(then optionally add a cashier via the Users page)."
    );
    process.exit(1);
  }

  await Promise.all([
    Product.deleteMany({}),
    Sale.deleteMany({}),
    Return.deleteMany({}),
    InventoryLog.deleteMany({}),
    AIQueryLog.deleteMany({}),
    Counter.deleteMany({}),
  ]);
  console.log("Cleared existing products/sales/returns/inventory logs (Users left untouched).");

  const products = await Product.insertMany(
    PRODUCTS.map((p, idx) => ({
      ...p,
      sku: skuFor(p.name, idx),
      barcode: `8901${String(1000000 + idx)}`,
      isActive: true,
    }))
  );

  await InventoryLog.insertMany(
    products
      .filter((p) => p.stockQty > 0)
      .map((p) => ({
        product: p._id,
        changeQty: p.stockQty,
        reason: "manual",
        balanceAfter: p.stockQty,
        note: "Opening stock (sample data)",
        createdBy: cashier._id,
      }))
  );
  console.log(`Created ${products.length} sample products.`);

  const oldStock = await applyOldStockDiscounts();
  console.log(`Applied old-stock clearance discounts to ${oldStock.updated} product(s).`);

  // --- Historical sales: 60 days ago through yesterday ---
  const HISTORY_DAYS = 60;
  const invoiceSeqByDate = new Map();
  const salesDocs = [];

  for (let dayOffset = HISTORY_DAYS; dayOffset >= 1; dayOffset--) {
    const day = new Date();
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - dayOffset);
    const dateKey = day.toISOString().slice(0, 10).replace(/-/g, "");

    const isWeekend = [0, 6].includes(day.getDay());
    // Mild upward trend over the 60-day window + a weekend bump.
    const trendFactor = 1 + (HISTORY_DAYS - dayOffset) / HISTORY_DAYS / 2;
    const baseOrders = isWeekend ? randInt(8, 14) : randInt(3, 9);
    const ordersToday = Math.round(baseOrders * trendFactor);

    for (let o = 0; o < ordersToday; o++) {
      const lineCount = randInt(1, 4);
      const chosenProducts = new Set();
      while (chosenProducts.size < lineCount) {
        chosenProducts.add(pick(products));
      }

      const items = [];
      let subtotal = 0;
      let discountTotal = 0;
      let taxTotal = 0;
      let grandTotal = 0;

      for (const product of chosenProducts) {
        const qty = randInt(1, 3);
        const discountPercent = Math.random() < 0.15 ? 10 : 0;
        const discount = round2(product.sellingPrice * qty * (discountPercent / 100));
        const lineSubtotal = round2(product.sellingPrice * qty - discount);
        const lineTax = round2(lineSubtotal * (product.taxPercent / 100));
        const lineTotal = round2(lineSubtotal + lineTax);

        subtotal = round2(subtotal + product.sellingPrice * qty);
        discountTotal = round2(discountTotal + discount);
        taxTotal = round2(taxTotal + lineTax);
        grandTotal = round2(grandTotal + lineTotal);

        items.push({
          product: product._id,
          name: product.name,
          sku: product.sku,
          qty,
          price: product.sellingPrice,
          taxPercent: product.taxPercent,
          discountPercent,
          discount,
          lineTotal,
          returnedQty: 0,
        });
      }

      const seq = (invoiceSeqByDate.get(dateKey) || 0) + 1;
      invoiceSeqByDate.set(dateKey, seq);

      const hour = randInt(9, 20);
      const minute = randInt(0, 59);
      const createdAt = new Date(day);
      createdAt.setHours(hour, minute, randInt(0, 59));

      salesDocs.push({
        invoiceNumber: `INV-${dateKey}-${String(seq).padStart(4, "0")}`,
        cashier: cashier._id,
        customer: {},
        items,
        subtotal,
        discountTotal,
        taxTotal,
        grandTotal,
        paymentMethod: weightedPaymentMethod(),
        status: "completed",
        createdAt,
        updatedAt: createdAt,
      });
    }
  }

  await Sale.insertMany(salesDocs);
  console.log(`Created ${salesDocs.length} historical sales across ${HISTORY_DAYS} days, attributed to ${cashier.name}.`);
  console.log("\nSample data loaded.");

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Loading sample data failed:", err);
  process.exit(1);
});
