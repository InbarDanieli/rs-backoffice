import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth/dal";
import { findSponsorById, uploadSponsorImage } from "@/lib/sponsors";
import { actorFromUser, imageUploadMeta, logAudit } from "@/lib/audit";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** Uploads a single sponsor image and returns its URL: `{ url }`. */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { user } = await verifySession();

  const { id } = await params;
  const sponsor = await findSponsorById(id);
  if (!sponsor) return NextResponse.json({ error: "Sponsor not found" }, { status: 404 });

  const body = await request.json().catch(() => null);
  const url = await uploadSponsorImage(sponsor.id, body);
  if (!url) return NextResponse.json({ error: "Invalid image upload" }, { status: 400 });

  await logAudit({
    action: "sponsor.image_uploaded",
    actor: actorFromUser(user),
    target: { type: "sponsor", id: sponsor.id, label: sponsor.name },
    meta: imageUploadMeta(body, url),
  });

  return NextResponse.json({ url });
}
