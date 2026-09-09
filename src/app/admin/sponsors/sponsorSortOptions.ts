import type { SortOption } from "@/lib/sort";
import type { Sponsor } from "@/lib/sponsors";

function byName(a: Sponsor, b: Sponsor): number {
  return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
}

function byUpdatedAt(a: Sponsor, b: Sponsor): number {
  return a.updated
    ? new Date(a.updatedAt).getTime()
    : 0 - (b.updated ? new Date(b.updatedAt).getTime() : 0);
}

// Add a new entry here to add a new sort option — no other code changes needed.
export const SPONSOR_SORT_OPTIONS: SortOption<Sponsor>[] = [
  { value: "name-asc", label: "Name (A–Z)", compare: byName },
  { value: "name-desc", label: "Name (Z–A)", compare: (a, b) => byName(b, a) },
  {
    value: "updated-newest",
    label: "Last updated (Newest)",
    compare: (a, b) => byUpdatedAt(b, a),
  },
  {
    value: "updated-oldest",
    label: "Last updated (Oldest)",
    compare: byUpdatedAt,
  },
];

export const DEFAULT_SPONSOR_SORT = SPONSOR_SORT_OPTIONS[0].value;
