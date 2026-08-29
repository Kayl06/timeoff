---
phase: 02-tenant-isolation-and-server-authz
reviewed: 2026-08-29T14:10:00Z
depth: standard
files_reviewed: 40
files_reviewed_list:
  - apps/web/env.example
  - apps/web/package.json
  - apps/web/src/app/api/auth/invites/accept/route.ts
  - apps/web/src/app/api/auth/invites/preview/route.ts
  - apps/web/src/app/api/auth/invites/route.ts
  - apps/web/src/app/api/auth/signup/route.ts
  - apps/web/src/app/api/calendar/leave-requests/route.ts
  - apps/web/src/app/api/leave-balances/route.ts
  - apps/web/src/app/api/leave-policies/route.ts
  - apps/web/src/app/api/leave-requests/[id]/route.ts
  - apps/web/src/app/api/leave-requests/bulk/route.ts
  - apps/web/src/app/api/leave-requests/route.ts
  - apps/web/src/app/api/manager-team-stats/route.ts
  - apps/web/src/app/api/notifications/route.ts
  - apps/web/src/app/api/test-connection/route.ts
  - apps/web/src/components/dashboard/leave-calendar-view.tsx
  - apps/web/src/components/dashboard/team-calendar-view.tsx
  - apps/web/src/components/dashboard/unified-calendar-view.tsx
  - apps/web/src/components/leave-request-form.tsx
  - apps/web/src/hooks/use-dashboard-data.ts
  - apps/web/src/hooks/use-leave-request-operations.ts
  - apps/web/src/lib/auth.ts
  - apps/web/src/lib/bind-leave-actor.test.ts
  - apps/web/src/lib/bind-leave-actor.ts
  - apps/web/src/lib/env.ts
  - apps/web/src/lib/leave-list-scope.test.ts
  - apps/web/src/lib/leave-list-scope.ts
  - apps/web/src/lib/require-tenant-session.test.ts
  - apps/web/src/lib/require-tenant-session.ts
  - apps/web/src/lib/service-role-supabase.ts
  - apps/web/src/lib/supabase-jwt.test.ts
  - apps/web/src/lib/supabase-jwt.ts
  - apps/web/src/lib/tenant-supabase.ts
  - apps/web/src/lib/validation.ts
  - apps/web/src/providers/database-provider.tsx
  - packages/database/migrations/20250818193735_tenant_rls_and_anon_revoke.sql
  - packages/database/src/index.ts
  - packages/database/src/modules/database-service.ts
  - packages/database/src/modules/users/repository.ts
  - supabase/tests/tenant_rls.test.sql
findings:
  critical: 1
  warning: 6
  info: 3
  total: 10
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-08-29T14:10:00Z
**Depth:** standard
**Files Reviewed:** 40
**Status:** issues_found

## Summary

Session-gated BFF routes, per-request minted PostgREST JWTs, and the identity-only service_role client are in place. RLS drops unrestricted tenant policies, avoids users self-subqueries, and revokes anon on tenant tables. The remaining hole is password disclosure: manager/HR leave-list JSON still embeds `users(*)` including password hashes, and several UserRepository selects still return `password`. Env validation lists the new secrets as required but still does not throw, and write BFFs do not check role or ownership beyond the session cookie.

## Narrative Findings (AI reviewer)

## Critical Issues

### CR-01: Team/all leave lists return joined user password hashes

**File:** `apps/web/src/app/api/leave-requests/route.ts:52-57`
**Issue:** `GET /api/leave-requests` and `GET /api/calendar/leave-requests` return `fetchLeaveRequestsForScope` results as JSON. For `scope=team` and `scope=all` that calls `getTeamLeaveRequests` / `getAllLeaveRequests`, whose repository select is `users!leave_requests_user_id_fkey(*)`. PostgREST therefore embeds every `users` column — including `password` bcrypt hashes — into the browser response. `USER_DOMAIN_COLUMNS` on `UserRepository` does not apply to this join. Any supervisor, admin, or HR session in the tenant can read coworker password hashes from Network/JSON.
**Fix:** Select an explicit users embed without `password` (same columns as `USER_DOMAIN_COLUMNS`), and/or strip `users.password` in the BFF before `NextResponse.json`.

```ts
users!leave_requests_user_id_fkey(
  id, email, first_name, last_name, avatar, department, team, role,
  manager_id, company_id, hire_date, is_active, created_at, updated_at
)
```

Same join exists in `packages/database/src/modules/leave-requests/repository.ts` (`findAll` ~53-56, `findTeamRequests` ~97-100, `findById` / `findPendingRequests`). Calendar route: `apps/web/src/app/api/calendar/leave-requests/route.ts:42-47`.

## Warnings

### WR-01: UserRepository domain selects still return `password`

