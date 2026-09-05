# AI Architecture

## Data Flow

Every AI feature follows the same shape, matching the brief's required flow:

```
React → Express route (authenticate + authorize('admin')) → controller
      → fetch/aggregate REAL data from MongoDB (services/aiTools.js, services/forecastService.js)
      → pass that data as context to the OpenAI API (services/aiService.js)
      → AI response → JSON response → React renders it
```

The AI is never the first thing called, and it is never given write access to
anything. It only ever sees data the backend already fetched, and only ever
returns text.

## Where Each Feature's Grounding Data Comes From

| Feature | Endpoint | Real data fetched first | AI's job |
|---|---|---|---|
| Sales Insights | `GET /api/ai/insights` | `getBestSellers()` / `getSlowMovers()` — Mongo aggregation over `Sale.items`, grouped by product | Summarize the numbers in natural language. Cannot introduce products or figures not in the payload. |
| Business Q&A | `POST /api/ai/ask` | Nothing upfront — the model chooses which whitelisted tool(s) to call (see below) | Decide which tool(s) answer the question, then phrase the final answer from the tool results. |
| Inventory Recommendations | `GET /api/ai/inventory-recommendations` | `getLowStockProducts()` + `getBestSellers()` (for 30-day sales velocity per SKU) | Suggest a reorder quantity + one-line reason per product, grounded in the velocity/gap numbers given. |
| Sales Forecast | `GET /api/ai/forecast` | `forecastService.buildSalesForecast()` — a **deterministic linear regression** over 60 days of real `Sale` totals, computed entirely in Node | Narrate the trend and label it as an estimate. **The AI never generates the forecast numbers themselves** — see below. |

## Why Business Q&A Uses Tool-Calling, Not Free-Form Queries

`services/aiTools.js` defines a small, fixed set of functions — `getBestSellers`,
`getSlowMovers`, `getLowStockProducts`, `getSalesTotal`, `getRevenueByCategory` — each
backed by a real, hand-written Mongo aggregation. These are registered as OpenAI
function-calling tools.

When an admin asks a question, `services/aiService.answerQuestion()`:

1. Sends the question + the tool definitions to the model.
2. The model picks zero or more tools to call and supplies simple parameters (e.g.
   `{ days: 7 }`) — it never writes a query itself.
3. The backend executes the corresponding aggregation for real and returns the
   result to the model as a tool response.
4. The model produces the final answer from those real results. This can loop up to
   4 rounds (e.g. "best-sellers AND revenue by category" triggers two tool calls
   before the final answer).
5. The question, the tools actually invoked, and the final answer are logged to
   `AIQueryLog` for auditability.

This is the standard grounded-agent pattern: the LLM is a **router and narrator**,
never a query generator. It closes off SQL/NoSQL-injection-style risk entirely,
because the only "queries" that ever run are the ones a developer wrote and
whitelisted — the model can only choose *which* of those to run and with what simple
numeric parameters.

## Why the Forecast Isn't LLM-Generated

Sales forecasting is the single biggest hallucination risk in this feature set — an
LLM asked to "predict next week's revenue" will confidently invent plausible-looking
numbers with no real basis. Instead:

- `services/forecastService.js` pulls the last 60 days of real daily revenue from
  `Sale` documents (missing days filled with 0).
- It fits an ordinary least-squares linear regression over that series entirely in
  Node — no AI involved in this step at all.
- It projects the fitted line 7 days forward, clamped at 0.
- **Only then** is the AI given `{ trendDirection, forecast }` and asked to narrate it
  in 2–4 sentences, with an explicit system-prompt instruction to always state these
  are estimates, not guarantees.

The frontend also visually distinguishes the two: history is a solid line, the
forecast segment is a dashed line explicitly labeled "Forecast (estimate)", and the
page carries an "Estimate — not a guarantee" badge.

## Security & Reliability

- **Keys never leave the backend.** `OPENAI_API_KEY` is read only in
  `backend/services/aiService.js` via `process.env`; it is never sent to the React
  app, never appears in any API response, and the frontend has no OpenAI SDK
  dependency at all.
- **No AI-triggered mutations.** Every AI endpoint (`/api/ai/*`) is `GET` or a
  read-only `POST` (`/ask`) — none of them can change stock, price, products, or
  sales. Any change to inventory/sales happens exclusively through the authenticated,
  validated REST endpoints in `saleController`/`returnController`/`inventoryController`,
  which the AI has no path to call.
- **Input validation.** The `/api/ai/ask` question body is validated
  (`express-validator`: string, 3–500 chars) before it ever reaches the model.
- **Timeouts & graceful degradation.** `aiService` sets a 15s request timeout and
  retries once on a 5xx/429. If the AI call still fails, `insights`,
  `inventory-recommendations`, and `forecast` all fall back to returning the raw,
  already-fetched data with `aiUnavailable: true` rather than a hard error — the
  dashboard still shows real numbers even if OpenAI is down.
- **Role-gated.** All `/api/ai/*` routes require `authenticate` + `authorize('admin')`
  — cashiers cannot access any AI feature.
