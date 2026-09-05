import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
} from "recharts";
import axiosClient from "../../api/axiosClient";
import MarkdownLite from "../../components/MarkdownLite";

const currency = (n) => `₹${Number(n || 0).toFixed(2)}`;

const TABS = [
  { key: "insights", label: "Sales Insights", emoji: "📈" },
  { key: "inventory", label: "Inventory Recs", emoji: "📦" },
  { key: "forecast", label: "Forecast", emoji: "🔮" },
];

function AISummaryBanner({ summary, aiUnavailable }) {
  return (
    <div
      className="mb-5 rounded-2xl p-4 text-sm"
      style={
        aiUnavailable
          ? {
            background: "#fffbeb",
            border: "1px solid #fde68a",
            color: "#92400e",
          }
          : {
            background: "linear-gradient(135deg, #eef2ff, #f5f3ff)",
            border: "1px solid #c7d2fe",
            color: "#312e81",
          }
      }
    >
      <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide opacity-70">
        {aiUnavailable ? (
          <>⚠️ AI Unavailable</>
        ) : (
          <>✨ AI Summary</>
        )}
      </p>
      <MarkdownLite text={summary} className="space-y-1 leading-relaxed" />
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="skeleton h-24 rounded-2xl" />
      <div className="grid grid-cols-2 gap-4">
        <div className="skeleton h-48 rounded-2xl" />
        <div className="skeleton h-48 rounded-2xl" />
      </div>
    </div>
  );
}

