# Phase 2: Tenant Isolation and Server Authz - Research

**Researched:** 2026-08-29
**Domain:** Multi-tenant RLS + Next.js App Router BFF on NextAuth v4 JWT + Supabase PostgREST (no Supabase Auth)
**Confidence:** HIGH (brownfield verified against live local Postgres + official NextAuth/Supabase docs)

<user_constraints>
## User Constraints (from CONTEXT.md)

No CONTEXT.md exists for this phase — there are no discuss-phase locked decisions. Do not invent them. Plan from research + REQUIREMENTS.md + Phase 1 artifacts.

### Planning constraints (from PROJECT.md, ROADMAP.md, CLAUDE.md, Phase 1 — honor these)

- Stay on Next.js App Router (`apps/web`), NextAuth v4 `NextAuthOptions` (not Auth.js v5), `@timeoff/database` modules, Supabase Postgres. Do not add a second ORM or a parallel app.
- Do not rebuild shipped dashboards, request form, approve dialogs, or calendar chrome. Phase 2 has no UI-gate visual redesign — swap data transport only.
- Owner = `companies.owner_id`; first user role is `admin`; invitees are `employee`. Do NOT add `owner` to the `users.role` CHECK.
- Open RLS `USING (true)` on `companies` / `company_invites` was accepted as Phase 2 (T-01-06 / AR-01-01), not a Phase 1 miss. Close it here.
- Local Supabase is the Phase 1 schema source of truth; hosted project may lag. Apply the new RLS migration locally (`supabase db push --local`) the same way as 01-02.
- Identity writes stay on Route Handlers + `@/lib/supabase` (or a new server-only client). Do not invent a third data client besides: (1) identity server client, (2) tenant-scoped `IDatabaseService`.
- Prefer modifying leave lifecycle and auth in place (hooks, services, RLS migrations) over a greenfield rewrite.

### Claude's Discretion (recommendations — not user-locked)

- Move **both** reads and writes off the browser anon key onto session-gated Route Handlers (one transport). Do not leave dashboard GET on PostgREST after REVOKE.
- Isolate child tables via `EXISTS (users.company_id = current_company_id())` rather than adding `company_id` columns to every table this phase.
- Mint a short-lived Supabase-compatible JWT on the server after `getServerSession` so RLS actually evaluates (AUTHZ-02). Use `service_role` only for pre-session identity (credentials `authorize`, session callback, invite hash lookup, SECURITY DEFINER RPCs).
- Recreate `active_leave_requests` as `security_invoker` (Postgres 15+). The current view bypasses RLS.
- Wave 0 tests stay on Node built-in `node:test` (no Vitest). Add `supabase/tests/*.sql` + `supabase test db` for RLS allow/deny.

### Deferred Ideas (OUT OF SCOPE)

- BAL-01–05 live remaining days / default balances / deduct on approve (Phases 3–5).
- LEAVE-01–04 durable audit correctness and `user_id: 'system'` (Phase 4). Best-effort audit/notify in `LeaveRequestService` stays as-is.
- NOTIF-01–04 in-app + email (Phase 4).
- AUTH-01–04 password reset (Phase 6).
- CAL-01–02 calendar/dashboard agreement (Phase 7) — only tenant-scope the existing calendar queries.
- ADMIN-01 / stub `/(admin)/users`.
- Working-day math, `leave_policies` enforcement, mailer.
- Full RBAC (employee cannot approve). Phase 2 is **company** isolation + session-bound writes, not a new permission matrix.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TENANT-04 | Company A cannot read or change Company B’s people, requests, balances, calendars, notifications, or audit | Drop `USING (true)` policies; RLS `to authenticated` keyed on `(select public.current_company_id())` (JWT `company_id` claim). `getAllLeaveRequests` / `findAll` users become company-scoped by policy even if the repository has no filter. Recreate `active_leave_requests` as `security_invoker`. |
| AUTHZ-01 | Leave and user mutations run on the server using the signed-in session, not the browser anon key | New Route Handlers next to `/api/auth/invites` using `getServerSession(authOptions)`. Hooks keep TanStack Query; `mutationFn`/`queryFn` become `fetch('/api/...', { credentials: 'include' })`. Bind `user_id` / actor id from `session.user.id`, never from the JSON body. |
| AUTHZ-02 | Database policies deny rows outside the session user’s company | Policies must run as Postgres role `authenticated` with a user JWT. `service_role` **bypasses** RLS — do not use it for tenant queries. Helper `(select auth.jwt() ->> 'company_id')`. |
| AUTHZ-03 | The public API key cannot read or write leave, user, or notification data without a valid tenant session | `REVOKE ALL` on tenant tables from `anon`; drop public `USING (true)` policies; keep `GRANT EXECUTE` only on `create_company_with_owner` and `accept_invite_with_employee` (make those `SECURITY DEFINER`). Anon curl to `/rest/v1/leave_requests` must 401/empty. |
</phase_requirements>

## Project Constraints (from .cursor/rules/ and CLAUDE.md)

No `.cursor/rules/` directory exists. Actionable directives from `.claude/CLAUDE.md` / CONVENTIONS:

- **Stack:** Next.js 14 App Router in `apps/web` (`next` `^14.2.18`). Do not use Next 15 async `cookies()` / `params`. Root `package.json` listing Next 15 is not the app.
- **Auth:** NextAuth v4 `NextAuthOptions`. `getServerSession` from `next-auth/next`.
- **Data:** Supabase JS only. No Prisma/Drizzle/`DATABASE_URL` driver.
- **Identity vs domain:** Auth/signup/invites use a server Supabase client. Domain ops use `IDatabaseService` (move that construction onto the server this phase).
- **Files:** kebab-case (`require-tenant-session.ts`, `tenant-supabase.ts`). API handlers named `GET`/`POST`/`PATCH`. Zod in `apps/web/src/lib/validation.ts`. Session types in `apps/web/src/types/next-auth.d.ts`.
- **Errors:** `NextResponse.json({ error, details? }, { status })` with 400 / 401 / 403 / 500; `validateInput` + `formatValidationErrors`.
- **UI:** No new screens. Import shadcn from `@/components/ui/*`. sonner stays on signed-in mutations.
- **Admin IA:** Do not build `/(admin)/users`.
- **GSD:** Execution of planned work goes through `/gsd-execute-phase`.

