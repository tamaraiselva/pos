import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import axiosClient from "../../api/axiosClient";
import StatCard from "../../components/StatCard";
import { useSelector } from "react-redux";

const currency = (n) => `₹${Number(n || 0).toFixed(2)}`;

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl px-3 py-2 text-sm"
      style={{
        background: "#0f172a",
        border: "1px solid rgba(255,255,255,0.1)",
        color: "#fff",
        boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
      }}
    >
      <p className="text-slate-400 text-xs mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {currency(p.value)}
        </p>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const user = useSelector((s) => s.auth.user);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axiosClient
      .get("/dashboard/summary")
      .then((res) => setData(res.data.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-8 w-64 rounded-xl" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton h-28 rounded-2xl" />
          ))}
        </div>
        <div className="skeleton h-72 rounded-2xl" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
        Failed to load dashboard data. Please try refreshing.
      </div>
    );
  }

  const chartData = data.last7Days.map((d) => ({
    ...d,
    label: new Date(d.date + "T00:00:00").toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    }),
  }));

  const paymentBreakdown = [
    { method: "Cash", value: data.today.cash, color: "#10b981" },
    { method: "UPI", value: data.today.upi, color: "#6366f1" },
    { method: "Card", value: data.today.card, color: "#8b5cf6" },
  ];
  const maxPayment = Math.max(...paymentBreakdown.map((p) => p.value), 1);

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          {getGreeting()}, {user?.name?.split(" ")[0]} 👋
        </h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Here's your store performance for today and the last 7 days.
        </p>
      </div>

      {/* Top stat cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          label="Today's Revenue"
          value={currency(data.today.revenue)}
          sub={`${data.today.orderCount} orders`}
          accent="emerald"
          icon={
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path d="M10.75 10.818v2.614A3.13 3.13 0 0 0 11.888 13c.482-.315.612-.648.612-.875 0-.229-.13-.562-.612-.875a3.13 3.13 0 0 0-1.138-.432ZM8.33 8.62c.053.055.115.11.184.164.208.16.46.284.736.363V6.603a2.45 2.45 0 0 0-.35.13c-.14.065-.27.143-.386.233-.377.292-.514.627-.514.909 0 .184.058.39.26.61Z" />
              <path fillRule="evenodd" d="M9.99 1.012C5.022 1.012 1 5.034 1 10c0 4.968 4.022 8.988 8.99 8.988S18.988 14.968 18.988 10c0-4.966-4.02-8.988-8.998-8.988ZM9.25 7.5A2.75 2.75 0 0 0 9.25 13v1.5a.75.75 0 0 0 1.5 0v-1.5a2.75 2.75 0 0 0 0-5.5V6a.75.75 0 0 0-1.5 0v1.5Z" clipRule="evenodd" />
            </svg>
          }
        />
        <StatCard
          label="Orders Today"
          value={data.today.orderCount}
          sub="completed"
          accent="indigo"
          icon={
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path d="M1 1.75A.75.75 0 0 1 1.75 1h1.628a1.75 1.75 0 0 1 1.734 1.51L5.18 3a65.25 65.25 0 0 1 13.36 1.412.75.75 0 0 1 .58.875 48.645 48.645 0 0 1-1.618 6.2.75.75 0 0 1-.712.513H6a2.503 2.503 0 0 0-2.292 1.5H17.25a.75.75 0 0 1 0 1.5H2.76a.75.75 0 0 1-.748-.807 4.002 4.002 0 0 1 2.716-3.486L3.626 2.716a.25.25 0 0 0-.248-.216H1.75A.75.75 0 0 1 1 1.75Z" />
            </svg>
          }
        />
        <StatCard
          label="Total Products"
          value={data.totalProducts}
          sub="active"
          accent="violet"
          icon={
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path d="M7.25 1.75a.75.75 0 0 0-1.5 0v.884a1.25 1.25 0 0 0-.876 1.741l.25.5A1.25 1.25 0 0 0 6.25 5.5h7.5a1.25 1.25 0 0 0 1.126-.625l.25-.5A1.25 1.25 0 0 0 14.25 2.634V1.75a.75.75 0 0 0-1.5 0v.75h-5.5V1.75ZM2.5 7.5A2.5 2.5 0 0 1 5 5h10a2.5 2.5 0 0 1 2.5 2.5v8a2.5 2.5 0 0 1-2.5 2.5H5A2.5 2.5 0 0 1 2.5 15.5v-8Z" />
            </svg>
          }
        />
        <StatCard
          label="Low Stock Items"
          value={data.lowStockCount}
          sub={data.lowStockCount > 0 ? "Needs attention" : "All good ✓"}
          accent={data.lowStockCount > 0 ? "rose" : "emerald"}
          icon={
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
            </svg>
          }
        />
      </div>

      {/* Payment breakdown + chart row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Payment method breakdown */}
        <div
          className="rounded-2xl bg-white p-5"
          style={{
            boxShadow: "0 1px 3px rgba(0,0,0,0.07)",
            border: "1px solid rgba(0,0,0,0.06)",
          }}
        >
          <h2 className="mb-4 text-sm font-semibold text-slate-700">
            Today's Payment Breakdown
          </h2>
          <div className="space-y-4">
            {paymentBreakdown.map((p) => (
              <div key={p.method}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">{p.method}</span>
                  <span className="font-semibold text-slate-900 tabular-nums">
                    {currency(p.value)}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${(p.value / maxPayment) * 100}%`,
                      background: p.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Payment bar chart */}
          <div className="mt-5 -mx-2">
            <ResponsiveContainer width="100%" height={100}>
              <BarChart data={paymentBreakdown} barSize={28}>
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {paymentBreakdown.map((p) => (
                    <rect key={p.method} fill={p.color} />
                  ))}
                </Bar>
                <XAxis
                  dataKey="method"
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(v) => currency(v)}
                  contentStyle={{
                    background: "#0f172a",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 10,
                    color: "#fff",
                    fontSize: 12,
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 7-day revenue chart */}
        <div
          className="lg:col-span-2 rounded-2xl bg-white p-5"
          style={{
            boxShadow: "0 1px 3px rgba(0,0,0,0.07)",
            border: "1px solid rgba(0,0,0,0.06)",
          }}
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">
              Revenue - Last 7 Days
            </h2>
            <span className="text-xs text-slate-400 bg-slate-50 rounded-full px-2.5 py-1">
              Daily total
            </span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#f1f5f9"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `₹${v}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#6366f1"
                strokeWidth={2.5}
                fill="url(#revenueGrad)"
                dot={{ r: 4, fill: "#6366f1", strokeWidth: 0 }}
                activeDot={{ r: 6, fill: "#6366f1" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
