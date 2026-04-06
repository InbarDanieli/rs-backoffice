import { getSession } from "@/lib/session";
import { findUsersByYear } from "@/lib/users";
import { getYearIdByName } from "@/lib/years";
import { NextRequest, NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function GET(
  _request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const { slug } = await params;
  const currentYearId = await getYearIdByName(slug);
  
  if (!currentYearId) {
    return NextResponse.json({ error: "Year not found" }, { status: 404 });
  }

  const users = await findUsersByYear(currentYearId);
  return NextResponse.json(users);
}
