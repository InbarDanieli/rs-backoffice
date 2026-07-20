import "server-only";
import type { UserRole } from "@/lib/users";
import { canEditUser, canReadUser, type Predicate } from "./predicates";
import { matchRoute } from "./match";

/**
 * ============================================================================
 * Single source of truth for authorization in this project.
 * ============================================================================
 *
 * Every protected page and API route has an entry in `ROUTE_PERMISSIONS`.
 * `proxy.ts` looks up each request against this table and enforces the rule —
 * pages and APIs go through the same code path. There is no per-route auth
 * code in the rest of the codebase; mutation handlers add a one-line DAL
 * backstop (`verifySession()`) for defense in depth against stale JWT roles.
 *
 * ----------------------------------------------------------------------------
 * Adding a new admin page
 * ----------------------------------------------------------------------------
 *   1. Create `src/app/admin/<name>/page.tsx`.
 *   2. Add `"/admin/<name>": { roles: ["admin"] }` here.
 *   3. Done. No auth code in the page itself.
 *
 * ----------------------------------------------------------------------------
 * Adding a new API route
 * ----------------------------------------------------------------------------
 *   1. Create `src/app/api/<name>/route.ts`.
 *   2. Add `"/api/<name>": { roles: [...], redirectToLogin: false }` here.
 *   3. For mutation handlers (POST/PATCH/PUT/DELETE), call `await verifySession()`
 *      at the top — DB-backed defense-in-depth.
 *
 * ----------------------------------------------------------------------------
 * Entry shape
 * ----------------------------------------------------------------------------
 *   roles            List of UserRole, or "any-authenticated", or "public".
 *   redirectToLogin  On auth failure: true (default) → redirect to login;
 *                    false → return 401/403 JSON. Use false for /api/* routes.
 *   check            Optional predicate for nuanced rules (e.g. self-or-admin,
 *                    field-level). Receives { user, params, method, body } and
 *                    returns boolean. Predicates live in ./predicates.ts.
 *
 * For routes with different rules per HTTP method, use `perMethod`:
 *   "/api/foo": {
 *     perMethod: {
 *       GET:    { roles: "any-authenticated", redirectToLogin: false },
 *       PATCH:  { roles: ["admin"], redirectToLogin: false },
 *     },
 *   }
 *
 * ----------------------------------------------------------------------------
 * Matching
 * ----------------------------------------------------------------------------
 * Patterns may contain `[param]` segments. Most-specific pattern wins.
 * `/admin/members` matches both `/admin/members` AND `/admin/members/[userId]/edit`
 * unless a more specific entry overrides it.
 *
 * ----------------------------------------------------------------------------
 * Default-deny
 * ----------------------------------------------------------------------------
 * Any request that doesn't match an entry is rejected. Forgetting to register a
 * route is a visible failure (login redirect or 401), not a silent hole.
 *
 * ----------------------------------------------------------------------------
 * Worked example: /api/users/[id]
 * ----------------------------------------------------------------------------
 * Rule: any authenticated user can read their own profile or (if admin) any
 * profile. Only admin can change the `role` field. Expressed as:
 *
 *   "/api/users/[id]": {
 *     perMethod: {
 *       GET:   { roles: "any-authenticated", redirectToLogin: false, check: canReadUser },
 *       PATCH: { roles: "any-authenticated", redirectToLogin: false, check: canEditUser },
 *     },
 *   }
 *
 * The role list `"any-authenticated"` lets every signed-in user past the role
 * gate; the predicate then narrows further (self-or-admin, no role-field for
 * non-admin). Both `canReadUser` and `canEditUser` are pure functions in
 * ./predicates.ts.
 * ============================================================================
 */

export type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export type RoleList = UserRole[] | "any-authenticated" | "public";

export type AccessRule = {
  roles: RoleList;
  /** On auth failure: true → redirect to /admin/login; false → return 401/403 JSON. Default true. */
  redirectToLogin?: boolean;
  /** Optional predicate for nuanced rules. Runs after the role check. */
  check?: Predicate;
};

export type RouteConfig =
  | AccessRule
  | { perMethod: Partial<Record<HttpMethod, AccessRule>> };

export const ROUTE_PERMISSIONS: Record<string, RouteConfig> = {
  // ---- Root and public pages ----
  "/": { roles: "public" },
  "/admin/login": { roles: "public" },
  "/admin/unauthorized": { roles: "public" },
  "/public/[token]": { roles: "public" },

  // ---- Protected admin pages (redirect to login on failure — default) ----
  "/admin/dashboard": { roles: "any-authenticated" },
  "/admin/members": { roles: ["admin"] },
  "/admin/sponsors": { roles: ["admin", "sponsor-manager"] },

  // ---- Protected APIs (return 401/403 on failure) ----
  "/api/years": { roles: ["admin"], redirectToLogin: false },
  "/api/sponsors": {
    roles: ["admin", "sponsor-manager"],
    redirectToLogin: false,
  },
  "/api/users": {
    perMethod: {
      GET: { roles: "public", redirectToLogin: false },
      POST: { roles: ["admin"], redirectToLogin: false },
    },
  },
  "/api/users/[id]": {
    perMethod: {
      GET: {
        roles: "any-authenticated",
        redirectToLogin: false,
        check: canReadUser,
      },
      PATCH: {
        roles: "any-authenticated",
        redirectToLogin: false,
        check: canEditUser,
      },
    },
  },
  "/api/images/sponsors/[id]": {
    roles: ["admin", "sponsor-manager"],
    redirectToLogin: false,
  },
  "/api/images/users/[id]": {
    roles: "any-authenticated",
    redirectToLogin: false,
    check: canReadUser,
  },
  // ---- Explicitly public APIs ----
  "/api/auth/google": { roles: "public" },
  "/api/auth/callback/google": { roles: "public" },
  "/api/auth/logout": { roles: "public" },
  "/api/public/[token]": { roles: "public" },
  "/api/public/sponsors": { roles: "public", redirectToLogin: false },
};

/**
 * Returns true if a user with `role` is allowed to access `pathname` per the
 * config. Used by the sidebar to decide which nav items to show. Treats any
 * pathname not in the table as inaccessible (matches default-deny behavior).
 *
 * For programmatic enforcement, use `proxy.ts` (which calls `matchRoute`
 * directly) — this helper is for UI hints only.
 */
export function canAccessRoute(pathname: string, role: UserRole): boolean {
  const matched = matchRoute(pathname, "GET", ROUTE_PERMISSIONS);
  if (!matched) return false;
  const { roles } = matched.rule;
  if (roles === "public" || roles === "any-authenticated") return true;
  return roles.includes(role);
}

/** Convenience: true if the role grants full administrative privileges. */
export function isAdmin(role: UserRole): boolean {
  return role === "admin";
}
