/**
 * Frontend UI component: developer/engineering dashboard.
 *
 * Shows what's actually happening behind the scenes — every outbound API
 * call (Rain sandbox requests, checkout outcomes), success/failure rates,
 * latency, profit per order, and Monad testnet status, all in one place
 * for debugging and demoing. Retailer/shipping pricing detail lives on the
 * separate Retailer Dashboard (/dashboard) — not duplicated here.
 *
 * Owned by: frontend/UI team (data comes from backend routes below).
 */
"use client";

import { useEffect, useState } from "react";
import type { ApiCallLogEntry, CallLogStats } from "@/backend/services/callLog";
import type { OrderLogEntry, ProfitStats } from "@/backend/services/orderLog";

interface DevMetrics {
  rainConfigured: boolean;
  stats: CallLogStats;
  calls: ApiCallLogEntry[];
  profit: ProfitStats;
  orders: OrderLogEntry[];
  monad: {
    config: { rpcUrl: string; chainId: string; usdcContract: string };
    status:
      | {
          chainId: number;
          latestBlock: number;
          gasPriceWei: string;
          usdcContract: string;
          reachable: true;
        }
      | { reachable: false; error: string };
  };
}

const REFRESH_MS = 2000;
// Highlight any call recorded within this window as "new" during a live demo.
const NEW_CALL_WINDOW_MS = 3000;

