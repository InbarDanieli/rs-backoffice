import { NextRequest, NextResponse } from "next/server";
import { createSession } from "@/lib/session";
import { findUserByEmail, upsertUser } from "@/lib/users";
import { actorFromUser, logAudit, publicActor } from "@/lib/audit";
import { findDefaultYear } from "@/lib/years";
import { EMAILS } from "@/lib/share/emails";

interface GoogleTokenResponse {
  access_token: string;
  error?: string;
}

interface GoogleUserInfo {
  sub: string;
  email: string;
  name: string;
  picture: string;
  verified_email: boolean;
}

/**
 * Redirect to /admin/unauthorized and clear any existing session/oauth cookies,
 * so a failed re-auth attempt doesn't leave a stale session that lets the user
 * loop back into the dashboard via the login-page redirect in proxy.ts.
 */
function unauthorizedRedirect(appUrl: string): NextResponse {
  const response = NextResponse.redirect(new URL("/admin/unauthorized", appUrl));
  response.cookies.delete("admin_session");
  response.cookies.delete("oauth_state");
  return response;
}

/** Records the failed sign-in attempt, then redirects to /admin/unauthorized. */
async function denyLogin(
  appUrl: string,
  reason: string,
  attemptedEmail?: string,
): Promise<NextResponse> {
  await logAudit({
    action: "auth.login_failed",
    actor: publicActor("Anonymous"),
    meta: { reason, ...(attemptedEmail ? { attemptedEmail } : {}) },
  });
  return unauthorizedRedirect(appUrl);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const appUrl = process.env.APP_URL;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!appUrl || !clientId || !clientSecret) {
    return denyLogin(appUrl ?? request.url, "server_misconfigured");
  }

  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const storedState = request.cookies.get("oauth_state")?.value;

  // Not logged: anyone can hit this URL without a state cookie (bots, stale
  // tabs), so recording it would let anonymous requests flood the audit log.
  if (!state || !storedState || state !== storedState) {
    return unauthorizedRedirect(appUrl);
  }

  if (!code) {
    return denyLogin(appUrl, "missing_code");
  }

  const redirectUri = `${appUrl}/api/auth/callback/google`;

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  const tokenData = (await tokenResponse.json()) as GoogleTokenResponse;

  if (!tokenResponse.ok || !tokenData.access_token) {
    return denyLogin(appUrl, "oauth_error");
  }

  const userInfoResponse = await fetch(
    "https://www.googleapis.com/oauth2/v2/userinfo",
    { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
  );

  if (!userInfoResponse.ok) {
    return denyLogin(appUrl, "oauth_error");
  }

  const userInfo = (await userInfoResponse.json()) as GoogleUserInfo;

  if (!userInfo.verified_email) {
    return denyLogin(appUrl, "email_not_verified", userInfo.email?.toLowerCase());
  }

  const normalizedEmail = userInfo.email.toLowerCase();

  // Check access via the default year's member list; fall back to allowed emails if no year exists yet.
  const defaultYear = await findDefaultYear();
  let isAllowed = false;
  let activeYearId: string | undefined;

  if (defaultYear) {
    isAllowed = defaultYear.memberEmails.includes(normalizedEmail);
    if (isAllowed) activeYearId = defaultYear.id;
  } else {
    isAllowed = Object.values(EMAILS.default).includes(normalizedEmail);
  }

  if (!isAllowed) {
    return denyLogin(appUrl, "not_allowed", normalizedEmail);
  }

  const existingUser = await findUserByEmail(userInfo.email);
  const dbUser = await upsertUser({
    email: userInfo.email,
    name: userInfo.name,
    picture: userInfo.picture,
    yearId: activeYearId,
  });

  await createSession({
    email: userInfo.email,
    name: userInfo.name,
    picture: userInfo.picture,
    sub: userInfo.sub,
    userId: dbUser.id,
    role: dbUser.role,
  });

  if (!existingUser) {
    await logAudit({
      action: "user.created",
      actor: actorFromUser(dbUser),
      target: { type: "user", id: dbUser.id, label: dbUser.email },
      meta: { via: "first_login" },
    });
  }
  await logAudit({
    action: "auth.login",
    actor: actorFromUser(dbUser),
    target: { type: "user", id: dbUser.id, label: dbUser.email },
  });

  const response = NextResponse.redirect(new URL("/admin/dashboard", appUrl));
  response.cookies.delete("oauth_state");
  return response;
}