## Summary

Phase 2 closes the hole Phase 1 explicitly deferred (T-01-06): the browser still talks to PostgREST with `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and almost every tenant table has RLS enabled with `USING (true)` or `WITH CHECK (true)`. NextAuth’s JWT is independent of Supabase Auth, so `auth.uid()` is null on those requests. Holding the public anon key is enough to read/write other companies’ people, leave, notifications, and (via INSERT `true`) audit.

There is no `company_id` on `leave_requests`, `leave_balances`, `notifications`, `audit_logs`, or `calendar_events`. Isolation is via `users.company_id` (NOT NULL since Phase 1). Session already carries `companyId` and `isOwner` from the NextAuth `session` / `jwt` callbacks.

**Primary recommendation:** (1) Session-gated Route Handlers for all leave/user/notification/calendar reads and writes, reusing `getServerSession(authOptions)` exactly as `/api/auth/invites`. (2) Per-request `IDatabaseService` bound to a Supabase client whose `accessToken` is a short-lived JWT minted with the **project JWT secret** (`role: "authenticated"`, `sub` = `session.user.id`, `company_id` = `session.user.companyId`). (3) One migration: `REVOKE` from `anon`, drop open policies, add `authenticated`-only tenant policies using `(select public.current_company_id())`, `SECURITY DEFINER` the two onboarding RPCs, fix the `active_leave_requests` view. Do not put the minted JWT or `SUPABASE_SERVICE_ROLE_KEY` in the browser.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Deny anon PostgREST on tenant tables | Database / Storage (REVOKE + drop `USING (true)`) | — | AUTHZ-03 is a Postgres grant/policy property, not a React check |
| Tenant row filter (Company A ≠ B) | Database / Storage (RLS `to authenticated`) | API / Backend (`.eq` / EXISTS as defense in depth) | AUTHZ-02 must hold even if a handler forgets a filter |
| Leave/user/notification mutations | API / Backend (Route Handlers + `getServerSession`) | Domain services (`IDatabaseService` on the server) | AUTHZ-01; middleware does not protect `/api` |
| Dashboard/calendar reads | API / Backend (same BFF) | Browser (TanStack Query `fetch`) | After REVOKE, browser `createDatabaseService(supabase)` cannot load data |
| Bind write actor / `user_id` | API / Backend (`session.user.id`) | — | Client-supplied ids are untrusted |
| Credentials login / session enrich / invite hash lookup | API / Backend (`service_role` client) | Database (SECURITY DEFINER RPCs still callable by `anon`) | No tenant JWT exists yet; `authorize` must still `SELECT` the user |
| Mint PostgREST JWT | Frontend Server (Route Handler helper) | Database (PostgREST verifies `role` claim) | NextAuth cookie is not a Supabase JWT |
| UI chrome (forms, tables, calendars) | Browser / Client | — | Unchanged; only hooks’ transport changes |

## Current data-access inventory (brownfield)

### Clients

| Client | File | Key | Where it runs | Phase 2 fate |
|--------|------|-----|---------------|--------------|
| Browser PostgREST | `apps/web/src/lib/supabase.ts` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client (`createClient` with `persistSession: true`) | Stop using for leave/user/notification. Keep the module for `mapUserFromDatabase` only, or split map helpers out. |
| Package default | `packages/database/src/index.ts` `getSupabaseClient()` | same anon env | Lazy; used if facade is constructed without an injected client | Must not be the server tenant client |
| Identity (signup, auth, invites) | same `apps/web/src/lib/supabase.ts` imported from Route Handlers / `auth.ts` | anon today | Server | Switch to **service_role** server client (`persistSession: false`) |
| Factory singleton | `DatabaseServiceFactory.getInstance(db)` | first client wins forever | Process | **Do not** reuse for mixed anon vs tenant JWT. Add request-scoped `create(db)` (no singleton) for server |

Quoted factory first-wins [VERIFIED: packages/database/src/modules/database-service.ts:20-24]:

```
  static getInstance(db: DatabaseClient): DatabaseServiceFactory {
    if (!DatabaseServiceFactory.instance) {
      DatabaseServiceFactory.instance = new DatabaseServiceFactory(db);
    }
    return DatabaseServiceFactory.instance;
  }
```

Quoted browser client [VERIFIED: apps/web/src/lib/supabase.ts:4-9]:

```
export const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!, env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! , {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})
```

Quoted NextAuth session user fields [VERIFIED: apps/web/src/types/next-auth.d.ts:6-21]:

```
      id: string
      email?: string | null
      name?: string | null
      image?: string | null
      first_name: string
      last_name: string
      department: string
      team: string
      role: UserRole
      managerId?: string
      companyId: string
      isOwner: boolean
      hireDate: Date
      isActive: boolean
```

`jwt` callback copies the same `companyId` / `isOwner` / `id` onto the token [VERIFIED: apps/web/src/lib/auth.ts:283-297]. `session` callback re-reads `users` by email via the anon client [VERIFIED: apps/web/src/lib/auth.ts:250-276].

Quoted `getServerSession` analog already in-repo [VERIFIED: apps/web/src/app/api/auth/invites/route.ts:2-23]:

```
import { getServerSession } from 'next-auth/next'
...
  const session = await getServerSession(authOptions)
