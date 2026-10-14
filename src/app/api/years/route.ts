import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth/dal";
import { listYears, createYear } from "@/lib/years";
import { actorFromUser, logAudit } from "@/lib/audit";

export async function GET(): Promise<NextResponse> {
  const years = await listYears();
  return NextResponse.json(years);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const { user } = await verifySession();

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

  const year = await createYear({ name, isDefault, userEmail: user.email });
  await logAudit({
    action: "year.created",
    actor: actorFromUser(user),
    target: { type: "year", id: year.id, label: year.name },
    meta: { isDefault },
  });
  return NextResponse.json(year, { status: 201 });
}
