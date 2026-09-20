const mongoose = require("mongoose");
const Sale = require("../models/Sale");
const Product = require("../models/Product");

/**
 * Fixed, whitelisted set of read-only Mongo aggregations the AI Business Q&A
 * feature (services/aiService.js) is allowed to call via OpenAI tool-calling.
 * The model NEVER generates queries itself — it only picks from this list and
 * supplies simple parameters, which keeps every answer grounded in real data
 * and closed to injection. See docs/AI_ARCHITECTURE.md.
 */

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function daysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function getBestSellers({ days = 30, limit = 5 } = {}) {
  const rows = await Sale.aggregate([
    { $match: { createdAt: { $gte: daysAgo(days) } } },
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.product",
        name: { $first: "$items.name" },
        sku: { $first: "$items.sku" },
        qtySold: { $sum: "$items.qty" },
        revenue: { $sum: "$items.lineTotal" },
      },
    },
    { $sort: { qtySold: -1 } },
    { $limit: limit },
  ]);
  return rows.map((r) => ({ name: r.name, sku: r.sku, qtySold: r.qtySold, revenue: round2(r.revenue) }));
}

async function getSlowMovers({ days = 30, limit = 5 } = {}) {
  const soldIds = await Sale.aggregate([
    { $match: { createdAt: { $gte: daysAgo(days) } } },
    { $unwind: "$items" },
    { $group: { _id: "$items.product", qtySold: { $sum: "$items.qty" } } },
  ]);
  const soldMap = new Map(soldIds.map((r) => [r._id.toString(), r.qtySold]));

  const allProducts = await Product.find({ isActive: true }).select("name sku stockQty");
  const withSales = allProducts
    .map((p) => ({ name: p.name, sku: p.sku, stockQty: p.stockQty, qtySold: soldMap.get(p._id.toString()) || 0 }))
    .sort((a, b) => a.qtySold - b.qtySold)
    .slice(0, limit);

  return withSales;
}

async function getLowStockProducts({ limit = 20 } = {}) {
  const rows = await Product.find({
    isActive: true,
    $expr: { $lte: ["$stockQty", "$minStockLevel"] },
  })
    .select("name sku stockQty minStockLevel category sellingPrice")
    .limit(limit);
  return rows.map((p) => ({
    name: p.name,
    sku: p.sku,
    category: p.category,
    sellingPriceFormatted: `₹${round2(p.sellingPrice || 0).toFixed(2)}`,
    stockQty: p.stockQty,
    minStockLevel: p.minStockLevel,
    stockStatus: p.stockQty <= 0 ? "Out of Stock ❌" : "Low Stock ⚠️",
  }));
}

async function getOutOfStockProducts({ limit = 20 } = {}) {
  const rows = await Product.find({
    isActive: true,
    stockQty: 0,
  })
    .select("name sku stockQty minStockLevel category sellingPrice")
    .limit(limit);
  return rows.map((p) => ({
    name: p.name,
    sku: p.sku,
    category: p.category,
    sellingPriceFormatted: `₹${round2(p.sellingPrice || 0).toFixed(2)}`,
    stockQty: 0,
    status: "Out of Stock ❌",
  }));
}

async function getSalesTotal({ days = 7 } = {}) {
  const rows = await Sale.aggregate([
    { $match: { createdAt: { $gte: daysAgo(days) } } },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: "$grandTotal" },
        orderCount: { $sum: 1 },
      },
    },
  ]);
  const r = rows[0] || { totalRevenue: 0, orderCount: 0 };
  return { days, totalRevenue: round2(r.totalRevenue), orderCount: r.orderCount };
}

async function getRevenueByCategory({ days = 30 } = {}) {
  const rows = await Sale.aggregate([
    { $match: { createdAt: { $gte: daysAgo(days) } } },
    { $unwind: "$items" },
    {
      $lookup: {
        from: "products",
        localField: "items.product",
        foreignField: "_id",
        as: "productInfo",
      },
    },
    { $unwind: { path: "$productInfo", preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: { $ifNull: ["$productInfo.category", "Unknown"] },
        revenue: { $sum: "$items.lineTotal" },
      },
    },
    { $sort: { revenue: -1 } },
  ]);
  return rows.map((r) => ({ category: r._id, revenue: round2(r.revenue) }));
}

