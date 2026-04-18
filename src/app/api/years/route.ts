import { NextRequest, NextResponse } from "next/server";
import { getSessionWithRole, isAdmin, apiForbidden } from "@/lib/admin-authorization";
import { listYears, createYear } from "@/lib/years";

export async function GET(): Promise<NextResponse> {
  const sessionData = await getSessionWithRole();
  if (!sessionData) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(sessionData.role)) return apiForbidden();

  const years = await listYears();
  return NextResponse.json(years);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const sessionData = await getSessionWithRole();
  if (!sessionData) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(sessionData.role)) return apiForbidden();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  const isDefault = raw.isDefault === true;

  if (!name) {
    return NextResponse.json(
      { error: "Year name is required" },
      { status: 400 },
    );
  }

  const year = await createYear({ name, isDefault, userEmail: sessionData.session.email });
  return NextResponse.json(year, { status: 201 });
}
