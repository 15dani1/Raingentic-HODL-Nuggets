/**
 * Thin API route — delegates to the backend purchase/checkout flow.
 * Owned by: backend team.
 *
 * This is where the agent's full arbitrage search happens (across all
 * pack sizes, not just single units). If the cheapest option requires
 * buying more than the user asked for, this returns a "needs_confirmation"
 * result with a quantityMismatch prompt instead of completing the order —
 * the client must re-submit with `acceptedPackQuantity` set to true/false.
 *
 * NOTE: Rain purchase execution (issueScopedCard / executePurchase) is not
 * implemented yet — this currently returns a simulated confirmation so the
 * frontend can be built against a stable contract.
 */
import { NextRequest, NextResponse } from "next/server";
import {
  checkQuantityMismatch,
  getCheapestOverallQuote,
  getCheapestSingleUnitQuote,
} from "@/backend/services/arbitrageEngine";
import type { CheckoutRequest, CheckoutResult } from "@/shared/types";

const MARGIN_RATE = 1.12;

export async function POST(req: NextRequest) {
  const body = (await req.json()) as CheckoutRequest;
  const requestedQuantity = body.requestedQuantity ?? 1;

  const mismatch = checkQuantityMismatch(body.productId, requestedQuantity);

  // Mismatch found and user hasn't answered yet — ask before buying anything.
  if (mismatch && body.acceptedPackQuantity === undefined) {
    const pending: CheckoutResult = {
      orderId: "",
      productId: body.productId,
      retailer: "",
      carrier: "",
      totalPaidByAgent: 0,
      totalChargedToUser: 0,
      estimatedDelivery: "",
      status: "needs_confirmation",
      quantityMismatch: mismatch,
    };
    return NextResponse.json(pending);
  }

  // User declined the pack — buy the cheapest option that fits their requested quantity.
  const quote =
    mismatch && body.acceptedPackQuantity === false
      ? getCheapestSingleUnitQuote(body.productId, requestedQuantity)
      : getCheapestOverallQuote(body.productId);

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
    totalChargedToUser: Math.round(quote.totalLandedCost * MARGIN_RATE * 100) / 100,
    estimatedDelivery: quote.estimatedDelivery,
    status: "confirmed",
  };

  return NextResponse.json(result);
}
