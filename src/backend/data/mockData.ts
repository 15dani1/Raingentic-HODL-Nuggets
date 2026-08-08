/**
 * Mocked/seeded retailer + shipping data.
 *
 * Owned by: backend team.
 *
 * This simulates what a real retailer/shipping price-comparison API would
 * return. Swap this out for real integrations later without changing the
 * shape consumed by the arbitrage engine or frontend.
 */

import type { Product, RetailerListing, ShippingOption } from "@/shared/types";

export const PRODUCTS: Product[] = [
  {
    id: "toothpaste-travel",
    name: "Travel-Size Toothpaste",
    imageUrl: "/products/toothpaste.svg",
    unitQuantity: 1,
  },
  {
    id: "headphones-wireless",
    name: "Wireless Noise-Cancelling Headphones",
    imageUrl: "/products/headphones.svg",
    unitQuantity: 1,
  },
  {
    id: "phone-charger",
    name: "USB-C Fast Charger",
    imageUrl: "/products/charger.svg",
    unitQuantity: 1,
  },
];

/** Retailer listings keyed by product id. Includes multi-pack edge cases. */
export const RETAILER_LISTINGS: Record<string, RetailerListing[]> = {
  "toothpaste-travel": [
    { retailer: "Amazon", price: 2.99, packQuantity: 1 },
    { retailer: "Walmart", price: 9.49, packQuantity: 4 },
    { retailer: "Temu", price: 7.99, packQuantity: 4 },
  ],
  "headphones-wireless": [
    { retailer: "Amazon", price: 328.0, packQuantity: 1 },
    { retailer: "Walmart", price: 298.0, packQuantity: 1 },
    { retailer: "Temu", price: 245.0, packQuantity: 1 },
  ],
  "phone-charger": [
    { retailer: "Amazon", price: 15.99, packQuantity: 1 },
    { retailer: "Walmart", price: 12.49, packQuantity: 2 },
    { retailer: "Temu", price: 9.99, packQuantity: 2 },
  ],
};

/** Shipping options keyed by product id. */
export const SHIPPING_OPTIONS: Record<string, ShippingOption[]> = {
  "toothpaste-travel": [
    { carrier: "USPS", cost: 4.5, estimatedDelivery: "2026-08-13" },
    { carrier: "UPS", cost: 6.25, estimatedDelivery: "2026-08-12" },
    { carrier: "FedEx", cost: 7.0, estimatedDelivery: "2026-08-11" },
  ],
  "headphones-wireless": [
    { carrier: "USPS", cost: 6.0, estimatedDelivery: "2026-08-14" },
    { carrier: "UPS", cost: 8.5, estimatedDelivery: "2026-08-12" },
    { carrier: "FedEx", cost: 10.0, estimatedDelivery: "2026-08-11" },
  ],
  "phone-charger": [
    { carrier: "USPS", cost: 3.75, estimatedDelivery: "2026-08-13" },
    { carrier: "UPS", cost: 5.0, estimatedDelivery: "2026-08-12" },
    { carrier: "FedEx", cost: 6.5, estimatedDelivery: "2026-08-11" },
  ],
};
