import "server-only";
import { headers } from "next/headers";
import type { Collection, Filter } from "mongodb";
import clientPromise from "./db";
import type { User } from "./users";
import {
  AUDIT_ACTIONS,
  type AuditAction,
  type AuditActor,
  type AuditCategory,
  type AuditChange,
  type AuditLogEntry,
  type AuditTargetType,
} from "./audit-actions";

/** Entries expire automatically one year after creation (MongoDB TTL index). */
const RETENTION_SECONDS = 365 * 24 * 60 * 60;

const MAX_STRING_LENGTH = 300;
const MAX_VALUE_JSON_LENGTH = 2000;
const MAX_HEADER_LENGTH = 300;
const MAX_SEARCH_LENGTH = 200;
const MAX_PAGE = 10_000;

/** Fields never worth diffing (bookkeeping) or never safe to store (secrets). */
const IGNORED_DIFF_FIELDS = new Set([
  "_id",
  "createdAt",
  "updatedAt",
  "updated",
  "publicToken",
  "publicTokenExpiresAt",
]);

interface AuditLogDoc {
  id: string;
  /** Must stay a BSON Date — the TTL index ignores any other type. */
  createdAt: Date;
  action: AuditAction;
  category: AuditCategory;
  actor: AuditActor;
  target?: { type: AuditTargetType; id: string; label: string };
  changes?: AuditChange[];
  meta?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}

let indexesReady: Promise<unknown> | null = null;

async function getCollection(): Promise<Collection<AuditLogDoc>> {
  const client = await clientPromise;
  const col = client.db().collection<AuditLogDoc>("audit_logs");
  indexesReady ??= Promise.all([
    col.createIndex({ createdAt: 1 }, { expireAfterSeconds: RETENTION_SECONDS }),
    col.createIndex({ category: 1, createdAt: -1 }),
    col.createIndex({ action: 1, createdAt: -1 }),
    col.createIndex({ "actor.userId": 1, createdAt: -1 }),
    col.createIndex({ "target.id": 1, createdAt: -1 }),
  ]).catch((err) => {
    indexesReady = null;
    console.error("[audit] failed to create indexes", err);
  });
  await indexesReady;
  return col;
}

// ---------------------------------------------------------------------------
// Actors
// ---------------------------------------------------------------------------

export function actorFromUser(
  user: Pick<User, "id" | "email" | "name" | "role">,
): AuditActor {
  return { type: "user", userId: user.id, email: user.email, name: user.name, role: user.role };
}

export function publicActor(label = "Public"): AuditActor {
  return { type: "public", label };
}

// ---------------------------------------------------------------------------
// Diffing
// ---------------------------------------------------------------------------

/** Make a value safe and compact for storage: strip image data, cap lengths. */
function sanitize(value: unknown): unknown {
  if (typeof value === "string") {
    if (value.startsWith("data:")) return "[image data]";
    return value.length > MAX_STRING_LENGTH ? `${value.slice(0, MAX_STRING_LENGTH)}…` : value;
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  if (Array.isArray(value)) {
    const items = value.map(sanitize);
    return JSON.stringify(items).length > MAX_VALUE_JSON_LENGTH
      ? `[${value.length} items]`
      : items;
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, sanitize(v)]),
    );
  }
  return value;
}

function stableJson(value: unknown): string {
  return JSON.stringify(value ?? null) ?? "null";
}

/**
 * Field-level diff of `next` against `prev`. Only keys present in `next`
 * are compared, so partial updates (e.g. a tier change) diff just that field.
 */
export function diffFields(
  prev: object | null | undefined,
  next: object,
): AuditChange[] {
  const before = (prev ?? {}) as Record<string, unknown>;
  const changes: AuditChange[] = [];
  for (const [field, after] of Object.entries(next)) {
    if (IGNORED_DIFF_FIELDS.has(field) || after === undefined) continue;
    if (stableJson(before[field]) === stableJson(after)) continue;
    changes.push({ field, before: sanitize(before[field] ?? null), after: sanitize(after) });
  }
  return changes;
}

/**
 * Picks `keys` from a stored entity. Diff against what was actually saved
 * (not the raw request body) so normalized values — e.g. uploaded image
 * URLs — are what get logged.
 */
export function pickFields(obj: object, keys: string[]): Record<string, unknown> {
  const src = obj as Record<string, unknown>;
  return Object.fromEntries(keys.filter((k) => k in src).map((k) => [k, src[k]]));
}

/**
 * Meta for a failed image upload: the request's `{ kind, index }` (never the
 * image data) plus why it failed.
 */
