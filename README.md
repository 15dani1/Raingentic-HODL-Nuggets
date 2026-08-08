# Raingentic-HODL-Nuggets

Welcome to the Raingentic-HODL-Nuggets repository!

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
