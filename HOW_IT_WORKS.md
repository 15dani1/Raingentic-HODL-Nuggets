# How It Works: From Clicking "Buy Now" to the Dev Dashboard

A plain-English walkthrough of everything that happens behind the scenes
when you use the app — written for you as the person testing it, not as an
API reference. If you want the strict technical details, see
`IMPLEMENTATION_STATUS.md`; this doc is the "explain it to me like I'm
watching over your shoulder" version.

---

## The short version

1. You load the **marketplace** (`/`) → prices/delivery dates appear automatically.
2. You can drag a **delivery-time slider** to trade a longer wait for a lower price.
3. You click **Buy Now** → the agent does a deeper price search across every retailer/pack size.
4. (Sometimes) it asks you to confirm buying a multi-pack instead of 1 item.
5. It checks with **Monad** that it's safe to spend money.
6. It asks **Rain** for a one-time spending card, locked to the exact amount.
7. It uses that card to "buy" the item in Rain's sandbox (authorize → settle).
8. It broadcasts a real **Monad on-chain settlement transaction** from the agent's wallet.
9. You get an order confirmation.
10. Every single one of those steps gets logged and shows up on the **developer dashboard** (`/dev`) in real time, including a full "receipt" for each order.

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
- Filter out anything that can't arrive within your chosen delivery
  window (see the slider below).
- Find the cheapest total: item price + shipping.
- Add the agent's margin on top — that's how the agent would make money
  if this were real. The margin isn't a flat percentage: it scales down
  as the item gets pricier (18% under $20, down to 5% over $300) and
  shrinks further the longer you're willing to wait, since slower
  shipping is cheaper for the agent to use. There's always a small floor
  so the agent never sells at a loss.
- Show that price + the estimated delivery date.

This is intentionally the **cheap, fast lookup**. Nothing is booked or
charged yet.

### The delivery-time slider

Next to the price, you can drag a slider from 2 to 10 days. A longer
window unlocks slower, cheaper shipping options the agent wouldn't
otherwise consider — so you're trading wait time for a better price
(and the agent still keeps a smaller margin on the savings). Moving the
slider re-runs the quote above with the new cutoff.

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

Concretely, it makes a few real, live network calls:
- "What chain am I on?" (`eth_chainId`)
- "What's the latest block?" (`eth_blockNumber`) — this is also the actual
  gate check; if this fails, the purchase is blocked.
- "What's the current gas price?" (`eth_gasPrice`) — just for visibility on the dashboard.
- "What's my wallet's balance?" (`eth_getBalance`) — so you can watch the
  agent's real MON balance on the dashboard.

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

## Step 6 — Monad settles the order on-chain

Once the Rain purchase is confirmed, the agent broadcasts a **real,
mined transaction** on Monad testnet from its own wallet — this is not a
simulation, it's an actual signed transaction that gets included in a
block. The amount is scaled down from the order's landed cost (roughly
$1 → 0.001 MON) so a handful of demo purchases don't drain the whole
faucet balance in one sitting.

The point of this step is accountability: every Rain purchase leaves a
real, verifiable trace on-chain, and the agent's wallet balance visibly
decreases with every order. If no wallet/signer is configured, this step
is silently skipped and checkout still completes normally using only the
liveness check from Step 3.

---

## Step 7 — What you see as the user

Back on the marketplace, you get a confirmation with the order details:
retailer, carrier, what the agent actually paid, what you were charged
(with the margin), and the estimated delivery date.

---

## Step 8 — What shows up on the Developer Dashboard (`/dev`)

Every single network call made in steps 3–6 is logged the moment it
happens — timestamp, which system it hit (Monad or Rain), success/failure,
how long it took, and a short plain-English summary. The dashboard shows,
top to bottom:

- **Rain & Monad status** — whether real Rain credentials are configured
  (or it's running in simulated fallback mode), and whether Monad testnet
  is reachable, with live chain ID / latest block / gas price / wallet
  balance so you can see it's a real, live network and not fake data.
- **Profit** — total profit, average profit per order, and a table of
  every completed order with what the agent paid vs. what the user was
  charged. Click **View** on any order to expand its full **receipt** —
  every Rain call (card issuance, authorize, settle) and the Monad
  on-chain settlement transaction tied to that specific purchase.
- **Rain API Calls** — the full, unabridged list of every Rain/checkout
  call, with a "type" column (Card issuance, Authorization, Settlement,
  Checkout) so you don't have to guess what each row means.
- **Monad On-Chain Settlements** — just the real settlement transactions
  (not the frequent read-only polling calls), showing the wallet balance
  before/after and the transaction hash for each purchase.
- **All API Call Volume** — aggregate stats (total calls, success rate,
  average latency) and a side-by-side Rain vs. Monad call log, pushed to
  the bottom since Monad's high polling volume isn't the most meaningful
  thing to look at first.

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
| Delivery-time / price tradeoff slider | Fully real logic, over mocked shipping data |
| Monad network + wallet balance check | **Real** — actual live calls to Monad testnet |
| Rain card issuance + authorize/settle | **Real** — actual calls to Rain's sandbox, using your API credentials |
| Monad on-chain settlement transaction | **Real** — an actual signed, mined transaction on Monad testnet (if a wallet/signer is configured) |
| Money actually moving | No — Rain's sandbox and Monad testnet are both test environments, no real-world funds involved |
| On-chain spend-limit enforcement | Not yet — today it's a liveness check, not a real spend-policy contract |
| Multi-agent competition / reward payouts | Not built yet (future phase) |

If Rain credentials aren't configured in `.env`, checkout automatically
falls back to a simulated confirmation so the app still works end-to-end
for demo purposes — the dashboard will show you which mode you're in. If
no Monad wallet/private key is configured, the on-chain settlement step
is simply skipped.
