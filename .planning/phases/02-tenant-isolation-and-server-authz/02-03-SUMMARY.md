---
phase: 02-tenant-isolation-and-server-authz
plan: 03
subsystem: api
tags: [bff, next-auth, leave-requests, session, bindLeaveApprover]

requires:
  - phase: 02-tenant-isolation-and-server-authz
    provides: createTenantDatabaseService, GET/POST /api/leave-requests, bindLeaveApprover, tenantSessionRejectStatus
provides:
  - PATCH /api/leave-requests/[id] session-gated approve/reject/cancel/delete
  - POST /api/leave-requests/bulk session-gated approve/reject
  - leaveRequestPatchBodySchema
  - leaveRequestBulkBodySchema
  - use-leave-request-operations mutationFns fetch BFF with credentials include
affects:
  - 02-04 dashboard/calendar GET routes
  - 02-06 tenant RLS JWT fixtures
  - existing approve/reject/cancel/delete/bulk dialogs (transport only)

actuals:
  tokens: 3501
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - PATCH/POST leave BFF: getServerSession(authOptions) → tenantSessionRejectStatus → createTenantDatabaseService
    - bindLeaveApprover overwrites approver_id from session.user.id before approve/reject/bulk
    - Operations hook mutationFn fetch with credentials include; no minted JWT in the browser

key-files:
  created:
    - apps/web/src/app/api/leave-requests/[id]/route.ts
    - apps/web/src/app/api/leave-requests/bulk/route.ts
  modified:
    - apps/web/src/lib/validation.ts
    - apps/web/src/hooks/use-leave-request-operations.ts

key-decisions:
  - "PATCH approve/reject bind approver_id via bindLeaveApprover from session.user.id; cancel/delete have no actor field on IDatabaseService"
  - "Bulk POST builds status and approved_at/rejected_at on the server, then bindLeaveApprover before bulkUpdateLeaveRequests"
  - "Operations hook keeps userId only for query-key invalidation; JSON body has action/comments/reason/ids only"

patterns-established:
  - "Leave mutation BFF: Zod action enum, bind actor from session, IDatabaseService on minted tenant JWT"
  - "Client leave mutations: fetch credentials include, check res.ok then json, sonner + existing invalidation keys"

requirements-completed: [AUTHZ-01]

