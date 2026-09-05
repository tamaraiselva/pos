const mongoose = require("mongoose");

const saleItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    name: { type: String, required: true },
    sku: { type: String, required: true },
    qty: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
    taxPercent: { type: Number, required: true, min: 0 },
    // discountPercent is the rate the cashier/product applied (0-100, e.g. old-stock
    // clearance at 1-10%); discount is the resulting dollar amount computed from it —
    // the invoice always shows a hard dollar figure, discountPercent is context for it.
    discountPercent: { type: Number, required: true, min: 0, max: 100, default: 0 },
    discount: { type: Number, required: true, min: 0, default: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
    returnedQty: { type: Number, required: true, min: 0, default: 0 },
  },
  { _id: false }
);

const saleSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true },
    cashier: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    customer: {
      name: { type: String, default: null },
      phone: { type: String, default: null },
    },
    items: { type: [saleItemSchema], required: true, validate: (v) => v.length > 0 },
    subtotal: { type: Number, required: true, min: 0 },
    discountTotal: { type: Number, required: true, min: 0 },
    taxTotal: { type: Number, required: true, min: 0 },
    grandTotal: { type: Number, required: true, min: 0 },
    paymentMethod: { type: String, enum: ["cash", "upi", "card"], required: true },
    status: {
      type: String,
      enum: ["completed", "partially_returned", "returned"],
      default: "completed",
    },
  },
  { timestamps: true }
);

saleSchema.index({ createdAt: -1 });
saleSchema.index({ paymentMethod: 1, createdAt: -1 });

module.exports = mongoose.model("Sale", saleSchema);
