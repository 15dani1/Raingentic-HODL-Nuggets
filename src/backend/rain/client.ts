/**
 * Rain sandbox API client.
 *
 * Owned by: backend team.
 *
 * This is a TypeScript port of the working sandbox flow from
 * `rain_demo.py` (session-id generation, scoped card issuance,
 * authorize + settle, collateral funding, ACH-on-ramp, payment-route
 * simulation). Keep this file as the single place that talks to Rain so
 * both the checkout API route and any future admin/demo tooling share the
 * same implementation.
 *
 * Server-side only — never import this from client components, since it
 * reads the Rain API key from environment variables.
 */

import crypto from "crypto";
import { recordApiCall } from "@/backend/services/callLog";

const BASE_URL = process.env.RAIN_API_BASE_URL ?? "https://api-dev.raincards.xyz/v1";

// Rain's sandbox SessionId RSA public key. Do not replace with a
// self-generated key — Rain's sandbox only accepts sessions encrypted with
// this specific key.
const RAIN_PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCAP192809jZyaw62g/eTzJ3P9H
+RmT88sXUYjQ0K8Bx+rJ83f22+9isKx+lo5UuV8tvOlKwvdDS/pVbzpG7D7NO45c
0zkLOXwDHZkou8fuj8xhDO5Tq3GzcrabNLRLVz3dkx0znfzGOhnY4lkOMIdKxlQb
LuVM/dGDC9UpulF+UwIDAQAB
-----END PUBLIC KEY-----`;

export interface RainConfig {
  apiKey: string;
  userId: string;
  contractId: string;
  /** Optional — not required by the sandbox demo flow, but kept for any
   * future Rain endpoints that are scoped per-team. */
  teamId?: string;
}

export function getRainConfig(): RainConfig {
  const apiKey = process.env.RAIN_API_KEY;
  const userId = process.env.RAIN_USER_ID;
  const contractId = process.env.RAIN_CONTRACT_ID;
  const teamId = process.env.RAIN_TEAM_ID;

  if (!apiKey || !userId || !contractId) {
    throw new Error(
      "Missing Rain credentials. Set RAIN_API_KEY, RAIN_USER_ID, and " +
        "RAIN_CONTRACT_ID in your environment (see .env.example).",
    );
  }

  return { apiKey, userId, contractId, teamId };
}

// ============================================================
// Session ID generation
// ============================================================

export interface RainSession {
  /** Encrypted session value sent as the `sessionid` HTTP header. */
  sessionId: string;
  /** Original 32-character hex secret. Keep in memory only, never log it. */
  secretKey: string;
}

/**
 * Generates a Rain sandbox session id: a random 32-hex-char secret,
 * base64-encoded, then RSA-OAEP(SHA-1) encrypted with Rain's sandbox
 * public key.
 */
export function generateSessionId(): RainSession {
  const secretKey = crypto.randomBytes(16).toString("hex"); // 32 hex chars
  if (secretKey.length !== 32) {
    throw new Error(`Invalid secret key length: ${secretKey.length}`);
  }

  const secretKeyBase64 = Buffer.from(secretKey, "hex").toString("base64");

  const encrypted = crypto.publicEncrypt(
    {
      key: RAIN_PUBLIC_KEY_PEM,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha1",
    },
    Buffer.from(secretKeyBase64),
  );

  return { sessionId: encrypted.toString("base64"), secretKey };
}

// ============================================================
// HTTP helper
// ============================================================

async function apiRequest<T = unknown>(
  method: "GET" | "POST",
  path: string,
  options: { sessionId?: string; jsonBody?: unknown; summary?: string } = {},
): Promise<T> {
  const { apiKey } = getRainConfig();
  const startedAt = Date.now();

  const headers: Record<string, string> = {
    "Api-Key": apiKey,
    "Content-Type": "application/json",
  };
  if (options.sessionId) headers["sessionid"] = options.sessionId;

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: options.jsonBody !== undefined ? JSON.stringify(options.jsonBody) : undefined,
    });

    const data = await res.json().catch(() => null);
    const durationMs = Date.now() - startedAt;

    if (!res.ok) {
      recordApiCall({
        source: "rain",
        method,
        path,
        success: false,
        statusCode: res.status,
        durationMs,
        summary: options.summary,
        error: JSON.stringify(data),
      });
      throw new Error(
        `Rain API error ${res.status} on ${method} ${path}: ${JSON.stringify(data)}`,
      );
    }

    recordApiCall({
      source: "rain",
      method,
      path,
      success: true,
      statusCode: res.status,
      durationMs,
      summary: options.summary,
    });

    return data as T;
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("Rain API error")) {
      throw err; // already recorded above
    }
    recordApiCall({
      source: "rain",
      method,
      path,
      success: false,
      durationMs: Date.now() - startedAt,
      summary: options.summary,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

// ============================================================
// STEP 1: Fund collateral (sandbox only)
// ============================================================

/** Funds the sandbox collateral contract. Amount is in USD cents. */
export async function fundCollateral(amountInUsdCents = 100000) {
  const { contractId } = getRainConfig();
  return apiRequest("POST", "/simulate/collateral/fund", {
    jsonBody: { contractId, currency: "rusd", amount: amountInUsdCents },
    summary: `Funded collateral with $${(amountInUsdCents / 100).toFixed(2)}`,
  });
}

// ============================================================
// STEP 2 + 3: Session + scoped card issuance
// ============================================================

export interface ScopedCard {
  id: string;
  last4?: string;
  status?: string;
  [key: string]: unknown;
}

/**
 * Issues a scoped virtual card capped at `amountInUsdCents`. This caps the
 * agent's spend for a single purchase — it can never authorize more than
 * this amount on the card.
 */
export async function issueScopedCard(amountInUsdCents: number): Promise<ScopedCard> {
  const { userId } = getRainConfig();
  const { sessionId } = generateSessionId();

  const card = await apiRequest<ScopedCard>(
    "POST",
    `/issuing/users/${userId}/cards/scoped`,
    {
      sessionId,
      jsonBody: { amountInUSDCents: amountInUsdCents },
      summary: `Issued scoped card capped at $${(amountInUsdCents / 100).toFixed(2)}`,
    },
  );

  if (!card.id) {
    throw new Error("Rain did not return a card ID.");
  }

  return card;
}

// ============================================================
// STEP 4: Authorize + settle a transaction (sandbox simulation)
// ============================================================

export interface PurchaseResult {
  transactionId: string;
  settlement: unknown;
}

/**
 * Simulates authorizing and settling a card transaction in the Rain
 * sandbox. `amountInUsdCents` must be <= the scoped card's cap.
 */
export async function executePurchase(
  cardId: string,
  amountInUsdCents: number,
  merchantName: string,
  mcc: string,
): Promise<PurchaseResult> {
  const authorization = await apiRequest<{ transactionId?: string; status?: string }>(
    "POST",
    "/simulate/transactions/authorize",
    {
      jsonBody: {
        cardId,
        amount: amountInUsdCents,
        currency: "USD",
        merchantName,
        merchantCategoryCode: mcc,
      },
      summary: `Authorized $${(amountInUsdCents / 100).toFixed(2)} at ${merchantName}`,
    },
  );

  const transactionId = authorization.transactionId;
  if (!transactionId) {
    throw new Error(`No transactionId returned: ${JSON.stringify(authorization)}`);
  }
  if (authorization.status !== "authorized") {
    throw new Error(`Transaction was not authorized: ${JSON.stringify(authorization)}`);
  }

  const settlement = await apiRequest<{ status?: string }>(
    "POST",
    `/simulate/transactions/${transactionId}/settle`,
    {
      jsonBody: { amount: amountInUsdCents },
      summary: `Settled transaction ${transactionId}`,
    },
  );

  if (settlement.status !== "settled") {
    throw new Error(`Transaction did not settle: ${JSON.stringify(settlement)}`);
  }

  return { transactionId, settlement };
}

// ============================================================
// STEP 6: Read transaction history
// ============================================================

export async function listTransactions(limit = 20) {
  return apiRequest("GET", `/issuing/transactions?limit=${limit}`);
}

// ============================================================
// STEP 7-9: ACH -> USDC on-ramp + payment-route simulation
// ============================================================

/**
 * Returns the sandbox's existing ACH -> USDC/Base payment route id. Rain's
 * sandbox does not allow creating a second route with the same
 * source/destination, so this reuses the one already created (override via
 * RAIN_ONRAMP_ROUTE_ID env var).
 */
export function getOnrampRouteId(): string {
  return process.env.RAIN_ONRAMP_ROUTE_ID ?? "f9ddcfc8-4254-49f8-b973-9f1cbcd3ffc7";
}

/**
 * Simulates a transfer through a payment route. Sandbox limit observed:
 * max $100.00 per simulated transfer.
 */
export async function simulatePaymentRouteTransfer(paymentRouteId: string, amount: number) {
  const MAX_AMOUNT = 100.0;
  if (amount <= 0) throw new Error(`Payment-route amount must be positive: ${amount}`);
  if (amount > MAX_AMOUNT) {
    throw new Error(
      `Payment-route simulation cannot exceed $100.00 per transfer. Received $${amount.toFixed(2)}`,
    );
  }

  return apiRequest("POST", "/simulate/payment-routes", {
    jsonBody: { paymentRouteId, amount: String(amount) },
  });
}

export async function listTransferTransactions(limit = 20) {
  return apiRequest("GET", `/issuing/transactions?type=transfer&limit=${limit}`);
}

// ============================================================
// Monad spend-policy gate (checked before releasing funds)
// ============================================================

/**
 * TODO(backend): call/verify an on-chain spend-policy contract on Monad
 * before releasing funds to a Rain scoped card. Currently imported from
 * src/backend/monad/client.ts and left as a no-op there.
 */