```

Middleware **does not** run on `/api` [VERIFIED: apps/web/src/middleware.ts:24-34 matcher excludes `api`]. Every new BFF route must session-check itself.

### `IDatabaseService` mutation and leak sites

Quoted interface methods [VERIFIED: packages/database/src/index.ts:240-286] (subset):

```
  updateUser(id: string, updates: Partial<User>): Promise<User>
  createLeaveRequest(...)
  getAllLeaveRequests(): Promise<LeaveRequest[]>
  approveLeaveRequest(id: string, approverId: string, comments?: string)
  rejectLeaveRequest(...)
  deleteLeaveRequest(id: string)
  cancelLeaveRequest(id: string)
  bulkUpdateLeaveRequests(ids: string[], updates: Partial<LeaveRequest>)
  updateLeaveBalance(...)
  createNotification(...)
  markNotificationAsRead(id: string)
  createAuditLog(...)
  getAllUsers(): Promise<User[]>
```

**Browser callers today (all anon PostgREST):**

| Call | File |
|------|------|
| `createLeaveRequest`, `approveLeaveRequest` (manager auto-approve) | `apps/web/src/hooks/use-dashboard-data.ts` |
| `deleteLeaveRequest`, `cancelLeaveRequest`, `approveLeaveRequest`, `rejectLeaveRequest`, `bulkUpdateLeaveRequests` | `apps/web/src/hooks/use-leave-request-operations.ts` |
| `getLeaveBalance`, `getLeaveRequestsByUser`, `getTeamLeaveRequests`, `getManagerTeamStats`, `getAllLeaveRequests`, `getNotificationsByUser` | `use-dashboard-data.ts` |
| `getLeaveRequestsByUser`, `getAllLeaveRequests`, `getTeamLeaveRequests` | `unified-calendar-view.tsx`, `leave-calendar-view.tsx` |
| `getLeavePolicies` | `leave-request-form.tsx` |
| `useDatabaseService()` | `team-calendar-view.tsx` |

`updateUser` / `getAllUsers` are **not** called from `apps/web` TSX, but `UserRepository.findAll` / `update` / `select('*')` remain callable with the anon key until grants are revoked. `select('*')` on `users` includes `password` hashes [VERIFIED: packages/database/src/modules/users/repository.ts:10-13].

`getAllLeaveRequests` → `findAll` with **no company filter** [VERIFIED: packages/database/src/modules/leave-requests/repository.ts:49-57]. That is the admin/HR cross-tenant read.

`findTeamRequests` filters `users.manager_id` only — UUID-safe across companies, but still needs RLS so a forged manager id cannot scan another tenant.

### Tables and `company_id`

| Table | Has `company_id`? | Isolation strategy |
|-------|-------------------|--------------------|
| `companies` | n/a (the tenant) | `id = current_company_id()` |
| `company_invites` | yes, NOT NULL | `company_id = current_company_id()` |
| `users` | yes, NOT NULL [VERIFIED: packages/database/src/modules/users/types.ts:12] `company_id: string;` | `company_id = current_company_id()` |
| `leave_requests`, `leave_balances`, `notifications`, `audit_logs` | no | `EXISTS (SELECT 1 FROM users u WHERE u.id = <table>.user_id AND u.company_id = current_company_id())` |
| `calendar_events` | no; `user_id` nullable | same EXISTS when `user_id` is set; see Open Questions for `user_id IS NULL` holidays |
| `departments`, `teams`, `leave_policies` | no | Global catalogs today (`USING (true)` SELECT). TENANT-04 list does not name them; still **REVOKE anon INSERT/UPDATE/DELETE**. Authenticated SELECT-all is acceptable this phase. |
| `active_leave_requests` (VIEW) | inherits `leave_requests` | **Bypasses RLS** unless `security_invoker` [CITED: supabase.com/docs/guides/database/postgres/row-level-security — “Views bypass RLS by default”]. Recreate with `WITH (security_invoker = true)` (local Postgres 17). Repository reads this view [VERIFIED: packages/database/src/modules/leave-requests/repository.ts:266]. |

`leave_balances`: RLS **enabled**, **zero policies** on live local DB (queried 2026-08-29). Default deny for `anon`/`authenticated`; dashboard balance fetch is already empty/erroring against a correct RLS install — Phase 3 still owns seeding, but Phase 2 must add tenant SELECT/UPDATE policies or balances stay blocked after the BFF uses `authenticated`.

### Live open policies (local `supabase_db_timeoff`, 2026-08-29)

Verified via `pg_policies`. Open (`qual` or `with_check` is `true`) on: `leave_requests` (all cmds used by the app), `notifications` SELECT/UPDATE/INSERT, `calendar_events` SELECT, `companies` SELECT/INSERT/UPDATE, `company_invites` SELECT/INSERT/UPDATE, `users` several SELECT/UPDATE including `"Public can read users"` and `"Users can update own profile"`, `departments`/`teams`/`leave_policies` public SELECT, `audit_logs` INSERT `true`. Audit SELECT still uses `auth.uid()` (always null for NextAuth) so legitimate admin audit reads fail while anyone can INSERT.

`anon` has full table privileges (SELECT/INSERT/UPDATE/DELETE/TRUNCATE/…) on every public table **and** the view [VERIFIED: `information_schema.role_table_grants` grantee `anon`]. Official guide: adding policies does **not** revoke those grants [CITED: supabase.com/docs/guides/database/postgres/row-level-security — Grants and policies].

Onboarding RPCs (keep callable without a tenant session):

- `GRANT EXECUTE ON FUNCTION create_company_with_owner(...) TO anon, authenticated, service_role` [VERIFIED: packages/database/migrations/20250818193733_add_companies_and_invites.sql:120]
- `GRANT EXECUTE ON FUNCTION accept_invite_with_employee(...) TO anon, authenticated, service_role` [VERIFIED: packages/database/migrations/20250818193734_accept_invite_with_employee.sql:59]

Both functions are **SECURITY INVOKER** today (no `SECURITY DEFINER` in the `CREATE FUNCTION` bodies). After `REVOKE INSERT` on `users`/`companies` from `anon`, those RPCs **break** unless altered to `SECURITY DEFINER SET search_path = public`.

## Standard Stack

Reuse existing packages. Add **one** direct dependency: `jose@4.15.9` (already pulled in by `next-auth@4.24.15`). Do **not** install `jose@6` (legitimacy `SUS` too-new). Do **not** install `jsonwebtoken`. Do **not** install Vitest or `@supabase/ssr` (this app is NextAuth cookies, not Supabase Auth cookies).

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | `^14.2.18` (lockfile `14.2.35`) | App Router Route Handlers | Brownfield app |
| next-auth | `^4.24.5` (registry `4.24.15`) | `getServerSession(authOptions)` | Already used in invites route |
| @supabase/supabase-js | `^2.53.0` in `apps/web` (registry latest `2.112.4`) | PostgREST client | Only data client; use `accessToken` option [CITED: supabase.com/docs/guides/auth/jwts] |
| jose | **4.15.9** (do not use 6.x) | `SignJWT` HS256 for PostgREST | Official JWT docs show `jose` for verification; next-auth already depends on 4.15.9 |
| zod | existing `^3.25.76` | BFF body validation | Do not upgrade to Zod 4 |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @tanstack/react-query | existing | Hooks stay; swap `queryFn` to `fetch` | All dashboard/calendar queries |
| bcryptjs | existing | Unchanged credentials `authorize` | Identity only |
| node:test | Node 26 local / 18 Docker | Wave 0 unit tests | Same as Phase 1 |
| supabase test db / pgTAP | CLI `2.33.9` | RLS allow/deny | Official RLS procedure [CITED: supabase.com/docs/guides/database/postgres/row-level-security] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Minted user JWT + RLS | `service_role` for all tenant queries | Simpler (no JWT secret). **Reject as primary:** `service_role` bypasses RLS [CITED: supabase.com/docs/guides/database/postgres/row-level-security — “Full access. It bypasses RLS”]. AUTHZ-02 would be app-filter-only. Use service_role **only** pre-session. |
| Browser `accessToken` (user JWT in the client) | Keep `IDatabaseService` in React | Satisfies AUTHZ-03 (anon alone fails) and AUTHZ-02, but **fails AUTHZ-01** (“mutations run on the server using the signed-in session”). Do not put the minted JWT in the browser. |
| Next.js Server Actions | Route Handlers | Phase 1 established Route Handlers + `getServerSession`. Do not introduce a second mutation style. |
| Add `company_id` to every child table | EXISTS join through `users` | Faster RLS, more migrations. Defer columns; join is enough for v1 isolation. |
| `@supabase/ssr` | supabase-js `accessToken` | `@supabase/ssr` is for **Supabase Auth cookies**. This app’s session is NextAuth. Official: use supabase-js when you manage auth yourself [CITED: supabase.com/docs/guides/auth/choosing-a-server-package]. |
| Hand-rolled HMAC JWT | `jose@4.15.9` | Don’t hand-roll JWT (alg confusion, `none`). |

**Installation:**

```bash
# From repo root; pin 4.15.9 to match next-auth. Do not `npm install jose` (that resolves 6.x).
npm install jose@4.15.9 --workspace=@timeoff/web
```

**Version verification:** `npm view next-auth version` → `4.24.15`. `npm view @supabase/supabase-js version` → `2.112.4`. `npm view jose@4.15.9 version` → `4.15.9` (created 2014; no `postinstall`). `npm view jose version` → `6.2.10` (do **not** install).

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| jose@4.15.9 | npm | since 2014 | (jose overall ~127M/wk) | github.com/panva/jose | OK at 4.15.9 (already in tree via next-auth) | Approved — add as **direct** dep pinned `4.15.9` |
| jose (latest 6.2.10) | npm | latest published 2026-08-21 | high | github.com/panva/jose | SUS too-new | **REMOVED** — do not install latest |
| jsonwebtoken | — | — | — | — | not recommended | **REMOVED** — next-auth already uses jose |
| @supabase/ssr | — | — | — | — | wrong auth model | **REMOVED** |
| vitest latest | npm | — | — | — | SUS too-new (Phase 1) | **REMOVED** — keep `node:test` |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** `jose` latest 6.x — planner must pin `jose@4.15.9` and add `checkpoint:human-verify` only if the lockfile would resolve 6.x.

## Architecture Patterns

### System Architecture Diagram

```
Browser (signed-in)
  TanStack Query / forms  --fetch credentials:include-->  Next.js Route Handler
                                                              |
                                                              v
                                                    getServerSession(authOptions)
                                                              |
                         +------------------------------------+----------------------------------+
                         | session null                         | session.user.id + companyId      |
                         v                                      v
                      401 JSON                    mint HS256 JWT (role=authenticated,
                                                  sub=user.id, company_id=companyId)
                                                                      |
                                                                      v
                                                    createClient(url, ANON_KEY, { accessToken })
                                                    createDatabaseService(thatClient)  // NOT getInstance
                                                                      |
                                                                      v
                                                    PostgREST  Authorization: Bearer <jwt>
                                                    apikey: anon (publishable)
                                                                      |
                                                                      v
                                                    Postgres role authenticated
                                                    RLS: company_id = auth.jwt()->>'company_id'
                                                                      |
                                                                      v
                                                    JSON back to hook → existing UI

