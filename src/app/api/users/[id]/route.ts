import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { findUserById, updateUserById, type UpdatableUserFields, type UserRole } from "@/lib/users";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const VALID_ROLES: UserRole[] = ["team-member", "admin", "sponsor-manager"];

export async function GET(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const user = await findUserById(id);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(user);
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;

  const fields: Partial<UpdatableUserFields> = {
    name: typeof raw.name === "string" ? raw.name.trim() : undefined,
    company: typeof raw.company === "string" ? raw.company.trim() : undefined,
    title: typeof raw.title === "string" ? raw.title.trim() : undefined,
    bio: typeof raw.bio === "string" ? raw.bio.trim() : undefined,
    picture: typeof raw.picture === "string" ? raw.picture : undefined,
    linkedin: typeof raw.linkedin === "string" ? raw.linkedin.trim() : undefined,
    x: typeof raw.x === "string" ? raw.x.trim() : undefined,
    bluesky: typeof raw.bluesky === "string" ? raw.bluesky.trim() : undefined,
    facebook: typeof raw.facebook === "string" ? raw.facebook.trim() : undefined,
    instagram: typeof raw.instagram === "string" ? raw.instagram.trim() : undefined,
    youtube: typeof raw.youtube === "string" ? raw.youtube.trim() : undefined,
    github: typeof raw.github === "string" ? raw.github.trim() : undefined,
    medium: typeof raw.medium === "string" ? raw.medium.trim() : undefined,
    website: typeof raw.website === "string" ? raw.website.trim() : undefined,
    role:
      typeof raw.role === "string" && VALID_ROLES.includes(raw.role as UserRole)
        ? (raw.role as UserRole)
        : undefined,
  };

  const cleanFields = Object.fromEntries(
    Object.entries(fields).filter(([, v]) => v !== undefined)
  ) as Partial<UpdatableUserFields>;

  await updateUserById(id, cleanFields);

  return NextResponse.json({ success: true });
}
