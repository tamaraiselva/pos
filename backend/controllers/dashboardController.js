const Sale = require("../models/Sale");
const Product = require("../models/Product");
const asyncHandler = require("../utils/asyncHandler");

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

const summary = asyncHandler(async (req, res) => {
  const todayStart = startOfDay(new Date());
  const sevenDaysAgo = startOfDay(new Date());
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

  const [todayAgg, totalProducts, lowStockCount, sevenDayRaw] = await Promise.all([
    Sale.aggregate([
      { $match: { createdAt: { $gte: todayStart } } },
      {
        $group: {
          _id: null,
          revenue: { $sum: "$grandTotal" },
          orderCount: { $sum: 1 },
          cash: { $sum: { $cond: [{ $eq: ["$paymentMethod", "cash"] }, "$grandTotal", 0] } },
          upi: { $sum: { $cond: [{ $eq: ["$paymentMethod", "upi"] }, "$grandTotal", 0] } },
          card: { $sum: { $cond: [{ $eq: ["$paymentMethod", "card"] }, "$grandTotal", 0] } },
        },
      },
    ]),
    Product.countDocuments({ isActive: true }),
    Product.countDocuments({ isActive: true, $expr: { $lte: ["$stockQty", "$minStockLevel"] } }),
    Sale.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          revenue: { $sum: "$grandTotal" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const today = todayAgg[0] || { revenue: 0, orderCount: 0, cash: 0, upi: 0, card: 0 };

  // Fill in any missing days with zero so the chart always has 7 points.
  const byDate = new Map(sevenDayRaw.map((d) => [d._id, d]));
  const last7Days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const entry = byDate.get(key);
    last7Days.push({ date: key, revenue: entry?.revenue || 0, orders: entry?.orders || 0 });
  }

  res.json({
    success: true,
    data: {
      today: {
        revenue: today.revenue,
        orderCount: today.orderCount,
        cash: today.cash,
        upi: today.upi,
        card: today.card,
      },
      totalProducts,
      lowStockCount,
      last7Days,
    },
  });
});

module.exports = { summary };
