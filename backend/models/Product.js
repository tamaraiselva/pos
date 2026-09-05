const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    sku: { type: String, required: true, unique: true, trim: true, uppercase: true },
    barcode: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
      default: undefined,
    },
    category: { type: String, required: true, trim: true, index: true },
    sellingPrice: { type: Number, required: true, min: 0 },
    purchasePrice: { type: Number, required: true, min: 0 },
    taxPercent: { type: Number, required: true, min: 0, max: 100, default: 0 },
    // Percentage, not a dollar amount. 0 = no default discount; commonly used for
    // old/slow-moving stock clearance (typically 1-10%, but not enforced — admin can
    // set any value 0-100). Auto-fills the cart's per-line discount % when this
    // product is added at POS Billing.
    defaultDiscount: { type: Number, required: true, min: 0, max: 100, default: 0 },
    stockQty: { type: Number, required: true, min: 0, default: 0 },
    minStockLevel: { type: Number, required: true, min: 0, default: 5 },
    imageUrl: { type: String, default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

productSchema.index({ name: "text", sku: "text", barcode: "text" });
productSchema.index({ stockQty: 1, minStockLevel: 1 });

module.exports = mongoose.model("Product", productSchema);
