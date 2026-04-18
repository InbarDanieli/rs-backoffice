import { NextRequest, NextResponse } from "next/server";
import { getSessionWithRole, canManageSponsorsApi, apiForbidden } from "@/lib/admin-authorization";
import { findSponsorById, updateSponsor, deleteSponsor, type UpdatableSponsorFields } from "@/lib/sponsors";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const sessionData = await getSessionWithRole();
  if (!sessionData) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageSponsorsApi(sessionData.role)) return apiForbidden();

  const { id } = await params;
  const sponsor = await findSponsorById(id);
  if (!sponsor) return NextResponse.json({ error: "Sponsor not found" }, { status: 404 });

  return NextResponse.json(sponsor);
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const sessionData = await getSessionWithRole();
  if (!sessionData) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageSponsorsApi(sessionData.role)) return apiForbidden();

  const { id } = await params;
  const sponsor = await findSponsorById(id);
  if (!sponsor) return NextResponse.json({ error: "Sponsor not found" }, { status: 404 });

  const body = (await request.json()) as Partial<UpdatableSponsorFields>;
  await updateSponsor(id, body);

  const updated = await findSponsorById(id);
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const sessionData = await getSessionWithRole();
  if (!sessionData) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageSponsorsApi(sessionData.role)) return apiForbidden();

  const { id } = await params;
  const sponsor = await findSponsorById(id);
  if (!sponsor) return NextResponse.json({ error: "Sponsor not found" }, { status: 404 });

  await deleteSponsor(id);
  return NextResponse.json({ success: true });
}
