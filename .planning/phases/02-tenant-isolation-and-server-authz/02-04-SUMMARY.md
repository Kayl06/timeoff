---
phase: 02-tenant-isolation-and-server-authz
plan: 04
subsystem: api
tags: [bff, next-auth, supabase, jwt, leave-balances, notifications, leave-policies, calendar, manager-stats]

requires:
  - phase: 02-tenant-isolation-and-server-authz
    provides: createTenantDatabaseService, GET/POST /api/leave-requests, tenantSessionRejectStatus
provides:
  - GET /api/leave-balances session-gated for session.user.id current year
  - GET/PATCH /api/notifications session-gated; PATCH mark-read owns via tenant list
  - GET /api/leave-policies session-gated catalog
  - GET /api/leave-requests scope own|team|all from session.user.role
  - GET /api/calendar/leave-requests same role-capped scope
  - GET /api/manager-team-stats 403 for employee; managerId from session.user.id
  - resolveLeaveListScope (employee cannot escalate via query)
affects:
  - 02-07 dashboard/calendar fetch swap
  - 02-06 tenant RLS JWT fixtures

actuals:
  tokens: 4581
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - Per-request createTenantDatabaseService after getServerSession for dashboard GET BFF
    - Leave list scope own|team|all resolved from session.user.role; query may narrow, never escalate
    - manager-team-stats 403 when session.user.role is employee; managerId is session.user.id

key-files:
  created:
    - apps/web/src/app/api/leave-balances/route.ts
    - apps/web/src/app/api/notifications/route.ts
    - apps/web/src/app/api/leave-policies/route.ts
    - apps/web/src/app/api/calendar/leave-requests/route.ts
    - apps/web/src/app/api/manager-team-stats/route.ts
    - apps/web/src/lib/leave-list-scope.ts
    - apps/web/src/lib/leave-list-scope.test.ts
  modified:
    - apps/web/src/app/api/leave-requests/route.ts
    - apps/web/package.json

key-decisions:
  - "Leave list scope is resolved from session.user.role; client scope=all is ignored for employees and supervisors"
  - "PATCH notifications takes id from query or body but only marks read if the row is in getNotificationsByUser(session.user.id)"
  - "GET /api/manager-team-stats uses session.user.id as managerId and returns 403 for employee"

patterns-established:
  - "Dashboard GET BFF: getServerSession(authOptions) → tenantSessionRejectStatus → createTenantDatabaseService → IDatabaseService"
  - "Role-capped list scope: resolveLeaveListScope(role, query) then fetchLeaveRequestsForScope"

requirements-completed: [AUTHZ-01, TENANT-04]

coverage:
  - id: D1
    description: GET /api/leave-balances, /api/notifications, and /api/leave-policies call getServerSession and createTenantDatabaseService; balances and notifications use session.user.id
    requirement: AUTHZ-01
    verification:
      - kind: other
        ref: npm test --workspace=@timeoff/web
        status: pass
      - kind: other
        ref: rg "export async function GET|getServerSession|createTenantDatabaseService" apps/web/src/app/api/leave-balances/route.ts apps/web/src/app/api/notifications/route.ts apps/web/src/app/api/leave-policies/route.ts
        status: pass
    human_judgment: false
  - id: D2
    description: GET /api/leave-requests branches own vs team vs all from session.user.role; employee cannot escalate to all via query
    requirement: AUTHZ-01
    verification:
      - kind: unit
        ref: apps/web/src/lib/leave-list-scope.test.ts#ignores employee requests for team or all
        status: pass
      - kind: other
        ref: npm test --workspace=@timeoff/web
        status: pass
      - kind: other
        ref: rg "getServerSession|resolveLeaveListScope|session.user.role" apps/web/src/app/api/leave-requests/route.ts
        status: pass
    human_judgment: false
  - id: D3
    description: GET /api/calendar/leave-requests uses the same role-capped scope; GET /api/manager-team-stats returns 403 for employee and uses session.user.id
    requirement: AUTHZ-01
    verification:
      - kind: other
        ref: npm test --workspace=@timeoff/web
        status: pass
      - kind: other
        ref: rg "export async function GET|getServerSession|createTenantDatabaseService" apps/web/src/app/api/calendar/leave-requests/route.ts apps/web/src/app/api/manager-team-stats/route.ts
        status: pass
      - kind: other
        ref: rg "status: 403|UserRole.EMPLOYEE|session.user.id" apps/web/src/app/api/manager-team-stats/route.ts
        status: pass
    human_judgment: false
  - id: D4
    description: Unauthenticated GET /api/leave-balances and /api/manager-team-stats return 401; signed-in manager GET /api/manager-team-stats is 200
    requirement: AUTHZ-01
    verification: []
    human_judgment: true
    rationale: Requires a browser session cookie and live local app; node:test does not exercise unauthenticated HTTP against the running BFF

duration: 2min
completed: 2026-08-29
status: complete
---

# Phase 2 Plan 04: Session-Gated Dashboard GET BFF Summary

**Session-gated GET BFF routes for leave balances, notifications, policies, calendar leave lists, and manager team stats, with leave-request list scope capped by session.user.role**

## Performance

