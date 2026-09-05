const Counter = require("../models/Counter");

/**
 * Atomically generates a sequential, date-prefixed invoice number, e.g. INV-20260904-0007.
 * Uses a single-document atomic $inc so it is safe under concurrent sale creation.
 */
async function nextInvoiceNumber(session) {
  const today = new Date();
  const datePart = today.toISOString().slice(0, 10).replace(/-/g, "");
  const counterId = `invoice-${datePart}`;

  const options = session ? { new: true, upsert: true, session } : { new: true, upsert: true };
  const counter = await Counter.findOneAndUpdate(
    { _id: counterId },
    { $inc: { seq: 1 } },
    options
  );

  return `INV-${datePart}-${String(counter.seq).padStart(4, "0")}`;
}

module.exports = nextInvoiceNumber;
