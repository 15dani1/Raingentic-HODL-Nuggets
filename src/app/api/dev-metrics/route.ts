/**
 * Thin API route — developer/engineering dashboard data: recent API call
 * log (Rain sandbox calls + checkout outcomes), aggregate success/failure
 * stats, and Rain configuration status. Owned by: backend team.
 */
import { NextResponse } from "next/server";
import { getApiCallLog, getCallLogStats } from "@/backend/services/callLog";
import { getRainConfig } from "@/backend/rain/client";

function isRainConfigured(): boolean {
  try {
    getRainConfig();
    return true;
  } catch {
    return false;
  }
}

export async function GET() {
  return NextResponse.json({
    rainConfigured: isRainConfigured(),
    stats: getCallLogStats(),
    calls: getApiCallLog(),
  });
}
