import { NextRequest, NextResponse, after } from "next/server";
import { verifySession } from "@/lib/auth/dal";
import { findSponsorById, updateSponsor, deleteSponsor, type UpdatableSponsorFields } from "@/lib/sponsors";
import {
  validateSponsorFields,
  isFullSponsorProfilePayload,
} from "@/lib/sponsor-validation";
import { triggerSiteDeploy } from "@/lib/github/deploy";
import { actorFromUser, diffFields, logAudit, pickFields } from "@/lib/audit";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { id } = await params;
  const sponsor = await findSponsorById(id);
  if (!sponsor) return NextResponse.json({ error: "Sponsor not found" }, { status: 404 });

  return NextResponse.json(sponsor);
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { user } = await verifySession();

  const { id } = await params;
  const sponsor = await findSponsorById(id);
  if (!sponsor) return NextResponse.json({ error: "Sponsor not found" }, { status: 404 });

  const body = (await request.json()) as Partial<UpdatableSponsorFields>;

  // Reject incomplete profile submissions (backstop for the client-side form).
  // Partial updates such as a tier change are not full profiles and skip this.
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

  await updateSponsor(id, body);
  after(() => triggerSiteDeploy(`sponsor ${id} updated`));

  const updated = await findSponsorById(id);
  if (updated) {
    const changes = diffFields(sponsor, pickFields(updated, Object.keys(body ?? {})));
    if (changes.length > 0) {
      await logAudit({
        action: "sponsor.updated",
        actor: actorFromUser(user),
        target: { type: "sponsor", id, label: updated.name },
        changes,
      });
    }
  }
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { user } = await verifySession();

  const { id } = await params;
  const sponsor = await findSponsorById(id);
  if (!sponsor) return NextResponse.json({ error: "Sponsor not found" }, { status: 404 });

  await deleteSponsor(id);
  await logAudit({
    action: "sponsor.deleted",
    actor: actorFromUser(user),
    target: { type: "sponsor", id, label: sponsor.name },
    meta: { yearId: sponsor.yearId, tier: sponsor.tier },
  });
  after(() => triggerSiteDeploy(`sponsor ${id} deleted`));

  return NextResponse.json({ success: true });
}
