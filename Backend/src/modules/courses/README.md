# Courses Module

This module manages the paid-course catalog, recommends courses from an interview's skill gaps, and creates payment sessions through a pluggable payment layer.

## Endpoints (all need `Authorization: Bearer <token>`)

| Method | Path | Who | Notes |
|--------|------|-----|-------|
| GET | `/api/courses` | any user | `?skillTag=&limit=50&offset=0`. The tag filter ignores case |
| GET | `/api/courses/recommend/:interviewId` | interview owner / staff | Top 5 courses for a **completed** interview (otherwise 409) |
| GET | `/api/courses/:id` | any user | |
| POST | `/api/courses` | **admin** | `{ title, skillTag, price, currency?, url, description? }`. A duplicate title returns 409 |
| PATCH | `/api/courses/:id` | **admin** | Any subset of the fields above |
| DELETE | `/api/courses/:id` | **admin** | Returns 204 |
| POST | `/api/courses/:id/checkout` | any user | Returns a payment session (mock provider). Free courses return 400 |

**Creating an admin:** `/auth/register` only accepts the `candidate` and `recruiter` roles. Create or promote an admin with:
```bash
ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD='S3cure!pass' npm run create:admin
```

## How recommendations work
1. **Exact match:** each skill gap in `interviews.skill_gaps` is compared with `Course.skillTag`, ignoring case and punctuation (so `"node js"` matches `"Node.js"`).
2. **Semantic fallback:** gaps with no exact match go to Gemini (`GEMINI_FAST_MODEL`) together with the list of catalog tags. The response schema restricts the answer to **real catalog tags or `NONE`**, so the model can't invent a course. Each match comes with a one-sentence reason.
3. **Ranking:** gaps keep the evaluator's priority order. The list cycles through the gaps so one gap can't fill every slot. Within a gap, exact matches come before semantic ones, then cheaper courses first. The result is capped at 5.

Response:
```json
{
  "interviewId": "…",
  "skillGaps": ["React", "Distributed Systems"],
  "semanticMatching": "ok | mock | skipped | unavailable",
  "unmatchedGaps": [],
  "recommendations": [
    { "course": { "id", "title", "skillTag", "price", "currency", "url", "description" },
      "matchedGap": "React", "matchType": "exact | semantic",
      "why": "Directly targets \"React\", a skill gap identified in your interview." }
  ]
}
```
If Gemini fails, the endpoint still returns 200 with exact matches only and `semanticMatching: "unavailable"`.

## Checkout (placeholder)
`src/services/payments/` uses the same driver pattern as the storage layer. `PAYMENT_PROVIDER=mock` (the default) returns:
```json
{ "provider": "mock", "orderId": "order_…", "providerOrderId": "mock_…",
  "paymentLink": "<CLIENT_URL>/checkout/mock?orderId=…", "amount": 1999, "currency": "USD",
  "status": "created", "expiresAt": "…" }
```
`amount` is in the currency's **smallest unit** (cents or paise), which both Razorpay and Stripe require.

**To go live:**
1. Add `razorpay.provider.js` (Orders API or Payment Links) or `stripe.provider.js` (Checkout Sessions) with the same `createCheckout(order)` function.
2. Register the provider in `services/payments/index.js`.
3. Set `PAYMENT_PROVIDER` and the provider keys.
4. Add an `Order` table (`created → paid / failed`).
5. Add a webhook route that **verifies the provider's signature** before giving the user access. Never trust a "payment done" message from the client.

## Data
`courses`: `id, title (unique), skill_tag, price DECIMAL(8,2), currency (ISO 4217, default USD), url, description`.
`price` is returned as a JS number. Seed the catalog with `npm run seed:courses`.

## Tests
```bash
npm run test:courses   # Postgres only, mocked Gemini
```
