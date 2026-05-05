import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth/dal";
import { findYearById, addMemberToYear, removeMemberFromYear } from "@/lib/years";
import { addYearToUser, removeYearFromUser, findUsersByEmails } from "@/lib/users";

export interface MemberEntry {
  email: string;
  userId?: string;
  name?: string;
  picture?: string;
  role?: string;
}

export interface BulkAddMembersResponse {
  members: MemberEntry[];
  /** Non-empty input fragments that were not accepted as emails (e.g. typos). */
  invalidInputs?: string[];
}

const MAX_MEMBERS_PER_REQUEST = 50;

function normalizeEmail(value: string): string | null {
  const e = value.trim().toLowerCase();
  if (!e || !e.includes("@")) return null;
  return e;
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
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
  await verifySession();

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

  const bulkRaw = raw.emails;
  if (Array.isArray(bulkRaw) && bulkRaw.length > 0) {
    const seen = new Set<string>();
    const normalized: string[] = [];
    const invalidInputs: string[] = [];

    for (const item of bulkRaw) {
      if (typeof item !== "string") continue;
      const n = normalizeEmail(item);
      if (n) {
        if (!seen.has(n)) {
          seen.add(n);
          normalized.push(n);
        }
      } else if (item.trim().length > 0) {
        invalidInputs.push(item.trim());
      }
    }

    if (normalized.length > MAX_MEMBERS_PER_REQUEST) {
      return NextResponse.json(
        { error: `At most ${MAX_MEMBERS_PER_REQUEST} emails per request` },
        { status: 400 },
      );
    }

    if (normalized.length === 0) {
      return NextResponse.json({ error: "No valid emails" }, { status: 400 });
    }

    for (const email of normalized) {
      await addMemberToYear(id, email);
      await addYearToUser(email, id);
    }

    const users = await findUsersByEmails(normalized);
    const userMap = new Map(users.map((u) => [u.email.toLowerCase(), u]));

    const members: MemberEntry[] = normalized.map((email) => {
      const user = userMap.get(email);
      return {
        email,
        userId: user?.id,
        name: user?.name || undefined,
        picture: user?.picture || undefined,
        role: user?.role,
      };
    });

    const payload: BulkAddMembersResponse = {
      members,
      ...(invalidInputs.length > 0 ? { invalidInputs } : {}),
    };

    return NextResponse.json(payload, { status: 201 });
  }

  const email = typeof raw.email === "string" ? normalizeEmail(raw.email) : null;

  if (!email) {
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
  await verifySession();

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
