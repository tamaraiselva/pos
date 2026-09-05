import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import axiosClient from "../../api/axiosClient";

const currency = (n) => `₹${Number(n || 0).toFixed(2)}`;

const emptyForm = {
  name: "",
  sku: "",
  barcode: "",
  category: "",
  sellingPrice: "",
  purchasePrice: "",
  taxPercent: "0",
  defaultDiscount: "0",
  stockQty: "0",
  minStockLevel: "5",
  image: null,
};

function FormField({ label, children, hint }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-slate-400">{hint}</p>}
    </div>
  );
}

export default function ProductList() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  function refresh() {
    setLoading(true);
    const params = { limit: 200 };
    if (search) params.search = search;
    if (filterCat) params.category = filterCat;
    axiosClient
      .get("/products", { params })
      .then((res) => setProducts(res.data.data))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    axiosClient
      .get("/products/categories")
      .then((res) => setCategories(res.data.data || []));
  }, []);

  useEffect(() => {
    const handle = setTimeout(refresh, 250);
    return () => clearTimeout(handle);
  }, [search, filterCat]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(product) {
    setEditing(product);
    setForm({
      name: product.name,
      sku: product.sku,
      barcode: product.barcode || "",
      category: product.category,
      sellingPrice: product.sellingPrice,
      purchasePrice: product.purchasePrice,
      taxPercent: product.taxPercent,
      defaultDiscount: product.defaultDiscount ?? 0,
      minStockLevel: product.minStockLevel,
      stockQty: product.stockQty,
      image: null,
    });
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData();
    Object.entries(form).forEach(([key, value]) => {
      if (key === "image") {
        if (value) fd.append("image", value);
      } else if (editing && key === "stockQty") {
        // stockQty adjusted via Inventory page after creation
      } else {
        fd.append(key, value);
      }
    });

    try {
      if (editing) {
        await axiosClient.put(`/products/${editing._id}`, fd);
        toast.success("Product updated ✓");
      } else {
        await axiosClient.post("/products", fd);
        toast.success("Product created ✓");
      }
      setModalOpen(false);
      refresh();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeactivate(product) {
    try {
      await axiosClient.delete(`/products/${product._id}`);
      toast.success("Product deactivated");
      setConfirmDelete(null);
      refresh();
    } catch (err) {
      toast.error(err.message);
    }
  }

  const f = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  return (
    <div className="animate-fade-in space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Products</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {products.length} product{products.length !== 1 ? "s" : ""} found
          </p>
        </div>
        <button
          id="add-product-btn"
          onClick={openCreate}
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-all"
          style={{
            background: "linear-gradient(135deg, #6366f1, #4f46e5)",
            boxShadow: "0 4px 12px rgba(99,102,241,0.3)",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-1px)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "none")}
        >
          <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
            <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" />
          </svg>
          Add Product
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 w-full sm:max-w-sm">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
          </svg>
          <input
            type="text"
            placeholder="Search by name, SKU, or barcode…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm outline-none transition-all focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50"
          />
        </div>
        <select
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div
        className="overflow-hidden rounded-2xl bg-white"
        style={{
          border: "1px solid rgba(0,0,0,0.07)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        }}
      >
        {loading ? (
          <div className="space-y-3 p-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="skeleton h-12 rounded-xl" />
            ))}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead style={{ background: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
              <tr>
                {["", "Name", "SKU", "Category", "Price", "Tax", "Disc.", "Stock", ""].map(
                  (h, i) => (
                    <th
                      key={i}
                      className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400 ${["Price", "Tax", "Disc.", "Stock"].includes(h) ? "text-right" : "text-left"
                        }`}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr
                  key={p._id}
                  className="transition-colors hover:bg-slate-50"
                  style={{ borderTop: "1px solid #f8fafc" }}
                >
                  {/* Image */}
                  <td className="px-3 py-2.5">
                    {p.imageUrl ? (
                      <img
                        src={`${import.meta.env.VITE_API_URL || "http://localhost:5000"}${p.imageUrl}`}
                        alt={p.name}
                        className="h-9 w-9 rounded-lg object-cover"
                      />
                    ) : (
                      <div
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold text-white"
                        style={{
                          background: `hsl(${(p.name.charCodeAt(0) * 37) % 360}, 60%, 55%)`,
                        }}
                      >
                        {p.name.charAt(0)}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2.5 font-semibold text-slate-800">{p.name}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{p.sku}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                      style={{ background: "#eef2ff", color: "#4338ca" }}
                    >
                      {p.category}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold text-slate-900 tabular-nums">
                    {currency(p.sellingPrice)}
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-500">
                    {p.taxPercent}%
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {p.defaultDiscount > 0 ? (
                      <span
                        className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                        style={{ background: "#ecfdf5", color: "#065f46" }}
                      >
                        {p.defaultDiscount}%
                      </span>
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </td>
                  <td
                    className={`px-4 py-2.5 text-right font-bold tabular-nums ${p.stockQty === 0
                        ? "text-rose-600"
                        : p.stockQty <= p.minStockLevel
                          ? "text-amber-600"
                          : "text-slate-700"
                      }`}
                  >
                    {p.stockQty}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={() => openEdit(p)}
                      className="mr-3 text-xs font-semibold text-indigo-600 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setConfirmDelete(p)}
                      className="text-xs font-semibold text-rose-500 hover:underline"
                    >
                      Deactivate
                    </button>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No products found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Product modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => setModalOpen(false)}
        >
          <form
            onSubmit={handleSubmit}
            onClick={(e) => e.stopPropagation()}
            className="animate-scale-in w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
            style={{ maxHeight: "90vh" }}
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">
                {editing ? "Edit Product" : "Add New Product"}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
                  <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <FormField label="Product Name *">
                <input
                  required
                  placeholder="e.g. Organic Green Tea 50g"
                  value={form.name}
                  onChange={(e) => f("name", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100"
                />
              </FormField>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="SKU *">
                  <input
                    required
                    placeholder="e.g. TEA-001"
                    value={form.sku}
                    onChange={(e) => f("sku", e.target.value.toUpperCase())}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
                  />
                </FormField>
                <FormField label="Barcode">
                  <input
                    placeholder="Optional"
                    value={form.barcode}
                    onChange={(e) => f("barcode", e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
                  />
                </FormField>
              </div>

              <FormField label="Category *">
                <input
                  required
                  placeholder="e.g. Beverages"
                  value={form.category}
                  onChange={(e) => f("category", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
                />
              </FormField>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField label="Selling Price *">
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={form.sellingPrice}
                    onChange={(e) => f("sellingPrice", e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
                  />
                </FormField>
                <FormField label="Purchase Price *">
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={form.purchasePrice}
                    onChange={(e) => f("purchasePrice", e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
                  />
                </FormField>
                <FormField label="Tax / GST %">
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="100"
                    value={form.taxPercent}
                    onChange={(e) => f("taxPercent", e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
                  />
                </FormField>
                <FormField
                  label="Default Discount %"
                  hint="Auto-fills at POS for old/slow stock"
                >
                  <input
                    type="number"
                    step="1"
                    min="0"
                    max="100"
                    value={form.defaultDiscount}
                    onChange={(e) => f("defaultDiscount", e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
                  />
                </FormField>
                <FormField label="Min Stock Level">
                  <input
                    type="number"
                    min="0"
                    value={form.minStockLevel}
                    onChange={(e) => f("minStockLevel", e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
                  />
                </FormField>
                {!editing && (
                  <FormField label="Opening Stock Qty">
                    <input
                      type="number"
                      min="0"
                      value={form.stockQty}
                      onChange={(e) => f("stockQty", e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
                    />
                  </FormField>
                )}
              </div>

              <FormField label="Product Image">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => f("image", e.target.files[0])}
                  className="w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100"
                />
              </FormField>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg, #6366f1, #4f46e5)",
                  boxShadow: "0 4px 12px rgba(99,102,241,0.3)",
                }}
              >
                {submitting ? "Saving…" : editing ? "Save Changes" : "Create Product"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Confirm deactivate dialog */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => setConfirmDelete(null)}
        >
          <div
            className="animate-scale-in w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl"
              style={{ background: "#fff1f2" }}
            >
              <svg viewBox="0 0 20 20" fill="#ef4444" className="w-6 h-6">
                <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-slate-900">Deactivate Product?</h3>
            <p className="mt-1.5 text-sm text-slate-500">
              <strong>{confirmDelete.name}</strong> will be hidden from POS billing. Historical
              sales records are preserved.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeactivate(confirmDelete)}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 transition-colors"
              >
                Deactivate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
