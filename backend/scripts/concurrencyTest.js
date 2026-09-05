/**
 * Proves the oversell-prevention design in services/saleService.js (see
 * docs/CONCURRENCY.md): creates a throwaway product with stockQty = 1, then
 * fires N concurrent "buy 1 unit" sale requests at it. Exactly one must
 * succeed; every other request must fail with "Insufficient stock" and the
 * product's final stock must be exactly 0 — never negative, never more than
 * one sale recorded against that single unit.
 */
require("dotenv").config();
const mongoose = require("mongoose");
const Product = require("../models/Product");
const User = require("../models/User");
const Sale = require("../models/Sale");
const InventoryLog = require("../models/InventoryLog");
const saleService = require("../services/saleService");

const CONCURRENT_REQUESTS = 10;

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB.");

  // Self-contained: creates its own throwaway user rather than depending on any
  // pre-existing account, so this test has no setup dependency at all.
  const cashier = await User.create({
    name: "__concurrency_test_cashier__",
    email: `concurrency-test-${Date.now()}@test.local`,
    passwordHash: await User.hashPassword("Test@1234"),
    role: "cashier",
  });

  const testProduct = await Product.create({
    name: "__concurrency_test_product__",
    sku: `CONCTEST-${Date.now()}`,
    category: "Test",
    sellingPrice: 100,
    purchasePrice: 50,
    taxPercent: 0,
    stockQty: 1,
    minStockLevel: 0,
  });
  console.log(`Created test product ${testProduct._id} with stockQty=1.`);

  console.log(`Firing ${CONCURRENT_REQUESTS} concurrent "buy 1 unit" requests...`);
  const attempts = Array.from({ length: CONCURRENT_REQUESTS }, () =>
    saleService
      .createSale({
        items: [{ productId: testProduct._id.toString(), qty: 1 }],
        paymentMethod: "cash",
        cashierId: cashier._id.toString(),
      })
      .then(() => ({ ok: true }))
      .catch((err) => ({ ok: false, message: err.message }))
  );

  const results = await Promise.all(attempts);
  const succeeded = results.filter((r) => r.ok);
  const failed = results.filter((r) => !r.ok);

  const finalProduct = await Product.findById(testProduct._id);
  const salesCreated = await Sale.countDocuments({ "items.product": testProduct._id });

  console.log(`\nResults: ${succeeded.length} succeeded, ${failed.length} failed.`);
  console.log(`Final stockQty: ${finalProduct.stockQty} (expected 0)`);
  console.log(`Sale documents created against this product: ${salesCreated} (expected 1)`);
  failed.slice(0, 3).forEach((f) => console.log(`  rejected: ${f.message}`));

  const pass = succeeded.length === 1 && failed.length === CONCURRENT_REQUESTS - 1 && finalProduct.stockQty === 0 && salesCreated === 1;

  console.log(pass ? "\nPASS: no overselling occurred under concurrent load." : "\nFAIL: oversell or inconsistency detected.");

  // Cleanup
  await InventoryLog.deleteMany({ product: testProduct._id });
  await Sale.deleteMany({ "items.product": testProduct._id });
  await Product.deleteOne({ _id: testProduct._id });
  await User.deleteOne({ _id: cashier._id });
  console.log("Cleaned up test product, test user, and related records.");

  await mongoose.disconnect();
  process.exit(pass ? 0 : 1);
}

run().catch((err) => {
  console.error("Concurrency test crashed:", err);
  process.exit(1);
});
