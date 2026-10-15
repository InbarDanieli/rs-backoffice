"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui/Select";
import {
  AUDIT_ACTIONS,
  AUDIT_CATEGORIES,
  type AuditAction,
  type AuditCategory,
  type AuditLogEntry,
} from "@/lib/audit-actions";
import styles from "./audit-logs.module.css";

interface AuditActorOption {
  userId: string;
  email: string;
  name: string;
}

interface AuditLogsClientProps {
  actors: AuditActorOption[];
}

interface AuditLogsResponse {
  items: AuditLogEntry[];
  total: number;
  page: number;
  pageSize: number;
}

type FilterKey = "q" | "category" | "action" | "actor" | "targetId" | "target" | "range" | "from" | "to" | "page";

const RANGE_PRESETS = [
  { value: "", label: "All time" },
  { value: "24h", label: "Last 24h" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
] as const;

const RANGE_MS: Record<string, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

const ROLE_LABELS: Record<string, string> = {
  "team-member": "Team Member",
  admin: "Admin",
  "sponsor-manager": "Sponsor Manager",
};

const LOGIN_FAILURE_REASONS: Record<string, string> = {
  not_allowed: "Email not on the member list",
  email_not_verified: "Google email not verified",
  missing_code: "Sign-in was cancelled",
  oauth_error: "Google sign-in error",
  server_misconfigured: "Server misconfigured",
};

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  const datePart = date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  const timePart = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", second: "2-digit" });
  return `${datePart}, ${timePart}`;
}

