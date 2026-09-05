import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useReactToPrint } from "react-to-print";
import axiosClient from "../../api/axiosClient";

const currency = (n) => `₹${Number(n || 0).toFixed(2)}`;
const STORE_NAME = import.meta.env.VITE_STORE_NAME || "POS Retail Store";

const STATUS_STYLES = {
  completed: { bg: "#ecfdf5", color: "#065f46", label: "Completed" },
  partially_returned: { bg: "#fffbeb", color: "#92400e", label: "Partially Returned" },
  returned: { bg: "#fff1f2", color: "#9f1239", label: "Returned" },
};

export default function InvoiceView() {
  const { id } = useParams();
  const [sale, setSale] = useState(null);
  const printRef = useRef(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: sale?.invoiceNumber || "invoice",
  });

  useEffect(() => {
    axiosClient.get(`/sales/${id}`).then((res) => setSale(res.data.data));
  }, [id]);

  if (!sale) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="skeleton h-8 w-48 rounded-xl" />
        <div className="skeleton h-96 rounded-2xl" />
      </div>
    );
  }

  const statusStyle = STATUS_STYLES[sale.status] || STATUS_STYLES.completed;

  return (
    <div className="animate-fade-in mx-auto max-w-2xl">
      {/* Controls */}
      <div className="mb-4 flex items-center justify-between">
        <Link
          to="/sales"
          className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M14 8a.75.75 0 0 1-.75.75H4.56l3.22 3.22a.75.75 0 1 1-1.06 1.06l-4.5-4.5a.75.75 0 0 1 0-1.06l4.5-4.5a.75.75 0 0 1 1.06 1.06L4.56 7.25h8.69A.75.75 0 0 1 14 8Z" clipRule="evenodd" />
          </svg>
          Back to Sales
        </Link>
        <button
          id="print-invoice-btn"
          onClick={handlePrint}
          className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-all"
          style={{
            background: "linear-gradient(135deg, #6366f1, #4f46e5)",
            boxShadow: "0 4px 12px rgba(99,102,241,0.35)",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-1px)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "none")}
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M5 2.75C5 1.784 5.784 1 6.75 1h6.5c.966 0 1.75.784 1.75 1.75v3.552c.377.046.752.097 1.126.153A2.679 2.679 0 0 1 18 9.107V15.75A2.25 2.25 0 0 1 15.75 18H4.25A2.25 2.25 0 0 1 2 15.75V9.107c0-1.175.806-2.257 1.874-2.452A43.08 43.08 0 0 1 5 6.302V2.75Zm1.5 0v3.43a43.803 43.803 0 0 1 7 0V2.75a.25.25 0 0 0-.25-.25h-6.5a.25.25 0 0 0-.25.25Zm6.974 9.688a41.015 41.015 0 0 0-9.944 0l-.012.022.012-.022a.75.75 0 0 0-.57.91 41.015 41.015 0 0 0 9.944 0 .75.75 0 0 0 .003-.91Z" clipRule="evenodd" />
          </svg>
          Print Invoice
        </button>
      </div>

      {/* Invoice card */}
      <div
        id="printable-invoice"
        ref={printRef}
        className="rounded-2xl bg-white p-8"
        style={{
          border: "1px solid rgba(0,0,0,0.07)",
          boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
        }}
      >
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <div
              className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl text-lg font-extrabold text-white"
              style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}
            >
              P
            </div>
            <h1 className="text-xl font-bold text-slate-900">{STORE_NAME}</h1>
            <p className="mt-0.5 text-sm text-slate-400">
              Invoice #{sale.invoiceNumber}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-slate-800">
              {new Date(sale.createdAt).toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
            <p className="text-xs text-slate-400">
              {new Date(sale.createdAt).toLocaleTimeString()}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Cashier: {sale.cashier?.name}
            </p>
            {(sale.customer?.name || sale.customer?.phone) && (
              <p className="mt-0.5 text-xs text-slate-500">
                Customer: {sale.customer.name || sale.customer.phone}
              </p>
            )}
            <span
              className="mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold"
              style={{
                background: statusStyle.bg,
                color: statusStyle.color,
              }}
            >
              {statusStyle.label}
            </span>
          </div>
        </div>

        {/* Divider */}
        <div
          className="mb-6 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent, #e2e8f0 20%, #e2e8f0 80%, transparent)",
          }}
        />

        {/* Items table */}
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
              <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                Item
              </th>
              <th className="pb-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">
                Qty
              </th>
              <th className="pb-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">
                Price
              </th>
              <th className="pb-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">
                Discount
              </th>
              <th className="pb-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {sale.items.map((item) => (
              <tr
                key={item.sku}
                style={{ borderBottom: "1px solid #f8fafc" }}
                className="transition-colors hover:bg-slate-50"
              >
                <td className="py-3">
                  <span className="font-medium text-slate-800">{item.name}</span>
                  <span className="ml-1.5 text-[10px] text-slate-400">{item.sku}</span>
                  {item.returnedQty > 0 && (
                    <span
                      className="ml-2 rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                      style={{ background: "#fffbeb", color: "#92400e" }}
                    >
                      {item.returnedQty} returned
                    </span>
                  )}
                </td>
                <td className="py-3 text-center text-slate-600">{item.qty}</td>
                <td className="py-3 text-right text-slate-600 tabular-nums">
                  {currency(item.price)}
                </td>
                <td className="py-3 text-right tabular-nums">
                  {item.discount > 0 ? (
                    <span className="text-emerald-600 font-medium">
                      −{currency(item.discount)}
                      <span className="ml-1 text-[10px] text-slate-400">
                        ({item.discountPercent}%)
                      </span>
                    </span>
                  ) : (
                    <span className="text-slate-300">-</span>
                  )}
                </td>
                <td className="py-3 text-right font-semibold text-slate-800 tabular-nums">
                  {currency(item.lineTotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="ml-auto mt-6 w-64 space-y-2">
          <div className="flex justify-between text-sm text-slate-500">
            <span>Subtotal</span>
            <span className="tabular-nums">{currency(sale.subtotal)}</span>
          </div>
          {sale.discountTotal > 0 && (
            <div className="flex justify-between text-sm text-emerald-600">
              <span>Discount</span>
              <span className="tabular-nums">−{currency(sale.discountTotal)}</span>
            </div>
          )}
          {sale.taxTotal > 0 && (
            <div className="flex justify-between text-sm text-slate-500">
              <span>Tax / GST</span>
              <span className="tabular-nums">{currency(sale.taxTotal)}</span>
            </div>
          )}
          <div
            className="flex justify-between pt-2 text-base font-bold text-slate-900"
            style={{ borderTop: "1px solid #e2e8f0" }}
          >
            <span>Grand Total</span>
            <span className="tabular-nums">{currency(sale.grandTotal)}</span>
          </div>
          <div className="flex justify-between pt-1 text-sm text-slate-500">
            <span>Payment Method</span>
            <span className="font-medium capitalize">{sale.paymentMethod}</span>
          </div>
        </div>

        {/* Footer */}
        <div
          className="mt-8 pt-4 text-center text-xs text-slate-400"
          style={{ borderTop: "1px solid #f1f5f9" }}
        >
          Thank you for your purchase! · {STORE_NAME}
        </div>
      </div>
    </div>
  );
}
