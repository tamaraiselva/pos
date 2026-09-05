const Product = require("../models/Product");
const InventoryLog = require("../models/InventoryLog");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");

const list = asyncHandler(async (req, res) => {
  const { search, category, sku, barcode, page = 1, limit = 50, lowStockOnly } = req.query;

  const filter = { isActive: true };
  if (category) filter.category = category;
  if (sku) filter.sku = sku.toUpperCase();
  if (barcode) filter.barcode = barcode;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { sku: { $regex: search, $options: "i" } },
      { barcode: { $regex: search, $options: "i" } },
    ];
  }
  if (lowStockOnly === "true") {
    filter.$expr = { $lte: ["$stockQty", "$minStockLevel"] };
  }

  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(200, Math.max(1, Number(limit)));

  const [items, total] = await Promise.all([
    Product.find(filter)
      .sort({ name: 1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Product.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: items,
    pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
  });
});

const getOne = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new ApiError(404, "Product not found");
  res.json({ success: true, data: product });
});

const categories = asyncHandler(async (req, res) => {
  const cats = await Product.distinct("category", { isActive: true });
  res.json({ success: true, data: cats.sort() });
});

const create = asyncHandler(async (req, res) => {
  const body = req.body;

  const product = await Product.create({
    name: body.name,
    sku: body.sku,
    barcode: body.barcode || undefined,
    category: body.category,
    sellingPrice: Number(body.sellingPrice),
    purchasePrice: Number(body.purchasePrice),
    taxPercent: Number(body.taxPercent || 0),
    defaultDiscount: Number(body.defaultDiscount || 0),
    stockQty: Number(body.stockQty || 0),
    minStockLevel: Number(body.minStockLevel || 5),
    imageUrl: req.file ? `/uploads/products/${req.file.filename}` : null,
  });

  if (product.stockQty > 0) {
    await InventoryLog.create({
      product: product._id,
      changeQty: product.stockQty,
      reason: "manual",
      balanceAfter: product.stockQty,
      note: "Opening stock",
      createdBy: req.user.id,
    });
  }

  res.status(201).json({ success: true, data: product });
});

const update = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new ApiError(404, "Product not found");

  const editable = [
    "name",
    "sku",
    "barcode",
    "category",
    "sellingPrice",
    "purchasePrice",
    "taxPercent",
    "defaultDiscount",
    "minStockLevel",
  ];
  const numericFields = ["sellingPrice", "purchasePrice", "taxPercent", "defaultDiscount", "minStockLevel"];
  for (const field of editable) {
    if (req.body[field] !== undefined && req.body[field] !== "") {
      product[field] = numericFields.includes(field) ? Number(req.body[field]) : req.body[field];
    }
  }
  if (req.file) {
    product.imageUrl = `/uploads/products/${req.file.filename}`;
  }

  await product.save();
  res.json({ success: true, data: product });
});

const remove = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new ApiError(404, "Product not found");

  // Soft delete: preserves referential integrity with historical sales/returns.
  product.isActive = false;
  await product.save();

  res.json({ success: true, message: "Product deactivated" });
});

module.exports = { list, getOne, categories, create, update, remove };
