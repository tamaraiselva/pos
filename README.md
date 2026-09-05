# Mini Cloud-Based POS System with AI-Powered Business Insights

A full MERN-stack point-of-sale system: JWT-authenticated admin/cashier roles, product
management, POS billing, race-safe inventory, sales/invoices, returns, an admin
dashboard, and four AI features grounded in real MongoDB data.

## Stack

- **Frontend:** React 19 (Vite), Redux Toolkit, React Router, Tailwind CSS v4, Recharts, Axios
- **Backend:** Node.js, Express, MongoDB (Mongoose), JWT (HttpOnly cookies), bcryptjs
- **AI:** OpenAI (`gpt-4o-mini` by default) via backend-only tool-calling and summarization

## Project Structure

```
pos/
├── backend/          # Express API, MongoDB models, AI services
├── frontend/         # React (Vite) SPA
├── docs/             # Schema, AI architecture, concurrency writeups, Postman collection
└── mongodb.cfg       # Local MongoDB single-node replica-set config (dev convenience)
```

## Prerequisites

- Node.js 18+
- A MongoDB instance **configured as a replica set** (required for multi-document
  transactions used by the sale/return logic — see `docs/CONCURRENCY.md`).
  - **Recommended:** [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) free (M0) tier —
    it is a replica set by default, zero local setup.
  - **Local alternative:** MongoDB Community Server run with `--replSet rs0`, then
    `rs.initiate()` once. This repo includes `mongodb.cfg` and
    `backend/scripts/initReplica.js` for exactly this (see below).
- An OpenAI API key ([platform.openai.com/api-keys](https://platform.openai.com/api-keys))

## Setup

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
```

Fill in `.env`:

```
MONGO_URI=mongodb://127.0.0.1:27017/pos?replicaSet=rs0   # or your Atlas URI
JWT_SECRET=<generate with: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))">
OPENAI_API_KEY=sk-...
```

**If running MongoDB locally** (instead of Atlas), start it as a single-node replica set,
then initialize it once:

```bash
# from the repo root, adjust the mongod path for your install
"C:\Program Files\MongoDB\Server\<version>\bin\mongod.exe" --config mongodb.cfg
node backend/scripts/initReplica.js   # one-time: rs.initiate()
```

Start the API:

```bash
npm run dev      # nodemon, http://localhost:5000
```

**Create your first admin account.** There is no public registration endpoint —
by design, only an existing admin can create new users (via the Users page or
`POST /api/users`), so the very first account has to come from this one-time script:

```bash
node scripts/createAdmin.js --name "Your Name" --email you@example.com --password "YourPassword123"
```

Log in with those credentials, then use the **Users** page (admin-only) to create
cashier accounts or additional admins — everything from that point on goes through
the real app, no scripts required.

**Optional: load sample data.** The database starts empty — you add real products
through the admin UI as you go. If you want a populated demo (28 products across 5
categories + 60 days of realistic historical sales, so AI Sales Insights/Forecast/
Recommendations have something to analyze), run this any time after creating your
first user:

```bash
npm run load-sample-data
```

This only touches Products/Sales/Returns/Inventory — it never creates or modifies
user accounts, and it's never required for the app to function.

Prove the oversell-prevention design works under concurrent load (see
`docs/CONCURRENCY.md`) — this is fully self-contained and needs no setup:

```bash
npm run test:concurrency
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev       # http://localhost:5173
```

The Vite dev server proxies `/api` and `/uploads` to `http://localhost:5000`, so the
frontend and backend share cookies with zero CORS configuration in dev.

Log in at `http://localhost:5173/login` with the admin account you created above.

## Feature Checklist

| Area | Status |
|---|---|
| Auth (JWT, HttpOnly cookies, admin/cashier roles) | ✅ |
| User management (admin creates/deactivates admin & cashier accounts) | ✅ |
| Product management (CRUD, search/filter, image upload) | ✅ |
| POS billing (cart, discount, tax, cash/UPI/card, invoice) | ✅ |
| Inventory (low/out-of-stock, adjustment history, oversell prevention) | ✅ |
| Old-stock clearance discounts (derived live from stock/min-level ratio, never hardcoded) | ✅ |
| Sales & invoices (view/print) | ✅ |
| Sales history (search/filter by date + payment method) | ✅ |
| Returns (partial returns, refund calc, original invoice preserved) | ✅ |
| Admin dashboard (today's sales, 7-day chart, payment breakdown) | ✅ |
| AI Sales Insights | ✅ |
| AI Business Q&A (tool-calling, grounded) | ✅ |
| AI Inventory Recommendations | ✅ |
| AI Sales Forecast (deterministic trend + AI narration) | ✅ |

All 4 AI features are implemented (the brief requires a minimum of 2).

## Documentation

- [`frontend/docs/SCHEMA.md`](frontend/docs/SCHEMA.md) — MongoDB models, fields, indexes
- [`frontend/docs/AI_ARCHITECTURE.md`](frontend/docs/AI_ARCHITECTURE.md) — how each AI feature is grounded in real data
- [`frontend/docs/CONCURRENCY.md`](frontend/docs/CONCURRENCY.md) — how overselling is prevented under concurrent sales
- [`frontend/docs/postman_collection.json`](frontend/docs/postman_collection.json) — importable Postman collection for every endpoint

## Security Notes

- Passwords are hashed with bcrypt; JWTs live in HttpOnly, `SameSite=Strict` cookies — never in localStorage.
- The OpenAI API key is used **only** on the backend; it is never sent to or bundled into the frontend.
- All mutating routes validate input with `express-validator`; all totals (tax, discount, grand total) are recalculated server-side from the database, never trusted from the client.
- Rate limiting is applied to `/api/auth/login`.
- Security headers via `helmet`.
- No public registration endpoint — user creation is admin-only (`POST /api/users`), and an admin can neither deactivate their own account nor remove the last active admin, so the system can never be left without one.
