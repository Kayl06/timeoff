---
phase: 02-tenant-isolation-and-server-authz
verified: 2026-08-29T14:09:42Z
status: passed
score: 11/12 must-haves verified
behavior_unverified: 1
overrides_applied: 0
decision_coverage:
  skipped: true
  reason: "No phase CONTEXT.md; no <decisions> block"
mvp_goal_format:
  roadmap_goal_is_user_story: false
  plan_goal_is_user_story: true
  note: "ROADMAP.md Phase 2 goal is not As a / I want to / so that. PLAN files carry that user story; verification used ROADMAP success criteria plus the PLAN story for User Flow Coverage."
behavior_unverified_items:

  - truth: "Requesting, approving, or updating leave as a signed-in user still works; those writes are bound to the signed-in session, not the browser anon key"
    test: "Sign in, submit a leave request on the existing form, then as a same-company manager approve, reject, cancel, and bulk-select from the existing dialogs. Watch the Network tab."
    expected: "Create/approve/update succeed. Requests go to /api/leave-requests (POST/PATCH/bulk), not PostgREST /rest/v1/leave_requests. The created row's user_id is the signed-in user even if the client sent another user_id."
    why_human: "Bind helpers and BFF routes are present and unit-tested; no test hits getServerSession, mints a JWT, or persists a leave_requests row through the HTTP path."
human_verification:

  - test: "Log in, submit a leave request on the existing form. Open DevTools Network."
    expected: "POST /api/leave-requests (credentials included), not /rest/v1/leave_requests. The new row appears for that user. Manager/admin/hr self-leave is approved in the same POST (no second client approve call)."
    why_human: "Requires a browser session cookie and live local app; node:test does not exercise Network tab or the form."

  - test: "As a manager on the same company, approve, reject, cancel, and bulk-select from the existing dialogs. Watch Network."
    expected: "Calls go to /api/leave-requests/{id} PATCH and /api/leave-requests/bulk POST, not PostgREST leave_requests. Existing sonner toasts and table refresh still happen."
    why_human: "Requires a browser session cookie and live dialogs."

  - test: "Without a session cookie, GET /api/leave-balances and GET /api/manager-team-stats. Then sign in as a manager and GET /api/manager-team-stats again."
    expected: "Unauthenticated GETs return 401 JSON Unauthorized. Signed-in manager GET /api/manager-team-stats is 200. Signed-in employee GET /api/manager-team-stats is 403."
    why_human: "Route code gates on getServerSession; no HTTP test drives the cookie."

  - test: "Credentials sign-in, signup create-company, and invite preview/accept against local Supabase. GET /api/test-connection."
    expected: "Sign-in, create-company, and accept-invite still succeed (SECURITY DEFINER RPCs). GET /api/test-connection returns env SET/NOT SET only — no user emails or rows."
    why_human: "Onboarding RPCs and identity service_role are wired; live signup/accept is not exercised by a test. test-connection body shape is visible in code but not hit here."

  - test: "Two signed-in companies on the same local deployment. Open Company A dashboard (people, requests, balances, notifications) and personal/unified calendar."
    expected: "A does not list B people or requests. Dashboard Network has no /rest/v1/leave_requests (or other tenant tables). Personal and unified calendars load /api/calendar/leave-requests. Team calendar page may still show its pre-existing mock rows (02-07 removed only an unused import; CAL-01/CAL-02 are Phase 7)."
    why_human: "pgTAP proves Postgres isolation; two-company UI and the browser Network tab cannot be seen from grep."
---

# Phase 2: Tenant Isolation and Server Authz Verification Report

**Phase Goal:** Company A cannot read or mutate Company B; leave and user writes run on the server with a signed-in session; the public anon key cannot operate without a tenant session.
**Verified:** 2026-08-29T14:09:42Z
**Status:** human_needed
**Re-verification:** No — initial verification

