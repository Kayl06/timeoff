---
phase: 03-live-remaining-days
plan: 04
subsystem: ui
tags: [leave-balances, empty-state, sonner, remaining_days, BAL-01]

requires:
  - phase: 03-live-remaining-days
    provides: balancesForLeaveCard, LeaveBalanceCard bound to remaining_days
provides:
  - Leave Balance card empty branch (D-08)
  - leaveBalance query error toast Failed to load leave balances (D-09)
  - populated rows map balancesForLeaveCard; extra types not rendered (D-12)
affects:
  - Phase 4 leaveBalance query invalidation on approve

actuals:
  tokens: 1948
  tasks: 2
  commits: 4

tech-stack:
  added: []
  patterns:
    - Empty Leave Balance copy stays inside visible Card chrome; do not hide the card
    - TanStack Query v5 leaveBalance errors toast via useEffect on query error (useQuery has no onError)
    - Empty when balancesForLeaveCard returns []; extra GET types do not paint placeholder bars

key-files:
  created:
    - apps/web/src/lib/leave-balance-card-states.test.ts
  modified:
    - apps/web/src/components/dashboard/leave-balance-card.tsx
    - apps/web/src/hooks/use-dashboard-data.ts
    - apps/web/package.json

key-decisions:
  - "TanStack Query v5 has no useQuery onError; toast Failed to load leave balances from leaveBalanceError in useEffect"
  - "Empty branch keys off cardBalances.length === 0 so extra-only GET rows show empty copy, not a blank card body"

patterns-established:
  - "Dashboard remaining-day fetch errors use existing sonner Toaster; no second toaster, no inline destructive on the card"
  - "Leave Balance empty copy is No leave balance information available; card title stays Leave Balance"

requirements-completed: [BAL-01]

coverage:
  - id: D1
    description: After load, zero filtered rows (or fetch error) render Empty state body inside the still-visible Card
    requirement: BAL-01
    verification:
      - kind: unit
        ref: apps/web/src/lib/leave-balance-card-states.test.ts#renders Empty state body inside a still-visible Card when there are no rows
        status: pass
      - kind: other
        ref: npm test --workspace=@timeoff/web
        status: pass
    human_judgment: false
  - id: D2
    description: Failed GET toasts Failed to load leave balances via sonner; query key stays ['leaveBalance', user.id] with credentials include
    requirement: BAL-01
    verification:
      - kind: unit
        ref: apps/web/src/lib/leave-balance-card-states.test.ts#toasts Failed to load leave balances when the leaveBalance query errors
        status: pass
      - kind: other
        ref: npm test --workspace=@timeoff/web
        status: pass
    human_judgment: false
  - id: D3
    description: Populated map iterates balancesForLeaveCard (vacation, sick, personal); extra types and missing types get no placeholder bars
    requirement: BAL-01
    verification:
      - kind: unit
        ref: apps/web/src/lib/leave-balance-display.test.ts#balancesForLeaveCard
        status: pass
      - kind: unit
        ref: apps/web/src/lib/leave-balance-card-states.test.ts#maps populated rows through balancesForLeaveCard
        status: pass
      - kind: other
        ref: npm test --workspace=@timeoff/web
        status: pass
    human_judgment: false
  - id: D4
    description: Loading pulse skeleton, remaining_days chrome, and Overview card layout stay as shipped (no restyle)
    requirement: BAL-01
    verification: []
    human_judgment: true
    rationale: Visual chrome lock (pulse skeleton, spacing, dots, Progress) is not asserted by node:test source contracts

duration: 4min
completed: 2026-08-29
status: complete
---

# Phase 3 Plan 04: Empty, Fetch-Error, Partial, Type-Order Card Summary

**Leave Balance card shows live empty copy, sonner fetch-error toast, and vacation/sick/personal rows through balancesForLeaveCard with no mock 5/10 fallback**

## Performance

