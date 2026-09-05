import { useState } from "react";
import toast from "react-hot-toast";
import axiosClient from "../../api/axiosClient";

const currency = (n) => `₹${Number(n || 0).toFixed(2)}`;

const STEPS = ["Find Invoice", "Select Items", "Confirm Return"];

export default function Returns() {
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [sale, setSale] = useState(null);
  const [returnQty, setReturnQty] = useState({});
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const step = !sale ? 0 : Object.values(returnQty).some((v) => Number(v) > 0) ? 2 : 1;

  async function handleLookup(e) {
    e.preventDefault();
    setLoading(true);
    setSale(null);
    try {
      const res = await axiosClient.get(`/returns/lookup/${invoiceNumber.trim()}`);
      setSale(res.data.data);
      setReturnQty({});
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  function maxReturnable(item) {
    return item.qty - item.returnedQty;
  }

  const refundPreview = Object.entries(returnQty).reduce((total, [productId, qty]) => {
    if (!qty || Number(qty) <= 0) return total;
    const line = sale?.items.find((i) => i.product === productId || i.product?.toString() === productId);
    if (!line) return total;
    const perUnit = line.lineTotal / line.qty;
    return total + perUnit * Number(qty);
  }, 0);

  async function handleSubmitReturn() {
    const items = Object.entries(returnQty)
      .filter(([, qty]) => Number(qty) > 0)
      .map(([productId, qty]) => ({ productId, qty: Number(qty) }));

    if (items.length === 0) {
      toast.error("Select at least one item to return");
      return;
    }

    setSubmitting(true);
    try {
      const res = await axiosClient.post("/returns", { saleId: sale._id, items, reason });
      toast.success(`Return processed - refund ${currency(res.data.data.totalRefund)} 💰`);
      setSale(null);
      setInvoiceNumber("");
      setReason("");
      setReturnQty({});
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="animate-fade-in mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Returns</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Process product returns and generate refunds
        </p>
      </div>

      {/* Step indicator */}
      <div className="mb-6 flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <div
                className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all"
                style={{
                  background: i <= step ? "linear-gradient(135deg, #6366f1, #4f46e5)" : "#f1f5f9",
                  color: i <= step ? "#fff" : "#94a3b8",
                  boxShadow: i === step ? "0 0 12px rgba(99,102,241,0.4)" : "none",
                }}
              >
                {i < step ? (
                  <svg viewBox="0 0 12 12" fill="currentColor" className="w-3 h-3">
                    <path d="M10.28 2.28L3.989 8.575 1.695 6.28A1 1 0 0 0 .28 7.695l3 3a1 1 0 0 0 1.414 0l7-7A1 1 0 0 0 10.28 2.28Z" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <span
                className="text-xs font-medium"
                style={{ color: i <= step ? "#4f46e5" : "#94a3b8" }}
              >
                {s}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className="h-px w-8 transition-all"
                style={{ background: i < step ? "#6366f1" : "#e2e8f0" }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Invoice lookup */}
      <form onSubmit={handleLookup} className="mb-6 flex gap-2">
        <input
          type="text"
          placeholder="Enter invoice number (e.g. INV-20260904-0001)"
          value={invoiceNumber}
          onChange={(e) => setInvoiceNumber(e.target.value)}
          className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition-all focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50"
        />
        <button
          type="submit"
          disabled={loading || !invoiceNumber.trim()}
          className="rounded-xl px-5 py-3 text-sm font-semibold text-white transition-all disabled:opacity-50"
          style={{
            background: "linear-gradient(135deg, #6366f1, #4f46e5)",
            boxShadow: "0 4px 12px rgba(99,102,241,0.3)",
          }}
        >
          {loading ? "Searching…" : "Find Invoice"}
        </button>
      </form>

      {sale && (
        <div
          className="animate-slide-up rounded-2xl bg-white p-5"
          style={{
            border: "1px solid rgba(0,0,0,0.07)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
          }}
        >
          {/* Invoice info */}
          <div
            className="mb-4 flex items-center justify-between rounded-xl px-4 py-3"
            style={{ background: "#f8fafc", border: "1px solid #f1f5f9" }}
          >
            <div>
              <p className="text-sm font-bold text-slate-900">{sale.invoiceNumber}</p>
              <p className="text-xs text-slate-500">
                {new Date(sale.createdAt).toLocaleString()} · {sale.paymentMethod.toUpperCase()}
              </p>
            </div>
            <p className="text-base font-bold text-slate-800 tabular-nums">
              {currency(sale.grandTotal)}
            </p>
          </div>

          {/* Items */}
          <div className="space-y-3 mb-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Select items to return
            </p>
            {sale.items.map((item) => {
              const max = maxReturnable(item);
              return (
                <div
                  key={item.sku}
                  className="flex items-center justify-between rounded-xl px-4 py-3"
                  style={{
                    border: "1px solid #f1f5f9",
                    background: max === 0 ? "#f8fafc" : "#fff",
                    opacity: max === 0 ? 0.6 : 1,
                  }}
                >
                  <div className="min-w-0 flex-1 mr-4">
                    <p className="text-sm font-semibold text-slate-800">{item.name}</p>
                    <p className="text-xs text-slate-400">
                      Sold: {item.qty} · Returned: {item.returnedQty} · Available: {max}
                    </p>
                    <p className="text-xs text-slate-500 tabular-nums">
                      {currency(item.lineTotal / item.qty)} per unit
                    </p>
                  </div>
                  <input
                    type="number"
                    min="0"
                    max={max}
                    disabled={max === 0}
                    value={returnQty[item.product] || ""}
                    onChange={(e) =>
                      setReturnQty((q) => ({
                        ...q,
                        [item.product]: Math.min(Number(e.target.value), max),
                      }))
                    }
                    placeholder="0"
                    className="w-20 rounded-xl border border-slate-200 px-2.5 py-2 text-right text-sm font-semibold outline-none transition-all focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 disabled:bg-slate-50"
                  />
                </div>
              );
            })}
          </div>

          {/* Reason */}
          <textarea
            placeholder="Reason for return (optional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            className="mb-4 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition-all focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50"
          />

          {/* Refund preview */}
          {refundPreview > 0 && (
            <div
              className="mb-4 flex items-center justify-between rounded-xl px-4 py-3"
              style={{ background: "#ecfdf5", border: "1px solid #a7f3d0" }}
            >
              <p className="text-sm font-semibold text-emerald-800">
                Estimated Refund
              </p>
              <p className="text-base font-bold text-emerald-700 tabular-nums">
                {currency(refundPreview)}
              </p>
            </div>
          )}

          <button
            id="process-return-btn"
            onClick={handleSubmitReturn}
            disabled={submitting || refundPreview === 0}
            className="w-full rounded-xl py-3 text-sm font-bold text-white transition-all disabled:opacity-40"
            style={{
              background:
                submitting || refundPreview === 0
                  ? "#94a3b8"
                  : "linear-gradient(135deg, #f43f5e, #e11d48)",
              boxShadow:
                submitting || refundPreview === 0
                  ? "none"
                  : "0 4px 16px rgba(244,63,94,0.35)",
            }}
            onMouseEnter={(e) => {
              if (!submitting && refundPreview > 0)
                e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "none";
            }}
          >
            {submitting
              ? "Processing…"
              : refundPreview > 0
                ? `Process Return · Refund ${currency(refundPreview)}`
                : "Select items to return"}
          </button>
        </div>
      )}
    </div>
  );
}