**File:** `packages/database/src/modules/users/repository.ts:30-32`
**Issue:** `findByEmail` uses `.select('*')`. `create` (line 68) and `update` (line 86) use `.select()` with no column list, so PostgREST returns `password`. `findById` / `findAll` / `getTeamMembers` correctly use `USER_DOMAIN_COLUMNS`. Any caller that serializes a `User` from email lookup or write — including the facade `getUserByEmail` / `updateUser` — can leak hashes. Identity `auth.ts` authorize may keep a dedicated password select; domain repository methods must not.
**Fix:** Use `USER_DOMAIN_COLUMNS` on `findByEmail`, `create`, and `update`. Keep password reads only on the service-role identity path that needs bcrypt.

### WR-02: Required JWT secret and service_role key are not actually enforced

**File:** `apps/web/src/lib/env.ts:32-101`
**Issue:** `SUPABASE_JWT_SECRET` and `SUPABASE_SERVICE_ROLE_KEY` were added to `requiredVars`, but the `if (missingVars.length > 0) throw` block remains commented out. Missing or blank values leave `config[varName]` unset. `mintTenantAccessToken` then signs with `TextEncoder.encode(undefined)` (string `"undefined"`), and `identitySupabase` is constructed with an undefined key. BFF/identity fail opaquely instead of failing closed at boot.
**Fix:** Restore the throw when `missingVars.length > 0` (without logging secret values). Keep the required-var list as-is.

### WR-03: Leave write BFF allows any tenant session to approve, reject, cancel, delete, or bulk-update

**File:** `apps/web/src/app/api/leave-requests/[id]/route.ts:70-101`
**Issue:** After the 401 session gate, PATCH does not check `session.user.role` or that `cancel`/`delete` targets the session user's own row. Bulk POST (`apps/web/src/app/api/leave-requests/bulk/route.ts:49-67`) is the same. RLS `leave_requests_tenant_update` / `_delete` only require same-company `EXISTS`, so an employee cookie can approve a colleague's request and trigger balance deduction. `GET /api/manager-team-stats` already 403s employees; write routes do not.
**Fix:** For `approve`/`reject`/bulk, reject unless role is supervisor, admin, or hr (403). For `cancel`/`delete`, load the row and require `user_id === session.user.id` (or admin/hr). Tighten UPDATE/DELETE RLS to owner-or-manager if this phase should not trust the BFF alone.

### WR-04: Team calendar still renders fabricated leave data

**File:** `apps/web/src/components/dashboard/team-calendar-view.tsx:86-151`
**Issue:** `/team-calendar` still uses hardcoded John/Jane/Bob users and mock requests. It never calls `/api/calendar/leave-requests`. Personal and unified calendars were switched to the session BFF; this page cannot show real tenant data and contradicts calendars matching remaining-days truth.
**Fix:** Fetch with `credentials: 'include'` the same way `unified-calendar-view.tsx` does (`scope=team` or `all` from role), and delete the mock arrays.

### WR-05: Leave form reports success before the mutation finishes

**File:** `apps/web/src/components/leave-request-form.tsx:43-50`
**Issue:** `handleSubmit` shows a success toast, closes the dialog, and `form.reset()` synchronously, then calls `onSubmit(data)`. The parent mutation is async (`createLeaveRequest` fetch). A 401/500 still leaves the user with a success toast and an emptied form.
**Fix:** Make `onSubmit` return the mutation promise; toast and close only after it resolves. Keep error toasts on rejection.

### WR-06: Signup 500 body includes Postgres/RPC `message`

**File:** `apps/web/src/app/api/auth/signup/route.ts:67-69`
**Issue:** On non-23505 `create_company_with_owner` failure, the client receives `details: createError.message`. That can expose schema, function, or constraint names. Invite accept maps known codes and otherwise returns a generic 500 — signup should match.
**Fix:** Log `createError` with `devLog.error` and return `{ error: 'Failed to create user' }` without `details: createError.message`.

## Info

### IN-01: Session callback selects `users.*` including password

**File:** `apps/web/src/lib/auth.ts:255-259`
**Issue:** Credentials `authorize` needs `password` for bcrypt. The `session` callback (and Google `signIn` existing-user read) also `select('*')`. Hashes are not copied onto `session.user`, but they are loaded on every `getServerSession`. Prefer an explicit column list without `password` on session/Google reads.

### IN-02: Package still exports an anon-key `databaseService` singleton

**File:** `packages/database/src/index.ts:494-499`
**Issue:** `createDatabaseService` correctly uses `DatabaseServiceFactory.create`. The module still does `export const databaseService = createDatabaseService(supabase)` against the lazy anon client. Tenant BFF no longer uses it; a future import bypasses minted JWTs and hits revoked anon grants. Consider removing the default instance or making it throw.

### IN-03: Null `user_id` calendar events are globally visible

**File:** `packages/database/migrations/20250818193735_tenant_rls_and_anon_revoke.sql:172-189`
**Issue:** `calendar_events_tenant_all` allows `user_id IS NULL` on USING and WITH CHECK. pgTAP asserts company A can SELECT the shared holiday. Any authenticated insert with `user_id` null is therefore readable by every tenant. There is no calendar-write BFF yet; lock this down before exposing writes (require `company_id` or forbid null `user_id` inserts).

---

_Reviewed: 2026-08-29T14:10:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
