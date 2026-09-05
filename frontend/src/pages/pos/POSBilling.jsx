import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import axiosClient from "../../api/axiosClient";
import {
  addItem,
  incrementQty,
  decrementQty,
  removeItem,
  setPaymentMethod,
  setCustomer,
  setItemDiscount,
  clearCart,
  selectCartTotals,
} from "../../store/cartSlice";

const currency = (n) => `₹${Number(n || 0).toFixed(2)}`;

const PAYMENT_OPTIONS = [
  { key: "cash", label: "Cash", emoji: "💵" },
  { key: "upi", label: "UPI", emoji: "📱" },
  { key: "card", label: "Card", emoji: "💳" },
];

function ProductCard({ product, onAdd }) {
  const outOfStock = product.stockQty <= 0;
  const lowStock = product.stockQty > 0 && product.stockQty <= product.minStockLevel;

  return (
    <button
      onClick={() => !outOfStock && onAdd(product)}
      disabled={outOfStock}
      className="group relative w-full rounded-2xl bg-white text-left transition-all duration-200"
      style={{
        border: "1px solid rgba(0,0,0,0.07)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        cursor: outOfStock ? "not-allowed" : "pointer",
        opacity: outOfStock ? 0.5 : 1,
      }}
      onMouseEnter={(e) => {
        if (!outOfStock) {
          e.currentTarget.style.boxShadow =
            "0 4px 12px rgba(99,102,241,0.15), 0 0 0 1.5px rgba(99,102,241,0.4)";
          e.currentTarget.style.transform = "translateY(-2px)";
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.06)";
        e.currentTarget.style.transform = "none";
      }}
    >
      {/* Product image / placeholder */}
      <div
        className="relative overflow-hidden rounded-t-2xl"
        style={{ height: 90 }}
      >
        {product.imageUrl ? (
          <img
            src={`${import.meta.env.VITE_API_URL || "http://localhost:5000"}${product.imageUrl}`}
            alt={product.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center text-3xl"
            style={{
              background: `linear-gradient(135deg, hsl(${(product.name.charCodeAt(0) * 37) % 360}, 60%, 92%), hsl(${(product.name.charCodeAt(0) * 37 + 60) % 360}, 60%, 85%))`,
            }}
          >
            {product.name.charAt(0).toUpperCase()}
          </div>
        )}
        {lowStock && (
          <span
            className="absolute top-2 right-2 rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
            style={{ background: "#fef3c7", color: "#92400e" }}
          >
            Low
          </span>
        )}
        {outOfStock && (
          <span
            className="absolute top-2 right-2 rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
            style={{ background: "#fee2e2", color: "#991b1b" }}
          >
            Out
          </span>
        )}
      </div>

      <div className="p-3">
        <p className="truncate text-sm font-semibold text-slate-800">
          {product.name}
        </p>
        <p className="text-[11px] text-slate-400">{product.sku}</p>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-sm font-bold text-indigo-600">
            {currency(product.sellingPrice)}
          </span>
          <span className="text-[11px] text-slate-400">
            Qty: {product.stockQty}
          </span>
        </div>
        {product.defaultDiscount > 0 && (
          <span
            className="mt-1 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
            style={{ background: "#ecfdf5", color: "#065f46" }}
          >
            {product.defaultDiscount}% off
          </span>
        )}
      </div>
    </button>
  );
}

export default function POSBilling() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items, paymentMethod, customerName, customerPhone } = useSelector(
    (s) => s.cart
  );
  const totals = useSelector(selectCartTotals);

  const [search, setSearch] = useState("");
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showCustomer, setShowCustomer] = useState(false);
  const searchInputRef = useRef(null);

  // Fetch categories once
  useEffect(() => {
    axiosClient
      .get("/products/categories")
      .then((res) => setCategories(res.data.data || []))
      .catch(() => { });
  }, []);

  // Debounced product search
  useEffect(() => {
    const handle = setTimeout(() => {
      const params = { limit: 24 };
      if (search) params.search = search;
      if (activeCategory) params.category = activeCategory;
      axiosClient
        .get("/products", { params })
        .then((res) => setProducts(res.data.data))
        .catch(() => setProducts([]));
    }, 200);
    return () => clearTimeout(handle);
  }, [search, activeCategory]);

  function addProductToCart(product) {
    if (product.stockQty <= 0) {
      toast.error(`${product.name} is out of stock`);
      return;
    }
    dispatch(addItem(product));
    toast.success(`Added ${product.name}`, { duration: 1000, icon: "🛒" });
  }

  async function handleScanKeyDown(e) {
    if (e.key !== "Enter") return;
    const code = search.trim();
    if (!code) return;
    try {
      const res = await axiosClient.get("/products", {
        params: { barcode: code, limit: 1 },
      });
      const exactMatch = res.data.data[0];
      if (exactMatch) {
        addProductToCart(exactMatch);
      } else if (products.length === 1) {
        addProductToCart(products[0]);
      } else {
        toast.error(`No product found for "${code}"`);
        return;
      }
    } catch {
      toast.error("Lookup failed");
      return;
    }
    setSearch("");
    setProducts([]);
    searchInputRef.current?.focus();
  }

  function setDiscount(productId, val) {
    const pct = Math.max(0, Math.min(100, Number(val) || 0));
    dispatch(setItemDiscount({ productId, discountPercent: pct }));
  }

  async function handleCompleteSale() {
    if (items.length === 0) {
      toast.error("Cart is empty");
      return;
    }
    setSubmitting(true);
    try {
      const res = await axiosClient.post("/sales", {
        items: items.map((i) => ({
          productId: i.productId,
          qty: i.qty,
          discountPercent: i.discountPercent,
        })),
        paymentMethod,
        customer:
          customerName || customerPhone
            ? { name: customerName, phone: customerPhone }
            : {},
      });
      toast.success(`Sale complete - ${res.data.data.invoiceNumber} 🎉`);
      dispatch(clearCart());
      navigate(`/sales/${res.data.data._id}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="animate-fade-in flex flex-col lg:flex-row gap-6 min-h-[calc(100vh-5rem)] lg:h-[calc(100vh-5rem)]">
      {/* ── LEFT: Product Catalog ───────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">POS Billing</h1>
        </div>

        {/* Search bar */}
        <div className="relative mb-3">
          <svg
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z"
              clipRule="evenodd"
            />
          </svg>
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Scan barcode or search by name / SKU…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleScanKeyDown}
            autoFocus
            className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-3 text-sm text-slate-800 placeholder-slate-400 outline-none transition-all focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        {/* Category tabs */}
        {categories.length > 0 && (
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setActiveCategory("")}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${activeCategory === ""
                ? "bg-indigo-600 text-white"
                : "bg-white text-slate-600 border border-slate-200 hover:border-indigo-300"
                }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat === activeCategory ? "" : cat)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${activeCategory === cat
                  ? "bg-indigo-600 text-white"
                  : "bg-white text-slate-600 border border-slate-200 hover:border-indigo-300"
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Product grid */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 pb-2">
            {products.map((p) => (
              <ProductCard key={p._id} product={p} onAdd={addProductToCart} />
            ))}
            {products.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-16 text-slate-400">
                <svg
                  className="mb-3 w-12 h-12 opacity-40"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                  />
                </svg>
                <p className="text-sm">No products found</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── RIGHT: Cart ─────────────────────────────────────────── */}
      <div
        className="flex w-full lg:w-80 shrink-0 flex-col rounded-2xl bg-white"
        style={{
          border: "1px solid rgba(0,0,0,0.07)",
          boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
        }}
      >
        {/* Cart header */}
        <div
          className="flex items-center justify-between px-4 py-3.5"
          style={{ borderBottom: "1px solid #f1f5f9" }}
        >
          <h2 className="font-bold text-slate-800">
            Cart
            {items.length > 0 && (
              <span
                className="ml-2 rounded-full px-1.5 py-0.5 text-xs font-semibold"
                style={{ background: "#eef2ff", color: "#4338ca" }}
              >
                {items.length}
              </span>
            )}
          </h2>
          {items.length > 0 && (
            <button
              onClick={() => dispatch(clearCart())}
              className="text-xs font-medium text-rose-500 hover:text-rose-700 transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {/* Cart items */}
        <div className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
          {items.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-slate-300">
              <svg
                className="mb-3 w-10 h-10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z"
                />
              </svg>
              <p className="text-sm text-slate-400">Cart is empty</p>
              <p className="text-xs text-slate-300 mt-1">Click a product to add</p>
            </div>
          )}

          {items.map((item) => (
            <div
              key={item.productId}
              className="rounded-xl p-3"
              style={{ border: "1px solid #f1f5f9", background: "#fafafa" }}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="min-w-0 flex-1 mr-2">
                  <p className="truncate text-sm font-semibold text-slate-800">
                    {item.name}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {currency(item.sellingPrice)} each
                  </p>
                </div>
                <button
                  onClick={() => dispatch(removeItem(item.productId))}
                  className="shrink-0 rounded-full p-1 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500"
                >
                  <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                    <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
                  </svg>
                </button>
              </div>

              <div className="flex items-center justify-between">
                {/* Qty controls */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => dispatch(decrementQty(item.productId))}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
                  >
                    <svg viewBox="0 0 12 12" fill="currentColor" className="w-3 h-3">
                      <path d="M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </button>
                  <span className="w-7 text-center text-sm font-semibold text-slate-800">
                    {item.qty}
                  </span>
                  <button
                    onClick={() => dispatch(incrementQty(item.productId))}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
                  >
                    <svg viewBox="0 0 12 12" fill="currentColor" className="w-3 h-3">
                      <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>

                {/* Discount % input */}
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={item.discountPercent || ""}
                    placeholder="0"
                    onChange={(e) => setDiscount(item.productId, e.target.value)}
                    className="w-14 rounded-lg border border-slate-200 px-2 py-1 text-right text-xs font-medium text-slate-700 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100"
                    title="Discount %"
                  />
                  <span className="text-xs text-slate-400">%</span>
                </div>
              </div>

              {/* Line total */}
              <div className="mt-1.5 text-right">
                <span className="text-xs font-semibold text-slate-700">
                  {currency(
                    item.sellingPrice *
                    item.qty *
                    (1 - (item.discountPercent || 0) / 100) *
                    (1 + item.taxPercent / 100)
                  )}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom section */}
        <div
          className="space-y-3 px-4 pb-4 pt-3"
          style={{ borderTop: "1px solid #f1f5f9" }}
        >
          {/* Customer info toggle */}
          <button
            onClick={() => setShowCustomer((v) => !v)}
            className="flex w-full items-center justify-between rounded-xl border border-dashed border-slate-200 px-3 py-2 text-xs font-medium text-slate-500 transition-colors hover:border-indigo-300 hover:text-indigo-600"
          >
            <span>
              {showCustomer ? "Hide" : "Add"} customer info (optional)
            </span>
            <svg
              className={`w-3.5 h-3.5 transition-transform ${showCustomer ? "rotate-180" : ""}`}
              viewBox="0 0 12 12"
              fill="currentColor"
            >
              <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          </button>

          {showCustomer && (
            <div className="space-y-2 animate-fade-in">
              <input
                type="text"
                placeholder="Customer name"
                value={customerName}
                onChange={(e) =>
                  dispatch(setCustomer({ name: e.target.value }))
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100"
              />
              <input
                type="tel"
                placeholder="Phone number"
                value={customerPhone}
                onChange={(e) =>
                  dispatch(setCustomer({ phone: e.target.value }))
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100"
              />
            </div>
          )}

          {/* Payment method */}
          <div>
            <p className="mb-1.5 text-xs font-medium text-slate-400 uppercase tracking-wide">
              Payment
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {PAYMENT_OPTIONS.map(({ key, label, emoji }) => (
                <button
                  key={key}
                  onClick={() => dispatch(setPaymentMethod(key))}
                  className={`flex flex-col items-center gap-0.5 rounded-xl py-2 text-xs font-semibold transition-all ${paymentMethod === key
                    ? "bg-indigo-600 text-white shadow-md"
                    : "border border-slate-200 bg-white text-slate-600 hover:border-indigo-300"
                    }`}
                  style={
                    paymentMethod === key
                      ? { boxShadow: "0 4px 12px rgba(99,102,241,0.35)" }
                      : {}
                  }
                >
                  <span className="text-base">{emoji}</span>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal</span>
              <span className="tabular-nums">{currency(totals.subtotal)}</span>
            </div>
            {totals.discountTotal > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Discount</span>
                <span className="tabular-nums">−{currency(totals.discountTotal)}</span>
              </div>
            )}
            {totals.taxTotal > 0 && (
              <div className="flex justify-between text-slate-500">
                <span>Tax</span>
                <span className="tabular-nums">{currency(totals.taxTotal)}</span>
              </div>
            )}
            <div
              className="flex justify-between border-t border-slate-100 pt-2 text-base font-bold text-slate-900"
            >
              <span>Total</span>
              <span className="tabular-nums">{currency(totals.grandTotal)}</span>
            </div>
          </div>

          {/* Complete sale */}
          <button
            id="complete-sale-btn"
            onClick={handleCompleteSale}
            disabled={submitting || items.length === 0}
            className="w-full rounded-xl py-3 text-sm font-bold text-white transition-all duration-200"
            style={{
              background:
                submitting || items.length === 0
                  ? "#cbd5e1"
                  : "linear-gradient(135deg, #6366f1, #4f46e5)",
              boxShadow:
                submitting || items.length === 0
                  ? "none"
                  : "0 4px 16px rgba(99,102,241,0.4)",
            }}
            onMouseEnter={(e) => {
              if (!submitting && items.length > 0)
                e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "none";
            }}
          >
            {submitting ? "Processing…" : `Complete Sale · ${currency(totals.grandTotal)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
