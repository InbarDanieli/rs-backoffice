import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth/dal";
import { findSponsorById, uploadSponsorImage } from "@/lib/sponsors";
import { actorFromUser, imageUploadFailureMeta, logAudit } from "@/lib/audit";

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
  // Only failures are audited — successful uploads are recorded by the
  // sponsor.updated entry that saves the new URL.
  const logFailure = (error?: unknown) =>
    logAudit({
      action: "sponsor.image_upload_failed",
      actor: actorFromUser(user),
      target: { type: "sponsor", id: sponsor.id, label: sponsor.name },
      meta: imageUploadFailureMeta(body, error),
    });

  let url: string | null;
  try {
    url = await uploadSponsorImage(sponsor.id, body);
  } catch (err) {
    await logFailure(err);
    throw err;
  }
  if (!url) {
    await logFailure();
    return NextResponse.json({ error: "Invalid image upload" }, { status: 400 });
  }

  return NextResponse.json({ url });
}
