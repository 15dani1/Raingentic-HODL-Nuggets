/**
 * Rain API client.
 *
 * Owned by: backend team.
 *
 * Reads credentials from environment variables (see .env.example). Never
 * import this file from anything that runs in the browser — it must only be
 * used inside Next.js API routes / server code (src/app/api/**) so the API
 * key is never bundled into client-side JavaScript.
 */

const RAIN_API_BASE_URL = process.env.RAIN_API_BASE_URL ?? "https://api.rain.xyz";

export interface RainConfig {
  apiKey: string;
  userId: string;
  teamId: string;
  collateralContractId: string;
}

export function getRainConfig(): RainConfig {
  const apiKey = process.env.RAIN_API_KEY;
  const userId = process.env.RAIN_USER_ID;
  const teamId = process.env.RAIN_TEAM_ID;
  const collateralContractId = process.env.RAIN_COLLATERAL_CONTRACT_ID;

  if (!apiKey || !userId || !teamId || !collateralContractId) {
    throw new Error(
      "Missing Rain credentials. Set RAIN_API_KEY, RAIN_USER_ID, RAIN_TEAM_ID, " +
        "and RAIN_COLLATERAL_CONTRACT_ID in your environment (see .env.example).",
    );
  }

  return { apiKey, userId, teamId, collateralContractId };
}

/**
 * TODO(backend): implement scoped virtual card issuance ahead of a purchase.
 * Should cap spend at `maxAmount` so the agent can never overspend.
 */
export async function issueScopedCard(_maxAmount: number): Promise<{ cardId: string }> {
  const config = getRainConfig();
  void RAIN_API_BASE_URL;
  void config;
  throw new Error("issueScopedCard is not implemented yet");
}

/**
 * TODO(backend): implement the retail transaction execution using the
 * scoped card issued above.
 */
export async function executePurchase(_cardId: string, _amount: number): Promise<{ transactionId: string }> {
  throw new Error("executePurchase is not implemented yet");
}