Someone with only NEXT_PUBLIC_SUPABASE_ANON_KEY
  --> PostgREST as anon --> REVOKE / no policy --> empty / 401
  --> GRANT EXECUTE RPCs only: create_company_with_owner, accept_invite_with_employee (SECURITY DEFINER)

Pre-session identity (auth.ts authorize, session callback, invite preview)
  --> createClient(url, SERVICE_ROLE_KEY) persistSession:false
  --> bypasses RLS (server-only)
```

### Recommended Project Structure

```
apps/web/src/
  lib/
    require-tenant-session.ts      # getServerSession → 401/403; returns { userId, companyId, role }
    tenant-supabase.ts             # mint JWT + createClient({ accessToken })
    service-role-supabase.ts       # identity-only client; never import from 'use client'
    supabase-jwt.ts                # SignJWT helper (jose@4)
  app/api/
    leave-requests/route.ts        # GET list (own/team/all by role), POST create
    leave-requests/[id]/route.ts   # PATCH approve/reject/cancel/delete
    leave-requests/bulk/route.ts   # POST bulk status (same session bind)
    leave-balances/route.ts        # GET
    notifications/route.ts         # GET (+ optional PATCH read)
    calendar/leave-requests/route.ts
    leave-policies/route.ts        # GET catalog
