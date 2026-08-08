# How It Works: From Clicking "Buy Now" to the Dev Dashboard

A plain-English walkthrough of everything that happens behind the scenes
when you use the app — written for you as the person testing it, not as an
API reference. If you want the strict technical details, see
`IMPLEMENTATION_STATUS.md`; this doc is the "explain it to me like I'm
watching over your shoulder" version.

---

## The short version

1. You load the **marketplace** (`/`) → prices/delivery dates appear automatically.
2. You click **Buy Now** → the agent does a deeper price search across every retailer/pack size.
3. (Sometimes) it asks you to confirm buying a multi-pack instead of 1 item.
4. It checks with **Monad** that it's safe to spend money.
5. It asks **Rain** for a one-time spending card, locked to the exact amount.
6. It uses that card to "buy" the item in Rain's sandbox (authorize → settle).
7. You get an order confirmation.
8. Every single one of those steps gets logged and shows up on the **developer dashboard** (`/dev`) in real time.

Now, step by step.

---

## Step 1 — Loading the marketplace (`/`)

When the page loads, each product card automatically calls
`GET /api/quote` for that product. This does **not** involve Rain or Monad
at all — it's pure math:

- Look at every retailer's listing for that product (mocked data —
  pretend Amazon/Walmart/Temu listings, since we don't hit real retailer
  sites).
- Only consider single-item listings (not 4-packs) — you're looking at
  "buy 1" pricing at this point.
- Find the cheapest total: item price + shipping.
- Add the agent's margin (12%) on top — that's how the agent would make
  money if this were real.
- Show that price + the estimated delivery date.

This is intentionally the **cheap, fast lookup**. Nothing is booked or
charged yet.

---

## Step 2 — Clicking "Buy Now"

This calls `POST /api/checkout`, and this is where the real work starts.
Unlike the marketplace price (which only checked single items), checkout
does a **full search**:

- Checks every retailer, every pack size (1, 4-pack, whatever exists),
  every shipping option.
- Finds the actual cheapest total cost to fulfill your order.

Sometimes the cheapest total isn't a single item — e.g. a 4-pack of
toothpaste ships for $0.99 total with one retailer, so buying 4 and
throwing 3 away is technically the cheapest way to get you 1. That's a bad
customer experience if we just do it silently, so:

### Step 2a — Quantity mismatch check

If the cheapest option requires buying more than you asked for, checkout
**stops and asks you first** — nothing is charged. You'll see a message
like "the best price is a 4-pack for $8.98 — want it, or just 1?" You click
Accept or Decline, and it resubmits your answer.

Once that's resolved (or if there was no mismatch to begin with), the real
purchase flow kicks in.

---

## Step 3 — The Monad check (spend-policy gate)

Before any money moves, the backend calls out to **Monad's testnet**
(a public blockchain network) to make sure the network is alive and
reachable. Think of this like the agent "checking its own pulse" before
spending — a very simple version of an on-chain rule that says "don't
authorize a purchase if the safety-check network is down."

Concretely, it makes 3 real, live network calls:
- "What chain am I on?" (`eth_chainId`)
- "What's the latest block?" (`eth_blockNumber`) — this is also the actual
  gate check; if this fails, the purchase is blocked.
- "What's the current gas price?" (`eth_gasPrice`) — just for visibility on the dashboard.

These are **read-only** — no money moves on Monad itself yet, and nothing
is written to the blockchain. It's purely a safety/liveness check today.
(Down the road, this is where a real on-chain spend-limit contract, and
eventually multi-agent reward payouts, would plug in.)

If Monad can't be reached, checkout stops right there and the order fails
— better to block a purchase than let the agent spend blind.

---

## Step 4 — Rain issues a "scoped card"

Assuming Monad gave the green light, the backend talks to **Rain's
sandbox** (a realistic test environment for Rain's card-issuing API — not
real money, but it behaves like the real thing).

First it generates a secure, one-time **session** (this is just
cryptographic housekeeping Rain requires to prove the request is
legitimate — encrypted with a key Rain gave us).

Then it asks Rain: *"Issue me a virtual card, capped at exactly $X.XX."*
Rain hands back a card ID. This card **cannot spend more than that
capped amount** — even if something went wrong elsewhere, this card
physically can't overspend. That's the safety guarantee Rain provides.

---

## Step 5 — Rain "buys" the item (authorize → settle)

With the scoped card in hand, the backend simulates an actual purchase in
two parts, both against Rain's sandbox:

1. **Authorize** — "I want to charge $X.XX to this card at [retailer]." Rain
   checks the card is valid and within its cap, and holds the funds.
2. **Settle** — "Confirm that charge, it's final." Rain finalizes the
   transaction.

If either step fails or comes back with an unexpected status, the whole
checkout is marked as failed and you're told so — no silent partial
charges.

If both succeed, you get back a real transaction ID from Rain and a
"confirmed" order.

---

## Step 6 — What you see as the user

Back on the marketplace, you get a confirmation with the order details:
retailer, carrier, what the agent actually paid, what you were charged
(with the margin), and the estimated delivery date.

---

## Step 7 — What shows up on the Developer Dashboard (`/dev`)

Every single network call made in steps 3–5 is logged the moment it
happens — timestamp, which system it hit (Monad or Rain), success/failure,
how long it took, and a short plain-English summary. The dashboard shows:

- **Rain status** — whether real credentials are configured, or it's
  running in simulated fallback mode.
- **Monad status** — is the testnet reachable right now, what's the
  current chain ID / latest block / gas price, so you can see it's a real,
  live network and not fake data.
- **Aggregate stats** — total calls made, how many succeeded/failed,
  success rate, and average response time — auto-refreshes every few
  seconds.
- **The call log itself** — a running list of every individual API call
  (e.g. "Issued scoped card capped at $19.74", "Authorized $19.74 at
  Amazon", "Settled transaction ...", or a Monad "eth_blockNumber" ping),
  newest first, color-coded by which system it came from.
- **Pricing & shipping table** — the full breakdown of every mocked
  retailer/carrier/price/shipping combination per product, so you can
  cross-check why a certain retailer "won."

This dashboard exists specifically so you (as the engineer) can see
everything the agent did on your behalf without having to dig through
server logs — every Buy Now click should visibly show up here within a
couple seconds.

---

## What's real vs. simulated today

| Piece | Status |
|---|---|
| Retailer prices/shipping (Amazon/Walmart/Temu) | **Mocked** — hardcoded sample data, not real retailer APIs |
| Marketplace price shown on load | Real math, over mocked data |
| Quantity-mismatch prompt | Fully real logic |
| Monad network check | **Real** — actual live calls to Monad testnet |
| Rain card issuance + authorize/settle | **Real** — actual calls to Rain's sandbox, using your API credentials |
| Money actually moving | No — Rain's sandbox and Monad testnet are both test environments, no real funds involved |
| On-chain spend-limit enforcement | Not yet — today it's a liveness check, not a real spend-policy contract |
| Multi-agent competition / reward payouts | Not built yet (future phase, needs a funded Monad signer) |

If Rain credentials aren't configured in `.env`, checkout automatically
falls back to a simulated confirmation so the app still works end-to-end
for demo purposes — the dashboard will show you which mode you're in.