**MVP note:** ROADMAP.md marks this phase `mode: mvp` but the roadmap goal is not a user-story sentence. Every 02-*-PLAN.md uses: *As a signed-in employee of Company A, I want to request and update leave using my signed-in session, so that Company B cannot read or change our people, requests, balances, calendars, notifications, or audit, and someone holding only the public API key cannot operate without a tenant session.* Verification used the three ROADMAP success criteria as the contract and that PLAN story for User Flow Coverage. Reformat the ROADMAP goal with `/gsd mvp-phase 2` if you want the roadmap sentence to match.

## User Flow Coverage

User story (from PLAN files): As a signed-in employee of Company A, I want to request and update leave using my signed-in session, so that Company B cannot read or change our people, requests, balances, calendars, notifications, or audit, and someone holding only the public API key cannot operate without a tenant session.

| Step | Expected | Evidence | Status |
|------|----------|----------|--------|
| Sign in | Session has `user.id` and `user.companyId` | NextAuth JWT session; BFF calls `getServerSession(authOptions)` then `tenantSessionRejectStatus` | ✓ wired |
| Request leave | Form submits through the signed-in session | `use-dashboard-data.ts` `fetch POST /api/leave-requests` with `credentials: 'include'`; route `bindLeaveCreateActor(..., session.user.id)` | ⚠️ present; live submit needs human |
| Approve / update leave | Same session binds approver; UI unchanged | `use-leave-request-operations.ts` PATCH/bulk fetch; `[id]/route.ts` and `bulk/route.ts` call `bindLeaveApprover` | ⚠️ present; live dialogs need human |
| Isolation outcome | Company A cannot see or change Company B | Migration `current_company_id()` + tenant policies; `supabase test db` 22/22 PASS | ✓ VERIFIED at Postgres |
| Anon-key outcome | Public key without a tenant JWT cannot read/write leave, users, notifications | `REVOKE ALL FROM anon`; live PostgREST GET with anon key returns HTTP 401 / `42501` on those tables | ✓ VERIFIED at PostgREST |

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | ------- | ---------- | -------------- |
| 1 | A signed-in user at Company A cannot read or change Company B’s people, requests, balances, calendars, notifications, or audit | ✓ VERIFIED | `npx supabase test db`: `tenant_rls.test.sql` 22/22 PASS (cross-tenant SELECT/INSERT/UPDATE/DELETE deny on users, leave_requests, leave_balances, notifications, audit_logs, calendar_events, companies, company_invites; view does not leak B). BFF mints `company_id` as a top-level JWT claim (`supabase-jwt.test.ts` PASS). |
| 2 | Requesting, approving, or updating leave as a signed-in user still works; those writes are bound to the signed-in session, not the browser anon key | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | Routes call `getServerSession` + `createTenantDatabaseService` + `bindLeaveCreateActor` / `bindLeaveApprover`. Hooks fetch `/api/leave-requests*` with `credentials: 'include'` and no longer call `databaseService.*`. Bind unit test PASS. No test persists through HTTP. |
| 3 | Someone holding only the public API key, without a valid tenant session, cannot read or write leave, user, or notification data | ✓ VERIFIED | pgTAP anon SELECT/INSERT deny PASS. Live local PostgREST with anon key: `leave_requests`, `users`, `notifications`, `leave_balances`, `audit_logs`, `calendar_events` all HTTP 401 / Postgres `42501`. |
| 4 | `tenantSessionRejectStatus` returns 401 when userId or companyId is missing or empty; otherwise null | ✓ VERIFIED | `require-tenant-session.test.ts` — 7/7 PASS (named suite run). |
| 5 | `bindLeaveCreateActor` / `bindLeaveApprover` always set ids from the session argument; body copies are ignored | ✓ VERIFIED | Named test `returns user_id equal to sessionUserId when body user_id is another uuid` PASS; approver suite in `bind-leave-actor.test.ts`. |
| 6 | `mintTenantAccessToken` payload has `role` authenticated, `sub` equal to userId, and `company_id` equal to companyId | ✓ VERIFIED | `supabase-jwt.test.ts` PASS; `jose` pinned `4.15.9`. |
| 7 | Dashboard leave balance, requests, notifications, and manager stats load via session-gated GET BFF (`credentials: 'include'`), not a browser anon `IDatabaseService` | ✓ VERIFIED | `use-dashboard-data.ts` fetch to `/api/leave-balances`, `/api/leave-requests`, `/api/notifications`, `/api/manager-team-stats`. `DatabaseServiceProvider` default is `null`. `useDatabaseService()` has no remaining feature call sites. |
| 8 | Personal/unified calendar and leave-policies catalog fetch the same BFF pattern | ✓ VERIFIED | `unified-calendar-view.tsx` / `leave-calendar-view.tsx` → `/api/calendar/leave-requests`; `leave-request-form.tsx` → `/api/leave-policies`. `team-calendar-view.tsx` is still the pre-existing mock; 02-07 planned only to drop an unused import (CAL-01/CAL-02 → Phase 7). |
| 9 | Pre-session identity uses the server service-role client; that module is not imported from a `'use client'` file | ✓ VERIFIED | `identitySupabase` used by `auth.ts`, signup, invites. No `'use client'` importer of `service-role-supabase.ts`. Tenant BFF uses minted JWT + anon apikey, not `SUPABASE_SERVICE_ROLE_KEY`. |
| 10 | `GET /api/test-connection` does not return users rows | ✓ VERIFIED | Handler returns env SET/NOT SET only; no `from('users')`. |
| 11 | An employee cannot escalate leave-list scope to team/all via query or body | ✓ VERIFIED | `leave-list-scope.test.ts` PASS; GET `/api/leave-requests` and calendar GET call `resolveLeaveListScope(session.user.role, searchParams)`. Employee `/api/manager-team-stats` returns 403 in route code. |
| 12 | `active_leave_requests` is `security_invoker`; onboarding RPCs stay `SECURITY DEFINER` with `search_path = public` and `GRANT` to anon | ✓ VERIFIED | Migration recreates the view `WITH (security_invoker = true)` and `ALTER FUNCTION ... SET search_path = public`. pgTAP: A JWT does not see B rows through the view. |

