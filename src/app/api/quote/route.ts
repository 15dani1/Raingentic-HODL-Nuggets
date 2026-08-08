/**
 * Thin API route — delegates to the backend arbitrage engine.
 * Owned by: backend team.
 */
import { NextRequest, NextResponse } from "next/server";
import { PRODUCTS } from "@/backend/data/mockData";
import {
  checkQuantityMismatch,
  getMarketplacePrice,
} from "@/backend/services/arbitrageEngine";

export async function GET(req: NextRequest) {
  const productId = req.nextUrl.searchParams.get("productId");
  const requestedQuantity = Number(req.nextUrl.searchParams.get("quantity") ?? "1");

  if (!productId || !PRODUCTS.some((p) => p.id === productId)) {
    return NextResponse.json({ error: "Unknown productId" }, { status: 404 });
  }

  const price = getMarketplacePrice(productId);
  const quantityMismatch = checkQuantityMismatch(productId, requestedQuantity);

  return NextResponse.json({ price, quantityMismatch });
}
