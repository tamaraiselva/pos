import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  items: [], // { productId, name, sku, sellingPrice, taxPercent, stockQty, qty, discountPercent }
  paymentMethod: "cash",
  customerName: "",
  customerPhone: "",
};

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    addItem: (state, action) => {
      const product = action.payload;
      const existing = state.items.find((i) => i.productId === product._id);
      if (existing) {
        if (existing.qty < product.stockQty) existing.qty += 1;
        return;
      }
      if (product.stockQty <= 0) return;
      state.items.push({
        productId: product._id,
        name: product.name,
        sku: product.sku,
        sellingPrice: product.sellingPrice,
        taxPercent: product.taxPercent,
        stockQty: product.stockQty,
        qty: 1,
        // Pre-filled from the product's admin-configured default (%) so cashiers
        // don't have to type the same discount in on every single sale.
        discountPercent: product.defaultDiscount || 0,
      });
    },
    incrementQty: (state, action) => {
      const item = state.items.find((i) => i.productId === action.payload);
      if (item && item.qty < item.stockQty) item.qty += 1;
    },
    decrementQty: (state, action) => {
      const item = state.items.find((i) => i.productId === action.payload);
      if (item) item.qty = Math.max(1, item.qty - 1);
    },
    setQty: (state, action) => {
      const { productId, qty } = action.payload;
      const item = state.items.find((i) => i.productId === productId);
      if (item) item.qty = Math.min(Math.max(1, qty), item.stockQty || qty);
    },
    setItemDiscount: (state, action) => {
      const { productId, discountPercent } = action.payload;
      const item = state.items.find((i) => i.productId === productId);
      if (item) item.discountPercent = Math.max(0, Math.min(100, Number(discountPercent) || 0));
    },
    removeItem: (state, action) => {
      state.items = state.items.filter((i) => i.productId !== action.payload);
    },
    setPaymentMethod: (state, action) => {
      state.paymentMethod = action.payload;
    },
    setCustomer: (state, action) => {
      state.customerName = action.payload.name ?? state.customerName;
      state.customerPhone = action.payload.phone ?? state.customerPhone;
    },
    clearCart: () => initialState,
  },
});

export const {
  addItem,
  incrementQty,
  decrementQty,
  setQty,
  setItemDiscount,
  removeItem,
  setPaymentMethod,
  setCustomer,
  clearCart,
} = cartSlice.actions;

export function selectCartTotals(state) {
  let subtotal = 0;
  let discountTotal = 0;
  let taxTotal = 0;
  let grandTotal = 0;

  for (const item of state.cart.items) {
    const lineGross = item.sellingPrice * item.qty;
    const lineDiscount = lineGross * (item.discountPercent / 100);
    const lineSubtotal = Math.max(0, lineGross - lineDiscount);
    const lineTax = lineSubtotal * (item.taxPercent / 100);
    subtotal += lineGross;
    discountTotal += lineDiscount;
    taxTotal += lineTax;
    grandTotal += lineSubtotal + lineTax;
  }

  const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
  return {
    subtotal: round2(subtotal),
    discountTotal: round2(discountTotal),
    taxTotal: round2(taxTotal),
    grandTotal: round2(grandTotal),
  };
}

export default cartSlice.reducer;
