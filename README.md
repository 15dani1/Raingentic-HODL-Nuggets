# RainBox

Welcome to the RainBox repository!

## What is this?

An AI shopping arbitrage agent. Users pick a product on a simple marketplace
and pay a single, reasonable price — no manual pricing or shipping input.
Behind the scenes, an autonomous agent shops a mocked retailer dashboard
(simulated Amazon/Temu/Walmart pricing + UPS/FedEx/USPS shipping) to find
the cheapest landed cost, executes the purchase, and keeps the margin.

The project has two separate surfaces:

- **Retailer Dashboard (internal)** — mocked pricing/shipping data per
  product, used as the agent's market data.
- **Client Marketplace (public)** — simple storefront showing one price per
  product, no manual input required.

Future phases add multiple competing agents with prize/reward incentives,
some of which are settled on Monad.

See [idea.md](./idea.md) for the full concept, agent logic, and deployment
plan.

## Tech Stack

This project is built using the following companies/products:

- [Rain](https://raincards.xyz/) — stablecoin-backed scoped virtual cards,
  wallets, and payment execution for the agent's purchases.
- [Monad](https://monad.xyz/) — fast, EVM-compatible chain for spend policy
  enforcement and (future) multi-agent reward pools.
- TODO: add other products used

## Deployment

Target deployment platform: [Vercel](https://vercel.com/). See
[idea.md](./idea.md#deployment-plan-vercel) for the planned app structure.

## Project Structure

Single Next.js (App Router + TypeScript + Tailwind) app, organized so the
frontend and backend can be developed in parallel without colliding:

```
src/
  app/            # Routing only — thin pages + API route handlers.
                  # Pages import UI from src/frontend; API routes import
                  # logic from src/backend. Avoid adding real logic here.
    page.tsx              -> renders frontend/components/Marketplace
    dashboard/page.tsx     -> renders frontend/components/Dashboard
    api/quote/route.ts     -> backend arbitrage engine (pricing)
    api/checkout/route.ts  -> backend purchase flow
    api/products/route.ts  -> backend product list
    api/dashboard/route.ts -> backend full quote data

  frontend/       # Owned by: UI/frontend dev
    components/   # Marketplace, Dashboard, ProductCard, etc.
    lib/          # Client-side helpers/hooks

  backend/        # Owned by: backend dev
    rain/         # Rain API client (scoped cards, purchase execution)
    monad/        # Monad integration (spend policy, future reward pool)
    data/         # Mocked retailer + shipping seed data
    services/     # Arbitrage engine, pricing/margin logic

  shared/         # Shared TypeScript types (the API contract). Edit
                  # together — changes here affect both sides.
```

**Working in parallel:**
- Frontend dev works almost entirely in `src/frontend/**` and the page files
  under `src/app/**/page.tsx`.
- Backend dev works in `src/backend/**` and the route handlers under
  `src/app/api/**/route.ts`.
- `src/shared/types.ts` is the shared contract — coordinate before changing
  it, since both sides depend on it.
- The frontend currently calls the real `/api/*` routes (not mocked), so
  both sides can build/demo independently once the contract in
  `src/shared/types.ts` is agreed on.

## Environment Variables

Copy `.env.example` to `.env.local` and fill in your Rain credentials
(API key, user ID, team ID, collateral contract ID) and Monad RPC config.
These are read server-side only (`src/backend/**`) and are never bundled
into client-side JavaScript.

## Getting Started

```bash
npm install
npm run dev
```

- Marketplace: http://localhost:3000
- Dashboard: http://localhost:3000/dashboard

