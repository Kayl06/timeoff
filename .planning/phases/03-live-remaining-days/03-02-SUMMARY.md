---
phase: 03-live-remaining-days
plan: 02
subsystem: api
tags: [leave-balances, self-heal, remaining_days, tenant-jwt, BAL-01]

requires:
  - phase: 03-live-remaining-days
    provides: planDefaultBalanceInserts, balancesForLeaveCard
  - phase: 02-tenant-isolation-and-server-authz
    provides: createTenantDatabaseService, session-gated GET /api/leave-balances
provides:
  - LeaveBalanceRepository.create insert-only
  - LeaveBalanceService.ensureDefaultBalances
  - IDatabaseService.ensureDefaultLeaveBalances
  - GET /api/leave-balances self-heal for session.user.id then re-select
  - LeaveBalanceCard bound to fetched remaining_days (no mockLeaveBalance)
affects:
  - 03-03 onboarding RPC seed
  - 03-04 empty/error card polish

actuals:
  tokens: 1912
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - Insert-only self-heal: planDefaultBalanceInserts then repository.create; DUPLICATE_ENTRY continue; GET re-selects
    - Tenant GET uses createTenantDatabaseService; never identitySupabase or updateLeaveBalance
    - Card populated rows filter via balancesForLeaveCard and bind remaining_days column

key-files:
  created: []
  modified:
    - packages/database/src/modules/leave-balances/repository.ts
    - packages/database/src/modules/leave-balances/service.ts
    - packages/database/src/index.ts
    - apps/web/src/app/api/leave-balances/route.ts
    - apps/web/src/components/dashboard/leave-balance-card.tsx

key-decisions:
  - "GET self-heal inserts only session.user.id for the current calendar year"
  - "Duplicate unique (user_id, leave_type, year) is continue then re-select, never UPDATE used_days"
  - "Leave Balance card maps leaveBalance through balancesForLeaveCard and renders remaining_days"

patterns-established:
  - "Default seed on GET is insert-only via ensureDefaultLeaveBalances, not createLeaveBalance upsert"
  - "Dashboard remaining-day numbers come from leave_balances.remaining_days, not total_allowance - used_days"

requirements-completed: [BAL-01]

coverage:
  - id: D1
    description: GET /api/leave-balances uses createTenantDatabaseService then ensureDefaultLeaveBalances(session.user.id, year, policies) then getLeaveBalance
    requirement: BAL-01
    verification:
      - kind: other
        ref: apps/web/src/app/api/leave-balances/route.ts#ensureDefaultLeaveBalances
        status: pass
      - kind: other
        ref: npm test --workspace=@timeoff/web
        status: pass
      - kind: other
        ref: npm test --workspace=@timeoff/database
        status: pass
    human_judgment: false
  - id: D2
    description: LeaveBalanceRepository.create inserts (not upserts); IDatabaseService.ensureDefaultLeaveBalances delegates to insert-only ensureDefaultBalances
    requirement: BAL-01
    verification:
      - kind: other
        ref: packages/database/src/modules/leave-balances/repository.ts#create
        status: pass
      - kind: other
        ref: packages/database/src/index.ts#ensureDefaultLeaveBalances
        status: pass
    human_judgment: false
  - id: D3
    description: Leave Balance card deletes mockLeaveBalance, binds remaining_days from the leaveBalance prop via balancesForLeaveCard
    requirement: BAL-01
    verification:
      - kind: unit
        ref: apps/web/src/lib/leave-balance-display.test.ts#balancesForLeaveCard
        status: pass
      - kind: other
        ref: apps/web/src/components/dashboard/leave-balance-card.tsx#remaining_days
        status: pass
    human_judgment: false
  - id: D4
    description: Duplicate unique (user_id, leave_type, year) continues; GET never imports identitySupabase or calls updateLeaveBalance
    requirement: BAL-01
    verification:
      - kind: other
        ref: packages/database/src/modules/leave-balances/service.ts#DUPLICATE_ENTRY
        status: pass
      - kind: other
        ref: apps/web/src/app/api/leave-balances/route.ts
        status: pass
    human_judgment: false

