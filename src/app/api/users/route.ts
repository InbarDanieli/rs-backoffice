import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth/dal";
import { findOrCreateByEmail } from "@/lib/users";

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
