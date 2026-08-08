/**
 * Mocked/seeded retailer + shipping data.
 *
 * Owned by: backend team.
 *
 * This simulates what a real retailer/shipping price-comparison API would
 * return. Swap this out for real integrations later without changing the
 * shape consumed by the arbitrage engine or frontend.
 *
 * NOTE ON IMAGES: `imageUrl` values point to placehold.co, a placeholder
 * image service (no API key needed) that renders a colored box with the
 * product name. These are stand-ins for the demo — swap for real product
 * photos (or images returned by a real retailer API) later.
 */

import type { Product, RetailerListing, ShippingOption } from "@/shared/types";

function placeholderImage(label: string, bg: string, fg = "ffffff") {
  return `https://placehold.co/400x400/${bg}/${fg}?text=${encodeURIComponent(label)}`;
}

export const PRODUCTS: Product[] = [
  {
    id: "toothpaste-travel",
    name: "Travel-Size Toothpaste",
    imageUrl: placeholderImage("Toothpaste", "38bdf8"),
    unitQuantity: 1,
  },
  {
    id: "headphones-wireless",
    name: "Wireless Noise-Cancelling Headphones",
    imageUrl: placeholderImage("Headphones", "1e293b"),
    unitQuantity: 1,
  },
  {
    id: "phone-charger",
    name: "USB-C Fast Charger",
    imageUrl: placeholderImage("USB-C Charger", "f97316"),
    unitQuantity: 1,
  },
  {
    id: "water-bottle",
    name: "Insulated Steel Water Bottle",
    imageUrl: placeholderImage("Water Bottle", "0ea5e9"),
    unitQuantity: 1,
  },
  {
    id: "running-shoes",
    name: "Running Shoes",
    imageUrl: placeholderImage("Running Shoes", "ef4444"),
    unitQuantity: 1,
  },
  {
    id: "backpack",
    name: "Everyday Backpack",
    imageUrl: placeholderImage("Backpack", "78716c"),
    unitQuantity: 1,
  },
  {
    id: "wireless-mouse",
    name: "Wireless Mouse",
    imageUrl: placeholderImage("Mouse", "6366f1"),
    unitQuantity: 1,
  },
  {
    id: "mechanical-keyboard",
    name: "Mechanical Keyboard",
    imageUrl: placeholderImage("Keyboard", "14b8a6"),
    unitQuantity: 1,
  },
  {
    id: "coffee-beans",
    name: "Whole Bean Coffee (12oz)",
    imageUrl: placeholderImage("Coffee Beans", "78350f"),
    unitQuantity: 1,
  },
  {
    id: "sunglasses",
    name: "Polarized Sunglasses",
    imageUrl: placeholderImage("Sunglasses", "111827"),
    unitQuantity: 1,
  },
  {
    id: "yoga-mat",
    name: "Non-Slip Yoga Mat",
    imageUrl: placeholderImage("Yoga Mat", "8b5cf6"),
    unitQuantity: 1,
  },
  {
    id: "bluetooth-speaker",
    name: "Portable Bluetooth Speaker",
    imageUrl: placeholderImage("Speaker", "db2777"),
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
  "water-bottle": [
    { retailer: "Amazon", price: 24.99, packQuantity: 1 },
    { retailer: "Walmart", price: 19.99, packQuantity: 1 },
    { retailer: "Temu", price: 14.5, packQuantity: 2 },
  ],
  "running-shoes": [
    { retailer: "Amazon", price: 89.99, packQuantity: 1 },
    { retailer: "Walmart", price: 74.0, packQuantity: 1 },
    { retailer: "Temu", price: 61.25, packQuantity: 1 },
  ],
  backpack: [
    { retailer: "Amazon", price: 54.99, packQuantity: 1 },
    { retailer: "Walmart", price: 45.0, packQuantity: 1 },
    { retailer: "Temu", price: 39.99, packQuantity: 1 },
  ],
  "wireless-mouse": [
    { retailer: "Amazon", price: 22.99, packQuantity: 1 },
    { retailer: "Walmart", price: 18.5, packQuantity: 1 },
    { retailer: "Temu", price: 15.99, packQuantity: 1 },
  ],
  "mechanical-keyboard": [
    { retailer: "Amazon", price: 79.99, packQuantity: 1 },
    { retailer: "Walmart", price: 69.99, packQuantity: 1 },
    { retailer: "Temu", price: 58.0, packQuantity: 1 },
  ],
  "coffee-beans": [
    { retailer: "Amazon", price: 12.99, packQuantity: 1 },
    { retailer: "Walmart", price: 21.99, packQuantity: 2 },
    { retailer: "Temu", price: 19.99, packQuantity: 2 },
  ],
  sunglasses: [
    { retailer: "Amazon", price: 34.99, packQuantity: 1 },
    { retailer: "Walmart", price: 29.99, packQuantity: 1 },
    { retailer: "Temu", price: 11.5, packQuantity: 1 },
  ],
  "yoga-mat": [
    { retailer: "Amazon", price: 27.99, packQuantity: 1 },
    { retailer: "Walmart", price: 22.0, packQuantity: 1 },
    { retailer: "Temu", price: 16.75, packQuantity: 1 },
  ],
  "bluetooth-speaker": [
    { retailer: "Amazon", price: 45.99, packQuantity: 1 },
    { retailer: "Walmart", price: 39.0, packQuantity: 1 },
    { retailer: "Temu", price: 32.5, packQuantity: 1 },
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
  "water-bottle": [
    { carrier: "USPS", cost: 4.0, estimatedDelivery: "2026-08-13" },
    { carrier: "UPS", cost: 5.75, estimatedDelivery: "2026-08-12" },
    { carrier: "FedEx", cost: 7.25, estimatedDelivery: "2026-08-11" },
  ],
  "running-shoes": [
    { carrier: "USPS", cost: 7.5, estimatedDelivery: "2026-08-14" },
    { carrier: "UPS", cost: 9.0, estimatedDelivery: "2026-08-12" },
    { carrier: "FedEx", cost: 11.5, estimatedDelivery: "2026-08-11" },
  ],
  backpack: [
    { carrier: "USPS", cost: 6.5, estimatedDelivery: "2026-08-14" },
    { carrier: "UPS", cost: 8.0, estimatedDelivery: "2026-08-12" },
    { carrier: "FedEx", cost: 9.75, estimatedDelivery: "2026-08-11" },
  ],
  "wireless-mouse": [
    { carrier: "USPS", cost: 3.5, estimatedDelivery: "2026-08-13" },
    { carrier: "UPS", cost: 5.0, estimatedDelivery: "2026-08-12" },
    { carrier: "FedEx", cost: 6.25, estimatedDelivery: "2026-08-11" },
  ],
  "mechanical-keyboard": [
    { carrier: "USPS", cost: 5.0, estimatedDelivery: "2026-08-14" },
    { carrier: "UPS", cost: 7.0, estimatedDelivery: "2026-08-12" },
    { carrier: "FedEx", cost: 8.75, estimatedDelivery: "2026-08-11" },
  ],
  "coffee-beans": [
    { carrier: "USPS", cost: 4.25, estimatedDelivery: "2026-08-13" },
    { carrier: "UPS", cost: 6.0, estimatedDelivery: "2026-08-12" },
    { carrier: "FedEx", cost: 7.5, estimatedDelivery: "2026-08-11" },
  ],
  sunglasses: [
    { carrier: "USPS", cost: 3.25, estimatedDelivery: "2026-08-13" },
    { carrier: "UPS", cost: 4.75, estimatedDelivery: "2026-08-12" },
    { carrier: "FedEx", cost: 6.0, estimatedDelivery: "2026-08-11" },
  ],
  "yoga-mat": [
    { carrier: "USPS", cost: 5.5, estimatedDelivery: "2026-08-14" },
    { carrier: "UPS", cost: 7.25, estimatedDelivery: "2026-08-12" },
    { carrier: "FedEx", cost: 8.5, estimatedDelivery: "2026-08-11" },
  ],
  "bluetooth-speaker": [
    { carrier: "USPS", cost: 6.0, estimatedDelivery: "2026-08-14" },
    { carrier: "UPS", cost: 7.75, estimatedDelivery: "2026-08-12" },
    { carrier: "FedEx", cost: 9.25, estimatedDelivery: "2026-08-11" },
  ],
};
