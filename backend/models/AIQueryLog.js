const mongoose = require("mongoose");

const aiQueryLogSchema = new mongoose.Schema(
  {
    feature: {
      type: String,
      enum: ["insights", "ask", "inventory_recommendations", "forecast"],
      required: true,
    },
    question: { type: String, default: null },
    toolCalls: { type: [String], default: [] },
    answer: { type: String, required: true },
    askedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

aiQueryLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model("AIQueryLog", aiQueryLogSchema);
