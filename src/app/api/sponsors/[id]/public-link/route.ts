import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth/dal";
import { findSponsorById, setSponsorPublicToken } from "@/lib/sponsors";
import { actorFromUser, logAudit } from "@/lib/audit";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { user } = await verifySession();

  const { id } = await params;
  const sponsor = await findSponsorById(id);
  if (!sponsor) return NextResponse.json({ error: "Sponsor not found" }, { status: 404 });

  const body = (await request.json()) as { ttlDays?: number; revoke?: boolean };

  if (body.revoke) {
    await setSponsorPublicToken(id, null, null);
    if (sponsor.publicToken) {
      await logAudit({
        action: "sponsor.public_link_revoked",
        actor: actorFromUser(user),
        target: { type: "sponsor", id, label: sponsor.name },
      });
    }
    return NextResponse.json({ success: true });
  }

  const ttlDays = body.ttlDays ?? 7;
  const token = crypto.randomUUID().replace(/-/g, "");
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

  await setSponsorPublicToken(id, token, expiresAt);
  // The token itself is a credential — never log it.
  await logAudit({
    action: "sponsor.public_link_created",
    actor: actorFromUser(user),
    target: { type: "sponsor", id, label: sponsor.name },
    meta: { ttlDays, expiresAt },
  });

  const appUrl = process.env.APP_URL ?? "";
  const url = `${appUrl}/public/${token}`;

  return NextResponse.json({ url, token, expiresAt });
}
