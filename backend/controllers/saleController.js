const Sale = require("../models/Sale");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const saleService = require("../services/saleService");

const create = asyncHandler(async (req, res) => {
  const { items, paymentMethod, customer } = req.body;

  const sale = await saleService.createSale({
    items,
    paymentMethod,
    customer,
    cashierId: req.user.id,
  });

  const populated = await Sale.findById(sale._id).populate("cashier", "name");
  res.status(201).json({ success: true, data: populated });
});

const list = asyncHandler(async (req, res) => {
  const { from, to, paymentMethod, search, page = 1, limit = 25 } = req.query;

  const filter = {};
  if (paymentMethod) filter.paymentMethod = paymentMethod;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }
  if (search) filter.invoiceNumber = { $regex: search, $options: "i" };

  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(100, Math.max(1, Number(limit)));

  const [items, total] = await Promise.all([
    Sale.find(filter)
      .populate("cashier", "name")
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Sale.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: items,
    pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
  });
});

const getOne = asyncHandler(async (req, res) => {
  const sale = await Sale.findById(req.params.id).populate("cashier", "name");
  if (!sale) throw new ApiError(404, "Sale not found");
  res.json({ success: true, data: sale });
});

const getByInvoiceNumber = asyncHandler(async (req, res) => {
  const sale = await Sale.findOne({ invoiceNumber: req.params.invoiceNumber }).populate("cashier", "name");
  if (!sale) throw new ApiError(404, "Invoice not found");
  res.json({ success: true, data: sale });
});

module.exports = { create, list, getOne, getByInvoiceNumber };
