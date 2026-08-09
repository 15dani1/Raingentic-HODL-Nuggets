/**
 * Arbitrage engine: combines retailer + shipping data into landed-cost
 * quotes, handles the quantity-mismatch edge case, and applies the agent's
 * margin to produce the single price shown to marketplace users.
 *
 * Owned by: backend team.
 */

import { PRODUCTS, RETAILER_LISTINGS } from "@/backend/data/mockData";
import type {
  LandedCostQuote,
  MarketplacePrice,
  QuantityMismatchPrompt,
} from "@/shared/types";

/**
 * Margin is no longer a flat 12% on every order. Instead it scales with
 * the landed cost (thinner margin on pricier items, since a flat
 * percentage there would price the agent out of "best available"
 * territory) and gets a small additional discount the longer the user is
 * willing to wait, since slower shipping is cheaper for the agent to
 * fulfil and that savings should be passed on rather than pocketed
 * entirely. A floor keeps every order profitable.
 */
const MIN_MARGIN_RATE = 0.03;
const MAX_MARGIN_RATE = 0.18;
const WAIT_DISCOUNT_DAYS_RANGE: [min: number, max: number] = [2, 10];
const WAIT_DISCOUNT_MAX_RATE = 0.05;

/** Landed-cost tiers: cheaper items can bear a higher percentage margin. */
function baseMarginRate(totalLandedCost: number): number {
  if (totalLandedCost < 20) return 0.18;
  if (totalLandedCost < 100) return 0.12;
  if (totalLandedCost < 300) return 0.08;
  return 0.05;
}

/**
 * Computes the margin rate to apply for a given landed cost and
 * how many days the user is willing to wait for delivery. Always
 * returns at least MIN_MARGIN_RATE so every order stays profitable.
 */
export function getMarginRate(totalLandedCost: number, maxDeliveryDays?: number): number {
  let rate = baseMarginRate(totalLandedCost);

  if (maxDeliveryDays !== undefined) {
    const [minDays, maxDays] = WAIT_DISCOUNT_DAYS_RANGE;
    const clamped = Math.min(Math.max(maxDeliveryDays, minDays), maxDays);
    const waitFraction = (clamped - minDays) / (maxDays - minDays);
    rate -= waitFraction * WAIT_DISCOUNT_MAX_RATE;
  }

  return Math.min(Math.max(rate, MIN_MARGIN_RATE), MAX_MARGIN_RATE);
}

/** All landed-cost quotes across every retailer/carrier combo, including multi-packs. */
export function getAllLandedCostQuotes(productId: string): LandedCostQuote[] {
  const listings = RETAILER_LISTINGS[productId] ?? [];

  const quotes: LandedCostQuote[] = [];
  for (const listing of listings) {
    for (const shipping of listing.shippingOptions) {
      quotes.push({
        productId,
        retailer: listing.retailer,
        carrier: shipping.carrier,
        packQuantity: listing.packQuantity,
        productPrice: listing.price,
        shippingCost: shipping.cost,
        totalLandedCost: listing.price + shipping.cost,
        estimatedDelivery: shipping.estimatedDelivery,
      });
    }
  }
  return quotes;
}

/**
 * Cheapest quote considering ONLY listings whose pack size fits the
 * requested quantity (defaults to 1). Used for the initial marketplace
 * price shown to the user before they click Buy Now — it should never
 * silently assume they want a multi-pack.
 *
 * `maxDeliveryDaysFromNow`, if provided, additionally filters out any
 * quote whose estimated delivery date is later than that many days from
 * now — letting a user trade a longer wait for a lower price (slower
 * shipping options are often cheaper).
 */
export function getCheapestSingleUnitQuote(
  productId: string,
  requestedQuantity: number = 1,
  maxDeliveryDaysFromNow?: number,
): LandedCostQuote | null {
  let quotes = getAllLandedCostQuotes(productId).filter(
    (q) => q.packQuantity <= requestedQuantity,
  );
  if (maxDeliveryDaysFromNow !== undefined) {
    const cutoff = Date.now() + maxDeliveryDaysFromNow * 24 * 60 * 60 * 1000;
    quotes = quotes.filter((q) => new Date(q.estimatedDelivery).getTime() <= cutoff);
  }
  if (quotes.length === 0) return null;
  return quotes.reduce((cheapest, quote) =>
    quote.totalLandedCost < cheapest.totalLandedCost ? quote : cheapest,
  );
}

/**
 * Cheapest quote across ALL listings (including multi-packs larger than
 * requested). Only meant to be used during the Buy Now / checkout flow,
 * where the agent is actively searching for the best deal and may need to
 * confirm a quantity mismatch with the user before proceeding.
 *
 * `maxDeliveryDaysFromNow`, if provided, filters out quotes whose delivery
 * date is later than that many days from now.
 */
export function getCheapestOverallQuote(
  productId: string,
  maxDeliveryDaysFromNow?: number,
): LandedCostQuote | null {
  let quotes = getAllLandedCostQuotes(productId);
  if (maxDeliveryDaysFromNow !== undefined) {
    const cutoff = Date.now() + maxDeliveryDaysFromNow * 24 * 60 * 60 * 1000;
    quotes = quotes.filter((q) => new Date(q.estimatedDelivery).getTime() <= cutoff);
  }
  if (quotes.length === 0) return null;
  return quotes.reduce((cheapest, quote) =>
    quote.totalLandedCost < cheapest.totalLandedCost ? quote : cheapest,
  );
}

/**
 * Checks whether the cheapest overall quote (across all pack sizes)
 * requires a larger quantity than the user asked for. Returns a prompt to
 * show the user, or null if no mismatch. Intended to be called only as
 * part of the Buy Now / checkout flow, not on initial page load.
 */
export function checkQuantityMismatch(
  productId: string,
  requestedQuantity: number,
  maxDeliveryDaysFromNow?: number,
): QuantityMismatchPrompt | null {
  const product = PRODUCTS.find((p) => p.id === productId);
  const cheapestOverall = getCheapestOverallQuote(productId, maxDeliveryDaysFromNow);
  if (!product || !cheapestOverall) return null;

  if (cheapestOverall.packQuantity > requestedQuantity) {
    return {
      productId,
      requestedQuantity,
      offeredPackQuantity: cheapestOverall.packQuantity,
      packPrice: cheapestOverall.totalLandedCost,
      message: `The best price we found is for a ${cheapestOverall.packQuantity}-pack at $${cheapestOverall.totalLandedCost.toFixed(
        2,
      )} total — would you like to buy the pack instead of ${requestedQuantity}?`,
    };
  }
  return null;
}

/**
 * Computes the single marketplace price (landed cost + margin) shown to
 * users on initial page load, based on single-unit-fitting listings only.
 * `maxDeliveryDays`, if provided, lets the user accept a slower delivery
 * window in exchange for a potentially lower price. `marginRate`, if
 * provided, overrides the dynamic per-order margin rate (mainly useful
 * for tests) — otherwise the rate is computed by `getMarginRate` based on
 * landed cost and delivery window, rather than a flat percentage.
 */
export function getMarketplacePrice(
  productId: string,
  marginRate?: number,
  maxDeliveryDays?: number,
): MarketplacePrice | null {
  const cheapest = getCheapestSingleUnitQuote(productId, 1, maxDeliveryDays);
  if (!cheapest) return null;

  const rate = marginRate ?? getMarginRate(cheapest.totalLandedCost, maxDeliveryDays);

  return {
    productId,
    price: Math.round(cheapest.totalLandedCost * (1 + rate) * 100) / 100,
    estimatedDelivery: cheapest.estimatedDelivery,
  };
}
