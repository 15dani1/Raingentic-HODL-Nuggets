/**
 * Mocked/seeded retailer + shipping data.
 *
 * Owned by: backend team.
 *
 * This simulates what a real retailer/shipping price-comparison API would
 * return. Swap this out for real integrations later without changing the
 * shape consumed by the arbitrage engine or frontend.
 *
 * NOTE ON IMAGES: `imageUrl` values point to specific Unsplash photos
 * (free to use, no API key needed for direct image URLs), hand-picked per
 * product so each one clearly shows the actual item rather than a random
 * loosely-tagged photo. Swap for real product photos (or images from a
 * real retailer API) later.
 *
 * NOTE ON PRICING: a multi-pack's listing price must always be higher than
 * any single-unit listing price for the same product — buying more units
 * should never cost less, in raw price, than buying one. Shipping is now
 * modeled per retailer (different retailers really do offer different
 * carriers/rates), so it's possible for a multi-pack's *total landed cost*
 * (price + its own shipping) to come out cheaper than a single unit's total
 * landed cost elsewhere — that's the realistic "buy a 4-pack you didn't
 * need" scenario the quantity-mismatch prompt is designed to catch.
 */

import type { Product, RetailerListing } from "@/shared/types";

function productImage(photoId: string) {
  return `https://images.unsplash.com/photo-${photoId}?w=600&q=80&auto=format&fit=crop`;
}

export const PRODUCTS: Product[] = [
  {
    id: "toothpaste-travel",
    name: "Travel-Size Toothpaste",
    imageUrl: productImage("1620916566398-39f1143ab7be"),
    unitQuantity: 1,
  },
  {
    id: "headphones-wireless",
    name: "Wireless Noise-Cancelling Headphones",
    imageUrl: productImage("1505740420928-5e560c06d30e"),
    unitQuantity: 1,
  },
  {
    id: "phone-charger",
    name: "USB-C Fast Charger",
    imageUrl: productImage("1583863788434-e58a36330cf0"),
    unitQuantity: 1,
  },
  {
    id: "water-bottle",
    name: "Insulated Steel Water Bottle",
    imageUrl: productImage("1602143407151-7111542de6e8"),
    unitQuantity: 1,
  },
  {
    id: "running-shoes",
    name: "Running Shoes",
    imageUrl: productImage("1542291026-7eec264c27ff"),
    unitQuantity: 1,
  },
  {
    id: "backpack",
    name: "Everyday Backpack",
    imageUrl: productImage("1553062407-98eeb64c6a62"),
    unitQuantity: 1,
  },
  {
    id: "wireless-mouse",
    name: "Wireless Mouse",
    imageUrl: productImage("1527864550417-7fd91fc51a46"),
    unitQuantity: 1,
  },
  {
    id: "mechanical-keyboard",
    name: "Mechanical Keyboard",
    imageUrl: productImage("1587829741301-dc798b83add3"),
    unitQuantity: 1,
  },
  {
    id: "coffee-beans",
    name: "Whole Bean Coffee (12oz)",
    imageUrl: productImage("1447933601403-0c6688de566e"),
    unitQuantity: 1,
  },
  {
    id: "sunglasses",
    name: "Polarized Sunglasses",
    imageUrl: productImage("1572635196237-14b3f281503f"),
    unitQuantity: 1,
  },
  {
    id: "yoga-mat",
    name: "Non-Slip Yoga Mat",
    imageUrl: productImage("1601925260368-ae2f83cf8b7f"),
    unitQuantity: 1,
  },
  {
    id: "bluetooth-speaker",
    name: "Portable Bluetooth Speaker",
    imageUrl: productImage("1608043152269-423dbba4e7e1"),
    unitQuantity: 1,
  },
];

/**
 * Retailer listings keyed by product id, each with its own shipping
 * options. Multi-pack listings always have a higher raw price than any
 * single-unit listing for the same product.
 */
