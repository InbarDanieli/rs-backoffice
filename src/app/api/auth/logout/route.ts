import { NextResponse } from "next/server";
import { deleteSession, getSession } from "@/lib/session";
import { logAudit } from "@/lib/audit";

export async function GET(): Promise<NextResponse> {
  // Read the session before deleting it so the log knows who signed out.
  const session = await getSession();
  if (session) {
    await logAudit({
      action: "auth.logout",
      actor: {
        type: "user",
        userId: session.userId,
        email: session.email,
        name: session.name,
        role: session.role,
      },
    });
  }

  await deleteSession();
  const appUrl = process.env.APP_URL ?? "";
  return NextResponse.redirect(new URL("/admin/login", appUrl));
}
