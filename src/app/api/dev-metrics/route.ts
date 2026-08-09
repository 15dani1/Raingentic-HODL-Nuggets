/**
 * Thin API route — developer/engineering dashboard data: recent API call
 * log (Rain sandbox calls + checkout outcomes), aggregate success/failure
 * stats, and Rain configuration status. Owned by: backend team.
 */
import { NextResponse } from "next/server";
import { getApiCallLog, getCallLogStats } from "@/backend/services/callLog";
import { getOrderLog, getProfitStats } from "@/backend/services/orderLog";
import { getRainConfig } from "@/backend/rain/client";
import { getMonadConfig, getNetworkStatus } from "@/backend/monad/client";

function isRainConfigured(): boolean {
  try {
    getRainConfig();
    return true;
  } catch {
    return false;
  }
}

export async function GET() {
  const monadConfig = getMonadConfig();
  const monadStatus = await getNetworkStatus().catch((err) => ({
    reachable: false,
    error: err instanceof Error ? err.message : String(err),
  }));

  return NextResponse.json({
    rainConfigured: isRainConfigured(),
    stats: getCallLogStats(),
    calls: getApiCallLog(),
    profit: getProfitStats(),
    orders: getOrderLog(),
    monad: {
      config: monadConfig,
      status: monadStatus,
    },
  });
}
