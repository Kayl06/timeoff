---
phase: 04-approve-reject-cancel-side-effects
plan: 01
subsystem: database
tags: [node:test, leave-balances, notifications, nyquist, BAL-03, BAL-04, NOTIF-01, NOTIF-02]

requires:
  - phase: 03-live-remaining-days
    provides: remaining_days as the deducted column; plan-default-inserts node:test analog; @timeoff/database test script
provides:
  - applyApprovalDeduct / applyApprovalRestore (delta used_days and remaining_days; no total_allowance)
  - shouldApplyApprovalDeduct (pending only) / shouldApplyApprovalRestore (approved only)
  - yearFromStartDate (ISO prefix; throws Invalid start_date)
  - leaveRequestNotificationType (request_approved / request_rejected)
  - leaveRequestNotificationCopy (Leave Request approved/rejected copy)
  - three new node:test files registered on @timeoff/database test script
affects:
  - 04-03 updateBalanceAfterApproval / restoreBalanceAfterReversal / createLeaveRequestNotification wiring
  - 04-04 PATCH mail and React Query invalidation (helpers already locked)

actuals:
  tokens: 2180
  tasks: 2
  commits: 5

tech-stack:
  added: []
  patterns:
    - Pure Wave 0 kebab-case helpers next to plan-default-inserts.ts; no database client
    - Delta remaining_days in place (never total_allowance - used_days)
    - ISO year from startDate.slice(0, 4); never Date#getFullYear
    - CHECK-valid notification types only; throw on any other action

key-files:
  created:
    - packages/database/src/modules/leave-balances/balance-arithmetic.ts
    - packages/database/src/modules/leave-balances/balance-arithmetic.test.ts
    - packages/database/src/modules/leave-balances/year-from-start-date.ts
    - packages/database/src/modules/leave-balances/year-from-start-date.test.ts
    - packages/database/src/modules/notifications/leave-request-notification-type.ts
    - packages/database/src/modules/notifications/leave-request-notification-type.test.ts
  modified:
    - packages/database/package.json

key-decisions:
  - "applyApprovalDeduct/Restore return only { used_days, remaining_days }; carried_over stays on the row"
  - "remaining_days may go negative; the helper does not clamp (D-04)"
  - "yearFromStartDate uses Number(startDate.slice(0, 4)) and throws Invalid start_date"
  - "shouldApplyApprovalDeduct is pending-only; shouldApplyApprovalRestore is approved-only"
  - "leaveRequestNotificationType emits only request_approved or request_rejected (D-10)"
  - "No service wiring, PostgREST writes, or Resend this plan (04-03 / 04-04)"

patterns-established:
  - "Wave 0 helpers are pure functions with colocated node:test files; no Vitest"
  - "Balance arithmetic is delta on remaining_days, never recomputed from total_allowance"
  - "Notification type mapper is the only place that names CHECK-valid request_approved / request_rejected"

requirements-completed: [BAL-03, BAL-04, NOTIF-01, NOTIF-02]

coverage:
  - id: D1
    description: applyApprovalDeduct adds total_days to used_days and subtracts the same from remaining_days without using total_allowance; remaining may go negative; restore is the inverse
    requirement: BAL-03
    verification:
      - kind: unit
        ref: packages/database/src/modules/leave-balances/balance-arithmetic.test.ts#applyApprovalDeduct
        status: pass
      - kind: unit
        ref: packages/database/src/modules/leave-balances/balance-arithmetic.test.ts#applyApprovalRestore
        status: pass
      - kind: other
        ref: npm test --workspace=@timeoff/database
        status: pass
    human_judgment: false
  - id: D2
    description: shouldApplyApprovalDeduct is true only for pending; shouldApplyApprovalRestore is true only for approved
    requirement: BAL-04
    verification:
      - kind: unit
        ref: packages/database/src/modules/leave-balances/balance-arithmetic.test.ts#shouldApplyApprovalDeduct
        status: pass
      - kind: unit
        ref: packages/database/src/modules/leave-balances/balance-arithmetic.test.ts#shouldApplyApprovalRestore
        status: pass
    human_judgment: false
  - id: D3
    description: yearFromStartDate('2025-12-31') returns 2025 from the ISO prefix and throws Invalid start_date when the prefix is not an integer
    requirement: BAL-03
    verification:
      - kind: unit
        ref: packages/database/src/modules/leave-balances/year-from-start-date.test.ts#yearFromStartDate
        status: pass
    human_judgment: false
  - id: D4
    description: leaveRequestNotificationType maps approved to request_approved and rejected to request_rejected; throws on any other action; copy keeps Leave Request approved/rejected
    requirement: NOTIF-01
    verification:
      - kind: unit
        ref: packages/database/src/modules/notifications/leave-request-notification-type.test.ts#leaveRequestNotificationType
        status: pass
      - kind: unit
        ref: packages/database/src/modules/notifications/leave-request-notification-type.test.ts#leaveRequestNotificationCopy
        status: pass
    human_judgment: false
  - id: D5
    description: packages/database package.json scripts.test lists plan-default-inserts, balance-arithmetic, year-from-start-date, and leave-request-notification-type tests
    requirement: NOTIF-02
    verification:
      - kind: other
        ref: packages/database/package.json#scripts.test
        status: pass
      - kind: other
        ref: npm test --workspace=@timeoff/database
        status: pass
    human_judgment: false

