/**
 * In-memory log of outbound API calls (Rain sandbox, and internal
 * checkout/arbitrage events) plus a rolling event log for the developer
 * dashboard. Not persisted — resets on server restart. Good enough for a
 * hackathon demo; swap for a real datastore/observability tool later.
 *
 * Owned by: backend team.
 */

export type ApiCallSource = "rain" | "monad" | "checkout";

export interface ApiCallLogEntry {
  id: number;
  timestamp: string; // ISO 8601
  source: ApiCallSource;
  method: string;
  /** Path or short label describing the call, e.g. "/issuing/users/.../cards/scoped". */
  path: string;
  /** True if the call completed successfully. */
  success: boolean;
  /** HTTP status code, if applicable. */
  statusCode?: number;
  durationMs: number;
  /** Short human-readable summary, e.g. "Issued scoped card for $19.74". */
  summary?: string;
  /** Error message, only present when success is false. */
  error?: string;
}

const MAX_ENTRIES = 200;
const log: ApiCallLogEntry[] = [];
let nextId = 1;

export function recordApiCall(entry: Omit<ApiCallLogEntry, "id" | "timestamp">): ApiCallLogEntry {
  const full: ApiCallLogEntry = {
    id: nextId++,
    timestamp: new Date().toISOString(),
    ...entry,
  };
  log.push(full);
  if (log.length > MAX_ENTRIES) log.shift();
  return full;
}

export function getApiCallLog(): ApiCallLogEntry[] {
  // Newest first.
  return [...log].reverse();
}

export interface CallLogStats {
  totalCalls: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  avgDurationMs: number;
  callsBySource: Record<string, number>;
}

export function getCallLogStats(): CallLogStats {
  const totalCalls = log.length;
  const successCount = log.filter((e) => e.success).length;
  const failureCount = totalCalls - successCount;
  const avgDurationMs =
    totalCalls === 0 ? 0 : log.reduce((sum, e) => sum + e.durationMs, 0) / totalCalls;

  const callsBySource: Record<string, number> = {};
  for (const entry of log) {
    callsBySource[entry.source] = (callsBySource[entry.source] ?? 0) + 1;
  }

  return {
    totalCalls,
    successCount,
    failureCount,
    successRate: totalCalls === 0 ? 0 : successCount / totalCalls,
    avgDurationMs,
    callsBySource,
  };
}

/** Clears the log (useful for demos/tests). Not exposed via any API route. */
export function clearApiCallLog() {
  log.length = 0;
}
