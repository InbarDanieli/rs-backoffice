import { NextRequest, NextResponse } from "next/server";
import { findSponsorByToken, uploadSponsorImage } from "@/lib/sponsors";

interface RouteParams {
  params: Promise<{ token: string }>;
}

/** Uploads a single sponsor image via a public edit link and returns its URL: `{ url }`. */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { token } = await params;
  const sponsor = await findSponsorByToken(token);
  if (
    !sponsor ||
    (sponsor.publicTokenExpiresAt && new Date(sponsor.publicTokenExpiresAt) < new Date())
  ) {
    return NextResponse.json({ error: "Link not found or expired" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const url = await uploadSponsorImage(sponsor.id, body);
  if (!url) return NextResponse.json({ error: "Invalid image upload" }, { status: 400 });

  return NextResponse.json({ url });
}
