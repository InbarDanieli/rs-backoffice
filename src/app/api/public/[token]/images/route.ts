import { NextRequest, NextResponse } from "next/server";
import { findSponsorByToken, uploadSponsorImage } from "@/lib/sponsors";
import { imageUploadFailureMeta, logAudit, publicActor } from "@/lib/audit";

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
  // Only failures are audited — successful uploads are recorded by the
  // sponsor.updated entry that saves the new URL.
  const logFailure = (error?: unknown) =>
    logAudit({
      action: "sponsor.image_upload_failed",
      actor: publicActor("Public link"),
      target: { type: "sponsor", id: sponsor.id, label: sponsor.name },
      meta: { ...imageUploadFailureMeta(body, error), via: "public_link" },
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
