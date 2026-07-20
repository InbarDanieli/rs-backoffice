import { NextRequest, NextResponse } from "next/server";
import { listSponsorsByYear, toPublicSponsor } from "@/lib/sponsors";
import { findYearById } from "@/lib/years";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const yearId = request.nextUrl.searchParams.get("yearId");
  if (!yearId) {
    return NextResponse.json(
      { error: "yearId query param is required" },
      { status: 400 },
    );
  }

  const year = await findYearById(yearId);
  if (!year) {
    return NextResponse.json({ error: "Year not found" }, { status: 404 });
  }

  const sponsors = await listSponsorsByYear(yearId);
  return NextResponse.json(sponsors.map(toPublicSponsor));
}
