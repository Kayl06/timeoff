---
phase: 02-tenant-isolation-and-server-authz
plan: 07
subsystem: api
tags: [bff, next-auth, tanstack-query, dashboard, calendar, AUTHZ-01, TENANT-04]

requires:
  - phase: 02-tenant-isolation-and-server-authz
    provides: GET /api/leave-balances, /api/notifications, /api/leave-policies, /api/leave-requests, /api/calendar/leave-requests, /api/manager-team-stats
provides:
  - dashboard queryFns fetch session-gated GET BFF with credentials include
  - calendar queryFns fetch GET /api/calendar/leave-requests with credentials include
  - leave-policies catalog fetch GET /api/leave-policies; queryKey leave-policies unchanged
  - DatabaseServiceProvider default is null (no browser createDatabaseService(anon))
  - UserRepository findById, findAll, getTeamMembers select without password
affects:
  - 02-06 REVOKE from anon (UI must already fetch BFF or dashboards go empty)

actuals:
  tokens: 3743
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - Client domain reads fetch GET /api/* with credentials include; session cookie only; no minted JWT in the browser
    - Leave list scope query may narrow (own) or request team/all only from enabled manager/admin queries; server still caps escalation
    - DatabaseServiceProvider omits default browser IDatabaseService; tests may still inject service

key-files:
  created: []
  modified:
    - apps/web/src/hooks/use-dashboard-data.ts
    - apps/web/src/providers/database-provider.tsx
    - apps/web/src/components/dashboard/unified-calendar-view.tsx
    - apps/web/src/components/dashboard/leave-calendar-view.tsx
    - apps/web/src/components/dashboard/team-calendar-view.tsx
    - apps/web/src/components/leave-request-form.tsx
    - packages/database/src/modules/users/repository.ts

key-decisions:
  - "recentRequests fetches /api/leave-requests?scope=own so managers still see their own list; server default would be team/all"
  - "DatabaseServiceProvider yields null when service is omitted so useDatabaseService throws instead of constructing a browser anon client"
  - "UserRepository domain selects use USER_DOMAIN_COLUMNS without password; findByEmail still select star (not a BFF list path this plan)"

patterns-established:
  - "Dashboard/calendar queryFn: fetch GET BFF, credentials include, throw on !ok, adapt after json"
  - "Browser provider is not the domain path; tenant JWT stays on the server"

requirements-completed: [AUTHZ-01, TENANT-04]

coverage:
  - id: D1
    description: Dashboard leave balance, recent/team/all requests, notifications, and manager team stats load via fetch to session-gated GET BFF routes with credentials include
    requirement: AUTHZ-01
    verification:
      - kind: other
        ref: npm test --workspace=@timeoff/web
        status: pass
      - kind: other
        ref: rg "/api/|credentials" apps/web/src/hooks/use-dashboard-data.ts
        status: pass
      - kind: other
        ref: rg "getLeaveBalance|getAllLeaveRequests" apps/web/src/hooks/use-dashboard-data.ts (absent)
        status: pass
    human_judgment: false
  - id: D2
    description: DatabaseServiceProvider does not construct createDatabaseService from the browser anon client as the default domain path
    requirement: AUTHZ-01
    verification:
      - kind: other
        ref: npm test --workspace=@timeoff/web
        status: pass
      - kind: other
        ref: rg createDatabaseService apps/web/src/providers/database-provider.tsx (absent)
        status: pass
    human_judgment: false
  - id: D3
    description: Personal and team calendar queryFns and leave-policies catalog fetch GET BFF with credentials include; leave-policies query key unchanged
    requirement: TENANT-04
    verification:
      - kind: other
        ref: npm test --workspace=@timeoff/web
        status: pass
      - kind: other
        ref: rg /api/calendar/leave-requests apps/web/src/components/dashboard/unified-calendar-view.tsx apps/web/src/components/dashboard/leave-calendar-view.tsx
        status: pass
      - kind: other
        ref: rg "/api/leave-policies|leave-policies" apps/web/src/components/leave-request-form.tsx
        status: pass
      - kind: other
        ref: rg useDatabaseService apps/web/src/components/dashboard/team-calendar-view.tsx (absent)
        status: pass
    human_judgment: false
  - id: D4
    description: UserRepository findById, findAll, and getTeamMembers select User fields and omit password
    requirement: AUTHZ-01
    verification:
      - kind: other
        ref: npm test --workspace=@timeoff/web
        status: pass
      - kind: other
        ref: rg "select\(USER_DOMAIN_COLUMNS\)" packages/database/src/modules/users/repository.ts
        status: pass
    human_judgment: false
  - id: D5
    description: Signed-in employee dashboard loads balances/requests/notifications without Network calls to /rest/v1/leave_requests; calendars use /api/calendar/leave-requests
    requirement: TENANT-04
    verification: []
    human_judgment: true
    rationale: Requires a browser session cookie and Network tab against the running app; node:test does not exercise live dashboard fetches

duration: 2min
completed: 2026-08-29
status: complete
---

# Phase 2 Plan 07: Dashboard Calendar BFF Fetch Swap Summary

**Dashboard, calendar, and policy catalog reads fetch session-gated GET BFF routes with credentials include; browser anon IDatabaseService is no longer the domain path; UserRepository domain selects omit password**

## Performance

- **Duration:** 2 min
- **Started:** 2026-08-29T13:51:26Z
- **Completed:** 2026-08-29T13:54:03Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments

- Dashboard `queryFn`s fetch `GET /api/leave-balances`, `/api/leave-requests` (`scope=own|team|all`), `/api/manager-team-stats`, and `/api/notifications` with `credentials: 'include'`; create mutation from 02-02 is unchanged
- `DatabaseServiceProvider` no longer calls `createDatabaseService(supabase)`; omitted `service` is `null` so `useDatabaseService` throws
- Unified and leave calendars fetch `GET /api/calendar/leave-requests`; leave-request form fetches `GET /api/leave-policies` and keeps `queryKey` `leave-policies`; unused `useDatabaseService` import removed from team calendar
- `UserRepository` `findById`, `findAll`, and `getTeamMembers` select an explicit User column list without `password`

## Task Commits

Each task was committed atomically:

1. **Task 1: Dashboard queryFn swap and provider default stop** - `2119867` (feat)
2. **Task 2: Calendar views and policy form fetch** - `97f2b4c` (feat)
3. **Task 3: UserRepository domain select without password** - `45c72de` (feat)

**Plan metadata:** (this commit)

## Files Created/Modified

- `apps/web/src/hooks/use-dashboard-data.ts` - Remaining queryFns fetch GET BFF; `useDatabaseService` removed
- `apps/web/src/providers/database-provider.tsx` - Default path is null; no browser anon `createDatabaseService`
- `apps/web/src/components/dashboard/unified-calendar-view.tsx` - Calendar leave lists fetch `/api/calendar/leave-requests`
- `apps/web/src/components/dashboard/leave-calendar-view.tsx` - Personal calendar fetch `/api/calendar/leave-requests?scope=own`
- `apps/web/src/components/dashboard/team-calendar-view.tsx` - Unused `useDatabaseService` import removed
- `apps/web/src/components/leave-request-form.tsx` - Policies catalog fetch `/api/leave-policies`; key `leave-policies` unchanged
- `packages/database/src/modules/users/repository.ts` - Domain selects omit password via `USER_DOMAIN_COLUMNS`

## Decisions Made

- `recentRequests` fetches `/api/leave-requests?scope=own` so managers still see their own list; the server default would be team/all
- `DatabaseServiceProvider` yields `null` when `service` is omitted so `useDatabaseService` throws instead of constructing a browser anon client
- UserRepository domain selects use `USER_DOMAIN_COLUMNS` without password; `findByEmail` still `select('*')` (not a BFF list path this plan)

## Deviations from Plan

None - plan executed exactly as written.

## Authentication Gates

None during execution.

## Issues Encountered

None

## User Setup Required

None - no new external service configuration. Live dashboard/calendar still needs the JWT secret and service role already listed in [02-USER-SETUP.md](./02-USER-SETUP.md).

## Next Phase Readiness

Ready for 02-06 (if not already done) and phase verification. Shipped dashboard and calendar reads go through the session-gated BFF. AUTHZ-01 and TENANT-04 stay incomplete at the requirement level until sibling plans finish (shared-ID gate). `findByEmail` still uses `select('*')`; identity authorize keeps its own password select on the service-role client.

## Self-Check: PASSED
