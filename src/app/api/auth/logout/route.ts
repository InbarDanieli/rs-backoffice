import { NextResponse } from "next/server";
import { deleteSession } from "@/lib/session";

export async function GET(): Promise<NextResponse> {
  await deleteSession();
  const appUrl = process.env.APP_URL ?? "";
  return NextResponse.redirect(new URL("/admin/login", appUrl));
}
