# Implementation Status

A plain-language explanation of what's actually working right now, why it
works without any API keys configured yet, and what each piece of the UI
does.

## Why does it "work" without Rain/Monad API keys?

Everything you see right now is running on **mocked/simulated data** — no
real calls to Rain, Monad, Amazon, Walmart, UPS, FedEx, etc. are being made.

- Product prices, retailer names, and per-retailer shipping costs come from
  a hardcoded seed file: `src/backend/data/mockData.ts`.
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

- ✅ Marketplace page (`/`) — grid of products. Price and estimated delivery
  load automatically for each product (no "Check price" click needed). The
  only button is **Buy now**.
- ✅ Retailer dashboard (`/dashboard`) — internal table view showing every
  mocked retailer/carrier price combination per product.
- ✅ Arbitrage engine (`src/backend/services/arbitrageEngine.ts`):
  - `getMarketplacePrice` — used for the price shown on page load. Only
    considers single-unit listings (never assumes you want a multi-pack),
    landed cost (price + shipping) + a 12% margin.
  - `checkQuantityMismatch` / `getCheapestOverallQuote` — used **only**
    during the Buy Now / checkout flow. This searches across *all* pack
    sizes, and if the cheapest total lands on a multi-pack bigger than what
    you asked for, checkout pauses and asks you to confirm before charging
    anything.
- ✅ 12 sample products, each with a real photo (see "About the images"
  below) and a live estimated delivery date.
- ✅ API routes: `/api/products`, `/api/quote` (single-unit display price),
  `/api/checkout` (full arbitrage + quantity-mismatch confirmation),
  `/api/dashboard` — all backed by mocked data.
- ❌ Not implemented: real Rain card issuance/purchase execution, real Monad
  spend-policy checks, real retailer/shipping APIs, user accounts/auth,
  multi-agent competition, reward payouts.

## What happens when you click "Buy now"

1. The page already shows a price + estimated delivery for buying **1**
   unit (loaded automatically via `GET /api/quote` when the page renders).
2. Clicking **Buy now** calls `POST /api/checkout`, which is where the
   agent actually runs its full price-comparison search across every
   retailer, pack size, and carrier — this is intentionally a separate,
   heavier search than the quick display price.
3. If the cheapest option found is a multi-pack bigger than what you asked
   for (e.g. the toothpaste demo: Amazon sells a single tube for $2.99, but
   Temu's 4-pack for $7.99 ends up cheaper *in total* once you add
   shipping), checkout pauses and shows a prompt: "Buy the pack" or "No,
   just 1" — no charge happens until you answer.
4. Once resolved (or immediately, if there was no mismatch), checkout
   returns a fake `orderId` and `status: "confirmed"` — no money moves, no
   Rain card is issued yet. It's there so the full user flow (browse →
   price → buy → confirm quantity if needed → confirmation) can be demoed
   end-to-end while the real payment integration is being built.

### Note on multi-pack pricing realism

A multi-pack's raw listing price is always higher than any single-unit
listing price for the same product (buying 4 always costs more than buying
1) — that's enforced in the mock data. What can still make a multi-pack the
overall cheapest choice is **shipping**: each retailer now has its own
shipping options in `mockData.ts`, so it's possible (and realistic) for a
retailer's bulk-shipping rate to undercut another retailer's single-item
shipping rate enough that the pack wins on total landed cost — which is
exactly the scenario the quantity-mismatch prompt is designed to catch.

## About the images

Product images come from [loremflickr.com](https://loremflickr.com) — a
free image service that serves real Flickr photos matching a given tag (no
API key required). Each product's `imageUrl` includes a `?lock=` number so
the same photo shows every time instead of changing on reload. These are
still stand-ins for the demo — swap for real product photos or licensed
stock photos later by updating `imageUrl` in `src/backend/data/mockData.ts`.

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
