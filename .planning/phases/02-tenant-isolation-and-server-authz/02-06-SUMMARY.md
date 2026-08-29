---
phase: 02-tenant-isolation-and-server-authz
plan: 06
subsystem: database
tags: [rls, pgtap, supabase, current_company_id, TENANT-04, AUTHZ-02, AUTHZ-03]

requires:
  - phase: 02-tenant-isolation-and-server-authz
    provides: minted tenant JWT with company_id claim; session-gated BFF; identity service_role client
provides:
  - public.current_company_id() from JWT company_id
  - authenticated tenant RLS on companies, company_invites, users, leave_requests, leave_balances, notifications, audit_logs, calendar_events
  - REVOKE ALL from anon on tenant tables and active_leave_requests
  - SECURITY DEFINER search_path public on create_company_with_owner and accept_invite_with_employee
  - active_leave_requests WITH security_invoker true
  - supabase/tests/tenant_rls.test.sql pgTAP
affects:
  - hosted schema (human db push if .env.local points at hosted)
  - PostgREST anon key no longer reads or writes tenant tables

actuals:
  tokens: 4969
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - RLS helper current_company_id() wrapped in (SELECT ...) for initPlan caching
    - Child tables isolate via EXISTS users.company_id = current_company_id(); users/companies/company_invites use direct equality
    - Wave 0 RLS tests are supabase test db pgTAP with set_config request.jwt.claims then SET ROLE authenticated

key-files:
  created:
    - packages/database/migrations/20250818193735_tenant_rls_and_anon_revoke.sql
    - supabase/tests/tenant_rls.test.sql
  modified: []

key-decisions:
  - "Child isolation stays EXISTS through users.company_id; no company_id columns on leave_requests, leave_balances, notifications, audit_logs, or calendar_events"
  - "Catalog departments/teams/leave_policies get authenticated SELECT USING (true) this phase (A2); tenant tables do not"
  - "calendar_events with null user_id remain visible to authenticated tenants"
  - "pgTAP throws_ok uses the four-argument form so GRANT 42501 and RLS WITH CHECK 42501 messages are matched separately"

patterns-established:
  - "One migration: drop unrestricted policies by name, CREATE POLICY TO authenticated, REVOKE anon, SECURITY DEFINER RPCs, security_invoker view"
  - "supabase/tests/*.test.sql + npx supabase test db for RLS allow/deny; no Vitest"

requirements-completed: [TENANT-04, AUTHZ-02, AUTHZ-03]

coverage:
  - id: D1
    description: JWT with company_id of Company A cannot SELECT, INSERT, UPDATE, or DELETE Company B rows on tenant tables
    requirement: TENANT-04
    verification:
      - kind: integration
        ref: supabase/tests/tenant_rls.test.sql#A JWT cannot SELECT/mutate company B
        status: pass
      - kind: other
        ref: npx supabase test db
        status: pass
    human_judgment: false
  - id: D2
    description: Postgres role anon cannot SELECT or INSERT leave_requests, users, or notifications
    requirement: AUTHZ-03
    verification:
      - kind: integration
        ref: supabase/tests/tenant_rls.test.sql#anon SELECT/INSERT deny
        status: pass
      - kind: other
        ref: curl local PostgREST /rest/v1/leave_requests with anon key (HTTP 401, 42501)
        status: pass
    human_judgment: false
  - id: D3
    description: active_leave_requests is security_invoker so it does not bypass leave_requests RLS; A does not see B rows through the view
    requirement: TENANT-04
    verification:
      - kind: integration
        ref: supabase/tests/tenant_rls.test.sql#active_leave_requests as A does not return B rows
        status: pass
      - kind: other
        ref: pg_class reloptions security_invoker=true on active_leave_requests
        status: pass
    human_judgment: false
  - id: D4
    description: create_company_with_owner and accept_invite_with_employee are SECURITY DEFINER with search_path public and remain GRANTed to anon
    requirement: AUTHZ-03
    verification:
      - kind: other
        ref: rg "SECURITY DEFINER" packages/database/migrations/20250818193735_tenant_rls_and_anon_revoke.sql
        status: pass
    human_judgment: true
    rationale: Live signup and accept-invite still need a browser session against the running app; SQL GRANT is asserted, the onboarding UI path is not.
  - id: D5
    description: Two signed-in companies: A dashboard does not list B people or requests
    requirement: AUTHZ-02
    verification: []
    human_judgment: true
    rationale: Requires two browser sessions against the running app; pgTAP covers Postgres isolation, not the dashboard UI.