function StatCard({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  return (
    <div className="rounded-xl border border-zinc-200 px-5 py-4 dark:border-zinc-800">
      <div className="text-xs uppercase tracking-wide text-zinc-500">{label}</div>
      <div
        className={
          "mt-1 text-2xl font-semibold " +
          (tone === "good"
            ? "text-emerald-600 dark:text-emerald-400"
            : tone === "bad"
              ? "text-red-600 dark:text-red-400"
              : "")
        }
      >
        {value}
      </div>
    </div>
  );
}

/** Turns a Rain API path into a short, human-readable transaction type label. */
function rainTransactionType(path: string): string {
  if (path.includes("checkout")) return "Checkout";
  if (path.includes("cards/scoped")) return "Card issuance";
  if (path.includes("authorize")) return "Authorization";
  if (path.includes("settle")) return "Settlement";
  if (path.includes("collateral/fund")) return "Collateral funding";
  if (path.includes("transactions")) return "Transaction lookup";
  if (path.includes("payment-routes")) return "Payment routing";
  return "Other";
}

function RainCallLogTable({ calls, now }: { calls: ApiCallLogEntry[]; now: number }) {
  return (
    <div className="mb-14 overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
      <table className="w-full text-left text-sm">
        <thead className="bg-zinc-50 text-zinc-500 dark:bg-zinc-900">
          <tr>
            <th className="px-4 py-2">Time</th>
            <th className="px-4 py-2">Type</th>
            <th className="px-4 py-2">Method</th>
            <th className="px-4 py-2">Path</th>
            <th className="px-4 py-2">Status</th>
            <th className="px-4 py-2">Duration</th>
            <th className="px-4 py-2">Details</th>
          </tr>
        </thead>
        <tbody>
          {calls.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-6 text-center text-zinc-400">
                No Rain/checkout calls yet — browse the marketplace and click Buy Now to
                generate some.
              </td>
            </tr>
          )}
          {calls.map((call) => {
            const isNew = now - new Date(call.timestamp).getTime() < NEW_CALL_WINDOW_MS;
            return (
              <tr
                key={call.id}
                className={
                  "border-t border-zinc-100 transition-colors duration-1000 dark:border-zinc-800 " +
                  (isNew ? "bg-emerald-50 dark:bg-emerald-950/40" : "")
                }
              >
                <td className="px-4 py-2 whitespace-nowrap text-zinc-500">
                  {new Date(call.timestamp).toLocaleTimeString()}
                </td>
                <td className="px-4 py-2">
                  <span
                    className={
                      "rounded-full px-2 py-0.5 text-xs font-medium " +
                      (call.source === "checkout"
                        ? "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                        : "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300")
                    }
                  >
                    {rainTransactionType(call.path)}
                  </span>
                </td>
                <td className="px-4 py-2">{call.method}</td>
                <td className="px-4 py-2 font-mono text-xs">{call.path}</td>
                <td className="px-4 py-2">
                  <span
                    className={
                      "rounded-full px-2 py-0.5 text-xs font-medium " +
                      (call.success
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                        : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300")
                    }
                  >
                    {call.success ? `OK${call.statusCode ? ` ${call.statusCode}` : ""}` : "FAILED"}
                  </span>
                </td>
                <td className="px-4 py-2 whitespace-nowrap">{call.durationMs}ms</td>
                <td className="px-4 py-2 text-zinc-500">{call.error ?? call.summary ?? ""}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CallLogPanel({
  title,
  calls,
  emptyMessage,
  now,
}: {
  title: string;
  calls: ApiCallLogEntry[];
  emptyMessage: string;
  now: number;
}) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-zinc-600 dark:text-zinc-400">
        {title} <span className="font-normal text-zinc-400">({calls.length})</span>
      </h3>
      <div className="max-h-96 overflow-y-auto overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-zinc-50 text-zinc-500 dark:bg-zinc-900">
            <tr>
              <th className="px-3 py-2">Time</th>
              <th className="px-3 py-2">Method</th>
              <th className="px-3 py-2">Path</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Duration</th>
              <th className="px-3 py-2">Details</th>
            </tr>
          </thead>
          <tbody>
            {calls.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-zinc-400">
                  {emptyMessage}
                </td>
              </tr>
            )}
            {calls.map((call) => {
              const isNew = now - new Date(call.timestamp).getTime() < NEW_CALL_WINDOW_MS;
              return (
                <tr
                  key={call.id}
                  className={
                    "border-t border-zinc-100 transition-colors duration-1000 dark:border-zinc-800 " +
                    (isNew ? "bg-emerald-50 dark:bg-emerald-950/40" : "")
                  }
                >
                  <td className="px-3 py-2 whitespace-nowrap text-zinc-500">
                    {new Date(call.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="px-3 py-2">{call.method}</td>
                  <td className="px-3 py-2 font-mono text-xs">{call.path}</td>
                  <td className="px-3 py-2">
                    <span
                      className={
                        "rounded-full px-2 py-0.5 text-xs font-medium " +
                        (call.success
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                          : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300")
                      }
                    >
                      {call.success ? `OK${call.statusCode ? ` ${call.statusCode}` : ""}` : "FAILED"}
                    </span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{call.durationMs}ms</td>
                  <td className="px-3 py-2 text-zinc-500">{call.error ?? call.summary ?? ""}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function DevDashboard() {
  const [metrics, setMetrics] = useState<DevMetrics | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      fetch("/api/dev-metrics")
        .then((res) => res.json())
        .then((data) => {
          if (!cancelled) setMetrics(data);
        });
    };
    load();
    if (!autoRefresh) return;
    const id = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [autoRefresh]);

  const stats = metrics?.stats;

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-16">
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-3xl font-semibold tracking-tight">Developer Dashboard</h1>
        <label className="flex items-center gap-2 text-sm text-zinc-500">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
          />
          Auto-refresh
        </label>
      </div>
      <p className="mb-8 text-zinc-500">
        Behind-the-scenes engineering view: every outbound API call (Rain sandbox +
        Monad testnet RPC), success/failure rates, and per-order profit. Not visible
        from the marketplace. For retailer pricing/shipping data, see the Retailer
        Dashboard.
      </p>

      {/* Rain integration status */}
      <div className="mb-8 flex items-center gap-2 rounded-xl border border-zinc-200 px-4 py-3 text-sm dark:border-zinc-800">
        <span
          className={
            "inline-block h-2.5 w-2.5 rounded-full " +
            (metrics?.rainConfigured ? "bg-emerald-500" : "bg-amber-500")
          }
        />
        {metrics === null
          ? "Checking Rain configuration…"
          : metrics.rainConfigured
            ? "Rain sandbox credentials detected — checkout is making real Rain API calls."
            : "No Rain credentials found — checkout is running in simulated mode (set RAIN_API_KEY / RAIN_USER_ID / RAIN_CONTRACT_ID)."}
      </div>

      {/* Monad network status */}
      <div className="mb-8 rounded-xl border border-zinc-200 px-4 py-4 text-sm dark:border-zinc-800">
        <div className="mb-3 flex items-center gap-2">
          <span
            className={
              "inline-block h-2.5 w-2.5 rounded-full " +
              (metrics?.monad.status.reachable ? "bg-emerald-500" : "bg-red-500")
            }
          />
          <span className="font-medium">Monad testnet</span>
          {metrics && (
            <span className="text-zinc-500">
              {metrics.monad.status.reachable
                ? "reachable — used to gate purchases via checkSpendPolicy before releasing funds."
                : `unreachable — ${"error" in metrics.monad.status ? metrics.monad.status.error : "purchases are blocked"}`}
            </span>
          )}
        </div>
        {metrics?.monad.status.reachable && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <div className="text-xs uppercase tracking-wide text-zinc-500">Chain ID</div>
              <div className="mt-0.5 font-mono">{metrics.monad.status.chainId}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-zinc-500">Latest Block</div>
              <div className="mt-0.5 font-mono">
                {metrics.monad.status.latestBlock.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-zinc-500">Gas Price</div>
              <div className="mt-0.5 font-mono">
                {(Number(metrics.monad.status.gasPriceWei) / 1e9).toFixed(2)} gwei
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-zinc-500">USDC Contract</div>
              <div className="mt-0.5 truncate font-mono text-xs" title={metrics.monad.status.usdcContract}>
                {metrics.monad.status.usdcContract}
              </div>
            </div>
          </div>
        )}
        <div className="mt-3 text-xs text-zinc-400">
          RPC: {metrics?.monad.config.rpcUrl ?? "…"}
        </div>
      </div>

      {/* Profit — the number that matters most, shown first. */}
      <h2 className="mb-3 text-lg font-semibold">Profit</h2>
      <p className="mb-4 text-zinc-500">
        The spread between what the agent actually paid the retailer (product +
        shipping, via Rain) and what the user was charged, for every completed order.
      </p>
      <div className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Total Profit"
          value={metrics ? `$${metrics.profit.totalProfit.toFixed(2)}` : "—"}
          tone="good"
        />
        <StatCard
          label="Avg Profit / Order"
          value={metrics ? `$${metrics.profit.avgProfit.toFixed(2)}` : "—"}
        />
        <StatCard label="Orders" value={String(metrics?.profit.totalOrders ?? 0)} />
        <StatCard
          label="Revenue vs. Cost"
          value={
            metrics
              ? `$${metrics.profit.totalRevenue.toFixed(2)} / $${metrics.profit.totalCost.toFixed(2)}`
              : "—"
          }
        />
      </div>
      <div className="mb-14 overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-500 dark:bg-zinc-900">
            <tr>
              <th className="px-4 py-2">Time</th>
              <th className="px-4 py-2">Order</th>
              <th className="px-4 py-2">Retailer / Carrier</th>
              <th className="px-4 py-2">Agent Paid</th>
              <th className="px-4 py-2">User Charged</th>
              <th className="px-4 py-2">Profit</th>
            </tr>
          </thead>
          <tbody>
            {(metrics?.orders ?? []).length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-zinc-400">
                  No completed orders yet — buy something in the marketplace to see
                  profit show up here.
                </td>
              </tr>
            )}
            {(metrics?.orders ?? []).map((order) => {
              const isNew = now - new Date(order.timestamp).getTime() < NEW_CALL_WINDOW_MS;
              return (
                <tr
                  key={order.id}
                  className={
                    "border-t border-zinc-100 transition-colors duration-1000 dark:border-zinc-800 " +
                    (isNew ? "bg-emerald-50 dark:bg-emerald-950/40" : "")
                  }
                >
                  <td className="px-4 py-2 whitespace-nowrap text-zinc-500">
                    {new Date(order.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">{order.orderId}</td>
                  <td className="px-4 py-2">
                    {order.retailer} / {order.carrier}
                  </td>
                  <td className="px-4 py-2">${order.totalPaidByAgent.toFixed(2)}</td>
                  <td className="px-4 py-2">${order.totalChargedToUser.toFixed(2)}</td>
                  <td className="px-4 py-2 font-medium text-emerald-600 dark:text-emerald-400">
                    +${order.profit.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Rain call log — full detail, not height-constrained, since Rain
          calls are the ones the user actually cares about inspecting. */}
      <h2 className="mb-3 text-lg font-semibold">Rain API Calls</h2>
      <p className="mb-4 text-zinc-500">
        Every Rain sandbox request the agent made (card issuance, authorization,
        settlement), with the transaction type, status, and timing.
      </p>
      <RainCallLogTable calls={(metrics?.calls ?? []).filter((c) => c.source !== "monad")} now={now} />

      {/* Aggregate call stats — pushed to the bottom since raw call volume
          (dominated by frequent Monad RPC polling) is less meaningful than
          profit or the Rain call detail above. */}
      <h2 className="mb-3 mt-14 text-lg font-semibold">All API Call Volume</h2>
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-5">
        <StatCard label="Total Calls" value={String(stats?.totalCalls ?? 0)} />
        <StatCard label="Succeeded" value={String(stats?.successCount ?? 0)} tone="good" />
        <StatCard label="Failed" value={String(stats?.failureCount ?? 0)} tone="bad" />
        <StatCard
          label="Success Rate"
          value={stats ? `${(stats.successRate * 100).toFixed(0)}%` : "—"}
        />
        <StatCard
          label="Avg Latency"
          value={stats ? `${stats.avgDurationMs.toFixed(0)}ms` : "—"}
        />
      </div>
      <div className="mb-14 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <CallLogPanel
          title="Rain & Checkout"
          calls={(metrics?.calls ?? []).filter((c) => c.source !== "monad")}
          emptyMessage="No Rain/checkout calls yet — browse the marketplace and click Buy Now to generate some."
          now={now}
        />
        <CallLogPanel
          title="Monad"
          calls={(metrics?.calls ?? []).filter((c) => c.source === "monad")}
          emptyMessage="No Monad calls yet."
          now={now}
        />
      </div>
    </div>
  );
}
