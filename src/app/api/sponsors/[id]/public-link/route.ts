import { NextRequest, NextResponse } from "next/server";
import { getSessionWithRole, canManageSponsorsApi, apiForbidden } from "@/lib/admin-authorization";
import { findSponsorById, setSponsorPublicToken } from "@/lib/sponsors";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const sessionData = await getSessionWithRole();
  if (!sessionData) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageSponsorsApi(sessionData.role)) return apiForbidden();

  const { id } = await params;
  const sponsor = await findSponsorById(id);
  if (!sponsor) return NextResponse.json({ error: "Sponsor not found" }, { status: 404 });

  const body = (await request.json()) as { ttlDays?: number; revoke?: boolean };

  if (body.revoke) {
    await setSponsorPublicToken(id, null, null);
    return NextResponse.json({ success: true });
  }

  const ttlDays = body.ttlDays ?? 7;
  const token = crypto.randomUUID().replace(/-/g, "");
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

  await setSponsorPublicToken(id, token, expiresAt);

  const appUrl = process.env.APP_URL ?? "";
  const url = `${appUrl}/public/${token}`;

  return NextResponse.json({ url, token, expiresAt });
}
