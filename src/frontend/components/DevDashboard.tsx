/**
 * Frontend UI component: developer/engineering dashboard.
 *
 * Shows what's actually happening behind the scenes — every outbound API
 * call (Rain sandbox requests, checkout outcomes), success/failure rates,
 * latency, plus the same per-product pricing/shipping detail as the
 * retailer dashboard, all in one place for debugging and demoing.
 *
 * Owned by: frontend/UI team (data comes from backend routes below).
 */
"use client";

import { useEffect, useState } from "react";
import type { LandedCostQuote, Product } from "@/shared/types";
import type { ApiCallLogEntry, CallLogStats } from "@/backend/services/callLog";

interface DashboardRow {
  product: Product;
  quotes: LandedCostQuote[];
}

interface DevMetrics {
  rainConfigured: boolean;
  stats: CallLogStats;
  calls: ApiCallLogEntry[];
}

const REFRESH_MS = 4000;

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

export function DevDashboard() {
  const [metrics, setMetrics] = useState<DevMetrics | null>(null);
  const [rows, setRows] = useState<DashboardRow[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((res) => res.json())
      .then((data) => setRows(data.data ?? []));
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
        Behind-the-scenes engineering view: every outbound API call, success/failure
        rates, and per-product pricing/shipping data. Not visible from the marketplace.
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

      {/* Aggregate stats */}
      <div className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-5">
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

      {/* Call log */}
      <h2 className="mb-3 text-lg font-semibold">Recent API Calls</h2>
      <div className="mb-14 overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-500 dark:bg-zinc-900">
            <tr>
              <th className="px-4 py-2">Time</th>
              <th className="px-4 py-2">Source</th>
              <th className="px-4 py-2">Method</th>
              <th className="px-4 py-2">Path</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Duration</th>
              <th className="px-4 py-2">Details</th>
            </tr>
          </thead>
          <tbody>
            {(metrics?.calls ?? []).length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-zinc-400">
                  No API calls yet — browse the marketplace and click Buy Now to generate
                  some.
                </td>
              </tr>
            )}
            {(metrics?.calls ?? []).map((call) => (
              <tr key={call.id} className="border-t border-zinc-100 dark:border-zinc-800">
                <td className="px-4 py-2 whitespace-nowrap text-zinc-500">
                  {new Date(call.timestamp).toLocaleTimeString()}
                </td>
                <td className="px-4 py-2">
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium dark:bg-zinc-800">
                    {call.source}
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
            ))}
          </tbody>
        </table>
      </div>

      {/* Pricing / shipping detail, same data as the retailer dashboard */}
      <h2 className="mb-3 text-lg font-semibold">Pricing &amp; Shipping by Product</h2>
      <p className="mb-6 text-zinc-500">
        Every mocked retailer/carrier combination the arbitrage engine considers.
      </p>
      <div className="flex flex-col gap-10">
        {rows.map(({ product, quotes }) => (
          <div key={product.id}>
            <h3 className="mb-3 text-base font-semibold">{product.name}</h3>
            <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50 text-zinc-500 dark:bg-zinc-900">
                  <tr>
                    <th className="px-4 py-2">Retailer</th>
                    <th className="px-4 py-2">Pack Qty</th>
                    <th className="px-4 py-2">Product Price</th>
                    <th className="px-4 py-2">Carrier</th>
                    <th className="px-4 py-2">Shipping</th>
                    <th className="px-4 py-2">Total Landed Cost</th>
                    <th className="px-4 py-2">Est. Delivery</th>
                  </tr>
                </thead>
                <tbody>
                  {quotes.map((quote, i) => (
                    <tr key={i} className="border-t border-zinc-100 dark:border-zinc-800">
                      <td className="px-4 py-2">{quote.retailer}</td>
                      <td className="px-4 py-2">{quote.packQuantity}</td>
                      <td className="px-4 py-2">${quote.productPrice.toFixed(2)}</td>
                      <td className="px-4 py-2">{quote.carrier}</td>
                      <td className="px-4 py-2">${quote.shippingCost.toFixed(2)}</td>
                      <td className="px-4 py-2 font-medium">
                        ${quote.totalLandedCost.toFixed(2)}
                      </td>
                      <td className="px-4 py-2">{quote.estimatedDelivery}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
