import { NextRequest, NextResponse } from "next/server";
import { getSessionWithRole, isAdmin, apiForbidden } from "@/lib/admin-authorization";
import { setDefaultYear, findYearById, deleteYear } from "@/lib/years";
import { removeYearFromAllUsers } from "@/lib/users";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const sessionData = await getSessionWithRole();
  if (!sessionData) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(sessionData.role)) return apiForbidden();

  const { id } = await params;
  const year = await findYearById(id);
  if (!year) return NextResponse.json({ error: "Year not found" }, { status: 404 });

  await setDefaultYear(id);
  return NextResponse.json({ success: true });
}

export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const sessionData = await getSessionWithRole();
  if (!sessionData) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(sessionData.role)) return apiForbidden();

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

  return NextResponse.json({ success: true });
}
