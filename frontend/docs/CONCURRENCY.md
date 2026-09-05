# Stock & Concurrency Design

## The Problem

Two cashiers must not be able to both sell the last unit of a product. The brief's
worked examples (§6, §9, §14) require:

- Stock 20 → sell 3 → stock 17
- Stock 10 → sell 3 → stock 7 → return 2 → stock 9
- A sale must never be recorded without the corresponding stock decrement actually
  succeeding, and a failed sale must never touch stock at all.

## The Design: Atomic Conditional Updates + Transactions

Every stock mutation in `services/saleService.js` and `services/returnService.js`
uses this pattern for each line item:

```js
const updated = await Product.findOneAndUpdate(
  { _id: product._id, stockQty: { $gte: qty } },   // condition checked AND applied atomically
  { $inc: { stockQty: -qty } },
  { new: true, session }
);
if (!updated) throw new ApiError(409, `Insufficient stock for "${product.name}"`);
```

`findOneAndUpdate` with a filter on the *current* value (`stockQty: { $gte: qty }`) is
a single atomic operation at the MongoDB storage-engine level — there is no
read-then-write race window. If two requests race for the same product's last unit,
MongoDB serializes the two `findOneAndUpdate` calls; only one can match the filter
after the first one decrements the stock, so the second gets `null` back and the sale
is rejected with a `409`. This holds **even without a transaction** — it's correct on
a single document by construction.

Transactions are layered on top for a different reason: **multi-document
consistency**. A sale touches three collections — `Product` (stock), `Sale` (the
invoice), and `InventoryLog` (the audit trail) — and a return additionally touches the
original `Sale` document (`items[].returnedQty`). Both `saleService.createSale` and
`returnService.createReturn` wrap all of these writes in a single
`session.withTransaction(...)` block:

- If any line item's atomic stock check fails partway through a multi-item sale, the
  whole transaction aborts — line items already decremented in this same transaction
  are rolled back automatically. A sale is never partially applied.
- If the process crashes between writing the `Sale` and writing the `InventoryLog`
  entries, the transaction guarantees neither is committed — there's no window where
  a sale exists without its matching stock/log changes, or vice versa.

This requires MongoDB to be a replica set (even a single-node one) — see the README's
setup section for how that's configured (`mongodb.cfg` + `initReplica.js`, or just use
MongoDB Atlas, which is a replica set out of the box).

## Proof: `backend/scripts/concurrencyTest.js`

Rather than just asserting this is correct, the repo includes a script that proves it:

1. Creates a throwaway product with `stockQty = 1`.
2. Fires **10 concurrent** `saleService.createSale()` calls, each trying to buy 1 unit.
3. Asserts: exactly 1 succeeds, the other 9 fail with `"Insufficient stock"`, the
   product's final `stockQty` is exactly `0` (never negative), and exactly 1 `Sale`
   document was created against that product (never more).

Run it with:

```bash
cd backend
npm run test:concurrency
```

Actual output from a run against this implementation:

```
Firing 10 concurrent "buy 1 unit" requests...

Results: 1 succeeded, 9 failed.
Final stockQty: 0 (expected 0)
Sale documents created against this product: 1 (expected 1)
  rejected: Insufficient stock for "__concurrency_test_product__"
  rejected: Insufficient stock for "__concurrency_test_product__"
  rejected: Insufficient stock for "__concurrency_test_product__"

PASS: no overselling occurred under concurrent load.
```

## Returns Use the Same Pattern

`returnService.createReturn` restores stock with the mirror-image atomic update
(`$inc: { stockQty: qty }`) inside its own transaction, and validates the requested
return quantity against `line.qty - line.returnedQty` (not just `line.qty`) so a
product can't be returned more times than it was actually sold — including across
multiple partial returns on the same invoice. The original sale's `qty`, `price`,
`discount`, and `lineTotal` are never mutated; only `returnedQty` is incremented, so
the original invoice is always reconstructable exactly as issued.
