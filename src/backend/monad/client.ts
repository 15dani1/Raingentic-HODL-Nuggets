/**
 * Monad integration stubs.
 *
 * Owned by: backend team.
 *
 * Server-side only. Reads RPC URL / chain config from environment variables
 * (see .env.example). Used for spend-policy enforcement and (future)
 * multi-agent reward pool distribution.
 */

const MONAD_RPC_URL = process.env.MONAD_RPC_URL ?? "https://testnet-rpc.monad.xyz";
const MONAD_CHAIN_ID = process.env.MONAD_CHAIN_ID ?? "10143"; // Monad testnet

export function getMonadConfig() {
  return {
    rpcUrl: MONAD_RPC_URL,
    chainId: MONAD_CHAIN_ID,
  };
}

/**
 * TODO(backend): call/verify an on-chain spend-policy contract before
 * releasing funds to a Rain scoped card.
 */
export async function checkSpendPolicy(_amount: number): Promise<boolean> {
  return true;
}

/**
 * TODO(backend, future phase): distribute rewards to the winning agent in
 * the multi-agent competition via a Monad reward-pool contract.
 */
export async function distributeReward(_agentId: string, _amount: number): Promise<void> {
  throw new Error("distributeReward is not implemented yet (future phase)");
}