export function imageUploadFailureMeta(body: unknown, error?: unknown): Record<string, unknown> {
  const { kind, index } = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;
  return {
    kind,
    ...(typeof index === "number" ? { index } : {}),
    reason: error === undefined ? "invalid_request" : "upload_error",
    ...(error !== undefined ? { error: error instanceof Error ? error.message : String(error) } : {}),
  };
}

// ---------------------------------------------------------------------------
// Writing
// ---------------------------------------------------------------------------

export interface LogAuditInput {
  action: AuditAction;
  actor: AuditActor;
  target?: { type: AuditTargetType; id: string; label: string };
  changes?: AuditChange[];
  meta?: Record<string, unknown>;
}

async function requestContext(): Promise<{ ip?: string; userAgent?: string }> {
  try {
    const h = await headers();
    // Headers are client-controlled unless a proxy/platform overwrites them;
    // cap their length so they can't bloat entries.
    const ip =
      h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || undefined;
    const userAgent = h.get("user-agent") || undefined;
    return {
      ip: ip?.slice(0, MAX_HEADER_LENGTH),
      userAgent: userAgent?.slice(0, MAX_HEADER_LENGTH),
    };
  } catch {
    return {};
  }
}

/**
 * Records an audit-log entry. Never throws — a logging failure must not
 * break the mutation that triggered it.
 */
export async function logAudit(input: LogAuditInput): Promise<void> {
  try {
    const col = await getCollection();
    const ctx = await requestContext();
    const doc: AuditLogDoc = {
      id: crypto.randomUUID(),
      createdAt: new Date(),
      action: input.action,
      category: AUDIT_ACTIONS[input.action].category,
      actor: input.actor,
      ...(input.target ? { target: input.target } : {}),
      ...(input.changes && input.changes.length > 0 ? { changes: input.changes } : {}),
      ...(input.meta ? { meta: sanitize(input.meta) as Record<string, unknown> } : {}),
      ...ctx,
    };
    await col.insertOne(doc);
  } catch (err) {
    console.error(`[audit] failed to record ${input.action}`, err);
  }
}

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

export interface AuditQuery {
  q?: string;
  category?: AuditCategory;
  action?: AuditAction;
  /** "public", or a user id. */
  actor?: string;
  targetId?: string;
  from?: Date;
  to?: Date;
  page?: number;
  pageSize?: number;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toEntry(doc: AuditLogDoc): AuditLogEntry {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { _id, ...rest } = doc as AuditLogDoc & { _id?: unknown };
  return { ...rest, createdAt: doc.createdAt.toISOString() };
}

export async function queryAuditLogs(
  query: AuditQuery,
): Promise<{ items: AuditLogEntry[]; total: number }> {
  const col = await getCollection();
  const filter: Filter<AuditLogDoc> = {};

  if (query.category) filter.category = query.category;
  if (query.action) filter.action = query.action;
  if (query.actor === "public") filter["actor.type"] = "public";
  else if (query.actor) filter["actor.userId"] = query.actor;
  if (query.targetId) filter["target.id"] = query.targetId;
  if (query.from || query.to) {
    filter.createdAt = {
      ...(query.from ? { $gte: query.from } : {}),
      ...(query.to ? { $lte: query.to } : {}),
    };
  }

  const q = query.q?.trim().slice(0, MAX_SEARCH_LENGTH);
  if (q) {
    const re = { $regex: escapeRegex(q), $options: "i" };
    filter.$or = [
      { "actor.email": re },
      { "actor.name": re },
      { "actor.label": re },
      { "target.label": re },
      { action: re },
      { "meta.email": re },
      { "meta.emails": re },
      { "meta.attemptedEmail": re },
      { ip: re },
    ];
  }

  const pageSize = Math.min(Math.max(query.pageSize ?? 50, 1), 200);
  const page = Math.min(Math.max(query.page ?? 1, 1), MAX_PAGE);

  const [docs, total] = await Promise.all([
    col
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .toArray(),
    col.countDocuments(filter),
  ]);

  return { items: docs.map(toEntry), total };
}

export interface AuditActorOption {
  userId: string;
  email: string;
  name: string;
}

/** Distinct signed-in actors that appear in the log, for the "Who" filter. */
export async function listAuditActors(): Promise<AuditActorOption[]> {
  const col = await getCollection();
  const rows = await col
    .aggregate<{ _id: string; email: string; name: string }>([
      { $match: { "actor.type": "user" } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$actor.userId",
          email: { $first: "$actor.email" },
          name: { $first: "$actor.name" },
        },
      },
      { $sort: { email: 1 } },
    ])
    .toArray();
  return rows.map((r) => ({ userId: r._id, email: r.email, name: r.name }));
}