- **Duration:** 2 min
- **Started:** 2026-08-29T13:31:18Z
- **Completed:** 2026-08-29T13:33:29Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- `GET /api/leave-balances`, `/api/notifications`, and `/api/leave-policies` call `getServerSession` and `createTenantDatabaseService`; balances and notification lists use `session.user.id` (current calendar year; notifications sliced to 5)
- `GET /api/leave-requests` and `GET /api/calendar/leave-requests` resolve `own|team|all` from `session.user.role`; a client `scope` query may narrow but cannot escalate (employee cannot get `all`)
- `PATCH /api/notifications` marks read only when the id is present in `getNotificationsByUser(session.user.id)` loaded through the tenant client
- `GET /api/manager-team-stats` returns 401 without a session, 403 when `session.user.role` is employee, and calls `getManagerTeamStats(session.user.id)` (no client manager id)
- POST `/api/leave-requests` from 02-02 is unchanged; dashboard hooks and the database provider are not swapped (02-07)

## Task Commits

Each task was committed atomically:

1. **Task 1: GET BFF for balances, notifications, policies, and leave list scopes** - `200d32d` (feat)
2. **Task 2: Calendar and manager-stats GET BFF routes** - `f3e11e0` (feat)

**Plan metadata:** (this commit)

## Files Created/Modified

- `apps/web/src/lib/leave-list-scope.ts` - `resolveLeaveListScope` and `fetchLeaveRequestsForScope` (role cap for T-02-11)
- `apps/web/src/lib/leave-list-scope.test.ts` - Employee cannot escalate to team/all; supervisor cannot escalate to all
- `apps/web/src/app/api/leave-balances/route.ts` - Session-gated GET current-year balances for session user
- `apps/web/src/app/api/notifications/route.ts` - Session-gated GET (limit 5) and PATCH mark-read with ownership check
- `apps/web/src/app/api/leave-policies/route.ts` - Session-gated GET catalog
- `apps/web/src/app/api/leave-requests/route.ts` - GET extended with role-capped scope; POST unchanged
- `apps/web/src/app/api/calendar/leave-requests/route.ts` - Session-gated GET with the same scope helper
- `apps/web/src/app/api/manager-team-stats/route.ts` - Session-gated GET; 403 for employee
- `apps/web/package.json` - Appended `leave-list-scope.test.ts` to the web test script

## Decisions Made

- Leave list scope is resolved from `session.user.role`; client `scope=all` is ignored for employees and supervisors
- PATCH notifications takes `id` from query or body but only marks read if the row is in `getNotificationsByUser(session.user.id)`
- GET `/api/manager-team-stats` uses `session.user.id` as `managerId` and returns 403 for employee

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Shared leave-list scope helper**
- **Found during:** Task 1
- **Issue:** Leave-requests GET and calendar GET must apply the same T-02-11 cap; duplicating the branch would let one route drift
- **Fix:** Extracted `resolveLeaveListScope` / `fetchLeaveRequestsForScope` and unit tests that assert employee cannot escalate
- **Files modified:** `apps/web/src/lib/leave-list-scope.ts`, `apps/web/src/lib/leave-list-scope.test.ts`, `apps/web/package.json`
- **Verification:** `npm test --workspace=@timeoff/web` 71 passing, including leave-list-scope cases
- **Committed in:** `200d32d` (Task 1)

**2. [Rule 2 - Missing Critical] Notifications PATCH ownership via tenant list**
- **Found during:** Task 1
- **Issue:** `markNotificationAsRead(id)` has no user_id; without a load-through-tenant check, a body id could mark another user's row before 02-06 RLS
- **Fix:** Load `getNotificationsByUser(session.user.id)` and 404 unless the id is in that list, then mark read
- **Files modified:** `apps/web/src/app/api/notifications/route.ts`
- **Verification:** Route finds match in tenant-loaded list before `markNotificationAsRead`
- **Committed in:** `200d32d` (Task 1)

**3. [Rule 2 - Missing Critical] Slice notification GET to 5**
- **Found during:** Task 1
- **Issue:** Facade `getNotificationsByUser` ignores the optional limit argument the dashboard passes as 5
- **Fix:** Slice to 5 in the BFF after the tenant list load
- **Files modified:** `apps/web/src/app/api/notifications/route.ts`
- **Verification:** GET returns `notifications.slice(0, 5)`
- **Committed in:** `200d32d` (Task 1)

---

**Total deviations:** 3 auto-fixed (3 missing critical)
**Impact on plan:** All required for AUTHZ-01 correctness. No dashboard hook swap (still 02-07). No scope creep.

## Authentication Gates

None during execution.

## Issues Encountered

None

## User Setup Required

None - no new external service configuration. Live GET still needs the JWT secret and service role already listed in [02-USER-SETUP.md](./02-USER-SETUP.md).

## Next Phase Readiness

Ready for 02-05 (identity/service-role client swap) and 02-07 (wire dashboard/calendar queryFns to these BFF paths). AUTHZ-01 and TENANT-04 stay incomplete at the requirement level until sibling plans finish (shared-ID gate). Dashboard hooks still use browser `databaseService` for reads until 02-07.

## Self-Check: PASSED
