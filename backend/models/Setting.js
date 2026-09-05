const mongoose = require("mongoose");

const settingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// Helper method to retrieve setting value by key with fallback
settingSchema.statics.get = async function (key, defaultValue = null) {
  const doc = await this.findOne({ key });
  return doc ? doc.value : defaultValue;
};

// Helper method to set setting value by key
settingSchema.statics.set = async function (key, value, updatedBy = null) {
  return await this.findOneAndUpdate(
    { key },
    { value, updatedBy },
    { new: true, upsert: true }
  );
};

module.exports = mongoose.model("Setting", settingSchema);
