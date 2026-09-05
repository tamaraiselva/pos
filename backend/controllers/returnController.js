const Return = require("../models/Return");
const Sale = require("../models/Sale");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const returnService = require("../services/returnService");

const create = asyncHandler(async (req, res) => {
  const { saleId, items, reason } = req.body;

  const created = await returnService.createReturn({
    saleId,
    items,
    reason,
    processedBy: req.user.id,
  });

  res.status(201).json({ success: true, data: created });
});

const list = asyncHandler(async (req, res) => {
  const { page = 1, limit = 25 } = req.query;
  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(100, Math.max(1, Number(limit)));

  const [items, total] = await Promise.all([
    Return.find()
      .populate("processedBy", "name")
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Return.countDocuments(),
  ]);

  res.json({
    success: true,
    data: items,
    pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
  });
});

const getOne = asyncHandler(async (req, res) => {
  const ret = await Return.findById(req.params.id).populate("processedBy", "name");
  if (!ret) throw new ApiError(404, "Return not found");
  res.json({ success: true, data: ret });
});

const findSaleByInvoice = asyncHandler(async (req, res) => {
  const sale = await Sale.findOne({ invoiceNumber: req.params.invoiceNumber });
  if (!sale) throw new ApiError(404, "Invoice not found");
  res.json({ success: true, data: sale });
});

module.exports = { create, list, getOne, findSaleByInvoice };
