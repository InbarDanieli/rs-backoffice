import { NextRequest, NextResponse, after } from "next/server";
import { findSponsorByToken, updateSponsor, type UpdatableSponsorFields } from "@/lib/sponsors";
import { triggerSiteDeploy } from "@/lib/github/deploy";
import { diffFields, logAudit, pickFields, publicActor } from "@/lib/audit";
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

  const body = (await request.json()) as Partial<UpdatableSponsorFields> & { updatedAt?: unknown };

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

  delete safeFields.updatedAt;

  // The edit form sends the sponsor's `updatedAt` as it loaded it; that's the
  // version this save is based on.
  const expectedUpdatedAt = typeof body.updatedAt === "string" ? body.updatedAt : undefined;
  const result = await updateSponsor(
    sponsor.id,
    safeFields as Partial<UpdatableSponsorFields>,
    expectedUpdatedAt,
  );
  if (result === "not_found") return NextResponse.json({ error: "Link not found or expired" }, { status: 404 });
  if (result === "stale") {
    return NextResponse.json(
      {
        error:
          "This sponsor was changed by someone else since you opened this page. Reload to see the latest version — your changes were not saved.",
        code: "stale",
      },
      { status: 409 },
    );
  }
  after(() => triggerSiteDeploy(`sponsor ${sponsor.id} updated via public link`));

  const updated = await findSponsorByToken(token);
  if (updated) {
    const changes = diffFields(sponsor, pickFields(updated, Object.keys(safeFields)));
    if (changes.length > 0) {
      await logAudit({
        action: "sponsor.updated",
        actor: publicActor("Public link"),
        target: { type: "sponsor", id: sponsor.id, label: updated.name },
        changes,
        meta: { via: "public_link" },
      });
    }
  }
  return NextResponse.json(updated);
}
