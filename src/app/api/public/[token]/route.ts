import { NextRequest, NextResponse, after } from "next/server";
import { findSponsorByToken, updateSponsor, type UpdatableSponsorFields } from "@/lib/sponsors";
import { triggerSiteDeploy } from "@/lib/github/deploy";
import {
  validateSponsorFields,
  isFullSponsorProfilePayload,
} from "@/lib/sponsor-validation";

interface RouteParams {
  params: Promise<{ token: string }>;
}

async function resolveSponsor(token: string) {
  const sponsor = await findSponsorByToken(token);
  if (!sponsor) return null;
  if (sponsor.publicTokenExpiresAt && new Date(sponsor.publicTokenExpiresAt) < new Date()) return null;
  return sponsor;
}

export async function GET(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { token } = await params;
  const sponsor = await resolveSponsor(token);
  if (!sponsor) return NextResponse.json({ error: "Link not found or expired" }, { status: 404 });

  return NextResponse.json(sponsor);
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { token } = await params;
  const sponsor = await resolveSponsor(token);
  if (!sponsor) return NextResponse.json({ error: "Link not found or expired" }, { status: 404 });

  const body = (await request.json()) as Partial<UpdatableSponsorFields>;

  // Reject incomplete profile submissions (backstop for the client-side form).
  if (isFullSponsorProfilePayload(body)) {
    const errors = validateSponsorFields(body);
    if (errors.length > 0) {
      return NextResponse.json(
        {
          error: "Please complete all required fields before saving.",
          details: errors.map((e) => e.message),
        },
        { status: 400 },
      );
    }
  }

  // Prevent changing structural fields via public link
  const { ...safeFields } = body as Record<string, unknown>;
  delete safeFields.yearId;
  delete safeFields.publicToken;
  delete safeFields.publicTokenExpiresAt;

  await updateSponsor(sponsor.id, safeFields as Partial<UpdatableSponsorFields>);
  after(() => triggerSiteDeploy(`sponsor ${sponsor.id} updated via public link`));

  const updated = await findSponsorByToken(token);
  return NextResponse.json(updated);
}
