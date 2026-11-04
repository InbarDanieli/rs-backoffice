import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth/dal";
import { isAdmin } from "@/lib/auth/permissions";
import { buildDatabaseExport, isExportScope } from "@/lib/export";

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Read-only: this route must never write to the database. It hands out
  // every record, so re-check the role from MongoDB rather than the JWT alone.
  const { user, role } = await verifySession();
  if (!isAdmin(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const scope = request.nextUrl.searchParams.get("scope") ?? "website";
  if (!isExportScope(scope)) {
    return NextResponse.json({ error: "scope must be \"website\" or \"all\"" }, { status: 400 });
  }

  const { zip, filename } = await buildDatabaseExport(scope, user.email);

  return new NextResponse(zip as BodyInit, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(zip.length),
      "Cache-Control": "no-store",
    },
  });
}
