/**
 * Arbitrage engine: combines retailer + shipping data into landed-cost
 * quotes, handles the quantity-mismatch edge case, and applies the agent's
 * margin to produce the single price shown to marketplace users.
 *
 * Owned by: backend team.
 */

import { PRODUCTS, RETAILER_LISTINGS, SHIPPING_OPTIONS } from "@/backend/data/mockData";
import type {
  LandedCostQuote,
  MarketplacePrice,
  QuantityMismatchPrompt,
} from "@/shared/types";

/** Default margin the agent takes on top of landed cost. */
const DEFAULT_MARGIN_RATE = 0.12;

export function getAllLandedCostQuotes(productId: string): LandedCostQuote[] {
  const listings = RETAILER_LISTINGS[productId] ?? [];
  const shippingOptions = SHIPPING_OPTIONS[productId] ?? [];

  const quotes: LandedCostQuote[] = [];
  for (const listing of listings) {
    for (const shipping of shippingOptions) {
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

export function getCheapestQuote(productId: string): LandedCostQuote | null {
  const quotes = getAllLandedCostQuotes(productId);
  if (quotes.length === 0) return null;
  return quotes.reduce((cheapest, quote) =>
    quote.totalLandedCost < cheapest.totalLandedCost ? quote : cheapest,
  );
}

/**
 * Checks whether the cheapest quote requires a larger quantity than the
 * user asked for. Returns a prompt to show the user, or null if no mismatch.
 */
export function checkQuantityMismatch(
  productId: string,
  requestedQuantity: number,
): QuantityMismatchPrompt | null {
  const product = PRODUCTS.find((p) => p.id === productId);
  const cheapest = getCheapestQuote(productId);
  if (!product || !cheapest) return null;

  if (cheapest.packQuantity > requestedQuantity) {
    return {
      productId,
      requestedQuantity,
      offeredPackQuantity: cheapest.packQuantity,
      packPrice: cheapest.totalLandedCost,
      message: `The best price we found is for a ${cheapest.packQuantity}-pack at $${cheapest.totalLandedCost.toFixed(
        2,
      )} total — would you like to buy the pack instead of ${requestedQuantity}?`,
    };
  }
  return null;
}

/** Computes the single marketplace price (landed cost + margin) shown to users. */
export function getMarketplacePrice(
  productId: string,
  marginRate: number = DEFAULT_MARGIN_RATE,
): MarketplacePrice | null {
  const cheapest = getCheapestQuote(productId);
  if (!cheapest) return null;

  return {
    productId,
    price: Math.round(cheapest.totalLandedCost * (1 + marginRate) * 100) / 100,
    estimatedDelivery: cheapest.estimatedDelivery,
  };
}
