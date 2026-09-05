# MongoDB Schema Reference

All models are Mongoose schemas under `backend/models/`. All use `{ timestamps: true }`
unless noted, giving every document `createdAt`/`updatedAt`.

## User

| Field | Type | Notes |
|---|---|---|
| `name` | String | required |
| `email` | String | required, unique, lowercased |
| `passwordHash` | String | required, bcrypt hash, `select: false` (never returned by default) |
| `role` | String | enum `admin` \| `cashier`, required |
| `isActive` | Boolean | default `true` — soft-disable instead of deleting |

**Indexes:** `email` unique.

Created via `POST /api/users` (admin-only — no public registration) or the one-time
`backend/scripts/createAdmin.js` bootstrap script for the very first account. `PUT
/api/users/:id` (admin-only) can change `role`/`isActive`, blocking two cases: an
admin deactivating their own account, and removing the last active admin entirely.

## Product

| Field | Type | Notes |
|---|---|---|
| `name` | String | required |
| `sku` | String | required, unique, uppercased |
| `barcode` | String | unique, sparse (optional — only enforced unique when present) |
| `category` | String | required, indexed |
| `sellingPrice` / `purchasePrice` | Number | required, ≥ 0 |
| `taxPercent` | Number | 0–100, default 0 |
| `defaultDiscount` | Number | percentage, 0–100, default 0 — admin can set any value manually, or `POST /api/inventory/apply-old-stock-discounts` (`services/oldStockService.js`) derives it automatically from `stockQty`/`minStockLevel` (never hardcoded per-product); auto-fills the cart's per-line discount % at POS Billing so cashiers don't re-enter it on every sale |
| `stockQty` | Number | required, ≥ 0 — current stock |
| `minStockLevel` | Number | required, ≥ 0 — low-stock threshold |
| `imageUrl` | String | path under `/uploads/products/`, nullable |
| `isActive` | Boolean | default `true` — soft delete |

**Indexes:** `sku` unique, `barcode` unique+sparse, text index on `name`/`sku`/`barcode`
(search), compound `{stockQty, minStockLevel}` (low-stock queries).

## Sale (invoice)

| Field | Type | Notes |
|---|---|---|
| `invoiceNumber` | String | required, unique — `INV-YYYYMMDD-NNNN`, generated atomically (see `utils/invoiceNumber.js`) |
| `cashier` | ObjectId → User | required |
| `customer.name` / `customer.phone` | String | optional |
| `items[]` | subdocument array | see below |
| `subtotal` / `discountTotal` / `taxTotal` / `grandTotal` | Number | computed server-side at sale time, never trusted from the client |
| `paymentMethod` | String | enum `cash` \| `upi` \| `card` |
| `status` | String | enum `completed` \| `partially_returned` \| `returned` |

**Sale item subdocument** (`items[]`): `product` (ref), `name`, `sku` (snapshotted at
sale time — a later product rename/re-SKU doesn't rewrite history), `qty`, `price`,
`taxPercent`, `discountPercent` (the rate applied, 0–100 — from the product's
`defaultDiscount` or a cashier override), `discount` (the resulting dollar amount,
computed server-side from `discountPercent` — this is what the invoice math and
printed receipt use), `lineTotal`, `returnedQty` (starts at 0, incremented by
returns — the original `qty`/`price`/`discountPercent`/`discount`/`lineTotal` are
never mutated, so the invoice stays exactly as issued).

**Indexes:** `invoiceNumber` unique, `createdAt` desc (history/date-range queries),
compound `{paymentMethod, createdAt}`.

## Return

| Field | Type | Notes |
|---|---|---|
| `sale` | ObjectId → Sale | required |
| `invoiceNumber` | String | denormalized copy of the original invoice number, for fast lookup |
| `items[]` | `{product, name, qty, refundAmount}` | one entry per returned line |
| `totalRefund` | Number | sum of `refundAmount` |
| `reason` | String | optional, free text |
| `processedBy` | ObjectId → User | required |

**Indexes:** `sale`, `createdAt` desc.

## InventoryLog

An append-only ledger of every stock change — the audit trail behind the Inventory
page's "History" view.

| Field | Type | Notes |
|---|---|---|
| `product` | ObjectId → Product | required |
| `changeQty` | Number | signed: positive = stock increase, negative = decrease |
| `reason` | String | enum `sale` \| `return` \| `manual` \| `restock` |
| `refId` | ObjectId | the Sale or Return `_id` that caused this change, if any |
| `balanceAfter` | Number | resulting `stockQty`, captured at write time |
| `note` | String | free text (e.g. "Opening stock", "damaged goods") |
| `createdBy` | ObjectId → User | required |

**Indexes:** compound `{product, createdAt desc}`.

## AIQueryLog

Audit trail for AI feature usage — every summary/answer produced is logged.

| Field | Type | Notes |
|---|---|---|
| `feature` | String | enum `insights` \| `ask` \| `inventory_recommendations` \| `forecast` |
| `question` | String | the admin's question, for `ask` only |
| `toolCalls` | String[] | which whitelisted tools the model invoked, for `ask` |
| `answer` | String | the AI's final text response |
| `askedBy` | ObjectId → User | required |

**Indexes:** `createdAt` desc.

## Counter

Internal helper for atomic invoice-number generation — one document per calendar day
(`_id: "invoice-YYYYMMDD"`), incremented via `findOneAndUpdate` + `$inc`, which is
atomic under concurrent writes without needing a lock.

| Field | Type |
|---|---|
| `_id` | String (e.g. `invoice-20260904`) |
| `seq` | Number |
