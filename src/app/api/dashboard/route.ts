import { NextRequest, NextResponse } from "next/server";
import { createMockDashboard } from "@/data/mock/dashboard";
import type { DashboardRange } from "@/domain/dashboard/types";

export const dynamic = "force-dynamic";

const ranges = new Set<DashboardRange>(["today", "7d", "30d", "90d", "year"]);

export async function GET(request: NextRequest) {
  const requestedRange = request.nextUrl.searchParams.get("range") as DashboardRange | null;
  const range = requestedRange && ranges.has(requestedRange) ? requestedRange : "7d";
  return NextResponse.json(createMockDashboard(range), {
    headers: { "Cache-Control": "private, max-age=30" }
  });
}
