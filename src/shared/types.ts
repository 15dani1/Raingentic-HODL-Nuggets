/**
 * Shared types used by both the frontend (UI) and backend (integrations,
 * arbitrage engine). Keep this file as the single source of truth for the
 * data contract between the two sides so changes are coordinated, not
 * duplicated independently in frontend/backend code.
 */

export interface Product {
  id: string;
  name: string;
  imageUrl: string;
  /** Default quantity a single "unit" purchase represents (usually 1). */
  unitQuantity: number;
}

export interface RetailerListing {
  retailer: string;
  /** Price for this specific listing (may cover more than 1 unit). */
  price: number;
  /** Quantity/pack size this price covers, e.g. 4 for a 4-pack. */
  packQuantity: number;
}

export interface ShippingOption {
  carrier: string;
  cost: number;
  /** Estimated delivery date, ISO 8601. */
  estimatedDelivery: string;
}

export interface LandedCostQuote {
  productId: string;
  retailer: string;
  carrier: string;
  packQuantity: number;
  productPrice: number;
  shippingCost: number;
  totalLandedCost: number;
  estimatedDelivery: string;
}

/**
 * A single, simple price the agent presents to the end user in the
 * marketplace UI. Computed from the cheapest valid LandedCostQuote plus the
 * agent's margin.
 */
export interface MarketplacePrice {
  productId: string;
  price: number;
  estimatedDelivery: string;
}

/**
 * Returned by the agent when the cheapest option requires buying more units
 * than the user asked for (e.g. a 4-pack instead of a single item). The UI
 * should prompt the user to accept or decline before checkout proceeds.
 */
export interface QuantityMismatchPrompt {
  productId: string;
  requestedQuantity: number;
  offeredPackQuantity: number;
  packPrice: number;
  message: string;
}

export interface CheckoutRequest {
  productId: string;
  requestedQuantity: number;
  /** Set to true once the user has accepted a QuantityMismatchPrompt. */
  acceptedPackQuantity?: boolean;
}

export interface CheckoutResult {
  orderId: string;
  productId: string;
  retailer: string;
  carrier: string;
  totalPaidByAgent: number;
  totalChargedToUser: number;
  estimatedDelivery: string;
  status: "confirmed" | "pending" | "failed";
}
