const mongoose = require("mongoose");

const returnItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    name: { type: String, required: true },
    qty: { type: Number, required: true, min: 1 },
    refundAmount: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const returnSchema = new mongoose.Schema(
  {
    sale: { type: mongoose.Schema.Types.ObjectId, ref: "Sale", required: true },
    invoiceNumber: { type: String, required: true },
    items: { type: [returnItemSchema], required: true, validate: (v) => v.length > 0 },
    totalRefund: { type: Number, required: true, min: 0 },
    reason: { type: String, default: "" },
    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

returnSchema.index({ sale: 1 });
returnSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Return", returnSchema);
