const mongoose = require("mongoose");
const Product = require("../models/Product");
const InventoryLog = require("../models/InventoryLog");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { applyOldStockDiscounts } = require("../services/oldStockService");
const { runInTransaction } = require("../utils/transactionHelper");

const lowStock = asyncHandler(async (req, res) => {
  const items = await Product.find({
    isActive: true,
    $expr: { $lte: ["$stockQty", "$minStockLevel"] },
  }).sort({ stockQty: 1 });

  res.json({
    success: true,
    data: {
      lowStock: items.filter((p) => p.stockQty > 0),
      outOfStock: items.filter((p) => p.stockQty === 0),
    },
  });
});

const history = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const logs = await InventoryLog.find({ product: productId })
    .populate("createdBy", "name")
    .sort({ createdAt: -1 })
    .limit(200);
  res.json({ success: true, data: logs });
});

const adjust = asyncHandler(async (req, res) => {
  const { productId, changeQty, note } = req.body;

  let updated;
  await runInTransaction(async (session) => {
    const opts = session ? { session } : {};
    const product = await Product.findById(productId, null, opts);
    if (!product) throw new ApiError(404, "Product not found");

    const newQty = product.stockQty + Number(changeQty);
    if (newQty < 0) throw new ApiError(400, "Adjustment would result in negative stock");

    product.stockQty = newQty;
    await product.save(opts);

    await InventoryLog.create(
      [
        {
          product: product._id,
          changeQty: Number(changeQty),
          reason: "manual",
          balanceAfter: newQty,
          note: note || "Manual adjustment",
          createdBy: req.user.id,
        },
      ],
      opts
    );

    updated = product;
  });

  res.json({ success: true, data: updated });
});

const applyOldStockDiscountsHandler = asyncHandler(async (req, res) => {
  const result = await applyOldStockDiscounts();
  res.json({ success: true, data: result });
});

module.exports = { lowStock, history, adjust, applyOldStockDiscounts: applyOldStockDiscountsHandler };