function InsightsTab() {
  const [data, setData] = useState(null);
  useEffect(() => {
    axiosClient.get("/ai/insights").then((res) => setData(res.data.data));
  }, []);
  if (!data) return <LoadingSkeleton />;

  return (
    <div className="animate-fade-in space-y-4">
      <AISummaryBanner summary={data.summary} aiUnavailable={data.aiUnavailable} />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Best sellers bar chart */}
        <div
          className="rounded-2xl bg-white p-5"
          style={{
            border: "1px solid rgba(0,0,0,0.07)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
          }}
        >
          <h3 className="mb-4 text-sm font-bold text-slate-700">
            🏆 Best Sellers - last {data.days} days
          </h3>
          {data.bestSellers.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart
                data={data.bestSellers}
                layout="vertical"
                margin={{ left: 10 }}
              >
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => v} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  width={90}
                />
                <Tooltip
                  formatter={(v, name) => [
                    name === "qtySold" ? `${v} sold` : currency(v),
                    name === "qtySold" ? "Units Sold" : "Revenue",
                  ]}
                  contentStyle={{
                    background: "#0f172a",
                    border: "none",
                    borderRadius: 10,
                    color: "#fff",
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="qtySold" fill="#6366f1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-8 text-center text-sm text-slate-400">No sales data yet.</p>
          )}
        </div>

        {/* Slow movers */}
        <div
          className="rounded-2xl bg-white p-5"
          style={{
            border: "1px solid rgba(0,0,0,0.07)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
          }}
        >
          <h3 className="mb-4 text-sm font-bold text-slate-700">
            🐌 Slow Movers - last {data.days} days
          </h3>
          <ul className="space-y-2">
            {data.slowMovers.map((p) => (
              <li
                key={p.sku}
                className="flex items-center justify-between rounded-xl px-3 py-2.5"
                style={{ background: "#f8fafc", border: "1px solid #f1f5f9" }}
              >
                <span className="text-sm font-medium text-slate-700">{p.name}</span>
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span
                    className="rounded-full px-2 py-0.5 font-semibold"
                    style={{ background: "#fef3c7", color: "#92400e" }}
                  >
                    {p.qtySold} sold
                  </span>
                  <span>Stock: {p.stockQty}</span>
                </div>
              </li>
            ))}
            {data.slowMovers.length === 0 && (
              <p className="py-8 text-center text-sm text-slate-400">No data yet.</p>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

function InventoryRecommendationsTab() {
  const [data, setData] = useState(null);
  useEffect(() => {
    axiosClient
      .get("/ai/inventory-recommendations")
      .then((res) => setData(res.data.data));
  }, []);
  if (!data) return <LoadingSkeleton />;

  return (
    <div className="animate-fade-in space-y-4">
      <AISummaryBanner summary={data.summary} aiUnavailable={data.aiUnavailable} />
      <div
        className="overflow-hidden rounded-2xl bg-white"
        style={{
          border: "1px solid rgba(0,0,0,0.07)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        }}
      >
        <table className="w-full text-sm">
          <thead style={{ background: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
            <tr>
              {["Product", "Category", "Stock", "Min Level", "Sold (30d)"].map((h) => (
                <th
                  key={h}
                  className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400 ${["Stock", "Min Level", "Sold (30d)"].includes(h) ? "text-right" : "text-left"
                    }`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.lowStock.map((p) => (
              <tr
                key={p.sku}
                className="transition-colors hover:bg-slate-50"
                style={{ borderTop: "1px solid #f8fafc" }}
              >
                <td className="px-4 py-3 font-semibold text-slate-800">{p.name}</td>
                <td className="px-4 py-3 text-slate-500">{p.category}</td>
                <td className="px-4 py-3 text-right font-bold text-rose-600 tabular-nums">
                  {p.stockQty}
                </td>
                <td className="px-4 py-3 text-right text-slate-400 tabular-nums">
                  {p.minStockLevel}
                </td>
                <td className="px-4 py-3 text-right text-slate-500 tabular-nums">
                  {p.qtySoldLast30Days}
                </td>
              </tr>
            ))}
            {data.lowStock.length === 0 && (
              <tr>
                <td colSpan={5} className="py-10 text-center text-sm text-slate-400">
                  All products are well stocked.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ForecastTab() {
  const [data, setData] = useState(null);
  useEffect(() => {
    axiosClient.get("/ai/forecast").then((res) => setData(res.data.data));
  }, []);
  if (!data) return <LoadingSkeleton />;

  const chartData = [
    ...data.history.slice(-21).map((h) => ({ date: h.date, actual: h.revenue })),
    ...data.forecast.map((f) => ({ date: f.date, forecast: f.predictedRevenue })),
  ];

  const trendColors = {
    upward: { bg: "#ecfdf5", color: "#065f46", icon: "↗" },
    downward: { bg: "#fff1f2", color: "#9f1239", icon: "↘" },
    flat: { bg: "#f8fafc", color: "#475569", icon: "→" },
  };
  const trend = trendColors[data.trendDirection] || trendColors.flat;

  return (
    <div className="animate-fade-in space-y-4">
      <AISummaryBanner summary={data.summary} aiUnavailable={data.aiUnavailable} />

      <div className="flex gap-3">
        <span
          className="rounded-full px-3 py-1 text-xs font-bold"
          style={{ background: trend.bg, color: trend.color }}
        >
          {trend.icon} {data.trendDirection.charAt(0).toUpperCase() + data.trendDirection.slice(1)} trend
        </span>
        <span
          className="rounded-full px-3 py-1 text-xs font-bold"
          style={{ background: "#dcfce7", color: "#15803d" }}
        >
          🎯 Verified Data-Backed Projections
        </span>
      </div>

      <div
        className="rounded-2xl bg-white p-5"
        style={{
          border: "1px solid rgba(0,0,0,0.07)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        }}
      >
        <h3 className="mb-4 text-sm font-bold text-slate-700">
          Revenue History + 7-Day Forecast
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <defs>
              <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity={0.1} />
                <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: "#94a3b8" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `₹${v}`}
            />
            <Tooltip
              formatter={(v) => currency(v)}
              contentStyle={{
                background: "#0f172a",
                border: "none",
                borderRadius: 10,
                color: "#fff",
                fontSize: 12,
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            />
            <Line
              type="monotone"
              dataKey="actual"
              name="Actual Revenue"
              stroke="#6366f1"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, fill: "#6366f1" }}
            />
            <Line
              type="monotone"
              dataKey="forecast"
              name="Forecast (estimate)"
              stroke="#f59e0b"
              strokeDasharray="6 3"
              strokeWidth={2.5}
              dot={{ r: 4, fill: "#f59e0b", strokeWidth: 0 }}
              activeDot={{ r: 6, fill: "#f59e0b" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function AIInsights() {
  const [tab, setTab] = useState("insights");

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">AI Insights</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Grounded in your real MongoDB sales data - no fabricated figures
        </p>
      </div>

      {/* Tab bar */}
      <div
        className="mb-5 flex gap-1 rounded-xl p-1"
        style={{ background: "#f1f5f9" }}
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all"
            style={
              tab === t.key
                ? {
                  background: "#fff",
                  color: "#4f46e5",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
                }
                : { color: "#64748b" }
            }
          >
            <span>{t.emoji}</span>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "insights" && <InsightsTab />}
      {tab === "inventory" && <InventoryRecommendationsTab />}
      {tab === "forecast" && <ForecastTab />}
    </div>
  );
}
