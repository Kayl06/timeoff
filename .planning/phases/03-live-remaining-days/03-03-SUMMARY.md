---
phase: 03-live-remaining-days
plan: 03
subsystem: database
tags: [supabase, plpgsql, leave-balances, onboarding-rpc, pgtap, BAL-02]

requires:
  - phase: 01-company-signup-and-invites
    provides: create_company_with_owner, accept_invite_with_employee
  - phase: 02-tenant-isolation-and-server-authz
    provides: SECURITY DEFINER SET search_path = public, GRANT EXECUTE to anon/authenticated/service_role
  - phase: 03-live-remaining-days
    provides: planDefaultBalanceInserts insert-only policy-driven seed contract
provides:
  - CREATE OR REPLACE create_company_with_owner seeds vacation/sick/personal from leave_policies
  - CREATE OR REPLACE accept_invite_with_employee seeds the same three types in-transaction
  - ON CONFLICT (user_id, leave_type, year) DO NOTHING never UPDATEs used_days
  - pgTAP seed_default_leave_balances.test.sql
  - local schema push of 20250830120000_seed_default_leave_balances.sql
affects:
  - 03-04 dashboard empty/error remaining-day card polish
  - first-user signup and invite accept remaining-day rows

actuals:
  tokens: 2909
  tasks: 3
  commits: 2

tech-stack:
  added: []
  patterns:
    - CREATE OR REPLACE onboarding RPCs in a new timestamped migration (do not edit 20250818193733/34/35 in place)
    - Policy-driven INSERT SELECT default_allowance DISTINCT ON (leave_type) ORDER BY leave_type, name
    - ON CONFLICT (user_id, leave_type, year) DO NOTHING
    - SECURITY DEFINER SET search_path = public on CREATE plus repeated ALTER/GRANT from Phase 2

key-files:
  created:
    - packages/database/migrations/20250830120000_seed_default_leave_balances.sql
    - supabase/tests/seed_default_leave_balances.test.sql
  modified: []

key-decisions:
  - "INSERT reads leave_policies.default_allowance at insert time; never hardcoded 20/10/5"
  - "DISTINCT ON (leave_type) ORDER BY leave_type, name when multiple active policies share a type"
  - "Skip a type when no active policy row exists"
  - "supabase/migrations is a symlink; SQL written once under packages/database/migrations"

patterns-established:
  - "Onboarding seed is insert-only in the same transaction as the new users row"
  - "Re-apply Phase 2 ALTER FUNCTION SECURITY DEFINER SET search_path and GRANT EXECUTE after CREATE OR REPLACE"

requirements-completed: [BAL-02]

coverage:
  - id: D1
    description: create_company_with_owner and accept_invite_with_employee INSERT vacation/sick/personal from active leave_policies.default_allowance with used_days 0, remaining_days equal to allowance, carried_over 0, year EXTRACT(YEAR FROM CURRENT_DATE)
    requirement: BAL-02
    verification:
      - kind: integration
        ref: supabase/tests/seed_default_leave_balances.test.sql#create_company_with_owner
        status: pass
      - kind: integration
        ref: supabase/tests/seed_default_leave_balances.test.sql#accept_invite_with_employee
        status: pass
      - kind: other
        ref: npx supabase test db
        status: pass
    human_judgment: false
  - id: D2
    description: ON CONFLICT (user_id, leave_type, year) DO NOTHING; existing used_days is never overwritten
    requirement: BAL-02
    verification:
      - kind: integration
        ref: supabase/tests/seed_default_leave_balances.test.sql#conflicting insert does not overwrite existing used_days
        status: pass
    human_judgment: false
  - id: D3
    description: Both functions remain SECURITY DEFINER SET search_path = public with GRANT EXECUTE to anon, authenticated, service_role; tenant_rls tests still pass
    requirement: BAL-02
    verification:
      - kind: integration
        ref: supabase/tests/tenant_rls.test.sql
        status: pass
      - kind: other
        ref: npx supabase test db
        status: pass
    human_judgment: false
  - id: D4
    description: Local db push applied 20250830120000_seed_default_leave_balances.sql; web and database unit suites still green
    requirement: BAL-02
    verification:
      - kind: other
        ref: npx supabase db push --local --yes
        status: pass
      - kind: unit
        ref: npm test --workspace=@timeoff/web
        status: pass
      - kind: unit
        ref: npm test --workspace=@timeoff/database
        status: pass
    human_judgment: false

duration: 2min
completed: 2026-08-29
status: complete
---

