/**
 * Thin API route — lists products for the marketplace UI.
 * Owned by: backend team.
 */
import { NextResponse } from "next/server";
import { PRODUCTS } from "@/backend/data/mockData";

export async function GET() {
  return NextResponse.json({ products: PRODUCTS });
}
