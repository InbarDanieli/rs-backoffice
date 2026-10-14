import { NextRequest, NextResponse } from "next/server";
import { queryAuditLogs } from "@/lib/audit";
import { isAuditAction, isAuditCategory } from "@/lib/audit-actions";

const PAGE_SIZE = 50;

function parseDate(value: string | null): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const sp = request.nextUrl.searchParams;

  const category = sp.get("category") ?? "";
  const action = sp.get("action") ?? "";
  const page = Number.parseInt(sp.get("page") ?? "1", 10);

  const { items, total } = await queryAuditLogs({
    q: sp.get("q") ?? undefined,
    category: isAuditCategory(category) ? category : undefined,
    action: isAuditAction(action) ? action : undefined,
    actor: sp.get("actor") || undefined,
    targetId: sp.get("targetId") || undefined,
    from: parseDate(sp.get("from")),
    to: parseDate(sp.get("to")),
    page: Number.isFinite(page) && page > 0 ? page : 1,
    pageSize: PAGE_SIZE,
  });

  return NextResponse.json({
    items,
    total,
    page: Number.isFinite(page) && page > 0 ? page : 1,
    pageSize: PAGE_SIZE,
  });
}
