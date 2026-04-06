import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { listSponsorsByYear, createSponsor } from "@/lib/sponsors";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const yearId = searchParams.get("yearId");
  if (!yearId) return NextResponse.json({ error: "yearId is required" }, { status: 400 });

  const sponsors = await listSponsorsByYear(yearId);
  return NextResponse.json(sponsors);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as { yearId?: string; name?: string };
  const { yearId, name } = body;

  if (!yearId || !name?.trim()) {
    return NextResponse.json({ error: "yearId and name are required" }, { status: 400 });
  }

  const sponsor = await createSponsor(yearId, name.trim());
  return NextResponse.json(sponsor, { status: 201 });
}
