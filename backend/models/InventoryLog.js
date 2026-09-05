const mongoose = require("mongoose");

const inventoryLogSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    changeQty: { type: Number, required: true }, // positive = stock increase, negative = decrease
    reason: { type: String, enum: ["sale", "return", "manual", "restock"], required: true },
    refId: { type: mongoose.Schema.Types.ObjectId, default: null }, // Sale._id or Return._id
    balanceAfter: { type: Number, required: true, min: 0 },
    note: { type: String, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

inventoryLogSchema.index({ product: 1, createdAt: -1 });

module.exports = mongoose.model("InventoryLog", inventoryLogSchema);
