const Product = require("../models/Product");

const OLD_STOCK_RATIO_THRESHOLD = 3; // stock at 3x+ its minimum level is treated as overstocked/aging
const OLD_STOCK_MAX_DISCOUNT = 10;

/**
 * Derives a suggested clearance discount (0, or 1-10%) purely from a product's own
 * stockQty vs minStockLevel — never from a hardcoded name or list. A product sitting
 * at several times its reorder threshold is a reasonable proxy for "old stock" that
 * isn't moving; the more overstocked it is, the larger the suggested discount,
 * capped at 10%.
 */
function computeOldStockDiscount({ stockQty, minStockLevel }) {
  if (!minStockLevel) return 0;
  const ratio = stockQty / minStockLevel;
  if (ratio < OLD_STOCK_RATIO_THRESHOLD) return 0;
  return Math.min(OLD_STOCK_MAX_DISCOUNT, Math.max(1, Math.round(ratio)));
}

/**
 * Reads every active product straight from MongoDB, computes each one's old-stock
 * discount from its current stock numbers, and writes the result back to that same
 * product document. Safe to re-run at any time — e.g. after new stock arrives, a
 * product's numbers naturally fall out of "old stock" and its discount is cleared
 * back to 0 on the next run.
 */
async function applyOldStockDiscounts() {
  const products = await Product.find({ isActive: true }).select("name stockQty minStockLevel defaultDiscount");

  const updates = [];
  for (const product of products) {
    const discount = computeOldStockDiscount(product);
    if (discount !== product.defaultDiscount) {
      updates.push({
        updateOne: {
          filter: { _id: product._id },
          update: { $set: { defaultDiscount: discount } },
        },
      });
    }
  }

  if (updates.length > 0) {
    await Product.bulkWrite(updates);
  }

  const flagged = products
    .map((p) => ({ id: p._id, name: p.name, discount: computeOldStockDiscount(p) }))
    .filter((p) => p.discount > 0);

  return { scanned: products.length, updated: updates.length, flagged };
}

module.exports = { computeOldStockDiscount, applyOldStockDiscounts };