function formatRelative(iso: string, now: number): string {
  const seconds = Math.round((now - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

/** "carouselImages" → "Carousel images" */
function humanizeField(field: string): string {
  const spaced = field.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]/g, " ").toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function summarize(entry: AuditLogEntry): string {
  const meta = entry.meta ?? {};
  switch (entry.action) {
    case "auth.login_failed": {
      const reason = LOGIN_FAILURE_REASONS[String(meta.reason)] ?? String(meta.reason ?? "");
      return meta.attemptedEmail ? `${meta.attemptedEmail}: ${reason}` : reason;
    }
    case "year.member_added":
    case "year.member_removed":
      return String(meta.email ?? "");
    case "year.members_bulk_added":
      return `${meta.count} members added`;
    case "year.members_reordered":
      return `${meta.count} members in new order`;
    case "year.deleted":
      return `Had ${meta.memberCount ?? 0} members`;
    case "sponsor.image_upload_failed": {
      const image = `${humanizeField(String(meta.kind ?? "image"))}${typeof meta.index === "number" ? ` #${meta.index + 1}` : ""}`;
      return meta.reason === "upload_error" ? `${image}: ${meta.error ?? "upload error"}` : `${image}: invalid request`;
    }
    case "sponsor.public_link_created":
      return `Valid for ${meta.ttlDays} day${meta.ttlDays === 1 ? "" : "s"}`;
    case "deploy.triggered":
      return meta.dispatched ? "Deploy started" : "Failed to start";
    case "user.created":
      return meta.via === "first_login" ? "Created on first sign-in" : "";
  }
  if (entry.changes && entry.changes.length > 0) {
    const fields = entry.changes.map((c) => humanizeField(c.field));
    const shown = fields.slice(0, 3).join(", ");
    return fields.length > 3 ? `Changed ${shown} +${fields.length - 3} more` : `Changed ${shown}`;
  }
  return "";
}

function targetHref(entry: AuditLogEntry): string | null {
  if (!entry.target || entry.action === "sponsor.deleted") return null;
  if (entry.target.type === "sponsor") return `/admin/sponsors/${entry.target.id}/edit`;
  if (entry.target.type === "user") return `/admin/members/${entry.target.id}/view`;
  return null;
}

/** ISO string for a date, or undefined if it's invalid (e.g. a hand-edited URL). */
function toIso(date: Date): string | undefined {
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function rangeToDates(params: URLSearchParams): { from?: string; to?: string } {
  const range = params.get("range") ?? "";
  if (Object.hasOwn(RANGE_MS, range)) {
    return { from: toIso(new Date(Date.now() - RANGE_MS[range])) };
  }
  const from = params.get("from");
  const to = params.get("to");
  return {
    // Date inputs are local calendar days: cover the whole "to" day.
    from: from ? toIso(new Date(`${from}T00:00:00`)) : undefined,
    to: to ? toIso(new Date(`${to}T23:59:59.999`)) : undefined,
  };
}

// ---------------------------------------------------------------------------
// Small presentational pieces
// ---------------------------------------------------------------------------

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
      className={`${styles.chevron} ${open ? styles.chevronOpen : ""}`}
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function DiffValue({ value }: { value: unknown }) {
  if (value === null || value === undefined || value === "") {
    return <span className={styles.diffEmpty}>empty</span>;
  }
  if (typeof value === "string") {
    if (/^https?:\/\//.test(value)) {
      return (
        <a href={value} target="_blank" rel="noreferrer" className={styles.diffLink}>
          {value}
        </a>
      );
    }
    return <span className={styles.diffText}>{value}</span>;
  }
  if (typeof value === "boolean" || typeof value === "number") {
    return <span className={styles.diffText}>{String(value)}</span>;
  }
  return <pre className={styles.diffPre}>{JSON.stringify(value, null, 2)}</pre>;
}

function EntryDetails({ entry }: { entry: AuditLogEntry }) {
  const metaEntries = Object.entries(entry.meta ?? {}).filter(([, v]) => v !== undefined && v !== "");
  return (
    <div className={styles.details}>
      {entry.changes && entry.changes.length > 0 && (
        <table className={styles.diffTable}>
          <thead>
            <tr>
              <th>Field</th>
              <th>Before</th>
              <th>After</th>
            </tr>
          </thead>
          <tbody>
            {entry.changes.map((change) => (
              <tr key={change.field}>
                <td className={styles.diffField}>{humanizeField(change.field)}</td>
                <td className={styles.diffBefore}><DiffValue value={change.before} /></td>
                <td className={styles.diffAfter}><DiffValue value={change.after} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <dl className={styles.metaList}>
        <dt>When</dt>
        <dd>{formatTimestamp(entry.createdAt)}</dd>
        <dt>Event</dt>
        <dd><code>{entry.action}</code></dd>
        {entry.actor.type === "user" && (
          <>
            <dt>Actor</dt>
            <dd>{entry.actor.name || "—"} ({entry.actor.email}), {ROLE_LABELS[entry.actor.role] ?? entry.actor.role}</dd>
          </>
        )}
        {entry.target && (
          <>
            <dt>Target</dt>
            <dd>{entry.target.label} <span className={styles.muted}>({entry.target.type} · {entry.target.id})</span></dd>
          </>
        )}
        {metaEntries.map(([key, value]) => (
          <Fragment key={key}>
            <dt>{humanizeField(key)}</dt>
            <dd>{Array.isArray(value) ? value.join(", ") : typeof value === "object" ? JSON.stringify(value) : String(value)}</dd>
          </Fragment>
        ))}
        {entry.ip && (
          <>
            <dt>IP address</dt>
            <dd>{entry.ip}</dd>
          </>
        )}
        {entry.userAgent && (
          <>
            <dt>Browser</dt>
            <dd className={styles.muted}>{entry.userAgent}</dd>
          </>
        )}
      </dl>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function AuditLogsClient({ actors }: AuditLogsClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const get = (key: FilterKey) => searchParams.get(key) ?? "";
  const q = get("q");
  const category = get("category");
  const action = get("action");
  const actor = get("actor");
  const targetId = get("targetId");
  const targetLabel = get("target");
  const range = get("range");
  const from = get("from");
  const to = get("to");
  const page = Math.max(Number.parseInt(get("page") || "1", 10) || 1, 1);

  const [searchInput, setSearchInput] = useState(q);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [result, setResult] = useState<{ key: string; data: AuditLogsResponse; now: number } | null>(null);
  const [error, setError] = useState<{ key: string; message: string } | null>(null);

  /** Merge `changes` into the URL. Any filter change resets to page 1. */
  function updateParams(changes: Partial<Record<FilterKey, string>>) {
    // Read the live URL (not the render-time searchParams) so the debounced
    // search update can't undo a filter changed in the meantime.
    const next = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    if (!("page" in changes)) next.delete("page");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  // Debounce the search box into the URL.
  useEffect(() => {
    if (searchInput.trim() === q) return;
    const timer = setTimeout(() => updateParams({ q: searchInput.trim() }), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (category) params.set("category", category);
    if (action) params.set("action", action);
    if (actor) params.set("actor", actor);
    if (targetId) params.set("targetId", targetId);
    if (range) params.set("range", range);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    params.set("page", String(page));
    return params.toString();
  }, [q, category, action, actor, targetId, range, from, to, page]);

  useEffect(() => {
    const params = new URLSearchParams(queryString);
    const { from: fromIso, to: toIso } = rangeToDates(params);
    params.delete("range");
    params.delete("from");
    params.delete("to");
    if (fromIso) params.set("from", fromIso);
    if (toIso) params.set("to", toIso);

    let cancelled = false;
    fetch(`/api/audit-logs?${params.toString()}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<AuditLogsResponse>;
      })
      .then((data) => {
        if (!cancelled) setResult({ key: queryString, data, now: Date.now() });
      })
      .catch(() => {
        if (!cancelled) setError({ key: queryString, message: "Failed to load audit logs." });
      });
    return () => {
      cancelled = true;
    };
  }, [queryString]);

  const loading = result?.key !== queryString && error?.key !== queryString;
  const failed = error?.key === queryString;
  const data = result?.data;
  const items = data?.items ?? [];
  const totalPages = data ? Math.max(Math.ceil(data.total / data.pageSize), 1) : 1;

  const actionOptions = useMemo(
    () => [
      { value: "", label: "All events" },
      ...(Object.entries(AUDIT_ACTIONS) as [AuditAction, { label: string; category: AuditCategory }][])
        .filter(([, def]) => !category || def.category === category)
        .map(([value, def]) => ({ value, label: def.label })),
    ],
    [category],
  );

  const actorOptions = useMemo(
    () => [
      { value: "", label: "Everyone" },
      { value: "public", label: "Public (not signed in)" },
      ...actors.map((a) => ({ value: a.userId, label: a.name ? `${a.name} (${a.email})` : a.email })),
    ],
    [actors],
  );

  const hasFilters = Boolean(q || category || action || actor || targetId || range || from || to);

  function clearFilters() {
    setSearchInput("");
    router.replace(pathname, { scroll: false });
  }

  return (
    <div className={styles.card}>
      {/* ── Filters ── */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <SearchIcon />
          <input
            type="search"
            className={styles.searchInput}
            placeholder="Search by person, email, sponsor, year, IP…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            aria-label="Search audit logs"
          />
        </div>
        <Select
          options={[{ value: "", label: "All categories" }, ...AUDIT_CATEGORIES]}
          value={category}
          onChange={(value) => {
            // Drop an action filter that doesn't belong to the new category.
            const keepAction = action && (!value || AUDIT_ACTIONS[action as AuditAction]?.category === value);
            updateParams({ category: value, action: keepAction ? action : "" });
          }}
          width="11rem"
        />
        <Select options={actionOptions} value={action} onChange={(value) => updateParams({ action: value })} width="13rem" />
        <Select options={actorOptions} value={actor} onChange={(value) => updateParams({ actor: value })} width="14rem" />
      </div>

      <div className={styles.toolbar}>
        <div className={styles.presets} role="group" aria-label="Time range">
          {RANGE_PRESETS.map((preset) => {
            const active = preset.value === range && (preset.value !== "" || (!from && !to));
            return (
              <button
                key={preset.label}
                type="button"
                className={`${styles.preset} ${active ? styles.presetActive : ""}`}
                onClick={() => updateParams({ range: preset.value, from: "", to: "" })}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
        <div className={styles.dateRange}>
          <label className={styles.dateLabel}>
            From
            <input
              type="date"
              className={styles.dateInput}
              value={from}
              max={to || undefined}
              onChange={(e) => updateParams({ from: e.target.value, range: "" })}
            />
          </label>
          <label className={styles.dateLabel}>
            To
            <input
              type="date"
              className={styles.dateInput}
              value={to}
              min={from || undefined}
              onChange={(e) => updateParams({ to: e.target.value, range: "" })}
            />
          </label>
        </div>
        {hasFilters && (
          <button type="button" className={styles.clearBtn} onClick={clearFilters}>
            Clear filters
          </button>
        )}
      </div>

      {targetId && (
        <div className={styles.activeChips}>
          <span className={styles.chip}>
            Showing history of <strong>{targetLabel || targetId}</strong>
            <button type="button" aria-label="Remove target filter" onClick={() => updateParams({ targetId: "", target: "" })}>
              ×
            </button>
          </span>
        </div>
      )}

      {/* ── Results ── */}
      <div className={styles.resultBar}>
        {data && !loading ? (
          <span>
            {data.total.toLocaleString()} {data.total === 1 ? "event" : "events"}
            {hasFilters ? " match your filters" : ""}
          </span>
        ) : (
          <span>&nbsp;</span>
        )}
      </div>

      {loading ? (
        <div className={styles.loadingState}>
          <span className={styles.spinner} aria-hidden="true" />
          Loading audit logs…
        </div>
      ) : failed ? (
        <p className={styles.errorMsg}>{error?.message}</p>
      ) : items.length === 0 ? (
        <p className={styles.emptyHint}>
          {hasFilters ? "No events match these filters." : "No events have been recorded yet."}
        </p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.colToggle} aria-label="Expand" />
                <th>When</th>
                <th>Who</th>
                <th>Event</th>
                <th>Target</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {items.map((entry) => {
                const open = expandedId === entry.id;
                // Fallback keeps old entries readable if an action is ever renamed.
                const def = AUDIT_ACTIONS[entry.action] ?? { label: entry.action, category: entry.category };
                const href = targetHref(entry);
                const summary = summarize(entry);
                return (
                  <Fragment key={entry.id}>
                    <tr
                      className={`${styles.row} ${open ? styles.rowOpen : ""}`}
                      onClick={() => setExpandedId(open ? null : entry.id)}
                    >
                      <td className={styles.colToggle}>
                        <button
                          type="button"
                          className={styles.toggleBtn}
                          aria-expanded={open}
                          aria-label={open ? "Hide details" : "Show details"}
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedId(open ? null : entry.id);
                          }}
                        >
                          <ChevronIcon open={open} />
                        </button>
                      </td>
                      <td className={styles.colTime} title={formatTimestamp(entry.createdAt)}>
                        {result ? formatRelative(entry.createdAt, result.now) : ""}
                      </td>
                      <td>
                        {entry.actor.type === "user" ? (
                          <button
                            type="button"
                            className={styles.linkBtn}
                            title={`Show everything ${entry.actor.email} did`}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (entry.actor.type === "user") updateParams({ actor: entry.actor.userId });
                            }}
                          >
                            <span className={styles.actorName}>{entry.actor.name || entry.actor.email}</span>
                            {entry.actor.name && <span className={styles.actorEmail}>{entry.actor.email}</span>}
                          </button>
                        ) : (
                          <button
                            type="button"
                            className={styles.linkBtn}
                            title="Show all public activity"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateParams({ actor: "public" });
                            }}
                          >
                            <span className={styles.publicBadge}>{entry.actor.label}</span>
                          </button>
                        )}
                      </td>
                      <td>
                        <span className={`${styles.badge} ${styles[`badge_${def.category}`]}`}>{def.label}</span>
                      </td>
                      <td>
                        {entry.target ? (
                          <span className={styles.targetCell}>
                            <button
                              type="button"
                              className={styles.linkBtn}
                              title={`Show history of ${entry.target.label}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (entry.target) updateParams({ targetId: entry.target.id, target: entry.target.label });
                              }}
                            >
                              {entry.target.label}
                            </button>
                            {href && (
                              <Link
                                href={href}
                                className={styles.openLink}
                                title="Open"
                                onClick={(e) => e.stopPropagation()}
                              >
                                ↗
                              </Link>
                            )}
                          </span>
                        ) : (
                          <span className={styles.muted}>—</span>
                        )}
                      </td>
                      <td className={styles.colSummary}>{summary || <span className={styles.muted}>—</span>}</td>
                    </tr>
                    {open && (
                      <tr className={styles.detailsRow}>
                        <td colSpan={6}>
                          <EntryDetails entry={entry} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Pagination ── */}
      {data && !loading && data.total > data.pageSize && (
        <div className={styles.pagination}>
          <button
            type="button"
            className={styles.pageBtn}
            disabled={page <= 1}
            onClick={() => updateParams({ page: String(page - 1) })}
          >
            ← Newer
          </button>
          <span className={styles.pageInfo}>
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            className={styles.pageBtn}
            disabled={page >= totalPages}
            onClick={() => updateParams({ page: String(page + 1) })}
          >
            Older →
          </button>
        </div>
      )}
    </div>
  );
}
