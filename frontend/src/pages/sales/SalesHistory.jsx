import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axiosClient from "../../api/axiosClient";

const currency = (n) => `₹${Number(n || 0).toFixed(2)}`;

const STATUS_STYLES = {
  completed: { bg: "#ecfdf5", color: "#065f46", label: "Completed" },
  partially_returned: { bg: "#fffbeb", color: "#92400e", label: "Part. Returned" },
  returned: { bg: "#fff1f2", color: "#9f1239", label: "Returned" },
};

const PAYMENT_ICONS = { cash: "💵", upi: "📱", card: "💳" };

export default function SalesHistory() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: "",
    paymentMethod: "",
    from: "",
    to: "",
  });

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (filters.search) params.search = filters.search;
    if (filters.paymentMethod) params.paymentMethod = filters.paymentMethod;
    if (filters.from) params.from = filters.from;
    if (filters.to) params.to = filters.to;

    const handle = setTimeout(() => {
      axiosClient
        .get("/sales", { params })
        .then((res) => setSales(res.data.data))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(handle);
  }, [filters]);

  const filteredRevenue = sales.reduce((s, sale) => s + sale.grandTotal, 0);

  return (
    <div className="animate-fade-in space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sales History</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            All completed transactions
          </p>
        </div>
        {sales.length > 0 && (
          <div className="text-right">
            <p className="text-xs text-slate-400">Showing {sales.length} sales</p>
            <p className="text-base font-bold text-indigo-600 tabular-nums">
              {currency(filteredRevenue)} total
            </p>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <input
          type="text"
          placeholder="Search invoice #"
          value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition-all focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50"
        />
        <select
          value={filters.paymentMethod}
          onChange={(e) =>
            setFilters((f) => ({ ...f, paymentMethod: e.target.value }))
          }
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition-all focus:border-indigo-400"
        >
          <option value="">All payments</option>
          <option value="cash">💵 Cash</option>
          <option value="upi">📱 UPI</option>
          <option value="card">💳 Card</option>
        </select>
        <input
          type="date"
          value={filters.from}
          onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400"
        />
        <input
          type="date"
          value={filters.to}
          onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400"
        />
      </div>

      {/* Table */}
      <div
        className="overflow-x-auto rounded-2xl bg-white"
        style={{
          border: "1px solid rgba(0,0,0,0.07)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        }}
      >
        {loading ? (
          <div className="space-y-3 p-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="skeleton h-10 rounded-xl" />
            ))}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead
              className="text-left"
              style={{ background: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}
            >
              <tr>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Invoice #
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Date
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Cashier
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Payment
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => {
                const statusStyle = STATUS_STYLES[sale.status] || STATUS_STYLES.completed;
                return (
                  <tr
                    key={sale._id}
                    className="transition-colors hover:bg-slate-50"
                    style={{ borderTop: "1px solid #f8fafc" }}
                  >
                    <td className="px-4 py-3">
                      <Link
                        to={`/sales/${sale._id}`}
                        className="font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                      >
                        {sale.invoiceNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(sale.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{sale.cashier?.name}</td>
                    <td className="px-4 py-3">
                      <span className="capitalize">
                        {PAYMENT_ICONS[sale.paymentMethod]}{" "}
                        {sale.paymentMethod.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                        style={{
                          background: statusStyle.bg,
                          color: statusStyle.color,
                        }}
                      >
                        {statusStyle.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900 tabular-nums">
                      {currency(sale.grandTotal)}
                    </td>
                  </tr>
                );
              })}
              {!loading && sales.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-slate-400"
                  >
                    No sales found for the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
