import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { findUserById, type User, type UserRole } from "@/lib/users";

/**
 * Defense-in-depth backstop for mutation handlers (POST/PATCH/PUT/DELETE).
 *
 * `proxy.ts` already enforces auth/authorization on every request using the
 * role embedded in the JWT — that's the optimistic check (fast, no DB hit).
 * For mutations we want a *fresh* read of the role from MongoDB so a user
 * who was demoted mid-session can't still write through their stale JWT.
 *
 * Read handlers don't need to call this — `proxy.ts` is sufficient there.
 *
 * Throws a `NextResponse` (401/403) on failure. Wrap in try/catch only if
 * the route needs custom error handling; otherwise let it propagate — Next.js
 * will return the response to the client.
 */
export const verifySession = cache(async (): Promise<{ user: User; role: UserRole }> => {
  const session = await getSession();
  if (!session) {
    throw NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await findUserById(session.userId);
  if (!user) {
    throw NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return { user, role: user.role };
});

/**
 * Helper for pages that need the current user's profile (display name,
 * picture, etc). Proxy already gated the request, so we just fetch the user.
 *
 * If the session or user record is missing (unexpected — proxy should have
 * caught this), redirect to login as a safety net.
 *
 * Memoized via `cache()` so multiple calls in one render hit MongoDB once.
 */
export const getCurrentUser = cache(async (): Promise<User> => {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  const user = await findUserById(session.userId);
  if (!user) redirect("/admin/login");
  return user;
});