duration: 5min
completed: 2026-08-29
status: complete
---

# Phase 2 Plan 06: Tenant RLS and Anon REVOKE Summary

**Local Postgres denies anon and cross-tenant authenticated read/write via current_company_id() RLS, REVOKE ALL from anon, SECURITY DEFINER onboarding RPCs, and a security_invoker active_leave_requests view**

## Performance

- **Duration:** 5 min
- **Started:** 2026-08-29T13:57:12Z
- **Completed:** 2026-08-29T14:02:27Z
- **Tasks:** 3
- **Files modified:** 2

## Accomplishments

- Migration `20250818193735_tenant_rls_and_anon_revoke.sql` adds `current_company_id()`, drops unrestricted tenant policies by name, and creates authenticated SELECT/INSERT/UPDATE/DELETE (or FOR ALL) policies keyed on JWT `company_id`
- Child tables isolate via `EXISTS users.company_id = (SELECT current_company_id())`; users/companies/company_invites use direct equality with no users self-subquery
- `anon` lost ALL on tenant tables and the view; onboarding RPCs are `SECURITY DEFINER SET search_path = public`; `active_leave_requests` is `security_invoker`
- Wave 0 pgTAP `supabase/tests/tenant_rls.test.sql` passed after `npx supabase db push --local --yes`; local PostgREST anon curl returned HTTP 401 / 42501; `npm test --workspace=@timeoff/web` 71/71

## Task Commits

Each task was committed atomically:

1. **Task 1: Write tenant RLS and anon REVOKE migration** - `65a3b57` (feat)
2. **Task 2: Wave 0 pgTAP anon deny and cross-tenant deny** - `35e7c02` (test)
3. **Task 3: Push tenant RLS locally and run pgTAP** - `1722cc5` (test)

**Plan metadata:** (this commit)

## Files Created/Modified

- `packages/database/migrations/20250818193735_tenant_rls_and_anon_revoke.sql` - Helper, drop/create tenant policies, REVOKE anon, SECURITY DEFINER RPCs, security_invoker view
- `supabase/tests/tenant_rls.test.sql` - pgTAP anon deny, cross-tenant SELECT deny, INSERT/UPDATE/DELETE deny

## Decisions Made

- Child isolation stays `EXISTS` through `users.company_id`; no `company_id` columns on leave/balances/notifications/audit/calendar this phase
- Catalog `departments`/`teams`/`leave_policies` get authenticated SELECT `USING (true)` this phase (A2); tenant tables do not
- `calendar_events` rows with null `user_id` remain visible to authenticated tenants
- pgTAP `throws_ok` uses the four-argument form so GRANT `42501` and RLS WITH CHECK `42501` messages are matched separately

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] pgTAP throws_ok treated the description as errmsg**
- **Found during:** Task 3 ([BLOCKING] Push tenant RLS locally and run pgTAP)
- **Issue:** Three-argument `throws_ok(sql, '42501', description)` compared the description to the actual exception text. Anon INSERT raised `permission denied for table …`; authenticated INSERT raised `new row violates row-level security policy …`. Plan count was also off by one.
- **Fix:** Use four-argument `throws_ok` with the real errmsg; add null `user_id` calendar_events visibility assertion so `plan(22)` matches.
- **Files modified:** `supabase/tests/tenant_rls.test.sql`
- **Verification:** `npx supabase test db` — All tests successful, 22/22
- **Committed in:** `1722cc5`

---

**Total deviations:** 1 auto-fixed (Rule 1).
**Impact on plan:** Test harness correction only. Policies were already correct; no schema change.

## Authentication Gates

None during execution.

## Issues Encountered

`npx supabase db push --local --yes` still printed a `[Y/n]` prompt but accepted `y` and applied `20250818193735_tenant_rls_and_anon_revoke.sql` without hanging. Hosted project was not pushed.

## User Setup Required

Local stack was running; migration applied locally. Hosted `db push` remains a human step if `.env.local` points at hosted — same as Phase 1. JWT secret and service role stay in [02-USER-SETUP.md](./02-USER-SETUP.md).

## Next Phase Readiness

Phase 2 plans 01–07 now have summaries. Ready for `/gsd-verify-work 2`. T-01-06 is closed on local Postgres. Do not treat hosted as updated. Two-company UI and live signup/accept-invite remain human checks.

## Self-Check: PASSED

- FOUND: `packages/database/migrations/20250818193735_tenant_rls_and_anon_revoke.sql`
- FOUND: `supabase/tests/tenant_rls.test.sql`
- FOUND: `65a3b57`, `35e7c02`, `1722cc5`
