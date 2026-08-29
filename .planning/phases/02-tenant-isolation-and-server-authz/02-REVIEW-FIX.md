---
phase: 02-tenant-isolation-and-server-authz
fixed_at: 2026-08-29T14:56:51Z
review_path: .planning/phases/02-tenant-isolation-and-server-authz/02-REVIEW.md
iteration: 1
findings_in_scope: 7
fixed: 6
skipped: 1
status: partial
---

# Phase 02: Code Review Fix Report

**Fixed at:** 2026-08-29T14:56:51Z
**Source review:** `.planning/phases/02-tenant-isolation-and-server-authz/02-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 7 (CR-01, WR-01..WR-06; Info skipped by `fix_scope: critical_warning`)
- Fixed: 6
- Skipped: 1 (WR-04, Phase 7 calendar scope)

## Verification

Gates ran in the **main checkout** (`workflow.use_worktrees` unset; sequential commits on `main` so `node_modules` and hooks were available). No isolated worktree.

- After CR-01: `npm test --workspace=@timeoff/web` — 71 passed, 0 failed
- After WR-03: `npm test --workspace=@timeoff/web` — 76 passed, 0 failed (5 new bind-leave-actor cases)
- Source grep for `users!leave_requests_user_id_fkey(*)` in `*.{ts,tsx,js,jsx}`: **zero hits** (remaining matches are planning docs and `SUPABASE_RELATIONSHIP_FIX.md` only)

## Fixed Issues

### CR-01: Team/all leave lists return joined user password hashes

**Files modified:** `packages/database/src/modules/leave-requests/repository.ts`, `packages/database/src/modules/users/repository.ts`
**Commit:** `16c31d1`
**Applied fix:** Exported `USER_DOMAIN_COLUMNS` and replaced every `users!leave_requests_user_id_fkey(*)` join with a shared `LEAVE_REQUEST_WITH_USER_SELECT` embed that lists the same columns (no `password`). `GET /api/leave-requests` and `GET /api/calendar/leave-requests` serialize that repository result, so hashes are no longer in the JSON.

### WR-01: UserRepository domain selects still return `password`

**Files modified:** `packages/database/src/modules/users/repository.ts`
**Commit:** `515dfdd`
**Applied fix:** `findByEmail`, `create`, and `update` now `.select(USER_DOMAIN_COLUMNS)` instead of `*` / default `select()`. Credentials `authorize` still reads password via `identitySupabase`.

### WR-02: Required JWT secret and service_role key are not actually enforced

**Files modified:** `apps/web/src/lib/env.ts`
**Commit:** `962fd02`
**Applied fix:** Restored the throw when `missingVars.length > 0`. The message lists missing **names only** (no secret values). Required-var list unchanged.

### WR-03: Leave write BFF allows any tenant session to approve, reject, cancel, delete, or bulk-update

**Files modified:** `apps/web/src/lib/bind-leave-actor.ts`, `apps/web/src/lib/bind-leave-actor.test.ts`, `apps/web/src/app/api/leave-requests/[id]/route.ts`, `apps/web/src/app/api/leave-requests/bulk/route.ts`
**Commit:** `a6299dc`
**Status:** `fixed: requires human verification`
**Applied fix:** Approve/reject/bulk return 403 unless role is supervisor, admin, or hr. Cancel/delete load the row and require `user_id === session.user.id` or admin/hr. RLS UPDATE/DELETE was **not** tightened (BFF gate only; no `company_id` columns added to child tables). Confirm in the browser that an employee cookie cannot approve a colleague's request.

### WR-05: Leave form reports success before the mutation finishes

**Files modified:** `apps/web/src/components/leave-request-form.tsx`
**Commit:** `3b8dcfe`
**Status:** `fixed: requires human verification`
**Applied fix:** `onSubmit` may return a promise. `handleSubmit` awaits it, then toasts success / closes / resets. Rejection shows a destructive toast and leaves the dialog open. Parent `createLeaveRequest` still toasts on success as well.

### WR-06: Signup 500 body includes Postgres/RPC `message`

**Files modified:** `apps/web/src/app/api/auth/signup/route.ts`
**Commit:** `0a9e63f`
**Applied fix:** Non-23505 `create_company_with_owner` failures still `devLog.error` the RPC error and now return `{ error: 'Failed to create user' }` with no `details`.

## Skipped Issues

### WR-04: Team calendar still renders fabricated leave data

**File:** `apps/web/src/components/dashboard/team-calendar-view.tsx:86-151`
**Reason:** Skipped by orchestrator intent — Phase 7 CAL scope (wire `/team-calendar` to `/api/calendar/leave-requests`). Not a Phase 02 tenant-isolation BFF fix.
**Original issue:** `/team-calendar` still uses hardcoded mock users/requests and never calls the session calendar BFF.

---

_Fixed: 2026-08-29T14:56:51Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
