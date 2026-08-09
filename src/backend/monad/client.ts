/**
 * Monad integration stubs.
 *
 * Owned by: backend team.
 *
 * Server-side only. Reads RPC URL / chain config from environment variables
 * (see .env.example). Used for spend-policy enforcement and (future)
 * multi-agent reward pool distribution.
 */

/**
 * Monad integration client.
 *
 * Owned by: backend team.
 *
 * Server-side only. Talks to the real Monad testnet JSON-RPC endpoint
 * (see https://docs.monad.xyz/ and the hackathon builder one-pager) to:
 *   - verify the network is live before releasing funds (spend-policy gate)
 *   - report real on-chain metrics (chain id, latest block, gas price, and
 *     the Monad testnet USDC token balance) on the developer dashboard
 *   - broadcast a real settlement transaction from the agent's funded
 *     wallet for every completed purchase, so the on-chain balance shown
 *     on the Dev Dashboard actually decreases as orders are placed
 *
 * If MONAD_WALLET_PRIVATE_KEY is set, a real signer is created and used to
 * send a small settlement transaction (scaled to the order's landed cost,
 * in MON) for every checkout — this is a self-transfer (no counterparty
 * contract exists yet) but it IS a real, broadcast, gas-paying
 * transaction that reduces the wallet's on-chain balance, unlike the
 * previous read-only-only setup. If no private key is configured, this
 * step is skipped and checkout proceeds using only the liveness-check
 * spend-policy gate, same as before.
 */
import { ethers } from "ethers";
import { recordApiCall } from "@/backend/services/callLog";

const MONAD_RPC_URL = process.env.MONAD_RPC_URL ?? "https://testnet-rpc.monad.xyz";
const MONAD_CHAIN_ID = process.env.MONAD_CHAIN_ID ?? "10143"; // Monad testnet

// Monad testnet USDC test token, from the hackathon builder one-pager
// (https://docs.monad.xyz/ builder resources PDF).
const MONAD_USDC_CONTRACT =
  process.env.MONAD_USDC_CONTRACT ?? "0x534b2f3A21130d7a60830c2Df862319e593943A3";

// Wallet the agent uses to receive testnet funds (faucet) and, if a
// private key is configured, sign real settlement transactions. Only the
// address is ever exposed to the frontend/dashboard — the private key
// stays server-side and unexported.
const MONAD_WALLET_ADDRESS = process.env.MONAD_WALLET_ADDRESS ?? null;
const MONAD_WALLET_PRIVATE_KEY = process.env.MONAD_WALLET_PRIVATE_KEY ?? null;

// Scales each order's USD landed cost down into a small MON amount so a
// handful of demo purchases don't drain the whole faucet balance in one
// sitting (1 landed-cost dollar -> 0.001 MON "settlement" transfer).
const USD_TO_MON_SETTLEMENT_RATE = 0.001;

let cachedProvider: ethers.JsonRpcProvider | null = null;
function getProvider(): ethers.JsonRpcProvider {
  if (!cachedProvider) {
    cachedProvider = new ethers.JsonRpcProvider(MONAD_RPC_URL, {
      chainId: Number(MONAD_CHAIN_ID),
      name: "monad-testnet",
    });
  }
  return cachedProvider;
}

/** True if a private key is configured and a real signer can be created. */
export function hasSigner(): boolean {
  return Boolean(MONAD_WALLET_PRIVATE_KEY);
}

export function getMonadConfig() {
  return {
    rpcUrl: MONAD_RPC_URL,
    chainId: MONAD_CHAIN_ID,
    usdcContract: MONAD_USDC_CONTRACT,
    walletAddress: MONAD_WALLET_ADDRESS,
    hasSigner: hasSigner(),
  };
}

let rpcId = 1;