packages/database/migrations/
  {timestamp}_tenant_rls_and_anon_revoke.sql
supabase/tests/
  tenant_rls.test.sql              # pgTAP: anon deny; company A JWT cannot see B
```

Do **not** add `packages/database/src/modules/companies/` this phase (Phase 1 deferred it; identity stays on routes).

### Pattern 1: Session gate (copy invites)

**What:** Every BFF handler starts with `getServerSession(authOptions)` and requires `session.user.id` and `session.user.companyId`.
**When to use:** All leave/user/notification/calendar routes.
**Example:**

```typescript
// Source: next-auth.js.org/configuration/nextjs (App Router) + apps/web/src/app/api/auth/invites/route.ts
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !session.user.companyId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // ...
}
```

Official: in App Router pass **only** `authOptions`, not `req`/`res` [CITED: next-auth.js.org/configuration/nextjs]. Returns `null` when no session cookie.

Client: `fetch('/api/leave-requests', { credentials: 'include' })`. Server Components must not `fetch` these routes (cookies not forwarded) [CITED: next-auth issue #7693] — these pages are already `'use client'`.

### Pattern 2: Tenant Supabase client (`accessToken`)

**What:** After session check, mint JWT and construct a **new** client per request.
**When to use:** Any `IDatabaseService` call for a signed-in tenant user.

```typescript
// Source: supabase.com/docs/guides/auth/jwts
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(url, anonKey, {
  accessToken: async () => mintedJwt,
  auth: { persistSession: false, autoRefreshToken: false },
})
```

Deprecated: `global.headers.Authorization` [CITED: supabase.com/docs/guides/auth/jwts — “no longer recommended”].

JWT payload (mint with project JWT secret, HS256, short `exp` e.g. 5 minutes): `role` = `authenticated`, `sub` = user UUID, `company_id` = company UUID. PostgREST maps `role` to the Postgres role [CITED: supabase.com/docs/guides/auth/jwts payload table].

Do **not** put `company_id` in `user_metadata` (user-modifiable) [CITED: supabase.com/docs/guides/database/postgres/row-level-security — auth.jwt() caution]. Top-level claim we mint server-side is fine.

### Pattern 3: RLS helper + `to authenticated`

**What:** One SQL helper; policies wrap it in `(select ...)` for initPlan caching [CITED: supabase.com/docs/guides/database/postgres/row-level-security].

```sql
-- Source: supabase.com/docs/guides/database/postgres/row-level-security (auth.jwt / (select) wrap)
CREATE FUNCTION public.current_company_id() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT NULLIF((SELECT auth.jwt() ->> 'company_id'), '')::uuid;
$$;

-- Example policy
CREATE POLICY leave_requests_tenant_select ON public.leave_requests
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = leave_requests.user_id
        AND u.company_id = (SELECT public.current_company_id())
    )
  );