duration: 2min
completed: 2026-08-29
status: complete
---

# Phase 4 Plan 1: Wave 0 Deduct Restore Year and Notification Type Summary

**Pure delta deduct/restore, ISO year from start_date prefix, pending/approved status gates, and CHECK-valid request_approved/request_rejected mappers locked by node:test**

## Performance

- **Duration:** 2 min
- **Started:** 2026-08-29T17:46:40Z
- **Completed:** 2026-08-29T17:48:24Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- `applyApprovalDeduct` adds `totalDays` to `used_days` and subtracts the same from `remaining_days` without reading `total_allowance` (BAL-03, D-01); remaining may go negative (D-04)
- `applyApprovalRestore` is the inverse (BAL-04, D-06); `shouldApplyApprovalDeduct` is pending-only and `shouldApplyApprovalRestore` is approved-only (D-05, D-06, D-07)
- `yearFromStartDate('2025-12-31')` returns 2025 from the ISO prefix; throws `Invalid start_date` when the prefix is not an integer (D-02)
- `leaveRequestNotificationType` emits only `request_approved` / `request_rejected`; `leaveRequestNotificationCopy` keeps existing title/message shape (NOTIF-01, NOTIF-02, D-10, D-11)
- All four helpers registered on `npm test --workspace=@timeoff/database` (21 pass, 0 fail)

## Task Commits

Each task was committed atomically (TDD RED then GREEN):

1. **Task 1 RED: Wave 0 deduct restore year and status gates** - `a46fb26` (test)
2. **Task 1 GREEN: Wave 0 deduct restore year and status gates** - `10168fb` (feat)
3. **Task 2 RED: CHECK-valid leave-request notification type** - `0487b79` (test)
4. **Task 2 GREEN: CHECK-valid leave-request notification type** - `c9f0737` (feat)

**Plan metadata:** this SUMMARY.md (docs commit after task commits)

_Note: TDD tasks have RED (`test`) then GREEN (`feat`) commits._

## TDD Gate Compliance

- RED `test(04-01)` commits: `a46fb26`, `0487b79`
- GREEN `feat(04-01)` commits: `10168fb`, `c9f0737`
- Both gates present for both tasks

## Files Created/Modified

- `packages/database/src/modules/leave-balances/balance-arithmetic.ts` - delta deduct/restore and status gates
- `packages/database/src/modules/leave-balances/balance-arithmetic.test.ts` - deduct, negative remaining, restore inverse, status gates
- `packages/database/src/modules/leave-balances/year-from-start-date.ts` - ISO prefix year
- `packages/database/src/modules/leave-balances/year-from-start-date.test.ts` - Dec 31 year and invalid prefix
- `packages/database/src/modules/notifications/leave-request-notification-type.ts` - CHECK-valid type + copy mapper
- `packages/database/src/modules/notifications/leave-request-notification-type.test.ts` - approved/rejected types, throw on other actions, copy
- `packages/database/package.json` - appended the three new test files; kept `plan-default-inserts.test.ts`

## Decisions Made

- Followed D-01–D-07 and D-10 as specified: delta remaining in place, ISO year, no clamp, reject never deducts (gate is pending-only), restore only approved, CHECK-valid notification types
- Wave 0 helpers only — no `LeaveBalanceService` / `NotificationService` wiring (04-03)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- 04-03 can import `applyApprovalDeduct`, `applyApprovalRestore`, `yearFromStartDate`, and `leaveRequestNotificationType` without inventing arithmetic or CHECK strings
- Do not call these helpers from bulk POST (D-18)
- Do not put Resend in `packages/database`

## Self-Check: PASSED

All seven key files exist. Commits `a46fb26`, `10168fb`, `0487b79`, `c9f0737` exist on main. Exports and test script listing verified.

---
*Phase: 04-approve-reject-cancel-side-effects*
*Completed: 2026-08-29*
