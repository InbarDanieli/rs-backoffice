import "server-only";

import { NextResponse } from "next/server";
import { notFound } from "next/navigation";
import { getSession, type SessionPayload } from "@/lib/session";
import { findUserById, type User, type UserRole } from "@/lib/users";

export function isAdmin(role: UserRole): boolean {
  return role === "admin";
}

export function canAccessAdminPath(pathname: string, role: UserRole): boolean {
  if (
    pathname === "/admin/dashboard" ||
    pathname.startsWith("/admin/dashboard/")
  ) {
    return true;
  }
  if (pathname.startsWith("/admin/members")) {
    return role === "admin";
  }
  if (pathname.startsWith("/admin/sponsors")) {
    return role === "admin" || role === "sponsor-manager";
  }
  return false;
}

export function assertAdminPageAccess(
  pathname: string,
  role: UserRole,
): void {
  if (!canAccessAdminPath(pathname, role)) {
    notFound();
  }
}

export function shouldShowMembersNav(role: UserRole): boolean {
  return role === "admin";
}

export function shouldShowSponsorsNav(role: UserRole): boolean {
  return role === "admin" || role === "sponsor-manager";
}

export type SessionWithRole = {
  session: SessionPayload;
  user: User;
  role: UserRole;
};

export async function getSessionWithRole(): Promise<SessionWithRole | null> {
  const session = await getSession();
  if (!session) return null;
  const user = await findUserById(session.userId);
  if (!user) return null;
  return { session, user, role: user.role };
}

export function apiNotFound(): NextResponse {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

export function apiForbidden(): NextResponse {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export function canManageSponsorsApi(role: UserRole): boolean {
  return role === "admin" || role === "sponsor-manager";
}