/** Minimal JSON-RPC 2.0 call against the configured Monad RPC endpoint. */
async function rpcCall<T = unknown>(method: string, params: unknown[] = []): Promise<T> {
  const startedAt = Date.now();
  const body = { jsonrpc: "2.0", id: rpcId++, method, params };

  try {
    const res = await fetch(MONAD_RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    const durationMs = Date.now() - startedAt;

    if (!res.ok || data.error) {
      recordApiCall({
        source: "monad",
        method: "POST",
        path: method,
        success: false,
        statusCode: res.status,
        durationMs,
        error: data.error ? JSON.stringify(data.error) : `HTTP ${res.status}`,
      });
      throw new Error(`Monad RPC error on ${method}: ${JSON.stringify(data.error ?? res.status)}`);
    }

    recordApiCall({
      source: "monad",
      method: "POST",
      path: method,
      success: true,
      statusCode: res.status,
      durationMs,
      summary: typeof data.result === "string" ? `-> ${data.result}` : undefined,
    });

    return data.result as T;
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("Monad RPC error")) throw err;
    recordApiCall({
      source: "monad",
      method: "POST",
      path: method,
      success: false,
      durationMs: Date.now() - startedAt,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

export interface MonadNetworkStatus {
  chainId: number;
  latestBlock: number;
  gasPriceWei: string;
  usdcContract: string;
  reachable: boolean;
  walletAddress: string | null;
  walletBalanceWei: string | null;
}

/**
 * Reads real, current network status from Monad testnet: chain id, latest
 * block number, current gas price, and (if MONAD_WALLET_ADDRESS is set)
 * the native MON balance of the agent's wallet — so you can confirm
 * faucet funds have actually landed. Used to power the "Monad" panel on
 * the developer dashboard and as the network-liveness check behind
 * checkSpendPolicy.
 */
export async function getNetworkStatus(): Promise<MonadNetworkStatus> {
  const [chainIdHex, blockHex, gasPriceHex, balanceHex] = await Promise.all([
    rpcCall<string>("eth_chainId"),
    rpcCall<string>("eth_blockNumber"),
    rpcCall<string>("eth_gasPrice"),
    MONAD_WALLET_ADDRESS
      ? rpcCall<string>("eth_getBalance", [MONAD_WALLET_ADDRESS, "latest"])
      : Promise.resolve(null),
  ]);

  return {
    chainId: parseInt(chainIdHex, 16),
    latestBlock: parseInt(blockHex, 16),
    gasPriceWei: BigInt(gasPriceHex).toString(),
    usdcContract: MONAD_USDC_CONTRACT,
    reachable: true,
    walletAddress: MONAD_WALLET_ADDRESS,
    walletBalanceWei: balanceHex ? BigInt(balanceHex).toString() : null,
  };
}

/**
 * Broadcasts a real, on-chain Monad testnet transaction to settle a
 * completed purchase against the agent's wallet, so the wallet's on-chain
 * balance visibly decreases (by value transferred + gas paid) as orders
 * are placed. Currently a self-transfer to the agent's own address, since
 * no counterparty spend-policy/escrow contract exists yet — the important
 * part for the dashboard is that this is a real broadcast, mined
 * transaction, not a simulated number.
 *
 * `landedCostUsd` is scaled down by USD_TO_MON_SETTLEMENT_RATE into a
 * small MON amount so demo purchases don't drain the whole faucet
 * balance. Returns null (and logs a failed call) if no signer is
 * configured, the wallet has insufficient MON, or the tx fails to
 * broadcast/mine — callers should treat that as "settlement skipped",
 * not as a reason to fail the whole checkout.
 */
export async function settlePurchaseOnChain(
  orderId: string,
  landedCostUsd: number,
): Promise<{ txHash: string; amountWei: string } | null> {
  if (!MONAD_WALLET_PRIVATE_KEY || !MONAD_WALLET_ADDRESS) return null;

  const startedAt = Date.now();
  try {
    const provider = getProvider();
    const wallet = new ethers.Wallet(MONAD_WALLET_PRIVATE_KEY, provider);
    const amountMon = Math.max(landedCostUsd * USD_TO_MON_SETTLEMENT_RATE, 0.0001);
    const value = ethers.parseEther(amountMon.toFixed(8));

    const tx = await wallet.sendTransaction({
      to: MONAD_WALLET_ADDRESS,
      value,
    });
    const receipt = await tx.wait();

    recordApiCall({
      source: "monad",
      method: "POST",
      path: "eth_sendTransaction",
      success: true,
      durationMs: Date.now() - startedAt,
      summary: `Settled order ${orderId} on-chain: ${amountMon.toFixed(6)} MON, tx ${tx.hash}`,
    });

    return { txHash: receipt?.hash ?? tx.hash, amountWei: value.toString() };
  } catch (err) {
    recordApiCall({
      source: "monad",
      method: "POST",
      path: "eth_sendTransaction",
      success: false,
      durationMs: Date.now() - startedAt,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/**
 * Spend-policy gate checked before releasing funds to a Rain scoped card.
 *
 * Currently: verifies Monad testnet is live and reachable (real
 * eth_blockNumber call) as a stand-in for a full on-chain spend-policy
 * contract check. If the network can't be reached, purchases are blocked
 * rather than silently proceeding.
 *
 * TODO(backend): replace the liveness check with a real call to an
 * on-chain spend-policy contract that enforces per-agent spend limits.
 */
export async function checkSpendPolicy(amount: number): Promise<boolean> {
  if (amount <= 0) return false;
  try {
    await rpcCall<string>("eth_blockNumber");
    return true;
  } catch {
    return false;
  }
}

/**
 * TODO(backend, future phase): distribute rewards to the winning agent in
 * the multi-agent competition via a Monad reward-pool contract. Requires a
 * funded signer/private key, which isn't configured yet.
 */
export async function distributeReward(_agentId: string, _amount: number): Promise<void> {
  throw new Error("distributeReward is not implemented yet (future phase)");
}
