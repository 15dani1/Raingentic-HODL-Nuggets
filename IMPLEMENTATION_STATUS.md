# Implementation Status

A plain-language explanation of what's actually working right now, why it
works without any API keys configured yet, and what each piece of the UI
does.

## Why does it "work" without Rain/Monad API keys?

Product prices, retailer names, and per-retailer shipping costs still come
from a hardcoded seed file (`src/backend/data/mockData.ts`) — there are no
real calls to Amazon, Walmart, UPS, FedEx, etc.

**Rain, however, is now real.** `src/backend/rain/client.ts` is a full
TypeScript port of the team's working `rain_demo.py` sandbox script — it
generates an RSA-encrypted Rain session, issues a real scoped card in
Rain's sandbox (`api-dev.raincards.xyz`), and runs a real
authorize → settle transaction against it.

- If `RAIN_API_KEY`, `RAIN_USER_ID`, and `RAIN_CONTRACT_ID` are set (see
  `.env.example` / your local `.env`), `POST /api/checkout` issues a real
  scoped Rain card and executes a real sandbox purchase. The returned
  `orderId` is Rain's actual transaction id in that case.
- If those env vars are **not** set, checkout automatically falls back to a
  simulated `orderId` (`sim-<timestamp>`) so the frontend keeps working for
  anyone without Rain credentials configured.
- `src/backend/monad/client.ts` now makes **real read-only JSON-RPC calls**
  to Monad testnet (`eth_chainId`, `eth_blockNumber`, `eth_gasPrice`) — no
  private key/signer is configured, so nothing is broadcast on-chain yet.
  `checkSpendPolicy` gates every checkout on a live Monad testnet
  reachability check before a Rain card is issued.

**In short: the UI, pricing logic, and quantity-mismatch flow are fully
wired up end-to-end, and checkout now performs a real Rain sandbox
transaction whenever credentials are present — with a safe simulated
fallback when they're not.**

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
  `/api/checkout` (full arbitrage + quantity-mismatch confirmation +
  real Rain purchase), `/api/dashboard` — pricing data is mocked, Rain
  execution is real when credentials are configured.
- ✅ Real Rain sandbox integration (`src/backend/rain/client.ts`, ported
  from `rain_demo.py`): session-id generation (RSA-OAEP/SHA-1 encrypted),
  scoped card issuance, and authorize + settle transaction execution.
- ✅ Real Monad testnet integration (`src/backend/monad/client.ts`): live
  `eth_chainId`/`eth_blockNumber`/`eth_gasPrice` JSON-RPC calls gate every
  checkout via `checkSpendPolicy`, and real network status (chain id,
  latest block, gas price, USDC test contract) is shown on `/dev`.
- ✅ Developer dashboard (`/dev`): live API call log (every Rain + Monad
  call, with success/failure, latency, and summaries), aggregate
  success-rate/latency stats, Rain + Monad status panels, and the same
  pricing/shipping table as `/dashboard`.
- ❌ Not implemented: on-chain spend-limit *enforcement* (currently just a
  liveness check, not a real spend-policy contract), real retailer/shipping
  APIs, user accounts/auth, multi-agent competition, reward payouts
  (`distributeReward` needs a funded Monad signer, which isn't set up).

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
   calls Rain: it issues a real scoped card capped at the landed cost
   amount, then runs authorize + settle against it in Rain's sandbox. On
   success you get back Rain's real transaction id and
   `status: "confirmed"`. If Rain isn't configured (no `.env` credentials),
   or the sandbox call fails, you get a simulated `orderId`/failure instead
   — the full user flow (browse → price → buy → confirm quantity if
   needed → confirmation) still works either way.

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

1. ~~Add your Rain API key, user ID, and contract ID to `.env`~~ — done;
   Rain purchases in `/api/checkout` are now live against the sandbox.
2. ~~Implement `checkSpendPolicy` in `src/backend/monad/client.ts`~~ — done;
   it now performs a real Monad testnet liveness check before every
   checkout. Next: replace the liveness check with a real on-chain
   spend-policy contract call once one exists, and add a funded signer to
   enable `distributeReward` for the future multi-agent phase.
3. Replace the mocked retailer/shipping data with real pricing sources once
   you have them.
4. Decide on production error-handling for Rain failures (currently any
   sandbox error surfaces as `status: "failed"` with a 502).
