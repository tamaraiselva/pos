const mongoose = require("mongoose");

/**
 * Executes a callback within a MongoDB transaction if the connected MongoDB instance
 * supports transactions (i.e. Replica Set or Mongos).
 * 
 * If MongoDB is running in standalone mode (which throws MongoServerError code 20 / IllegalOperation),
 * it gracefully falls back to executing the operations sequentially without a transaction session.
 * Single-document atomic updates (such as $inc with conditional queries) still guarantee race-safety.
 * 
 * @param {Function} fn - Async function taking (session) => Promise<any>
 * @returns {Promise<any>} Result of fn
 */
async function runInTransaction(fn) {
  let session = null;
  try {
    session = await mongoose.startSession();
  } catch (err) {
    // If sessions are completely unsupported by the driver/server version, run without session
    return await fn(null);
  }

  try {
    let result;
    let transactionError = null;

    try {
      await session.withTransaction(async () => {
        result = await fn(session);
      });
      return result;
    } catch (err) {
      transactionError = err;
    }

    // Check if error is due to MongoDB running as a standalone server without replica set
    const isStandaloneError =
      transactionError &&
      (transactionError.code === 20 ||
        transactionError.codeName === "IllegalOperation" ||
        (transactionError.errmsg && transactionError.errmsg.includes("Transaction numbers are only allowed")) ||
        (transactionError.message && transactionError.message.includes("Transaction numbers are only allowed")));

    if (isStandaloneError) {
      // Standalone MongoDB detected — execute operations directly without transaction session
      return await fn(null);
    } else {
      // Re-throw domain or validation errors (e.g. ApiError 409 Insufficient stock, validation errors)
      throw transactionError;
    }
  } finally {
    if (session) {
      try {
        await session.endSession();
      } catch (e) {
        // ignore session termination errors
      }
    }
  }
}

module.exports = { runInTransaction };
