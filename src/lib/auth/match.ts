import "server-only";
import type {
  AccessRule,
  HttpMethod,
  RouteConfig,
} from "./permissions";

export type MatchResult = {
  rule: AccessRule;
  params: Record<string, string>;
  patternKey: string;
};

/**
 * Match a request path against the route permissions config.
 *
 * Patterns may contain `[param]` segments matching any single segment.
 * The most specific pattern wins (longest exact prefix, then lexical).
 * For configs with `perMethod`, the rule for the request's method is
 * returned, falling back to no match if the method isn't configured.
 */
export function matchRoute(
  pathname: string,
  method: HttpMethod,
  table: Record<string, RouteConfig>,
): MatchResult | null {
  let best: MatchResult | null = null;
  let bestScore = -1;

  for (const [pattern, config] of Object.entries(table)) {
    const params = matchPattern(pattern, pathname);
    if (!params) continue;

    const rule = resolveMethodRule(config, method);
    if (!rule) continue;

    const score = specificity(pattern);
    if (score > bestScore) {
      bestScore = score;
      best = { rule, params, patternKey: pattern };
    }
  }

  return best;
}

function resolveMethodRule(
  config: RouteConfig,
  method: HttpMethod,
): AccessRule | null {
  if ("perMethod" in config) {
    return config.perMethod[method] ?? null;
  }
  return config;
}

/**
 * Match `pattern` (with optional [param] segments) against `pathname`.
 * The pattern may match `pathname` exactly, OR it may match a strict
 * prefix when followed by a `/` segment in the path. This lets the entry
 * for `/admin/members` cover `/admin/members/[userId]/edit` automatically.
 *
 * Returns extracted params on match, or null on miss.
 */
function matchPattern(
  pattern: string,
  pathname: string,
): Record<string, string> | null {
  const patternSegments = pattern.split("/").filter(Boolean);
  const pathSegments = pathname.split("/").filter(Boolean);

  if (pathSegments.length < patternSegments.length) return null;
  // Allow prefix match: pattern is a prefix of path on segment boundaries.
  // Exact match also passes through this same code path.

  const params: Record<string, string> = {};
  for (let i = 0; i < patternSegments.length; i++) {
    const p = patternSegments[i];
    const v = pathSegments[i];
    if (p.startsWith("[") && p.endsWith("]")) {
      params[p.slice(1, -1)] = v;
    } else if (p !== v) {
      return null;
    }
  }
  return params;
}

/**
 * Score a pattern so that more-specific patterns win. We prefer:
 * 1. Longer patterns (more segments) over shorter ones.
 * 2. Static segments over [param] segments at the same depth.
 */
function specificity(pattern: string): number {
  const segments = pattern.split("/").filter(Boolean);
  let score = segments.length * 100;
  for (const seg of segments) {
    if (!(seg.startsWith("[") && seg.endsWith("]"))) score += 1;
  }
  return score;
}