- **Duration:** 4 min
- **Started:** 2026-08-29T17:10:43Z
- **Completed:** 2026-08-29T17:15:20Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Uncommented the Leave Balance empty branch; Card chrome and title stay visible with copy "No leave balance information available"
- leaveBalance query toasts `Failed to load leave balances` on error; `adaptLeaveBalances([])` still yields `[]` so the empty branch runs
- Empty check uses `cardBalances.length === 0` after `balancesForLeaveCard`, so extra GET types are not rendered and do not leave a blank card body
- Query key stays `['leaveBalance', user.id]`; GET `/api/leave-balances` still uses `credentials: 'include'`

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: Empty card and fetch-error toast** - `c8e3857` (test)
2. **Task 1 GREEN: Empty card and fetch-error toast** - `35bfc58` (feat)
3. **Task 2 RED: Display order, partial rows, extra types hidden** - `5fb672b` (test)
4. **Task 2 GREEN: Display order, partial rows, extra types hidden** - `5366721` (feat)

**Plan metadata:** (this SUMMARY commit)

## Files Created/Modified

- `apps/web/src/components/dashboard/leave-balance-card.tsx` - Live empty branch; empty when filtered rows are empty; populated map stays `cardBalances`
- `apps/web/src/hooks/use-dashboard-data.ts` - Toast on leaveBalance query error via `useEffect`
- `apps/web/src/lib/leave-balance-card-states.test.ts` - Source-contract tests for empty, toast, credentials, type-order, extra types
- `apps/web/package.json` - Include the new test file in the web test script

## Decisions Made

- TanStack Query v5 removed `useQuery` `onError`; toast the locked copy from `leaveBalanceError` in `useEffect` so the toast actually fires (mutations still use `onError`)
- Empty branch keys off `cardBalances.length === 0` rather than raw `leaveBalance.length`, so maternity-only GET data shows empty copy instead of an empty `space-y-6` stack

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] useQuery onError is not valid in TanStack Query v5**
- **Found during:** Task 1
- **Issue:** Plan asked for `onError` on the leaveBalance `useQuery`. `@tanstack/react-query` 5.102.8 only types `onError` on mutations; a useQuery `onError` would be ignored at runtime and the toast would never fire.
- **Fix:** Read `error: leaveBalanceError` from the query and `toast.error('Failed to load leave balances')` in `useEffect` when it is set (after retries). Same locked copy as `fetchSessionJson` fallbackError. Existing Sonner in session-provider; no second toaster.
- **Files modified:** `apps/web/src/hooks/use-dashboard-data.ts`
- **Verification:** `leave-balance-card-states.test.ts` asserts `toast.error('Failed to load leave balances')` in the leaveBalance query block; `npm test --workspace=@timeoff/web` exits 0
- **Committed in:** `35bfc58`

**2. [Rule 2 - Missing Critical] Extra-only GET would skip empty copy**
- **Found during:** Task 2
- **Issue:** Plan's commented empty check used `!leaveBalance || leaveBalance.length === 0`. After `balancesForLeaveCard` drops extra types, a maternity-only payload would skip empty copy and render no rows.
- **Fix:** Empty when `cardBalances.length === 0`. Covers missing, `[]`, fetch error, and extra-only. A row with `remaining_days === 0` still has length > 0 and stays populated.
- **Files modified:** `apps/web/src/components/dashboard/leave-balance-card.tsx`
- **Verification:** source-contract test for `cardBalances.length === 0`; `leave-balance-display.test.ts` still drops maternity
- **Committed in:** `5366721`

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 missing critical)
**Impact on plan:** Both required for truthful empty/error/extra-type states. No restyle, no new packages.

## Issues Encountered

None

## Authentication Gates

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Phase 3 plans 01–04 are complete. Remaining-day card empty, error, partial, and overflow type states match 03-UI-SPEC. Ready for phase verification / next roadmap phase (deduct remaining days on approve). Do not invalidate `leaveBalance` on approve here — that is Phase 4.

---
*Phase: 03-live-remaining-days*
*Completed: 2026-08-29*

## Self-Check: PASSED

- FOUND: apps/web/src/components/dashboard/leave-balance-card.tsx
- FOUND: apps/web/src/hooks/use-dashboard-data.ts
- FOUND: apps/web/src/lib/leave-balance-card-states.test.ts
- FOUND: apps/web/package.json
- FOUND: .planning/phases/03-live-remaining-days/03-04-SUMMARY.md
- FOUND: c8e3857
- FOUND: 35bfc58
- FOUND: 5fb672b
- FOUND: 5366721
- VERIFY: npm test --workspace=@timeoff/web exits 0 (86 pass)