duration: 2min
completed: 2026-08-29
status: complete
---

# Phase 3 Plan 02: GET Self-Heal Tracer + Card Bind Summary

**GET /api/leave-balances insert-only self-heals vacation/sick/personal for session.user.id on the tenant JWT, then the Leave Balance card binds remaining_days from fetched rows**

## Performance

- **Duration:** 2 min
- **Started:** 2026-08-29T17:03:04Z
- **Completed:** 2026-08-29T17:05:15Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Added `LeaveBalanceRepository.create` that inserts into `leave_balances` (required fields `user_id`, `leave_type`, `total_allowance`, `year`); existing `upsert` left for `createLeaveBalance`
- Added `LeaveBalanceService.ensureDefaultBalances` using `planDefaultBalanceInserts` then `create`; `DUPLICATE_ENTRY` continues; never updates `used_days`
- Exposed `ensureDefaultLeaveBalances` on `IDatabaseService` / `DatabaseService`; GET self-heals `session.user.id` for the current calendar year via `createTenantDatabaseService`
- Deleted `mockLeaveBalance`; card populated rows use `balancesForLeaveCard` and `{balance.remaining_days} days remaining`

## Task Commits

Each task was committed atomically:

1. **Task 1: End-to-end live remaining days — GET self-heal then card bind** - `78b0f83` (feat)
2. **Task 2: Self-heal duplicate race stays insert-only** - verified in `78b0f83` (no extra production change; catch path and GET re-select already landed in Task 1)

**Plan metadata:** (this SUMMARY commit)

## Files Created/Modified

- `packages/database/src/modules/leave-balances/repository.ts` - Insert-only `create` next to existing `upsert`
- `packages/database/src/modules/leave-balances/service.ts` - `ensureDefaultBalances` (insert + DUPLICATE_ENTRY continue)
- `packages/database/src/index.ts` - `ensureDefaultLeaveBalances` on facade
- `apps/web/src/app/api/leave-balances/route.ts` - Self-heal then `getLeaveBalance` on tenant client
- `apps/web/src/components/dashboard/leave-balance-card.tsx` - Bind `remaining_days`; delete `mockLeaveBalance`; keep chrome and commented empty copy

## Decisions Made

- GET inserts only `session.user.id` for `new Date().getFullYear()` (D-04, D-05, D-06)
- Duplicate unique key is success; route always re-selects after ensure (D-07)
- Card uses `balancesForLeaveCard` so extra types are dropped and order is vacation then sick then personal (D-12)
- Empty-state uncomment and fetch toast stay in 03-04

## Deviations from Plan

None - plan executed exactly as written.

A confirmatory `LeaveBalanceService` node:test was drafted then withdrawn: `--experimental-strip-types` cannot load constructor parameter properties, so the suite stayed on the existing pure-helper tests. No extra test file shipped.

**Total deviations:** 0 auto-fixed
**Impact on plan:** None

## Issues Encountered

None

## Authentication Gates

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for 03-03 (RPC onboarding seed with the same insert-only / policy-driven defaults). Empty copy, fetch toast, and type-order polish remain 03-04. BAL-01 is shared with 03-04 — do not treat it as phase-complete until that plan finishes.

---
*Phase: 03-live-remaining-days*
*Completed: 2026-08-29*

## Self-Check: PASSED

- FOUND: packages/database/src/modules/leave-balances/repository.ts
- FOUND: packages/database/src/modules/leave-balances/service.ts
- FOUND: packages/database/src/index.ts
- FOUND: apps/web/src/app/api/leave-balances/route.ts
- FOUND: apps/web/src/components/dashboard/leave-balance-card.tsx
- FOUND: 78b0f83
- VERIFY: npm test --workspace=@timeoff/web exits 0 (80 pass)
- VERIFY: npm test --workspace=@timeoff/database exits 0 (7 pass)
