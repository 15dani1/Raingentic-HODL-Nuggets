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

/** Default margin the agent takes on top of landed cost. */
const DEFAULT_MARGIN_RATE = 0.12;

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
 */
export function getCheapestSingleUnitQuote(
  productId: string,
  requestedQuantity: number = 1,
): LandedCostQuote | null {
  const quotes = getAllLandedCostQuotes(productId).filter(
    (q) => q.packQuantity <= requestedQuantity,
  );
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
 */
export function getCheapestOverallQuote(productId: string): LandedCostQuote | null {
  const quotes = getAllLandedCostQuotes(productId);
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
): QuantityMismatchPrompt | null {
  const product = PRODUCTS.find((p) => p.id === productId);
  const cheapestOverall = getCheapestOverallQuote(productId);
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
 */
export function getMarketplacePrice(
  productId: string,
  marginRate: number = DEFAULT_MARGIN_RATE,
): MarketplacePrice | null {
  const cheapest = getCheapestSingleUnitQuote(productId, 1);
  if (!cheapest) return null;

  return {
    productId,
    price: Math.round(cheapest.totalLandedCost * (1 + marginRate) * 100) / 100,
    estimatedDelivery: cheapest.estimatedDelivery,
  };
}