```

INSERT/UPDATE `WITH CHECK` must use the same EXISTS (and for create: `(select auth.uid()) = user_id` so Company A cannot insert a row for a Company B user id).

Drop every policy whose `USING`/`WITH CHECK` is `true` on tenant tables. Replace users `"Public can read users"`. Restrict `"Admins can read all users"` with `AND company_id = (SELECT public.current_company_id())` — `role IN ('admin','hr')` **without** company filter is a TENANT-04 hole.

### Pattern 4: Hook transport swap (no UI rewrite)

Keep query keys (`['leaveBalance', user.id]`, etc.). Replace `databaseService.approveLeaveRequest(...)` with `fetch` to the BFF. Invalidation and sonner stay.

### Anti-Patterns to Avoid

- **`DatabaseServiceFactory.getInstance` on the server:** First client (often anon from a mistaken import) wins for the whole Node process.
- **Passing NextAuth cookie to PostgREST:** Different secret; `auth.uid()` stays null.
- **`service_role` for dashboard queries:** Policies never run; AUTHZ-02 is theater.
- **Leaving `active_leave_requests` as default view:** Bypasses table RLS [CITED: official RLS “Views and RLS”].
- **Client-supplied `user_id` / `company_id` / `approverId`:** Bind from session; ignore body copies of those fields (or 400 if they disagree).
- **`select('*')` on `users` from any client that could leak:** Exclude `password` in repository selects used by the BFF.
- **`GET /api/test-connection` listing users:** Today selects `id, email, first_name, last_name` with the anon client [VERIFIED: apps/web/src/app/api/test-connection/route.ts:17-20]. Gate with session or stop returning rows.
- **New screens or calendar redesign.**
- **Making onboarding RPCs SECURITY DEFINER without `SET search_path = public`:** search_path hijack.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JWT sign/verify | `crypto.createHmac` + base64url | `jose@4.15.9` `SignJWT` | alg/`none` pitfalls; official examples use jose |
| Session in Route Handlers | Parse cookies by hand | `getServerSession(authOptions)` | NextAuth signed JWT cookie |
| Tenant WHERE in every repo only | App filters with service_role | RLS `to authenticated` | Defense in depth; AUTHZ-02 |
| CSRF library | Extra CSRF package | Same-origin `fetch` + NextAuth cookie `SameSite=lax` (Phase 1 T-01-15) | Match invites |
| Second ORM | Prisma | `@timeoff/database` on the server | PROJECT.md stack lock |

**Key insight:** NextAuth proves **who** is signed in to Next.js. PostgREST RLS proves **which rows**. Those are two tokens. The BFF is the translator.

## Common Pitfalls

### Pitfall 1: service_role “RLS” that never runs
**What goes wrong:** Handlers use `SUPABASE_SERVICE_ROLE_KEY`; policies look correct; Company A still reads B if a query omits the filter.
**Why:** `service_role` has `bypassrls` [CITED: supabase.com/docs/guides/database/postgres/row-level-security].
**How to avoid:** Tenant `IDatabaseService` uses anon publishable key + user `accessToken`. Reserve service_role for identity.
**Warning signs:** `pg_policies` exist but `SET ROLE service_role` still sees all rows (expected) — test with a **user** JWT instead.

### Pitfall 2: Policies without REVOKE
**What goes wrong:** New policies look restrictive; `anon` still has INSERT/SELECT grants; a `USING (true)` leftover or missing policy on one command leaks.
**Why:** Grants and policies are independent [CITED: official RLS grants table].
**How to avoid:** Same migration: `REVOKE ALL ON TABLE ... FROM anon;` `GRANT SELECT, INSERT, UPDATE, DELETE ON ... TO authenticated;` drop old policies by **name**.
**Warning signs:** Anon curl still returns 200 with rows.

### Pitfall 3: SECURITY INVOKER RPCs after REVOKE
**What goes wrong:** Signup/accept-invite 500 after tightening RLS.
**Why:** RPCs run as `anon` and need table INSERT.
**How to avoid:** `ALTER FUNCTION ... SECURITY DEFINER SET search_path = public`; keep `GRANT EXECUTE TO anon`.
**Warning signs:** First credentials signup after migration fails; Google create-company fails.

### Pitfall 4: `active_leave_requests` view
**What goes wrong:** Table RLS is perfect; `getActiveLeaveRequests` still returns other companies.
**Why:** Views owned by `postgres` are security definer by default [CITED: official RLS Views section].
**How to avoid:** `CREATE OR REPLACE VIEW ... WITH (security_invoker = true)`.
**Warning signs:** pgTAP table tests pass; view tests fail.

### Pitfall 5: Factory singleton + persistSession on server
**What goes wrong:** Mixed cookies/JWT across users in one serverless isolate, or auth.ts `authorize` uses a client that later got a user session.
**Why:** `getInstance` first-wins; `persistSession: true` on a server client is wrong.
**How to avoid:** Request-scoped factory; `persistSession: false` on all server clients. Official troubleshooting: user session on a service_role client replaces Authorization and then RLS **applies** unexpectedly [CITED: supabase.com/docs/guides/troubleshooting/why-is-my-service-role-key-client-getting-rls-errors].
**Warning signs:** Intermittent empty dashboards; login works then domain queries 401.

### Pitfall 6: JWT `company_id` stale vs DB
**What goes wrong:** User moved companies; token still has old id (unlikely this product — no move-company feature).
**Why:** JWT is a snapshot [CITED: official auth.jwt() “not always up-to-date”].
**How to avoid:** Mint per request from **session callback data** which re-reads `users` [VERIFIED: auth.ts:250-272]. Keep `exp` short. Do not cache minted JWTs across requests.
**Warning signs:** Session shows new company; RLS still old — session callback failed to refresh.

### Pitfall 7: Hosted schema lag
**What goes wrong:** Local isolation works; `.env.local` still points at hosted without the migration.
**Why:** Phase 1 01-02: hosted push needs database password [VERIFIED: 01-02-SUMMARY.md].
**How to avoid:** Same as Phase 1: `db push --local` required; hosted is a human setup step. Do not claim hosted is updated.
**Warning signs:** App talks to hosted; policies still `USING (true)`.

### Pitfall 8: Recursive users policies
**What goes wrong:** Policy on `users` that `EXISTS (SELECT 1 FROM users …)` without a helper → infinite recursion (already happened; migration `004`).
**Why:** Policy on `users` querying `users`.
**How to avoid:** Tenant predicate is `company_id = (SELECT current_company_id())` — **no subquery on `users` for the users table itself**. Child tables may `EXISTS` against `users`.
**Warning signs:** `infinite recursion detected in policy for relation users`.

## Code Examples

### Mint HS256 JWT (server-only)

```typescript
// Source: jose SignJWT API (jose@4, already used by next-auth) + supabase.com/docs/guides/auth/jwts claim names role/sub/exp
import { SignJWT } from 'jose'