**Score:** 11/12 truths verified (1 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | ----------- | ------ | ------- |
| `apps/web/src/lib/require-tenant-session.ts` | `tenantSessionRejectStatus` | ✓ VERIFIED | Exists, substantive, used by all tenant BFF routes |
| `apps/web/src/lib/bind-leave-actor.ts` | create/approver bind | ✓ VERIFIED | Used by POST/PATCH/bulk |
| `apps/web/src/lib/supabase-jwt.ts` | `mintTenantAccessToken` | ✓ VERIFIED | HS256, `company_id` claim, 5m exp |
| `apps/web/src/lib/tenant-supabase.ts` | `createTenantDatabaseService` | ✓ VERIFIED | Per-request client; `DatabaseServiceFactory.create`, not `getInstance` |
| `apps/web/src/lib/service-role-supabase.ts` | `identitySupabase` | ✓ VERIFIED | `persistSession: false`; identity routes only |
| `apps/web/src/app/api/leave-requests/route.ts` | GET/POST session-gated | ✓ VERIFIED | Own/team/all from session role; POST binds `user_id` |
| `apps/web/src/app/api/leave-requests/[id]/route.ts` | PATCH approve/reject/cancel/delete | ✓ VERIFIED | Session gate + `bindLeaveApprover` |
| `apps/web/src/app/api/leave-requests/bulk/route.ts` | POST bulk | ✓ VERIFIED | Session `approver_id` |
| `apps/web/src/app/api/leave-balances/route.ts` | GET balances | ✓ VERIFIED | Session user id + year |
| `apps/web/src/app/api/notifications/route.ts` | GET + PATCH mark-read | ✓ VERIFIED | List and mark-read scoped to session user |
| `apps/web/src/app/api/leave-policies/route.ts` | GET catalog | ✓ VERIFIED | Session-gated |
| `apps/web/src/app/api/calendar/leave-requests/route.ts` | GET calendar lists | ✓ VERIFIED | Same scope helper as leave-requests GET |
| `apps/web/src/app/api/manager-team-stats/route.ts` | GET stats | ✓ VERIFIED | 401 unauthenticated; 403 employee |
| `apps/web/src/hooks/use-dashboard-data.ts` | Fetch BFF | ✓ VERIFIED | No `databaseService.createLeaveRequest` |
| `apps/web/src/hooks/use-leave-request-operations.ts` | Fetch BFF | ✓ VERIFIED | PATCH/bulk + sonner + invalidation |
| `apps/web/src/providers/database-provider.tsx` | No default anon domain client | ✓ VERIFIED | `service ?? null` |
| `packages/database/src/modules/users/repository.ts` | Domain select without password | ✓ VERIFIED | `USER_DOMAIN_COLUMNS` on `findById` / `findAll` / `getTeamMembers`; `findByEmail` still `select('*')` (not a BFF list path) |
| `packages/database/migrations/20250818193735_tenant_rls_and_anon_revoke.sql` | Tenant RLS + anon REVOKE | ✓ VERIFIED | Helper, policies, REVOKE, RPCs, invoker view |
| `supabase/tests/tenant_rls.test.sql` | pgTAP | ✓ VERIFIED | 22 tests, run this verification: PASS |
| `apps/web/package.json` | jose 4.15.9 + node:test list | ✓ VERIFIED | Wave 0 files included; no Vitest |

**Artifacts:** 20/20 verified (gsd `verify.artifacts` all_passed on all seven plans)

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | --- | --- | ------ | ------- |
| `use-dashboard-data.ts` | `/api/leave-requests` | fetch POST credentials include | ✓ WIRED | gsd + grep |
| `leave-requests/route.ts` | `tenant-supabase.ts` | `createTenantDatabaseService` after session | ✓ WIRED | |
| `tenant-supabase.ts` | `supabase-jwt.ts` | `mintTenantAccessToken` then `accessToken` | ✓ WIRED | |
| `use-leave-request-operations.ts` | `[id]/route.ts` | fetch PATCH | ✓ WIRED | |
| `use-leave-request-operations.ts` | `bulk/route.ts` | fetch POST bulk | ✓ WIRED | |
| `use-dashboard-data.ts` | `leave-balances/route.ts` | fetch GET | ✓ WIRED | |
| `leave-request-form.tsx` | `leave-policies/route.ts` | fetch GET | ✓ WIRED | |
| `auth.ts` / signup | `service-role-supabase.ts` | `identitySupabase` | ✓ WIRED | |
| `tenant-supabase.ts` | tenant RLS migration | JWT `company_id` = `current_company_id()` | ✓ WIRED | |
| `users/repository.ts` | domain selects | omit password | ✓ WIRED | gsd `verify.key-links` reported false (`pattern: password` absent by design). Manual: `USER_DOMAIN_COLUMNS` has no `password`. |

**Wiring:** 10/10 connections verified (one gsd false-negative overridden by manual read)

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| Dashboard balances/requests/notifications | React Query payloads | GET BFF → `createTenantDatabaseService` → PostgREST with minted JWT → Postgres | Yes, when session + RLS allow | ✓ FLOWING |
| Leave create/approve | `user_id` / `approver_id` | Overwritten from `session.user.id` on the server | Yes (session), not body | ✓ FLOWING |
| Identity login/signup/invite | `users` / RPCs | `identitySupabase` service_role | Yes | ✓ FLOWING |
| `GET /api/test-connection` | env flags | `process.env` presence only | No user rows | ✓ FLOWING (non-tenant) |
| `TeamCalendarView` | mock John/Jane/Bob | hardcoded queryFn | No live tenant data | ⚠️ STATIC (intentional 02-07; Phase 7 CAL) |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Wave 0 + Phase 1 unit tests | `npm test --workspace=@timeoff/web` | 71 pass, 0 fail, 0 skip | ✓ PASS |
| Bind ignores spoofed `user_id` | `node --test --test-name-pattern "returns user_id equal to sessionUserId" src/lib/bind-leave-actor.test.ts` | 1 pass | ✓ PASS |
| Tenant RLS + anon deny | `npx supabase test db` | `tenant_rls.test.sql .. ok` Files=1 Tests=22 PASS | ✓ PASS |
| Anon PostgREST cannot read tenant tables | GET `/rest/v1/{leave_requests,users,notifications,...}` with local anon key | HTTP 401, `code=42501` | ✓ PASS |
| HTTP create/approve with a real session cookie | (not run — would need app + mutation) | skipped | ? SKIP |

### Probe Execution

| Probe | Command | Result | Status |
| ----- | ------- | ------ | ------ |
| — | No `scripts/*/tests/probe-*.sh` and none declared in PLAN/SUMMARY | n/a | SKIPPED |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ---------- | ----------- | ------ | -------- |
| TENANT-04 | 02-04, 02-06, 02-07 | Company A cannot read or change Company B’s people, requests, balances, calendars, notifications, or audit | ✓ SATISFIED | RLS + pgTAP; BFF JWT `company_id`. Two-company UI still listed under Human Verification. |
| AUTHZ-01 | 02-01, 02-02, 02-03, 02-04, 02-05, 02-07 | Leave and user mutations run on the server using the signed-in session, not the browser anon key | ✓ SATISFIED | Session-gated BFF + bind helpers + dashboard/ops fetch. Live “still works” is behavior-unverified. |
| AUTHZ-02 | 02-01, 02-06 | Database policies deny rows outside the session user’s company | ✓ SATISFIED | `current_company_id()` from JWT; policies `TO authenticated`; pgTAP PASS. |
| AUTHZ-03 | 02-05, 02-06 | Public API key cannot read or write leave, user, or notification data without a valid tenant session | ✓ SATISFIED | REVOKE anon; live PostgREST 401/42501; identity moved to service_role before REVOKE. |

**Orphaned requirements:** none. REQUIREMENTS.md maps TENANT-04, AUTHZ-01, AUTHZ-02, AUTHZ-03 to Phase 2; every ID appears in at least one PLAN `requirements:` list.

**Coverage:** 4/4 requirement IDs accounted for (implementation evidence). Human confirmation remains for UI.

### Decision Coverage

Skipped — no `02-*-CONTEXT.md` and no `<decisions>` block.

### Test Quality Audit

| Test File | Linked Req | Active | Skipped | Circular | Assertion Level | Verdict |
|-----------|-----------|--------|---------|----------|-----------------|---------|
| `apps/web/src/lib/require-tenant-session.test.ts` | AUTHZ-01 | 7 | 0 | no | value (401 vs null) | OK |
| `apps/web/src/lib/bind-leave-actor.test.ts` | AUTHZ-01 | 3 | 0 | no | value (session id wins) | OK |
| `apps/web/src/lib/supabase-jwt.test.ts` | AUTHZ-02 | 3 | 0 | no | value (role/sub/company_id) | OK |
| `apps/web/src/lib/leave-list-scope.test.ts` | AUTHZ-01 / TENANT-04 | 7 | 0 | no | value (scope cap) | OK |
| `supabase/tests/tenant_rls.test.sql` | TENANT-04, AUTHZ-02, AUTHZ-03 | 22 | 0 | no | behavioral (deny/allow counts + 42501) | OK |

**Disabled tests on requirements:** 0
**Circular patterns detected:** 0
**Insufficient assertions:** 0 (HTTP session paths have no test — tracked as PRESENT_BEHAVIOR_UNVERIFIED, not a skipped test)

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| `packages/database/src/modules/users/repository.ts` | `findByEmail` `.select('*')` | Domain read can include `password` | ⚠️ Warning | Not used by tenant BFF list paths; identity authorize still selects password on service_role. Do not call `getUserByEmail` through the tenant JWT client. |
| `apps/web/src/lib/supabase.ts` | `export const supabase = createClient(anon)` and `testSupabaseConnection` | Leftover browser/anon client | ⚠️ Warning | No remaining `'use client'` `.from()` usage found. Module-load still constructs anon client when maps are imported on the server. After REVOKE, `testSupabaseConnection` would fail closed. |
| `apps/web/src/lib/env.ts` | missing-var `throw` commented out | Pre-existing | ℹ️ Info | `SUPABASE_JWT_SECRET` is listed required but boot does not throw if empty; mint would fail at request time. |
| `apps/web/src/components/dashboard/team-calendar-view.tsx` | hardcoded mock team | Hollow calendar | ℹ️ Info | 02-07 explicitly did not swap this queryFn. Phase 7 CAL-01/CAL-02. |
| Catalog policies `departments` / `teams` / `leave_policies` | `USING (true)` TO authenticated | Planned A2 | ℹ️ Info | Not tenant tables; anon public policies were dropped. |

**Debt markers (`TBD` / `FIXME` / `XXX`):** none in phase-touched application files.

**Prohibitions (judgment-tier, verifier-scanned — human review recommended, not a silent pass):** no new screens or `/(admin)/users` finish; no `jose` 6 / Vitest / Jest / Playwright / `jsonwebtoken` / `@supabase/ssr`; no `company_id` columns on child tables; tenant BFF does not use service_role; minted JWT is not in a cookie or `'use client'` module; tenant policies are not `USING (true)` (catalog-only exception as planned).

### Human Verification Required

### 1. Leave request over the BFF (Network tab)

**Test:** Log in, submit a leave request on the existing form. Open DevTools Network.
**Expected:** POST `/api/leave-requests` (not `/rest/v1/leave_requests`). Row appears for that user. Manager/admin/hr self-leave is approved in the same POST.
**Why human:** Session cookie + live app; no HTTP persist test.

### 2. Approve / reject / cancel / bulk (Network tab)

**Test:** As a same-company manager, use the existing dialogs including bulk-select.
**Expected:** PATCH `/api/leave-requests/{id}` and POST `/api/leave-requests/bulk`. Toasts and table refresh still work.
**Why human:** Live dialogs.

### 3. Unauthenticated vs manager GET

**Test:** GET `/api/leave-balances` and `/api/manager-team-stats` with no cookie; then as manager; then as employee for team-stats.
**Expected:** 401 without session; manager stats 200; employee stats 403.
**Why human:** Cookie-backed `getServerSession` not exercised by node:test.

### 4. Live signup / accept-invite after REVOKE

**Test:** Credentials sign-in, create-company signup, invite preview/accept. GET `/api/test-connection`.
**Expected:** Onboarding still succeeds. test-connection has no user emails.
**Why human:** RPCs are in SQL; live path is not tested.

### 5. Two-company UI + dashboard Network

**Test:** Two companies on this local stack. Use Company A dashboard and personal/unified calendar. Watch Network.
**Expected:** No Company B people/requests. No `/rest/v1/leave_requests`. Calendars hit `/api/calendar/leave-requests`.
**Why human:** pgTAP is not a browser. Team calendar page may still show mocks (Phase 7).

### Gaps Summary

No blocking gaps. Isolation (TENANT-04 / AUTHZ-02) and anon deny (AUTHZ-03) hold in the local database this app points at (`apps/web/.env.local` → local Supabase). Session-bound writes (AUTHZ-01) are implemented and unit-tested at the bind/JWT/scope layer; requesting and approving through the running UI is not proven by a test.

Do not treat this phase as complete until the human checks above pass.

---

_Verified: 2026-08-29T14:09:42Z_
_Verifier: Claude (gsd-verifier)_
