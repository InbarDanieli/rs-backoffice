import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth/dal";
import { findOrCreateByEmail, findUsersByEmailsOrdered } from "@/lib/users";
import { findYearById } from "@/lib/years";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const yearId = request.nextUrl.searchParams.get("yearId");
  if (!yearId) {
    return NextResponse.json(
      { error: "yearId query param is required" },
      { status: 400 },
    );
  }

  const year = await findYearById(yearId);
  if (!year) {
    return NextResponse.json({ error: "Year not found" }, { status: 404 });
  }

  const users = await findUsersByEmailsOrdered(year.memberEmails);
  return NextResponse.json(users.map(({ email: _email, ...rest }) => rest));
}

export async function POST(request: Request) {
  await verifySession();

  const body = (await request.json()) as { email?: string };
  const email = body.email?.trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }

  const user = await findOrCreateByEmail(email);
  return NextResponse.json({ userId: user.id }, { status: 201 });
}
