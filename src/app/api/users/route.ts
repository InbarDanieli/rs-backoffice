import { NextResponse } from "next/server";
import { getSessionWithRole, isAdmin, apiForbidden } from "@/lib/admin-authorization";
import { findOrCreateByEmail } from "@/lib/users";

export async function POST(request: Request) {
  const sessionData = await getSessionWithRole();
  if (!sessionData) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(sessionData.role)) return apiForbidden();

  const body = (await request.json()) as { email?: string };
  const email = body.email?.trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }

  const user = await findOrCreateByEmail(email);
  return NextResponse.json({ userId: user.id }, { status: 201 });
}
