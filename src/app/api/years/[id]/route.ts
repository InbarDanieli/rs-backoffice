import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth/dal";
import { setDefaultYear, findYearById, findDefaultYear, deleteYear } from "@/lib/years";
import { actorFromUser, logAudit } from "@/lib/audit";
import { removeYearFromAllUsers } from "@/lib/users";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { user } = await verifySession();

  const { id } = await params;
  const year = await findYearById(id);
  if (!year) return NextResponse.json({ error: "Year not found" }, { status: 404 });

  const previousDefault = await findDefaultYear();
  await setDefaultYear(id);
  if (previousDefault?.id !== id) {
    await logAudit({
      action: "year.default_changed",
      actor: actorFromUser(user),
      target: { type: "year", id, label: year.name },
      changes: [{ field: "default year", before: previousDefault?.name ?? null, after: year.name }],
    });
  }
  return NextResponse.json({ success: true });
}

export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { user } = await verifySession();

  const { id } = await params;
  const year = await findYearById(id);
  if (!year) return NextResponse.json({ error: "Year not found" }, { status: 404 });

  if (year.isDefault) {
    return NextResponse.json(
      { error: "Cannot delete the default year. Set another year as default first." },
      { status: 400 }
    );
  }

  await removeYearFromAllUsers(id);
  await deleteYear(id);
  await logAudit({
    action: "year.deleted",
    actor: actorFromUser(user),
    target: { type: "year", id, label: year.name },
    meta: { memberCount: year.memberEmails.length },
  });

  return NextResponse.json({ success: true });
}
