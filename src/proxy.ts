import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import {
  ROUTE_PERMISSIONS,
  type AccessRule,
  type HttpMethod,
} from "@/lib/auth/permissions";
import { matchRoute } from "@/lib/auth/match";
import type { UserRole } from "@/lib/users";

/**
 * Single chokepoint for authentication and authorization. Every request
 * (except static assets) is matched against `ROUTE_PERMISSIONS` and either
 * passes through, redirects to login, or returns 401/403.
 *
 * To change who can access a page or API, edit `src/lib/auth/permissions.ts` —
 * not this file.
 */

const COOKIE_NAME = "admin_session";

type SessionFromJwt = {
  userId: string;
  email: string;
  role: UserRole;
};

function getEncodedKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET environment variable is not set");
  return new TextEncoder().encode(secret);
}

async function readSession(
  request: NextRequest,
): Promise<SessionFromJwt | null> {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify<SessionFromJwt>(token, getEncodedKey(), {
      algorithms: ["HS256"],
    });
    if (
      typeof payload.userId !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.role !== "string"
    ) {
      return null;
    }
    return { userId: payload.userId, email: payload.email, role: payload.role };
  } catch {
    return null;
  }
}

function failureResponse(
  request: NextRequest,
  rule: AccessRule,
  status: 401 | 403,
): NextResponse {
  if (rule.redirectToLogin === false) {
    return NextResponse.json(
      { error: status === 401 ? "Unauthorized" : "Forbidden" },
      { status },
    );
  }
  // Page failure: redirect. 401 → login. 403 → dashboard, so an
  // authenticated-but-wrong-role user doesn't bounce around.
  const target = status === 401 ? "/admin/login" : "/admin/dashboard";
  return NextResponse.redirect(new URL(target, request.url));
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  const method = (request.method || "GET").toUpperCase() as HttpMethod;

  const session = await readSession(request);

  // Authenticated users on the login page or root → push to dashboard.
  if (session && (pathname === "/" || pathname === "/admin/login")) {
    return NextResponse.redirect(new URL("/admin/dashboard", request.url));
  }

  const matched = matchRoute(pathname, method, ROUTE_PERMISSIONS);

  // Default-deny: no rule = treat as protected. Pages redirect to login,
  // API routes return 401/403.
  const rule: AccessRule = matched?.rule ?? {
    roles: [],
    redirectToLogin: !pathname.startsWith("/api/"),
  };
  const params = matched?.params ?? {};

  if (rule.roles === "public") return NextResponse.next();

  if (!session) return failureResponse(request, rule, 401);

  if (
    rule.roles !== "any-authenticated" &&
    !rule.roles.includes(session.role)
  ) {
    return failureResponse(request, rule, 403);
  }

  if (rule.check) {
    let body: unknown;
    if (method === "POST" || method === "PATCH" || method === "PUT") {
      body = await request.clone().json().catch(() => undefined);
    }
    const ok = await rule.check({ user: session, params, method, body });
    if (!ok) return failureResponse(request, rule, 403);
  }

  return NextResponse.next();
}

export const config = {
  // Run on every page and API route. Skip Next internals and static asset paths.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico|gif|woff2?|ttf|otf|css|js|map)$).*)",
  ],
};
