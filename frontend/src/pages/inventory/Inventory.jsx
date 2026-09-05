import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import axiosClient from "../../api/axiosClient";

function StockBadge({ qty, minLevel }) {
  if (qty === 0)
    return (
      <span
        className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
        style={{ background: "#fee2e2", color: "#991b1b" }}
      >
        Out of stock
      </span>
    );
  return (
    <span
      className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={{ background: "#fef3c7", color: "#92400e" }}
    >
      Low - {qty} left
    </span>
  );
}

export default function Inventory() {
  const user = useSelector((s) => s.auth.user);
  const [data, setData] = useState({ lowStock: [], outOfStock: [] });
  const [loading, setLoading] = useState(true);
  const [historyProduct, setHistoryProduct] = useState(null);
  const [history, setHistory] = useState([]);
  const [adjustQty, setAdjustQty] = useState("");
  const [adjustNote, setAdjustNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [applyingDiscounts, setApplyingDiscounts] = useState(false);

  function refresh() {
    setLoading(true);
    axiosClient
      .get("/inventory/low-stock")
      .then((res) => setData(res.data.data))
      .finally(() => setLoading(false));
  }

  useEffect(refresh, []);

  async function openHistory(product) {
    setHistoryProduct(product);
    setAdjustQty("");
    setAdjustNote("");
    const res = await axiosClient.get(`/inventory/history/${product._id}`);
    setHistory(res.data.data);
  }

  async function handleAdjust() {
    if (!adjustQty || Number(adjustQty) === 0) {
      toast.error("Enter a non-zero adjustment quantity");
      return;
    }
    setSubmitting(true);
    try {
      await axiosClient.post("/inventory/adjust", {
        productId: historyProduct._id,
        changeQty: Number(adjustQty),
        note: adjustNote,
      });
      toast.success("Stock adjusted");
      const res = await axiosClient.get(`/inventory/history/${historyProduct._id}`);
      setHistory(res.data.data);
      setAdjustQty("");
      setAdjustNote("");
      refresh();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleApplyOldStockDiscounts() {
    setApplyingDiscounts(true);
    try {
      const res = await axiosClient.post("/inventory/apply-old-stock-discounts");
      const { updated, flagged } = res.data.data;
      toast.success(
        updated > 0
          ? `Applied clearance discounts to ${updated} product(s): ${flagged.map((p) => `${p.name} (${p.discount}%)`).join(", ")}`
          : "No products currently qualify as old stock."
      );
    } catch (err) {
      toast.error(err.message);
    } finally {
      setApplyingDiscounts(false);
    }
  }

  const rows = [...data.outOfStock, ...data.lowStock];
  const outCount = data.outOfStock.length;
  const lowCount = data.lowStock.length;

  return (
    <div className="animate-fade-in space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inventory</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Products at or below their minimum stock level
          </p>
        </div>
        {user?.role === "admin" && (
          <button
            onClick={handleApplyOldStockDiscounts}
            disabled={applyingDiscounts}
            className="flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 transition-colors hover:bg-indigo-100 disabled:opacity-50"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-11.25a.75.75 0 0 0-1.5 0v2.5h-2.5a.75.75 0 0 0 0 1.5h2.5v2.5a.75.75 0 0 0 1.5 0v-2.5h2.5a.75.75 0 0 0 0-1.5h-2.5v-2.5Z" clipRule="evenodd" />
            </svg>
            {applyingDiscounts ? "Scanning…" : "Apply Old-Stock Discounts"}
          </button>
        )}
      </div>

      {/* Alert banners */}
      {!loading && (outCount > 0 || lowCount > 0) && (
        <div className="flex gap-3">
          {outCount > 0 && (
            <div
              className="flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium"
              style={{ background: "#fee2e2", color: "#991b1b", border: "1px solid #fecaca" }}
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0">
                <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
              </svg>
              {outCount} product{outCount > 1 ? "s" : ""} out of stock
            </div>
          )}
          {lowCount > 0 && (
            <div
              className="flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium"
              style={{ background: "#fffbeb", color: "#92400e", border: "1px solid #fde68a" }}
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0">
                <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
              </svg>
              {lowCount} product{lowCount > 1 ? "s" : ""} running low
            </div>
          )}
        </div>
      )}

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
            {[...Array(5)].map((_, i) => (
              <div key={i} className="skeleton h-12 rounded-xl" />
            ))}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead
              style={{ background: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}
            >
              <tr>
                {["Product", "Category", "Stock", "Min Level", "Status", ""].map((h) => (
                  <th
                    key={h}
                    className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400 ${h === "Stock" || h === "Min Level" ? "text-right" : "text-left"}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const pct = p.minStockLevel > 0 ? (p.stockQty / p.minStockLevel) * 100 : 0;
                return (
                  <tr
                    key={p._id}
                    className="transition-colors hover:bg-slate-50"
                    style={{ borderTop: "1px solid #f8fafc" }}
                  >
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      {p.name}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{p.category}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${Math.min(pct, 100)}%`,
                              background: p.stockQty === 0 ? "#ef4444" : "#f59e0b",
                            }}
                          />
                        </div>
                        <span
                          className="tabular-nums font-bold"
                          style={{ color: p.stockQty === 0 ? "#dc2626" : "#d97706" }}
                        >
                          {p.stockQty}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-500">
                      {p.minStockLevel}
                    </td>
                    <td className="px-4 py-3">
                      <StockBadge qty={p.stockQty} minLevel={p.minStockLevel} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openHistory(p)}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline transition-colors"
                      >
                        History
                      </button>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-14 text-center">
                    <svg
                      className="mx-auto mb-3 w-10 h-10 text-emerald-300"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                      />
                    </svg>
                    <p className="text-sm font-medium text-slate-500">
                      All products are sufficiently stocked
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* History modal */}
      {historyProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => setHistoryProduct(null)}
        >
          <div
            className="animate-scale-in w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {historyProduct.name}
                </h2>
                <p className="text-xs text-slate-400">Stock history & adjustment</p>
              </div>
              <button
                onClick={() => setHistoryProduct(null)}
                className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              >
                <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
                  <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
                </svg>
              </button>
            </div>

            {user?.role === "admin" && (
              <div
                className="mb-4 flex gap-2 rounded-xl p-3"
                style={{ background: "#f8fafc", border: "1px solid #f1f5f9" }}
              >
                <input
                  type="number"
                  placeholder="+/− qty"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  className="w-24 rounded-lg border border-slate-200 px-2.5 py-2 text-sm outline-none focus:border-indigo-400"
                />
                <input
                  type="text"
                  placeholder="Note (e.g. restock, damaged)"
                  value={adjustNote}
                  onChange={(e) => setAdjustNote(e.target.value)}
                  className="flex-1 rounded-lg border border-slate-200 px-2.5 py-2 text-sm outline-none focus:border-indigo-400"
                />
                <button
                  onClick={handleAdjust}
                  disabled={submitting}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
                >
                  {submitting ? "…" : "Apply"}
                </button>
              </div>
            )}

            <div className="max-h-72 space-y-2 overflow-y-auto">
              {history.map((log) => (
                <div
                  key={log._id}
                  className="flex items-center justify-between rounded-xl px-3 py-2.5"
                  style={{ background: "#f8fafc", border: "1px solid #f1f5f9" }}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold"
                      style={{
                        background: log.changeQty > 0 ? "#ecfdf5" : "#fee2e2",
                        color: log.changeQty > 0 ? "#065f46" : "#991b1b",
                      }}
                    >
                      {log.changeQty > 0 ? "+" : "−"}
                    </span>
                    <div>
                      <span className="text-sm font-semibold text-slate-800">
                        {Math.abs(log.changeQty)} units
                      </span>
                      <span className="ml-2 text-xs capitalize text-slate-500">
                        {log.reason}
                      </span>
                      {log.note && (
                        <p className="text-xs text-slate-400">{log.note}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-slate-600">
                      Balance: {log.balanceAfter}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {new Date(log.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
              {history.length === 0 && (
                <p className="py-8 text-center text-sm text-slate-400">
                  No history yet.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
