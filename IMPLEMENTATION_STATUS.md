# Implementation Status

A plain-language explanation of what's actually working right now, why it
works without any API keys configured yet, and what each piece of the UI
does.

## Why does it "work" without Rain/Monad API keys?

Everything you see right now is running on **mocked/simulated data** — no
real calls to Rain, Monad, Amazon, Walmart, UPS, FedEx, etc. are being made.

- Product prices, retailer names, and shipping costs come from a hardcoded
  seed file: `src/backend/data/mockData.ts`.
- The `/api/checkout` route does **not** call Rain — it just returns a fake
  "confirmed" response immediately (see `src/app/api/checkout/route.ts`).
  There's a `TODO(backend)` comment there marking exactly where real Rain
  calls need to go.
- `src/backend/rain/client.ts` and `src/backend/monad/client.ts` are stub
  files. They read your API key / user ID / team ID / collateral contract
  ID from environment variables, but the actual functions
  (`issueScopedCard`, `executePurchase`, `checkSpendPolicy`) just throw a
  "not implemented yet" error if called — and right now, nothing calls
  them yet.

**In short: this is a working prototype of the UI and pricing logic, wired
up to fake data, so the frontend and backend can be built and demoed in
parallel before real integrations exist.** Once your Rain keys are added to
`.env.local` and the backend implements the TODOs, real purchases can be
wired in without changing the frontend at all (same API contract).

## What's implemented

- ✅ Marketplace page (`/`) — grid of products, each with an image, a "Check
  price" button, and a "Buy now" button.
- ✅ Retailer dashboard (`/dashboard`) — internal table view showing every
  mocked retailer/carrier price combination per product.
- ✅ Arbitrage engine (`src/backend/services/arbitrageEngine.ts`) — for a
  given product, computes the cheapest total (product price + shipping)
  across all mocked retailer × carrier combinations, and applies a 12%
  margin to produce the price shown to the user.
- ✅ Quantity-mismatch detection — if the cheapest option is a multi-pack
  (e.g. a 4-pack of toothpaste) but you only want 1, the UI shows a message
  asking if you'd accept paying for the pack instead.
- ✅ 12 sample products with placeholder images (see "About the images"
  below).
- ✅ API routes: `/api/products`, `/api/quote`, `/api/checkout`,
  `/api/dashboard` — all backed by mocked data.
- ❌ Not implemented: real Rain card issuance/purchase execution, real Monad
  spend-policy checks, real retailer/shipping APIs, user accounts/auth,
  multi-agent competition, reward payouts.

## What happens when you click "Check price" then "Buy now"

1. **"Check price"** calls `GET /api/quote?productId=...` which runs the
   arbitrage engine against the mocked data and returns:
   - a single price (landed cost + margin), and
   - an estimated delivery date, and
   - a quantity-mismatch prompt if applicable.
2. **"Buy now"** calls `POST /api/checkout`, which currently just looks up
   the cheapest mocked quote and returns a fake `orderId` and
   `status: "confirmed"` — no money moves, no Rain card is issued, no real
   purchase happens. It's there so the full user flow (browse → price →
   buy → confirmation) can be demoed end-to-end while the real payment
   integration is being built.

## About the images

Product images currently come from
[placehold.co](https://placehold.co) — a free placeholder-image service
that generates a colored box with the product name on it (no API key
required, no images to source/host). They're stand-ins so every product
has *something* in the grid. To use real photos:

- Replace `imageUrl` values in `src/backend/data/mockData.ts` with real
  image URLs (e.g. from a stock photo site, your own uploads in `public/`,
  or images returned by a real retailer API later).

## Next steps to make this "real"

1. Add your Rain API key, user ID, team ID, and collateral contract ID to
   `.env.local` (see `.env.example`).
2. Implement `issueScopedCard` and `executePurchase` in
   `src/backend/rain/client.ts`, and call them from
   `src/app/api/checkout/route.ts` instead of returning a fake result.
3. Implement `checkSpendPolicy` in `src/backend/monad/client.ts` if you want
   on-chain spend-limit enforcement before a purchase goes through.
4. Replace the mocked retailer/shipping data with real pricing sources once
   you have them.