export const RETAILER_LISTINGS: Record<string, RetailerListing[]> = {
  "toothpaste-travel": [
    {
      retailer: "Amazon",
      price: 2.99,
      packQuantity: 1,
      // A single travel-size tube is too small/cheap on its own for
      // Amazon's discounted shipping tiers, so only pricier carriers apply.
      shippingOptions: [
        { carrier: "UPS", cost: 6.25, estimatedDelivery: "2026-08-12" },
        { carrier: "FedEx", cost: 7.0, estimatedDelivery: "2026-08-11" },
      ],
    },
    {
      retailer: "Walmart",
      price: 9.49,
      packQuantity: 4,
      shippingOptions: [
        { carrier: "USPS", cost: 3.0, estimatedDelivery: "2026-08-14" },
        { carrier: "UPS", cost: 4.5, estimatedDelivery: "2026-08-12" },
      ],
    },
    {
      retailer: "Temu",
      price: 7.99,
      packQuantity: 4,
      shippingOptions: [
        // Temu's bulk shipping is cheap enough that the 4-pack ends up as
        // the cheapest total landed cost, even though its raw price is
        // higher than Amazon's single unit — this is the scenario that
        // should trigger the quantity-mismatch prompt at Buy Now time.
        { carrier: "Standard", cost: 0.99, estimatedDelivery: "2026-08-15" },
      ],
    },
  ],
  "headphones-wireless": [
    {
      retailer: "Amazon",
      price: 328.0,
      packQuantity: 1,
      shippingOptions: [
        { carrier: "USPS", cost: 6.0, estimatedDelivery: "2026-08-14" },
        { carrier: "UPS", cost: 8.5, estimatedDelivery: "2026-08-12" },
        { carrier: "FedEx", cost: 10.0, estimatedDelivery: "2026-08-11" },
      ],
    },
    {
      retailer: "Walmart",
      price: 298.0,
      packQuantity: 1,
      shippingOptions: [{ carrier: "UPS", cost: 7.0, estimatedDelivery: "2026-08-12" }],
    },
    {
      retailer: "Temu",
      price: 245.0,
      packQuantity: 1,
      shippingOptions: [{ carrier: "Standard", cost: 3.5, estimatedDelivery: "2026-08-16" }],
    },
  ],
  "phone-charger": [
    {
      retailer: "Amazon",
      price: 15.99,
      packQuantity: 1,
      shippingOptions: [
        { carrier: "USPS", cost: 3.75, estimatedDelivery: "2026-08-13" },
        { carrier: "UPS", cost: 5.0, estimatedDelivery: "2026-08-12" },
      ],
    },
    {
      retailer: "Walmart",
      price: 24.99,
      packQuantity: 2,
      shippingOptions: [{ carrier: "UPS", cost: 4.0, estimatedDelivery: "2026-08-12" }],
    },
    {
      retailer: "Temu",
      price: 21.98,
      packQuantity: 2,
      shippingOptions: [{ carrier: "Standard", cost: 2.0, estimatedDelivery: "2026-08-16" }],
    },
  ],
  "water-bottle": [
    {
      retailer: "Amazon",
      price: 24.99,
      packQuantity: 1,
      shippingOptions: [{ carrier: "USPS", cost: 4.0, estimatedDelivery: "2026-08-13" }],
    },
    {
      retailer: "Walmart",
      price: 19.99,
      packQuantity: 1,
      shippingOptions: [{ carrier: "UPS", cost: 5.75, estimatedDelivery: "2026-08-12" }],
    },
    {
      retailer: "Temu",
      price: 34.99,
      packQuantity: 2,
      shippingOptions: [{ carrier: "Standard", cost: 3.0, estimatedDelivery: "2026-08-16" }],
    },
  ],
  "running-shoes": [
    {
      retailer: "Amazon",
      price: 89.99,
      packQuantity: 1,
      shippingOptions: [{ carrier: "UPS", cost: 9.0, estimatedDelivery: "2026-08-12" }],
    },
    {
      retailer: "Walmart",
      price: 74.0,
      packQuantity: 1,
      shippingOptions: [{ carrier: "USPS", cost: 7.5, estimatedDelivery: "2026-08-14" }],
    },
    {
      retailer: "Temu",
      price: 61.25,
      packQuantity: 1,
      shippingOptions: [{ carrier: "Standard", cost: 5.0, estimatedDelivery: "2026-08-16" }],
    },
  ],
  backpack: [
    {
      retailer: "Amazon",
      price: 54.99,
      packQuantity: 1,
      shippingOptions: [{ carrier: "UPS", cost: 8.0, estimatedDelivery: "2026-08-12" }],
    },
    {
      retailer: "Walmart",
      price: 45.0,
      packQuantity: 1,
      shippingOptions: [{ carrier: "USPS", cost: 6.5, estimatedDelivery: "2026-08-14" }],
    },
    {
      retailer: "Temu",
      price: 39.99,
      packQuantity: 1,
      shippingOptions: [{ carrier: "Standard", cost: 4.5, estimatedDelivery: "2026-08-16" }],
    },
  ],
  "wireless-mouse": [
    {
      retailer: "Amazon",
      price: 22.99,
      packQuantity: 1,
      shippingOptions: [{ carrier: "USPS", cost: 3.5, estimatedDelivery: "2026-08-13" }],
    },
    {
      retailer: "Walmart",
      price: 18.5,
      packQuantity: 1,
      shippingOptions: [{ carrier: "UPS", cost: 5.0, estimatedDelivery: "2026-08-12" }],
    },
    {
      retailer: "Temu",
      price: 15.99,
      packQuantity: 1,
      shippingOptions: [{ carrier: "Standard", cost: 2.5, estimatedDelivery: "2026-08-16" }],
    },
  ],
  "mechanical-keyboard": [
    {
      retailer: "Amazon",
      price: 79.99,
      packQuantity: 1,
      shippingOptions: [{ carrier: "USPS", cost: 5.0, estimatedDelivery: "2026-08-14" }],
    },
    {
      retailer: "Walmart",
      price: 69.99,
      packQuantity: 1,
      shippingOptions: [{ carrier: "UPS", cost: 7.0, estimatedDelivery: "2026-08-12" }],
    },
    {
      retailer: "Temu",
      price: 58.0,
      packQuantity: 1,
      shippingOptions: [{ carrier: "Standard", cost: 4.0, estimatedDelivery: "2026-08-16" }],
    },
  ],
  "coffee-beans": [
    {
      retailer: "Amazon",
      price: 12.99,
      packQuantity: 1,
      shippingOptions: [{ carrier: "USPS", cost: 4.25, estimatedDelivery: "2026-08-13" }],
    },
    {
      retailer: "Walmart",
      price: 21.99,
      packQuantity: 2,
      shippingOptions: [{ carrier: "UPS", cost: 5.5, estimatedDelivery: "2026-08-12" }],
    },
    {
      retailer: "Temu",
      price: 19.99,
      packQuantity: 2,
      shippingOptions: [{ carrier: "Standard", cost: 3.0, estimatedDelivery: "2026-08-16" }],
    },
  ],
  sunglasses: [
    {
      retailer: "Amazon",
      price: 34.99,
      packQuantity: 1,
      shippingOptions: [{ carrier: "USPS", cost: 3.25, estimatedDelivery: "2026-08-13" }],
    },
    {
      retailer: "Walmart",
      price: 29.99,
      packQuantity: 1,
      shippingOptions: [{ carrier: "UPS", cost: 4.75, estimatedDelivery: "2026-08-12" }],
    },
    {
      retailer: "Temu",
      price: 11.5,
      packQuantity: 1,
      shippingOptions: [{ carrier: "Standard", cost: 2.75, estimatedDelivery: "2026-08-16" }],
    },
  ],
  "yoga-mat": [
    {
      retailer: "Amazon",
      price: 27.99,
      packQuantity: 1,
      shippingOptions: [{ carrier: "USPS", cost: 5.5, estimatedDelivery: "2026-08-14" }],
    },
    {
      retailer: "Walmart",
      price: 22.0,
      packQuantity: 1,
      shippingOptions: [{ carrier: "UPS", cost: 7.25, estimatedDelivery: "2026-08-12" }],
    },
    {
      retailer: "Temu",
      price: 16.75,
      packQuantity: 1,
      shippingOptions: [{ carrier: "Standard", cost: 4.0, estimatedDelivery: "2026-08-16" }],
    },
  ],
  "bluetooth-speaker": [
    {
      retailer: "Amazon",
      price: 45.99,
      packQuantity: 1,
      shippingOptions: [{ carrier: "USPS", cost: 6.0, estimatedDelivery: "2026-08-14" }],
    },
    {
      retailer: "Walmart",
      price: 39.0,
      packQuantity: 1,
      shippingOptions: [{ carrier: "UPS", cost: 7.75, estimatedDelivery: "2026-08-12" }],
    },
    {
      retailer: "Temu",
      price: 32.5,
      packQuantity: 1,
      shippingOptions: [{ carrier: "Standard", cost: 5.0, estimatedDelivery: "2026-08-16" }],
    },
  ],
};