async function searchProducts({ query = "", limit = 10 } = {}) {
  const filter = { isActive: true };
  if (query && query.trim()) {
    const q = query.trim();
    filter.$or = [
      { sku: { $regex: q, $options: "i" } },
      { name: { $regex: q, $options: "i" } },
      { category: { $regex: q, $options: "i" } },
      { barcode: { $regex: q, $options: "i" } },
    ];
  }
  const products = await Product.find(filter)
    .select("name sku barcode sellingPrice purchasePrice stockQty minStockLevel category taxPercent defaultDiscount imageUrl")
    .limit(limit);

  return products.map((p) => {
    const sellingPrice = round2(p.sellingPrice || 0);
    const purchasePrice = round2(p.purchasePrice || 0);
    const stockStatus = p.stockQty <= 0 ? "Out of Stock ❌" : p.stockQty <= p.minStockLevel ? "Low Stock ⚠️" : "In Stock ✅";
    return {
      name: p.name,
      sku: p.sku,
      barcode: p.barcode || "",
      sellingPriceFormatted: `₹${sellingPrice.toFixed(2)}`,
      sellingPrice: sellingPrice,
      purchasePrice: purchasePrice,
      stockQty: p.stockQty,
      minStockLevel: p.minStockLevel,
      stockStatus: stockStatus,
      category: p.category,
      taxPercent: p.taxPercent || 0,
      defaultDiscount: p.defaultDiscount || 0,
      imageUrl: p.imageUrl || null,
    };
  });
}

const TOOL_DEFINITIONS = [
  {
    type: "function",
    function: {
      name: "getBestSellers",
      description: "Get the best-selling products by quantity sold in a recent time window.",
      parameters: {
        type: "object",
        properties: {
          days: { type: "number", description: "Lookback window in days (default 30)" },
          limit: { type: "number", description: "Max products to return (default 5)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getSlowMovers",
      description: "Get the slowest-selling (lowest quantity sold) active products in a recent time window.",
      parameters: {
        type: "object",
        properties: {
          days: { type: "number", description: "Lookback window in days (default 30)" },
          limit: { type: "number", description: "Max products to return (default 5)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getLowStockProducts",
      description: "Get active products whose stock is low (at or below minStockLevel).",
      parameters: {
        type: "object",
        properties: { limit: { type: "number", description: "Max products to return (default 20)" } },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getOutOfStockProducts",
      description: "Get active products that are completely out of stock (stockQty = 0). Use this SPECIFICALLY when asked for 'out of stock', 'stock out', or 'zero stock' products.",
      parameters: {
        type: "object",
        properties: { limit: { type: "number", description: "Max products to return (default 20)" } },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getSalesTotal",
      description: "Get total revenue and order count over a recent time window (e.g. last 7 or 30 days).",
      parameters: {
        type: "object",
        properties: { days: { type: "number", description: "Lookback window in days (default 7)" } },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getRevenueByCategory",
      description: "Get total revenue broken down by product category over a recent time window.",
      parameters: {
        type: "object",
        properties: { days: { type: "number", description: "Lookback window in days (default 30)" }, },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "searchProducts",
      description: "Search active products by SKU code, name, or category to get price, stock, category, or product details.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query: SKU code (e.g. CHOCOL-008), product name, or category." },
          limit: { type: "number", description: "Max products to return (default 10)" },
        },
      },
    },
  },
];

const TOOL_IMPLEMENTATIONS = {
  getBestSellers,
  getSlowMovers,
  getLowStockProducts,
  getOutOfStockProducts,
  getSalesTotal,
  getRevenueByCategory,
  searchProducts,
};

module.exports = {
  TOOL_DEFINITIONS,
  TOOL_IMPLEMENTATIONS,
  getBestSellers,
  getSlowMovers,
  getLowStockProducts,
  getOutOfStockProducts,
  getSalesTotal,
  getRevenueByCategory,
  searchProducts,
};
