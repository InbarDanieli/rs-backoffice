<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Auth & Authorization

All authorization is controlled by **`src/lib/auth/permissions.ts`**. Every protected page and API route has an entry there. `src/proxy.ts` is the chokepoint that enforces the rules on every request — there is no per-page or per-route auth code in the rest of the codebase.

**Roles:** `admin` (full access), `sponsor-manager` (sponsors only), `team-member` (own profile + dashboard).

## Adding a new admin page

1. Create `src/app/admin/<name>/page.tsx`.
2. Add an entry to `ROUTE_PERMISSIONS` in `src/lib/auth/permissions.ts`:
   ```ts
   "/admin/<name>": { roles: ["admin"] },
   ```
3. The page renders. No auth code in the page itself. If the page needs the current user's profile, call `await getCurrentUser()` from `@/lib/auth/dal`.

## Adding a new API route

1. Create `src/app/api/<name>/route.ts`.
2. Add an entry with `redirectToLogin: false` so failures return JSON instead of redirecting:
   ```ts
   "/api/<name>": { roles: ["admin"], redirectToLogin: false },
   ```
3. **Mutation handlers** (POST/PATCH/PUT/DELETE) must call `await verifySession()` from `@/lib/auth/dal` at the top — this re-fetches the user's role from MongoDB so a stale JWT can't authorize a write. Read handlers (GET) don't need to — `proxy.ts` is sufficient.

## Custom rules (predicates)

For nuance the role list can't express — e.g., "user can edit own profile, but only admin can change the `role` field" — write a predicate in `src/lib/auth/predicates.ts` and reference it via `check`:

```ts
"/api/users/[id]": {
  perMethod: {
    GET:   { roles: "any-authenticated", redirectToLogin: false, check: canReadUser },
    PATCH: { roles: "any-authenticated", redirectToLogin: false, check: canEditUser },
  },
},
```

Predicates are pure functions that receive `{ user, params, method, body }` and return `boolean`. They run inside `proxy.ts` after the role check.

## How matching works

Patterns may contain `[param]` segments. The most specific pattern wins (longest, then static-segments-over-params). A pattern like `/admin/members` covers `/admin/members/[userId]/edit` automatically — no need to register every nested page unless they have different rules.

## Default-deny

Any request to a route not listed in `ROUTE_PERMISSIONS` is rejected. Pages redirect to `/admin/login`; APIs return 401. Forgetting to register a route is a visible failure, not a silent hole.
