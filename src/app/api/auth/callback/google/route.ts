import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import { createSession } from "@/lib/session";
import { upsertUser } from "@/lib/users";
import { findDefaultYear } from "@/lib/years";

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

/** Fallback for bootstrap: read allowed-emails.json when no year exists yet. */
function getBootstrapEmails(): string[] {
  try {
    const filePath = join(process.cwd(), "data", "allowed-emails.json");
    const file = readFileSync(filePath, "utf-8");
    const json = JSON.parse(file) as { emails: string[] };
    return json.emails.map((e) => e.toLowerCase());
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const appUrl = process.env.APP_URL;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!appUrl || !clientId || !clientSecret) {
    return NextResponse.redirect(new URL("/admin/unauthorized", appUrl ?? request.url));
  }

  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const storedState = request.cookies.get("oauth_state")?.value;

  if (!state || !storedState || state !== storedState) {
    return NextResponse.redirect(new URL("/admin/unauthorized", appUrl));
  }

  if (!code) {
    return NextResponse.redirect(new URL("/admin/unauthorized", appUrl));
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
    return NextResponse.redirect(new URL("/admin/unauthorized", appUrl));
  }

  const userInfoResponse = await fetch(
    "https://www.googleapis.com/oauth2/v2/userinfo",
    { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
  );

  if (!userInfoResponse.ok) {
    return NextResponse.redirect(new URL("/admin/unauthorized", appUrl));
  }

  const userInfo = (await userInfoResponse.json()) as GoogleUserInfo;

  if (!userInfo.verified_email) {
    return NextResponse.redirect(new URL("/admin/unauthorized", appUrl));
  }

  const normalizedEmail = userInfo.email.toLowerCase();

  // Check access via the default year's member list; fall back to allowed-emails.json
  // if no year exists yet (initial setup bootstrap).
  const defaultYear = await findDefaultYear();
  let isAllowed = false;
  let activeYearId: string | undefined;

  if (defaultYear) {
    isAllowed = defaultYear.memberEmails.includes(normalizedEmail);
    if (isAllowed) activeYearId = defaultYear.id;
  } else {
    isAllowed = getBootstrapEmails().includes(normalizedEmail);
  }

  if (!isAllowed) {
    return NextResponse.redirect(new URL("/admin/unauthorized", appUrl));
  }

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
  });

  const response = NextResponse.redirect(new URL("/admin/dashboard", appUrl));
  response.cookies.delete("oauth_state");
  return response;
}