coverage:
  - id: D1
    description: PATCH /api/leave-requests/[id] session-gates approve/reject/cancel/delete and binds approver_id from session via bindLeaveApprover
    requirement: AUTHZ-01
    verification:
      - kind: other
        ref: npm test --workspace=@timeoff/web
        status: pass
      - kind: other
        ref: rg "export async function PATCH|getServerSession|bindLeaveApprover" apps/web/src/app/api/leave-requests/[id]/route.ts
        status: pass
    human_judgment: false
  - id: D2
    description: POST /api/leave-requests/bulk session-gates, bindLeaveApprover then bulkUpdateLeaveRequests with session.user.id
    requirement: AUTHZ-01
    verification:
      - kind: other
        ref: npm test --workspace=@timeoff/web
        status: pass
      - kind: other
        ref: rg "export async function POST|getServerSession|bindLeaveApprover|bulkUpdateLeaveRequests" apps/web/src/app/api/leave-requests/bulk/route.ts
        status: pass
    human_judgment: false
  - id: D3
    description: use-leave-request-operations mutationFns fetch /api/leave-requests with credentials include; no databaseService leave mutations
    requirement: AUTHZ-01
    verification:
      - kind: other
        ref: npm test --workspace=@timeoff/web
        status: pass
      - kind: other
        ref: rg "/api/leave-requests|credentials" apps/web/src/hooks/use-leave-request-operations.ts
        status: pass
      - kind: other
        ref: rg "databaseService|useDatabaseService" apps/web/src/hooks/use-leave-request-operations.ts (absent)
        status: pass
    human_judgment: false
  - id: D4
    description: Signed-in manager approve/reject/cancel/bulk from existing dialogs hit /api/leave-requests/* not PostgREST leave_requests
    requirement: AUTHZ-01
    verification: []
    human_judgment: true
    rationale: Requires a browser session cookie and live local app; node:test does not exercise Network tab or dialogs

duration: 2min
completed: 2026-08-29
status: complete
---

# Phase 2 Plan 03: Session-Gated Approve/Reject/Cancel/Bulk Summary

**Session-gated PATCH /api/leave-requests/[id] and POST /api/leave-requests/bulk with bindLeaveApprover from session.user.id, and operations hook swapped to fetch credentials include**

## Performance

- **Duration:** 2 min
- **Started:** 2026-08-29T13:28:04Z
- **Completed:** 2026-08-29T13:30:07Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- `PATCH /api/leave-requests/[id]` returns 401 without a session; approve/reject bind `approver_id` from `session.user.id` via `bindLeaveApprover`; cancel/delete are session-gated with no client actor
- `POST /api/leave-requests/bulk` returns 401 without a session; builds `status` and `approved_at`/`rejected_at` on the server; calls `bindLeaveApprover` then `bulkUpdateLeaveRequests`
- `leaveRequestPatchBodySchema` and `leaveRequestBulkBodySchema` omit `user_id`, `approver_id`, and `company_id`; reject requires `reason`
- `useLeaveRequestOperations` mutationFns `fetch` those BFF routes with `credentials: 'include'`; `useDatabaseService` removed from this file

## Task Commits

Each task was committed atomically:

1. **Task 1: Session-gated PATCH leave request and bulk POST** - `85e4049` (feat)
2. **Task 2: Swap leave operations hook to BFF fetch** - `b818b05` (feat)

**Plan metadata:** (this commit)

## Files Created/Modified

- `apps/web/src/app/api/leave-requests/[id]/route.ts` - Session-gated PATCH approve/reject/cancel/delete
- `apps/web/src/app/api/leave-requests/bulk/route.ts` - Session-gated POST bulk approve/reject
- `apps/web/src/lib/validation.ts` - `leaveRequestPatchBodySchema`, `leaveRequestBulkBodySchema`
- `apps/web/src/hooks/use-leave-request-operations.ts` - mutationFns fetch BFF; sonner and invalidation keys unchanged

## Decisions Made

- PATCH approve/reject bind `approver_id` via `bindLeaveApprover` from `session.user.id`; cancel/delete have no actor field on `IDatabaseService`
- Bulk POST builds status and timestamps on the server, then `bindLeaveApprover` before `bulkUpdateLeaveRequests`
- Operations hook keeps `userId` only for query-key invalidation; JSON body has `action`/`comments`/`reason`/`ids` only

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Validate PATCH params.id as UUID**
- **Found during:** Task 1
- **Issue:** Plan said read `params.id` but did not specify format; an invalid id would hit PostgREST as a 500
- **Fix:** `validateInput(uuidSchema, params.id)` returns 400 before the tenant client is minted
- **Files modified:** `apps/web/src/app/api/leave-requests/[id]/route.ts`
- **Verification:** Schema export still matches plan; tests 64 passing
- **Committed in:** `85e4049` (Task 1)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Tightens input validation; no scope creep.

## Authentication Gates

None during execution.

## Issues Encountered

None

## User Setup Required

None - no new external service configuration. Live approve still needs the JWT secret and service role already listed in [02-USER-SETUP.md](./02-USER-SETUP.md).

## Next Phase Readiness

Ready for 02-04 (dashboard/calendar GET routes). Leave write mutations on the shipped UI now go through the BFF. GET queryFns on the dashboard still use the browser `databaseService` until 02-04/02-07. AUTHZ-01 stays incomplete at the requirement level until sibling plans finish (shared-ID gate). Bulk still updates status only (balance/audit/notify remain later-phase).

## Self-Check: PASSED
