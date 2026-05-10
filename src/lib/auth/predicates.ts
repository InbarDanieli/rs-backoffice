import "server-only";
import type { UserRole } from "@/lib/users";

/**
 * A predicate decides access for routes whose rule isn't a plain role list.
 *
 * Predicates run inside `proxy.ts` after the role check passes. They receive
 * the JWT-resolved user, the matched route params, the HTTP method, and
 * (for write methods) the parsed request body. Return `true` to allow.
 *
 * Keep predicates pure — they should be unit-testable in isolation.
 */
export type PredicateContext = {
  user: { userId: string; email: string; role: UserRole };
  params: Record<string, string>;
  method: string;
  body?: unknown;
};

export type Predicate = (
  ctx: PredicateContext,
) => boolean | Promise<boolean>;

/** Self or admin can read; admin sees everything. */
export const canReadUser: Predicate = ({ user, params }) =>
  user.role === "admin" || params.id === user.userId;

/**
 * Self can edit own profile. Only admin can change someone else's profile.
 * Only admin can change the `role` or `email` field — including their own.
 */
export const canEditUser: Predicate = ({ user, params, body }) => {
  if (user.role === "admin") return true;
  if (params.id !== user.userId) return false;
  if (body && typeof body === "object") {
    if ("role" in body) return false;
    if ("email" in body) return false;
  }
  return true;
};
