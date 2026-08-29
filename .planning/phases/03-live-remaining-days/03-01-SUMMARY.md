---
phase: 03-live-remaining-days
plan: 01
subsystem: testing
tags: [node:test, leave-balances, leave-policies, nyquist, BAL-01, BAL-02]

requires:
  - phase: 02-tenant-isolation-and-server-authz
    provides: session-gated GET /api/leave-balances, node:test web script
provides:
  - balancesForLeaveCard (vacation then sick then personal; drop extra types)
  - planDefaultBalanceInserts (insert-only seed planner from active policy default_allowance)
  - leave-balance-display.test.ts on @timeoff/web test script
  - plan-default-inserts.test.ts on @timeoff/database test script
affects:
  - 03-02 GET self-heal and card bind
  - 03-03 onboarding RPC CREATE OR REPLACE
  - 03-04 dashboard remaining-day card

actuals:
  tokens: 3146
  tasks: 2
  commits: 5

tech-stack:
  added: []
  patterns:
    - node:test + node:assert/strict with --experimental-strip-types and .ts suffix imports
    - Pure Wave 0 helpers with colocated node:test files; no Vitest
    - CARD_TYPES map/find/filter for remaining-day card order
    - Insert-only planner: skip existing leave_type, skip inactive or missing policy

key-files:
  created:
    - apps/web/src/lib/leave-balance-display.ts
    - apps/web/src/lib/leave-balance-display.test.ts
    - packages/database/src/modules/leave-balances/plan-default-inserts.ts
    - packages/database/src/modules/leave-balances/plan-default-inserts.test.ts
  modified:
    - apps/web/package.json
    - packages/database/package.json

key-decisions:
  - "Compare leave_type string values (vacation, sick, personal), not LeaveType enum keys"
  - "Missing is_active on a policy fixture is treated as inactive"
  - "Multiple active policies for one type: sort by name, take index 0"
  - "planDefaultBalanceInserts is a pure function; no database client import"

patterns-established:
  - "Wave 0 helpers are pure functions with colocated node:test files; no Vitest"
  - "@timeoff/database now has a node --test --experimental-strip-types script like @timeoff/web"
  - "Default seed planner returns CreateLeaveBalanceData inserts only; never update payloads"

requirements-completed: [BAL-01, BAL-02]

coverage:
  - id: D1
    description: balancesForLeaveCard returns vacation, then sick, then personal when all three exist, drops extra types, keeps partial lists ordered, and returns [] for no rows
    requirement: BAL-01
    verification:
      - kind: unit
        ref: apps/web/src/lib/leave-balance-display.test.ts#balancesForLeaveCard
        status: pass
      - kind: other
        ref: npm test --workspace=@timeoff/web
        status: pass
    human_judgment: false
  - id: D2
    description: planDefaultBalanceInserts copies default_allowance from the name-sorted active policy, unused-start fields, skips existing types and missing/inactive policies, and never emits extra types or another user_id
    requirement: BAL-02
    verification:
      - kind: unit
        ref: packages/database/src/modules/leave-balances/plan-default-inserts.test.ts#planDefaultBalanceInserts
        status: pass
      - kind: other
        ref: npm test --workspace=@timeoff/database
        status: pass
    human_judgment: false
  - id: D3
    description: leave-balance-display.test.ts is registered on the @timeoff/web test script alongside leave-list-scope.test.ts
    requirement: BAL-01
    verification:
      - kind: other
        ref: apps/web/package.json#scripts.test
        status: pass
    human_judgment: false
  - id: D4
    description: plan-default-inserts.test.ts is registered on the @timeoff/database node:test script
    requirement: BAL-02
    verification:
      - kind: other
        ref: packages/database/package.json#scripts.test
        status: pass
    human_judgment: false

duration: 3min
completed: 2026-08-29
status: complete
---

# Phase 3 Plan 01: Wave 0 Nyquist Helpers Summary

**balancesForLeaveCard orders vacation/sick/personal and planDefaultBalanceInserts plans insert-only policy-driven seeds, both locked by node:test**

## Performance

- **Duration:** 3 min
- **Started:** 2026-08-29T16:57:26Z
- **Completed:** 2026-08-29T17:00:44Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Exported `balancesForLeaveCard` that returns existing vacation, then sick, then personal rows and drops every other `leave_type` (BAL-01, D-12, D-15)
- Exported `planDefaultBalanceInserts` that plans unused-start inserts from active `leave_policies.default_allowance` for the caller `userId` and `year` only (BAL-02, D-01–D-04, D-06, D-07, D-14, D-15)
- Registered both test files on existing workspace `node --test --experimental-strip-types` scripts (no Vitest)

## Task Commits

Each task was committed atomically (TDD RED then GREEN):

1. **Task 1 RED: card type order and filter helper** - `d86c0f6` (test)
2. **Task 1 GREEN: card type order and filter helper** - `f457969` (feat)
3. **Task 2 RED: insert-only default seed planner** - `d7e6935` (test)
4. **Task 2 GREEN: insert-only default seed planner** - `30bdbc4` (feat)

**Plan metadata:** (this SUMMARY commit)

_Note: TDD tasks have multiple commits (test → feat)._

## Files Created/Modified

- `apps/web/src/lib/leave-balance-display.ts` - Pure mapper; CARD_TYPES map/find/filter
- `apps/web/src/lib/leave-balance-display.test.ts` - Order, extra-type drop, partial, empty
- `apps/web/package.json` - Appended leave-balance-display.test.ts; kept leave-list-scope.test.ts
- `packages/database/src/modules/leave-balances/plan-default-inserts.ts` - Pure insert-only planner
- `packages/database/src/modules/leave-balances/plan-default-inserts.test.ts` - Unused start, skip existing, skip missing policy, extra types, name-sort, userId, missing is_active
- `packages/database/package.json` - Added node:test script for plan-default-inserts.test.ts

## Decisions Made

- Compare `leave_type` string values (`vacation`, `sick`, `personal`), not `LeaveType` enum keys
- Treat missing `is_active` as inactive (must be strictly `true`)
- When two active policies share a type, sort by `name` and take index 0 (matches `LeavePolicyRepository.findByLeaveType`)
- Planner stays a pure function with no database client; 03-02 will call it from `ensureDefaultBalances`

## Deviations from Plan

None - plan executed exactly as written.

**Total deviations:** 0 auto-fixed
**Impact on plan:** None

## Issues Encountered

None

## Authentication Gates

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for 03-02 (GET self-heal calling `planDefaultBalanceInserts` and card bind via `balancesForLeaveCard`). BAL-01 remains shared with 03-02 and 03-04; BAL-02 remains shared with 03-03 — do not treat those requirements as phase-complete until sibling plans finish.

---
*Phase: 03-live-remaining-days*
*Completed: 2026-08-29*

## Self-Check: PASSED

- FOUND: apps/web/src/lib/leave-balance-display.ts
- FOUND: apps/web/src/lib/leave-balance-display.test.ts
- FOUND: packages/database/src/modules/leave-balances/plan-default-inserts.ts
- FOUND: packages/database/src/modules/leave-balances/plan-default-inserts.test.ts
- FOUND: d86c0f6
- FOUND: f457969
- FOUND: d7e6935
- FOUND: 30bdbc4
- VERIFY: npm test --workspace=@timeoff/web exits 0 (80 pass)
- VERIFY: npm test --workspace=@timeoff/database exits 0 (7 pass)