export async function mintTenantAccessToken(input: {
  userId: string
  companyId: string
  jwtSecret: string
}): Promise<string> {
  const secret = new TextEncoder().encode(input.jwtSecret)
  return new SignJWT({
    role: 'authenticated',
    company_id: input.companyId,
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(input.userId)
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(secret)
}
```

`SUPABASE_JWT_SECRET` (or CLI `JWT_SECRET`) is **not** `NEXTAUTH_SECRET`. Never prefix `NEXT_PUBLIC_`. Official docs caution against shipping HS256 secrets to the client [CITED: supabase.com/docs/guides/auth/jwts — Verifying with a shared secret].

Local JWT secret comes from `supabase status -o env` / the local stack; do not commit it. Add `SUPABASE_JWT_SECRET` to `apps/web/env.example` (placeholder only) and `env.ts` as **required** for the BFF (alongside making `SUPABASE_SERVICE_ROLE_KEY` required for identity).

### Anon deny smoke (AUTHZ-03)

```bash
# After REVOKE: must not return other tenants' leave rows
curl -sS "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/leave_requests?select=id" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $NEXT_PUBLIC_SUPABASE_ANON_KEY"
```

Expect error or `[]` with no other-company ids. Do not print key values in logs.

### Bind create to session

```typescript
// Planner: POST body may include dates/type/reason; user_id is overwritten
const body = await request.json()
const created = await databaseService.createLeaveRequest({
  ...parsed,
  user_id: session.user.id,
})
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `USING (true)` “application layer” | Real RLS + BFF session | This phase (reverts 009/010/013 pattern) | Shared deployment becomes tenable |
| `global.headers.Authorization` | `createClient(..., { accessToken })` | supabase-js documented current | Avoids clobbering Auth sessions |
| `auth.uid()` only | `auth.jwt()->>'company_id'` for tenancy | NextAuth never set `auth.uid()` | `sub` can still drive own-row checks once we mint JWT |
| Vitest for Wave 0 | `node:test` (Phase 1) | 2026-08-29 | Do not re-open Vitest |

**Deprecated/outdated:**

- Migration `009_fix_rls_for_nextauth.sql` open policies — replace, do not extend.
- Setting `Authorization` on the client `global.headers` [CITED: supabase.com/docs/guides/auth/jwts].
- `unstable_getServerSession` renamed to `getServerSession` [CITED: next-auth.js.org/configuration/nextjs].

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Local and hosted PostgREST still verify HS256 with the legacy JWT secret (not only asymmetric JWKS) | Pattern 2 | Minted tokens 401; would need imported signing keys / Third-Party Auth instead |
| A2 | Global `departments` / `leave_policies` SELECT for all authenticated users is out of TENANT-04 scope | Inventory | If product treats Engineering as per-company, need `company_id` on those tables later |
| A3 | `calendar_events.user_id IS NULL` rows are shared holidays visible to every authenticated tenant | Open Questions | Cross-tenant holiday titles leak; lock to deny-null if product disagrees |
| A4 | `jose@4` `SignJWT` HS256 is accepted by this project’s PostgREST | Standard Stack | Executor must verify one mint against local Kong/PostgREST in Wave 0 |

A1–A4 need a live round-trip in Wave 0 (`supabase test db` or a small node script against local 54321), not a product discussion.

## Open Questions

1. **Hosted JWT secret + schema**
   - What we know: Local stack is running and still has open policies. Hosted may lack companies migration (Phase 1).
   - What's unclear: Whether hosted uses new API keys (`sb_secret_`) vs legacy JWT secret.
   - Recommendation: Implement and verify on **local**. User-setup: link/push hosted + set `SUPABASE_JWT_SECRET` / `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`. Do not block planning.

2. **Null `calendar_events.user_id`**
   - What we know: Schema allows null user_id for holidays/company events [VERIFIED: packages/database/migrations/001_initial_schema.sql:107-114].
   - What's unclear: Whether those rows are global.
   - Recommendation: Policy `user_id IS NULL OR EXISTS (same company)`. Planner documents as accepted default.

3. **`GET /api/test-connection`**
   - What we know: Unauthenticated user listing.
   - Recommendation: Require session or return env SET/NOT SET only — include in the same security migration/plan, not a new UI.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node | `node:test`, Next | ✓ | v26.6.0 (Docker images still `node:18-alpine`) | Wave 0 uses `--experimental-strip-types` (Node 22+); Node 18 needs `tsc` then `node --test` as in Phase 1 VALIDATION |
| npm | installs | ✓ | 11.18.0 | — |
| Docker | local Postgres | ✓ | 27.4.0 | — |
| supabase CLI | db push, test db | ✓ | 2.33.9 | — |
| Local Supabase | live policy apply | ✓ | containers `supabase_db_timeoff`, `supabase_rest_timeoff` running | Hosted unverified |
| `SUPABASE_SERVICE_ROLE_KEY` | identity client | in `env.example` optional today | — | **Make required** in `env.ts` for server identity |
| `SUPABASE_JWT_SECRET` | mint tenant JWT | **not** in `env.example` | — | Add; source from `supabase status -o env` locally |
| ctx7 CLI | docs | ✗ | — | Official URLs via WebFetch (this research) |
| Context7 MCP | docs | ✗ in this agent | — | Same |

**Missing dependencies with no fallback:** none for local execution if `.env.local` gains JWT secret + service role (placeholders exist for service role).

**Missing dependencies with fallback:** hosted schema/password (human setup, same as Phase 1).

Step 2.6: not skipped — BFF depends on local Supabase + secrets.

## Validation Architecture

`workflow.nyquist_validation` is true in `.planning/config.json`.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Node.js `node:test` + `node:assert/strict` (Phase 1); plus `supabase test db` (pgTAP) for RLS |
| Config file | none for node:test — extend `apps/web` `"test"` script; `supabase/tests/*.sql` for db tests |
| Quick run command | `npm test --workspace=@timeoff/web` |
| Full suite command | `npm test` (turbo) && `supabase test db` |
| Estimated quick runtime | ~15–30 seconds (unit only) |

Do not add Jest/Vitest/Playwright this phase. RLS cannot be honestly unit-tested in Node without PostgREST; that is what `supabase test db` is for [CITED: official RLS “Secure a table with RLS” step 3–4].

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| AUTHZ-01 | `requireTenantSession` returns 401 without id/companyId; create payload uses session user id not body | unit | `node --test --experimental-strip-types src/lib/require-tenant-session.test.ts src/lib/bind-leave-actor.test.ts` | ❌ Wave 0 |
| AUTHZ-02 | JWT company A cannot SELECT company B leave/users/notifications/audit/balances/calendar | db | `supabase test db` | ❌ Wave 0 `supabase/tests/tenant_rls.test.sql` |
| AUTHZ-03 | role `anon` SELECT/INSERT on `leave_requests`/`users`/`notifications` denied | db | `supabase test db` | ❌ Wave 0 |
| TENANT-04 | Same as AUTHZ-02 plus invites/companies not readable cross-tenant with user JWT | db | `supabase test db` | ❌ Wave 0 |
| AUTHZ-01 | BFF rejects unauthenticated POST leave | unit (handler helper) | `npm test --workspace=@timeoff/web` | ❌ Wave 0 |
| — | `mintTenantAccessToken` round-trip header claims | unit | `src/lib/supabase-jwt.test.ts` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npm test --workspace=@timeoff/web`
- **Per wave merge:** `npm test` and, after the RLS migration task, `supabase test db`
- **Phase gate:** both green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `apps/web/src/lib/require-tenant-session.ts` + `.test.ts` — fail closed (no session → treat as 401)
- [ ] `apps/web/src/lib/supabase-jwt.ts` + `.test.ts` — assert payload keys `role`, `sub`, `company_id` (decode without verify in unit test; live verify in db test)
- [ ] `apps/web/src/lib/bind-leave-actor.ts` + `.test.ts` — body `user_id` ignored
- [ ] Extend `apps/web` `"test"` script with the new files
- [ ] `supabase/tests/tenant_rls.test.sql` — anon deny; two companies; `authenticated` JWT fixtures
- [ ] Framework install: `jose@4.15.9` only (not Vitest)
- [ ] Manual: curl anon key against local `54321` after migration (AUTHZ-03)

*(Existing Phase 1 tests stay green; do not remove them.)*

### Manual-Only Verifications

| Behavior | Requirement | Why Manual | Instructions |
|----------|-------------|------------|--------------|
| Signed-in employee create/approve/cancel still works on existing UI | AUTHZ-01 | Browser session cookie + live BFF | Log in, submit leave, approve as manager on the **same** company; Network tab shows `/api/leave-requests*` not `...supabase.co/rest/v1/leave_requests` |
| Two companies cannot see each other in UI | TENANT-04 | Two accounts | Company A dashboard lists only A; cannot open B’s request id if known |
| Anon key dump | AUTHZ-03 | Needs the public key (already in the browser bundle) | curl recipe above against local API |

## Security Domain

`security_enforcement` is enabled (`security_asvs_level`: 1).

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | NextAuth JWT session; BFF `getServerSession` |
| V3 Session Management | yes | Existing 30-day JWT cookie; SameSite=lax; do not put Supabase JWT in cookies |
| V4 Access Control | yes | RLS `current_company_id()` + session-bound `user_id` |
| V5 Input Validation | yes | zod on BFF bodies (`leaveRequestSchema` already in `validation.ts`) |
| V6 Cryptography | yes | `jose` SignJWT; bcryptjs unchanged; never hand-roll JWT; never `NEXT_PUBLIC_` on JWT/service secrets |

### Known Threat Patterns for NextAuth + PostgREST

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Anon key reads all rows | Information Disclosure | REVOKE + drop `USING (true)` |
| Cross-tenant `getAllLeaveRequests` | Information Disclosure | RLS company predicate |
| Client spoofs `user_id` / `approverId` | Elevation of Privilege | Overwrite from session |
| `service_role` in the browser | Elevation of Privilege | Server-only env; never import service client in `'use client'` |
| View bypasses RLS | Information Disclosure | `security_invoker` view |
| Fake audit INSERT | Repudiation | Deny anon INSERT; authenticated INSERT only via server (optional: restrict INSERT to rows whose `user_id = auth.uid()`) |
| Recursive users policy | Denial of Service | No `users` self-subquery; use JWT claim |
| CSRF on BFF POST | Tampering | Same-origin fetch + session cookie (match T-01-15) |
| `users.password` in PostgREST | Information Disclosure | Exclude column; REVOKE anon SELECT |
| Unauthenticated `/api/test-connection` | Information Disclosure | Session-gate or strip row payload |

Phase 1 accepted T-01-06 as Phase 2 — this phase **closes** it; do not re-accept open RLS.

## Sources

### Primary (HIGH confidence)

- Live local Postgres `pg_policies` / `role_table_grants` / `relrowsecurity` on 2026-08-29 (`supabase_db_timeoff`)
- `packages/database/migrations/009_fix_rls_for_nextauth.sql`, `20250818193733_add_companies_and_invites.sql`, `001_initial_schema.sql`, `20250807140944_create_view_active_records.sql`
- `apps/web/src/lib/auth.ts`, `apps/web/src/types/next-auth.d.ts`, `apps/web/src/app/api/auth/invites/route.ts`, `packages/database/src/index.ts`, `packages/database/src/modules/database-service.ts`
- [next-auth.js.org/configuration/nextjs](https://next-auth.js.org/configuration/nextjs) — `getServerSession` App Router
- [supabase.com/docs/guides/database/postgres/row-level-security](https://supabase.com/docs/guides/database/postgres/row-level-security) — grants, `service_role` bypass, `auth.jwt()`, views, `(select)` wrap, `supabase test db`
- [supabase.com/docs/guides/auth/jwts](https://supabase.com/docs/guides/auth/jwts) — `accessToken`, claims `role`/`sub`/`exp`
- Phase 1 `01-SECURITY.md` AR-01-01 / T-01-06; `01-02-SUMMARY.md` local-vs-hosted

### Secondary (MEDIUM confidence)

- [supabase.com/docs/guides/troubleshooting/why-is-my-service-role-key-client-getting-rls-errors](https://supabase.com/docs/guides/troubleshooting/why-is-my-service-role-key-client-getting-rls-errors-or-not-returning-data-7_1K9z) — Authorization header vs apikey
- [supabase.com/docs/guides/auth/choosing-a-server-package](https://supabase.com/docs/guides/auth/choosing-a-server-package) — supabase-js when you manage auth
- `.planning/codebase/CONCERNS.md` — already recommended BFF + restore RLS

### Tertiary (LOW confidence)

- Community “exchange IdP JWT for Supabase JWT” posts — consistent with official `accessToken`, not used as authority

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions checked on npm; jose pin matches next-auth tree
- Architecture: HIGH — live policies, factory singleton, session claims, call sites read this session
- Pitfalls: HIGH — official RLS/view/service_role docs + Phase 1 recursion history

**Research date:** 2026-08-29
**Valid until:** 2026-09-28 (30 days; JWT signing-key migration on hosted would invalidate A1)
