import { NextRequest, NextResponse, after } from "next/server";
import { verifySession } from "@/lib/auth/dal";
import {
  changeUserEmail,
  findUserById,
  updateUserById,
  type UpdatableUserFields,
  type UserRole,
} from "@/lib/users";
import { triggerSiteDeploy } from "@/lib/github/deploy";
import { actorFromUser, diffFields, logAudit, pickFields } from "@/lib/audit";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const VALID_ROLES: UserRole[] = ["team-member", "admin", "sponsor-manager"];

export async function GET(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { id } = await params;
  const user = await findUserById(id);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json(user);
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  // Re-verify with fresh DB role: a JWT-cached admin who was demoted cannot
  // sneak a role update through the proxy's optimistic check.
  const { user: actor } = await verifySession();

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

  const before = await findUserById(id);
  if (!before) return NextResponse.json({ error: "User not found" }, { status: 404 });
  const auditActor = actorFromUser(actor);

  if (actor.role === "admin" && typeof raw.email === "string") {
    const result = await changeUserEmail(id, raw.email);
    if (!result.ok) {
      return NextResponse.json({ error: result.reason }, { status: 400 });
    }
    const newEmail = raw.email.trim().toLowerCase();
    if (newEmail !== before.email.toLowerCase()) {
      await logAudit({
        action: "user.email_changed",
        actor: auditActor,
        target: { type: "user", id, label: newEmail },
        changes: [{ field: "email", before: before.email, after: newEmail }],
      });
    }
  }

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
      actor.role === "admin" &&
      typeof raw.role === "string" &&
      VALID_ROLES.includes(raw.role as UserRole)
        ? (raw.role as UserRole)
        : undefined,
  };

  const cleanFields = Object.fromEntries(
    Object.entries(fields).filter(([, v]) => v !== undefined)
  ) as Partial<UpdatableUserFields>;

  await updateUserById(id, cleanFields);

  const { role: newRole, ...profileFields } = cleanFields;
  const stored = (await findUserById(id)) ?? before;
  const targetLabel = stored.name || stored.email;
  if (newRole && newRole !== before.role) {
    await logAudit({
      action: "user.role_changed",
      actor: auditActor,
      target: { type: "user", id, label: targetLabel },
      changes: [{ field: "role", before: before.role, after: newRole }],
    });
  }
  const profileChanges = diffFields(before, pickFields(stored, Object.keys(profileFields)));
  if (profileChanges.length > 0) {
    await logAudit({
      action: "user.updated",
      actor: auditActor,
      target: { type: "user", id, label: targetLabel },
      changes: profileChanges,
    });
  }
  after(() => triggerSiteDeploy(`team member ${id} updated`));

  return NextResponse.json({ success: true });
}
