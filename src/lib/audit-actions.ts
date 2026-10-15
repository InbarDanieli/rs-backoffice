/**
 * Audit-log action catalog. Shared by the server (logging/query validation)
 * and the admin UI (labels, filters) — keep this file free of server-only
 * imports.
 */

export type AuditCategory = "auth" | "users" | "years" | "sponsors" | "deploy";

export const AUDIT_ACTIONS = {
  "auth.login": { label: "Signed in", category: "auth" },
  "auth.login_failed": { label: "Sign-in failed", category: "auth" },
  "auth.logout": { label: "Signed out", category: "auth" },

  "user.created": { label: "User created", category: "users" },
  "user.updated": { label: "Profile updated", category: "users" },
  "user.role_changed": { label: "Role changed", category: "users" },
  "user.email_changed": { label: "Email changed", category: "users" },

  "year.created": { label: "Year created", category: "years" },
  "year.deleted": { label: "Year deleted", category: "years" },
  "year.default_changed": { label: "Default year changed", category: "years" },
  "year.member_added": { label: "Member added", category: "years" },
  "year.members_bulk_added": { label: "Members bulk-added", category: "years" },
  "year.member_removed": { label: "Member removed", category: "years" },
  "year.members_reordered": { label: "Members reordered", category: "years" },

  "sponsor.created": { label: "Sponsor created", category: "sponsors" },
  "sponsor.updated": { label: "Sponsor updated", category: "sponsors" },
  "sponsor.deleted": { label: "Sponsor deleted", category: "sponsors" },
  "sponsor.image_upload_failed": { label: "Sponsor image upload failed", category: "sponsors" },
  "sponsor.public_link_created": { label: "Public link created", category: "sponsors" },
  "sponsor.public_link_revoked": { label: "Public link revoked", category: "sponsors" },

  "deploy.triggered": { label: "Site deploy triggered", category: "deploy" },
} as const satisfies Record<string, { label: string; category: AuditCategory }>;

export type AuditAction = keyof typeof AUDIT_ACTIONS;

export const AUDIT_CATEGORIES: { value: AuditCategory; label: string }[] = [
  { value: "auth", label: "Authentication" },
  { value: "users", label: "Users" },
  { value: "years", label: "Years & members" },
  { value: "sponsors", label: "Sponsors" },
  { value: "deploy", label: "Deploys" },
];

export function isAuditAction(value: string): value is AuditAction {
  return Object.hasOwn(AUDIT_ACTIONS, value);
}

export function isAuditCategory(value: string): value is AuditCategory {
  return AUDIT_CATEGORIES.some((c) => c.value === value);
}

export type AuditTargetType = "user" | "sponsor" | "year";

export type AuditActor =
  | { type: "user"; userId: string; email: string; name: string; role: string }
  | { type: "public"; label: string };

export interface AuditChange {
  field: string;
  before: unknown;
  after: unknown;
}

/** Serialized audit-log entry as returned by `GET /api/audit-logs`. */
export interface AuditLogEntry {
  id: string;
  createdAt: string;
  action: AuditAction;
  category: AuditCategory;
  actor: AuditActor;
  target?: { type: AuditTargetType; id: string; label: string };
  changes?: AuditChange[];
  meta?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}