# Phase 3 Plan 03: Onboarding RPC Seed Summary

**CREATE OR REPLACE create_company_with_owner and accept_invite_with_employee insert-only seed vacation/sick/personal leave_balances from active leave_policies.default_allowance, applied locally**

## Performance

- **Duration:** 2 min
- **Started:** 2026-08-29T17:06:56Z
- **Completed:** 2026-08-29T17:09:01Z
- **Tasks:** 3
- **Files modified:** 2

## Accomplishments

- Replaced both onboarding RPCs so the new owner and invitee get vacation/sick/personal `leave_balances` in the same transaction, reading `default_allowance` from active `leave_policies` (BAL-02, D-01, D-13, D-14)
- Seed rows start unused (`used_days` 0, `remaining_days` = allowance, `carried_over` 0, `year` = current calendar year); missing active policy types are skipped (D-02, D-04, D-15)
- Unique `(user_id, leave_type, year)` conflict is `DO NOTHING` so existing `used_days` is never updated (D-07)
- Kept `SECURITY DEFINER SET search_path = public` and re-applied Phase 2 GRANT EXECUTE to `anon`, `authenticated`, `service_role` (D-13)
- Applied the migration to local Postgres and confirmed pgTAP (`seed_default_leave_balances` + `tenant_rls`) plus workspace unit tests

## Task Commits

Each task was committed atomically:

1. **Task 1: CREATE OR REPLACE onboarding RPCs with policy-driven balance seed** - `6e205a3` (feat)
2. **Task 2: pgTAP for owner/invitee seed and conflict skip** - `d8c0acf` (test)
3. **Task 3: [BLOCKING] Push seed RPC migration locally and run pgTAP** - no extra commit (verification-only: local `db push` + tests)

**Plan metadata:** (this SUMMARY commit)

## Files Created/Modified

- `packages/database/migrations/20250830120000_seed_default_leave_balances.sql` - CREATE OR REPLACE both RPCs with policy-driven INSERT; ALTER/GRANT re-applied
- `supabase/tests/seed_default_leave_balances.test.sql` - pgTAP owner seed, invitee seed, conflict skip
- `supabase/migrations/20250830120000_seed_default_leave_balances.sql` - same file via existing symlink to `packages/database/migrations`

## Decisions Made

- INSERT selects `default_allowance` from `leave_policies` at insert time; catalog numbers 20/10/5 are not SQL literals (D-14)
- Multiple active policies for one type: `DISTINCT ON (leave_type) ORDER BY leave_type, name` (matches `getPolicyForLeaveType` name-sort)
- Skip a type with no active policy row rather than inserting a placeholder (D-15)
- Write SQL once under `packages/database/migrations`; `supabase/migrations` is a symlink (plan interfaces)

## Deviations from Plan

None - plan executed exactly as written.

`npx supabase db push --local --yes` still echoed a Y/n prompt and auto-answered `y`; the migration applied. Not treated as a deviation.

**Total deviations:** 0 auto-fixed
**Impact on plan:** None

## Issues Encountered

None

## Authentication Gates

None

## User Setup Required

Local schema push completed (`npx supabase db push --local --yes` applied `20250830120000_seed_default_leave_balances.sql`). This plan did not push to hosted production. If `apps/web/.env.local` points at a hosted project, a human must apply the same migration there separately (same as Phase 2).

## Next Phase Readiness

Ready for 03-04 (empty/error remaining-day card polish). New company owners and invitees get default current-year balances at create time; GET self-heal from 03-02 still covers existing Phase 1 users. BAL-02 is shared with 03-01 — do not treat it as phase-complete until sibling plans that declare it have summaries.

---
*Phase: 03-live-remaining-days*
*Completed: 2026-08-29*

## Self-Check: PASSED

- FOUND: packages/database/migrations/20250830120000_seed_default_leave_balances.sql
- FOUND: supabase/tests/seed_default_leave_balances.test.sql
- FOUND: supabase/migrations/20250830120000_seed_default_leave_balances.sql (symlink)
- FOUND: 6e205a3
- FOUND: d8c0acf
- VERIFY: npx supabase db push --local --yes applied 20250830120000_seed_default_leave_balances.sql
- VERIFY: npx supabase test db exits 0 (36 pass; seed_default_leave_balances.test.sql + tenant_rls.test.sql)
- VERIFY: npm test --workspace=@timeoff/web exits 0 (80 pass)
- VERIFY: npm test --workspace=@timeoff/database exits 0 (7 pass)
