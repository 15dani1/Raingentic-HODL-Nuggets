# Idea: AI Shopping Arbitrage Agent

## Summary

A marketplace where the user picks a product and pays a simple, reasonable
price — no typing in a max price. Behind the scenes, an autonomous agent
finds the cheapest total cost (product + shipping) across simulated
retailers and carriers, buys accordingly, and pockets the difference as
margin. Over time, multiple agents can compete against each other for
prize/reward incentives, with some rewards settled on Monad.

This is split into **two separate surfaces**:

1. **Retailer Dashboard (internal/admin)** — a mocked, minimal dashboard that
   mimics retailer pricing (Amazon, Temu, Walmart, etc.) and shipping costs
   (UPS, FedEx, USPS) per product. This is simulated/seeded data, not live
   scraping — used as the data source the agent shops against.
2. **Client Marketplace UI (public-facing)** — a simple storefront where end
   users just see a product and a single reasonable price. No price input,
   no retailer/shipping detail — the agent has already done that work.

## User Flow (Client Marketplace)

1. User browses the marketplace and picks a product.
2. UI shows a single, simple, reasonable price (computed by the agent from
   the dashboard data) and an estimated delivery date.
3. User checks out. No manual price entry.
4. **Quantity mismatch edge case**: if the cheapest matching listing is a
   multi-pack (e.g., a 4-pack of toothpaste) but the user only wants 1, the
   agent prompts the user: "The best price we found is for a 4-pack at $X
   total — would you like to buy the pack instead of a single unit?" User
   accepts or declines before checkout proceeds.
5. Agent executes the purchase (simulated retail transaction) using a
   Rain-issued scoped card, and the order is confirmed to the user.

## Retailer Dashboard (Internal)

- Minimal, clean UI — a table/grid per product showing:
  - Retailer name (Amazon, Temu, Walmart, etc. — simulated)
  - Product price at that retailer
  - Available pack/quantity sizes
  - Shipping cost + estimated delivery date per carrier (UPS, FedEx, USPS)
  - Computed total landed cost per retailer × carrier combination
- This is the agent's "market data" — swappable later for real APIs, but for
  the hackathon it's mocked/seeded so the whole flow works end-to-end.
- Acts as the control panel to see *why* the agent picked what it picked.

## Agent Logic

1. Look up the requested product across the mocked retailer dataset.
2. For each retailer, get price + available quantities/pack sizes.
3. For each shipping carrier, get shipping cost + delivery estimate.
4. Compute total landed cost per retailer × carrier combination.
5. **Quantity check**: if the cheapest option's quantity exceeds what the
   user needs, pause and ask the user if they're willing to pay for the
   larger pack (don't silently auto-buy extra).
6. Pick the cheapest valid combination that meets any delivery constraints.
7. Set the client-facing price with the agent's margin baked in (agent buys
   low, marketplace sells at a small markup — this is how the agent makes
   money).
8. Execute the purchase via Rain, confirm to the user.

## Multi-Agent Competition (Future Phase)

- Multiple agents can independently shop the same retailer dashboard data
  and compete to find the best price/margin for a given product or order.
- A scoring mechanism determines a "winner" per round/product (e.g., best
  margin, fastest fulfillment, or best price found).
- Winning agent(s) receive a reward — some rewards distributed/tracked on
  Monad (e.g., an on-chain reward pool or token payout per win).
- This phase is explicitly **future work**, not part of the initial hackathon
  build — the MVP is a single-agent flow.

## How Rain Fits In

- **Scoped virtual cards**: Issue a spend-capped virtual card per purchase
  so the agent can only spend up to the computed landed cost.
- **Stablecoin funding**: Agent's operating wallet (stablecoins) funds each
  card in real time.
- **Webhooks**: Real-time confirmation when a transaction is
  authorized/settled.
- **Wallet infrastructure**: Branded embedded wallet for the agent's
  operating funds, with built-in KYC/AML compliance.
- **Margin capture**: The spread between what the agent pays (landed cost)
  and what the user pays (marketplace price) is the agent's profit.

## How Monad Fits In

- **Reward pool / prize contract**: For the future multi-agent competition,
  a Monad smart contract can hold and distribute rewards to winning agents.
- **Fast settlement**: Sub-second finality lets agents react quickly and
  settle any on-chain fund movements almost instantly.
- **Spend policy contracts**: Encode constraints (e.g., max spend per
  purchase) as an on-chain policy before releasing funds to a Rain card.
- **Auditable transaction trail**: Log each agent's chosen retailer/carrier
  and computed margin on-chain for transparency, and (later) for scoring
  which agent performed best.

## Core Components

- **Retailer Dashboard (internal)**: Seeded/mocked pricing + shipping data
  UI, grouped by product.
- **Client Marketplace UI (public)**: Simple storefront — product, image,
  single price, delivery estimate, checkout. No manual price/carrier input.
- **Arbitrage Engine**: Combines product price + shipping price per
  retailer/carrier pair, handles quantity-mismatch prompts, and picks the
  cheapest valid option.
- **Pricing/Margin Layer**: Converts landed cost into the client-facing
  marketplace price (landed cost + agent margin).
- **Spend Authorization Layer**: Monad policy/contract that approves fund
  release within agreed limits.
- **Payment Executor**: Uses Rain's API to issue a scoped card and execute
  the (simulated) retail transaction.
- **Notification Layer**: Confirms purchase details back to the user
  (Rain webhooks + on-chain events from Monad).
- **(Future) Competition/Reward Layer**: Multi-agent scoring + Monad-based
  reward distribution.

## Deployment Plan (Vercel)

Since this needs to be demo-able for a hackathon and deployed on Vercel:

- Two separate Next.js apps/routes (or one monorepo with two apps):
  - `dashboard` — internal retailer/shipping mock data view.
  - `marketplace` — public client-facing storefront.
- Mocked retailer/shipping data can live in a simple JSON/seed file or a
  lightweight hosted DB (e.g., Vercel Postgres or KV) — no live scraping,
  so no server-side scraping infra needed, which keeps it Vercel-friendly
  (serverless functions only).
- Rain and Monad calls (API keys, RPC calls) go through Vercel serverless
  functions / API routes — keep keys server-side, never exposed to the
  client bundle.
- Environment variables (Rain API key, Monad RPC URL, etc.) managed via
  Vercel project settings, not committed to the repo.
- Keep the initial MVP to a single agent + single product flow so it demos
  cleanly; multi-agent competition and Monad reward pool are stretch goals.

## Open Questions / Next Steps

- What's the seed dataset for mocked retailer prices/shipping — how many
  products/retailers/carriers do we need for a convincing demo?
- Should quantity-mismatch prompt block checkout until answered, or offer a
  "just buy the single-unit price, no savings" fallback?
- How much margin should the agent take by default (fixed % vs. dynamic)?
- What does a minimal Monad reward-pool contract look like for the future
  multi-agent phase (even if not built for the hackathon)?
- Do we need user auth for the marketplace, or is it anonymous checkout for
  the demo?
