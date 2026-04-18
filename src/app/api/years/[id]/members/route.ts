import { NextRequest, NextResponse } from "next/server";
import { getSessionWithRole, isAdmin, apiForbidden } from "@/lib/admin-authorization";
import { findYearById, addMemberToYear, removeMemberFromYear } from "@/lib/years";
import { addYearToUser, removeYearFromUser, findUsersByEmails } from "@/lib/users";

export interface MemberEntry {
  email: string;
  userId?: string;
  name?: string;
  picture?: string;
  role?: string;
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const sessionData = await getSessionWithRole();
  if (!sessionData) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(sessionData.role)) return apiForbidden();

  const { id } = await params;
  const year = await findYearById(id);
  if (!year) return NextResponse.json({ error: "Year not found" }, { status: 404 });

  const users = await findUsersByEmails(year.memberEmails);
  const userMap = new Map(users.map((u) => [u.email.toLowerCase(), u]));

  const members: MemberEntry[] = year.memberEmails.map((email) => {
    const user = userMap.get(email.toLowerCase());
    return {
      email,
      userId: user?.id,
      name: user?.name || undefined,
      picture: user?.picture || undefined,
      role: user?.role,
    };
  });

  return NextResponse.json(members);
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const sessionData = await getSessionWithRole();
  if (!sessionData) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(sessionData.role)) return apiForbidden();

  const { id } = await params;
  const year = await findYearById(id);
  if (!year) return NextResponse.json({ error: "Year not found" }, { status: 404 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;
  const email = typeof raw.email === "string" ? raw.email.trim().toLowerCase() : "";

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  }

  await addMemberToYear(id, email);
  await addYearToUser(email, id);

  const existingUsers = await findUsersByEmails([email]);
  const user = existingUsers[0];
  const entry: MemberEntry = {
    email,
    userId: user?.id,
    name: user?.name || undefined,
    picture: user?.picture || undefined,
    role: user?.role,
  };

  return NextResponse.json(entry, { status: 201 });
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const sessionData = await getSessionWithRole();
  if (!sessionData) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(sessionData.role)) return apiForbidden();

  const { id } = await params;
  const year = await findYearById(id);
  if (!year) return NextResponse.json({ error: "Year not found" }, { status: 404 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;
  const email = typeof raw.email === "string" ? raw.email.trim().toLowerCase() : "";

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  await removeMemberFromYear(id, email);
  await removeYearFromUser(email, id);

  return NextResponse.json({ success: true });
}
