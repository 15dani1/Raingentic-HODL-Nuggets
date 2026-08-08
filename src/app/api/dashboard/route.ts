/**
 * Thin API route — internal dashboard data: every retailer/carrier quote
 * per product, so the dashboard UI can show full pricing detail.
 * Owned by: backend team.
 */
import { NextResponse } from "next/server";
import { PRODUCTS } from "@/backend/data/mockData";
import { getAllLandedCostQuotes } from "@/backend/services/arbitrageEngine";

export async function GET() {
  const data = PRODUCTS.map((product) => ({
    product,
    quotes: getAllLandedCostQuotes(product.id),
  }));
  return NextResponse.json({ data });
}
