/**
 * Thin API route — delegates to the backend purchase/checkout flow.
 * Owned by: backend team.
 *
 * NOTE: Rain purchase execution (issueScopedCard / executePurchase) is not
 * implemented yet — this currently returns a simulated confirmation so the
 * frontend can be built against a stable contract.
 */
import { NextRequest, NextResponse } from "next/server";
import { getCheapestQuote } from "@/backend/services/arbitrageEngine";
import type { CheckoutRequest, CheckoutResult } from "@/shared/types";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as CheckoutRequest;
  const quote = getCheapestQuote(body.productId);

  if (!quote) {
    return NextResponse.json({ error: "Unknown productId" }, { status: 404 });
  }

  // TODO(backend): replace with real Rain issueScopedCard + executePurchase,
  // gated by Monad checkSpendPolicy.
  const result: CheckoutResult = {
    orderId: `sim-${Date.now()}`,
    productId: body.productId,
    retailer: quote.retailer,
    carrier: quote.carrier,
    totalPaidByAgent: quote.totalLandedCost,
    totalChargedToUser: Math.round(quote.totalLandedCost * 1.12 * 100) / 100,
    estimatedDelivery: quote.estimatedDelivery,
    status: "confirmed",
  };

  return NextResponse.json(result);
}
