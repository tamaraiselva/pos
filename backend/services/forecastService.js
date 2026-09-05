const Sale = require("../models/Sale");

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Ordinary least-squares linear regression over (index, revenue) points.
 * Returns { slope, intercept } so forecast values are computed deterministically —
 * the LLM is never asked to invent these numbers, only to narrate them (see aiController.ask/forecast).
 */
function linearRegression(points) {
  const n = points.length;
  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumXX = points.reduce((s, p) => s + p.x * p.x, 0);

  const denom = n * sumXX - sumX * sumX;
  const slope = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

/**
 * Builds a daily revenue history for the last `historyDays` and a deterministic
 * `forecastDays`-ahead projection from a linear trend fit over that history.
 * Every number here is computed in Node from real Sale documents — not the LLM.
 */
async function buildSalesForecast({ historyDays = 60, forecastDays = 7 } = {}) {
  const start = new Date();
  start.setDate(start.getDate() - (historyDays - 1));
  start.setHours(0, 0, 0, 0);

  const rows = await Sale.aggregate([
    { $match: { createdAt: { $gte: start } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        revenue: { $sum: "$grandTotal" },
      },
    },
  ]);
  const byDate = new Map(rows.map((r) => [r._id, r.revenue]));

  const history = [];
  for (let i = 0; i < historyDays; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    history.push({ date: key, revenue: round2(byDate.get(key) || 0) });
  }

  const points = history.map((h, i) => ({ x: i, y: h.revenue }));
  const { slope, intercept } = linearRegression(points);

  const forecast = [];
  for (let i = 0; i < forecastDays; i++) {
    const x = historyDays + i;
    const d = new Date(start);
    d.setDate(d.getDate() + x);
    const predicted = Math.max(0, slope * x + intercept);
    forecast.push({ date: d.toISOString().slice(0, 10), predictedRevenue: round2(predicted) });
  }

  const trendDirection = slope > 0.5 ? "upward" : slope < -0.5 ? "downward" : "flat";

  return {
    history,
    forecast,
    method: "linear-regression-daily-revenue",
    trendDirection,
    isEstimate: true,
  };
}

module.exports = { buildSalesForecast };
