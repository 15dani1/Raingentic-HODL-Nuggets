/**
 * Thin API route — delegates to the backend arbitrage engine.
 * Owned by: backend team.
 *
 * Returns the single-unit display price only (no multi-pack quantity
 * mismatch logic here — that's evaluated during checkout/Buy Now).
 */
import { NextRequest, NextResponse } from "next/server";
import { PRODUCTS } from "@/backend/data/mockData";
import { getMarketplacePrice } from "@/backend/services/arbitrageEngine";

export async function GET(req: NextRequest) {
  const productId = req.nextUrl.searchParams.get("productId");
  const maxDeliveryDaysParam = req.nextUrl.searchParams.get("maxDeliveryDays");
  const maxDeliveryDays = maxDeliveryDaysParam ? Number(maxDeliveryDaysParam) : undefined;

  if (!productId || !PRODUCTS.some((p) => p.id === productId)) {
    return NextResponse.json({ error: "Unknown productId" }, { status: 404 });
  }

  const price = getMarketplacePrice(productId, undefined, maxDeliveryDays);
  return NextResponse.json({ price });
}
