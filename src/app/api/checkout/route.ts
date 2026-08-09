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
 * Rain integration: if RAIN_API_KEY / RAIN_USER_ID / RAIN_CONTRACT_ID are
 * set (see .env.example), this issues a real scoped card in Rain's
 * sandbox and simulates authorize + settle against it via
 * src/backend/rain/client.ts (ported from rain_demo.py). If those env
 * vars are missing, it falls back to a simulated confirmation so the
 * frontend keeps working without any credentials configured.
 */
import { NextRequest, NextResponse } from "next/server";
import {
  checkQuantityMismatch,
  getCheapestOverallQuote,
  getCheapestSingleUnitQuote,
} from "@/backend/services/arbitrageEngine";
import { executePurchase, getRainConfig, issueScopedCard } from "@/backend/rain/client";
import { checkSpendPolicy } from "@/backend/monad/client";
import { recordApiCall } from "@/backend/services/callLog";
import { recordOrder } from "@/backend/services/orderLog";
import type { CheckoutRequest, CheckoutResult, LandedCostQuote } from "@/shared/types";

const MARGIN_RATE = 1.12;
const DEFAULT_MCC = "5999"; // Miscellaneous and specialty retail stores

function isRainConfigured(): boolean {
  try {
    getRainConfig();
    return true;
  } catch {
    return false;
  }
}

async function completeOrderViaRain(quote: LandedCostQuote): Promise<CheckoutResult> {
  const totalChargedToUser = Math.round(quote.totalLandedCost * MARGIN_RATE * 100) / 100;
  const amountInUsdCents = Math.round(quote.totalLandedCost * 100);

  const card = await issueScopedCard(amountInUsdCents);
  const { transactionId } = await executePurchase(
    card.id,
    amountInUsdCents,
    quote.retailer,
    DEFAULT_MCC,
  );

  return {
    orderId: transactionId,
    productId: quote.productId,
    retailer: quote.retailer,
    carrier: quote.carrier,
    totalPaidByAgent: quote.totalLandedCost,
    totalChargedToUser,
    estimatedDelivery: quote.estimatedDelivery,
    status: "confirmed",
  };
}

function completeOrderSimulated(quote: LandedCostQuote): CheckoutResult {
  return {
    orderId: `sim-${Date.now()}`,
    productId: quote.productId,
    retailer: quote.retailer,
    carrier: quote.carrier,
    totalPaidByAgent: quote.totalLandedCost,
    totalChargedToUser: Math.round(quote.totalLandedCost * MARGIN_RATE * 100) / 100,
    estimatedDelivery: quote.estimatedDelivery,
    status: "confirmed",
  };
}

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

  const startedAt = Date.now();
  try {
    // Gate the purchase with a real Monad spend-policy/liveness check before
    // issuing a Rain card.
    const spendPolicyOk = await checkSpendPolicy(quote.totalLandedCost);
    if (!spendPolicyOk) {
      throw new Error("Monad spend-policy check failed — refusing to release funds.");
    }

    const result = isRainConfigured()
      ? await completeOrderViaRain(quote)
      : completeOrderSimulated(quote);
    recordApiCall({
      source: "checkout",
      method: "POST",
      path: `/api/checkout (${quote.productId})`,
      success: true,
      durationMs: Date.now() - startedAt,
      summary: `${isRainConfigured() ? "Rain" : "simulated"} order via ${quote.retailer}/${quote.carrier} — $${quote.totalLandedCost.toFixed(2)}`,
    });
    recordOrder({
      orderId: result.orderId,
      productId: result.productId,
      retailer: result.retailer,
      carrier: result.carrier,
      totalPaidByAgent: result.totalPaidByAgent,
      totalChargedToUser: result.totalChargedToUser,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("Checkout failed:", err);
    recordApiCall({
      source: "checkout",
      method: "POST",
      path: `/api/checkout (${quote.productId})`,
      success: false,
      durationMs: Date.now() - startedAt,
      error: err instanceof Error ? err.message : String(err),
    });
    const failed: CheckoutResult = {
      orderId: "",
      productId: quote.productId,
      retailer: quote.retailer,
      carrier: quote.carrier,
      totalPaidByAgent: 0,
      totalChargedToUser: 0,
      estimatedDelivery: quote.estimatedDelivery,
      status: "failed",
    };
    return NextResponse.json(failed, { status: 502 });
  }
}
