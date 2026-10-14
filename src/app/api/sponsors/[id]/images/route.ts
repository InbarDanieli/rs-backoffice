import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth/dal";
import { findSponsorById, uploadSponsorImage } from "@/lib/sponsors";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** Uploads a single sponsor image and returns its URL: `{ url }`. */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  await verifySession();

  const { id } = await params;
  const sponsor = await findSponsorById(id);
  if (!sponsor) return NextResponse.json({ error: "Sponsor not found" }, { status: 404 });

  const body = await request.json().catch(() => null);
  const url = await uploadSponsorImage(sponsor.id, body);
  if (!url) return NextResponse.json({ error: "Invalid image upload" }, { status: 400 });

  return NextResponse.json({ url });
}
