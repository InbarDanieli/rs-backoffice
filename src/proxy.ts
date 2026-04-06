import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "admin_session";

function getEncodedKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET environment variable is not set");
  return new TextEncoder().encode(secret);
}

async function isValidSession(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, getEncodedKey(), { algorithms: ["HS256"] });
    return true;
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  const isProtected =
    pathname.startsWith("/admin/dashboard") ||
    pathname.startsWith("/admin/members") ||
    pathname.startsWith("/admin/sponsors");

  // Pages where authenticated users should be redirected to the dashboard
  const isAuthRedirect = pathname === "/admin/login" || pathname === "/";

  const authenticated = await isValidSession(request);

  if (isProtected && !authenticated) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  // Redirect already-authenticated users away from login / root
  // Note: /public/* is intentionally NOT included — sponsors and logged-in
  // admins should both be able to access public sponsor-edit links.
  if (isAuthRedirect && authenticated) {
    return NextResponse.redirect(new URL("/admin/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/admin/login",
    "/admin/dashboard/:path*",
    "/admin/members/:path*",
    "/admin/sponsors/:path*",
    "/public/:path*",
  ],
};
