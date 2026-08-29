---
phase: 02-tenant-isolation-and-server-authz
plan: 02
subsystem: api
tags: [bff, next-auth, supabase, jwt, leave-requests, tenant]

requires:
  - phase: 02-tenant-isolation-and-server-authz
    provides: tenantSessionRejectStatus, bindLeaveCreateActor, mintTenantAccessToken, jose@4.15.9
provides:
  - createTenantDatabaseService (minted HS256 accessToken + request-scoped IDatabaseService)
  - DatabaseServiceFactory.create (not first-client-wins getInstance)
  - GET/POST /api/leave-requests session-gated BFF
  - leaveRequestCreateBodySchema
  - required SUPABASE_JWT_SECRET and SUPABASE_SERVICE_ROLE_KEY on EnvironmentConfig
affects:
  - 02-03 approve/reject/cancel/bulk BFF
  - 02-04 dashboard/calendar GET routes
  - 02-06 tenant RLS JWT fixtures

actuals:
  tokens: 3213
  tasks: 3
  commits: 2

tech-stack:
  added: []
  patterns:
    - Per-request createTenantDatabaseService after getServerSession (anon key + minted accessToken, persistSession false)
    - DatabaseServiceFactory.create always constructs a new factory; getInstance unused on tenant BFF
    - Dashboard create mutationFn fetch POST /api/leave-requests with credentials include

key-files:
  created:
    - apps/web/src/lib/tenant-supabase.ts
    - apps/web/src/app/api/leave-requests/route.ts
  modified:
    - apps/web/src/lib/env.ts
    - apps/web/env.example
    - packages/database/src/modules/database-service.ts
    - packages/database/src/index.ts
    - apps/web/src/lib/validation.ts
    - apps/web/src/hooks/use-dashboard-data.ts

key-decisions:
  - "Always insert leave_requests as pending; ignore body status so an employee cannot self-approve"
  - "Compute total_days on the server from dates and is_half_day; do not trust client total_days"
  - "DatabaseService constructor uses Factory.create for every createDatabaseService caller, including the browser provider until 02-04"

patterns-established:
  - "Tenant BFF: getServerSession(authOptions) → tenantSessionRejectStatus → createTenantDatabaseService → IDatabaseService"
  - "Manager self-leave auto-approve runs in the POST handler with session.user.id as approver"

requirements-completed: [AUTHZ-01]

coverage:
  - id: D1
    description: Required SUPABASE_JWT_SECRET and SUPABASE_SERVICE_ROLE_KEY; DatabaseServiceFactory.create; createTenantDatabaseService mints JWT and uses createDatabaseService
    requirement: AUTHZ-01
    verification:
      - kind: other
        ref: npm test --workspace=@timeoff/web
        status: pass
      - kind: other
        ref: rg SUPABASE_JWT_SECRET apps/web/src/lib/env.ts apps/web/env.example
        status: pass
    human_judgment: false
  - id: D2
    description: GET/POST /api/leave-requests session-gate, bindLeaveCreateActor, dashboard create via fetch credentials include
    requirement: AUTHZ-01
    verification:
      - kind: other
        ref: npm test --workspace=@timeoff/web
        status: pass
      - kind: other
        ref: rg getServerSession|createTenantDatabaseService|bindLeaveCreateActor apps/web/src/app/api/leave-requests/route.ts
        status: pass
      - kind: other
        ref: rg /api/leave-requests|credentials apps/web/src/hooks/use-dashboard-data.ts
        status: pass
    human_judgment: false
  - id: D3
    description: Tenant BFF cannot pin DatabaseServiceFactory.getInstance; constructor uses create
    requirement: AUTHZ-01
    verification:
      - kind: other
        ref: rg DatabaseServiceFactory.create packages/database/src/index.ts
        status: pass
      - kind: other
        ref: rg getInstance apps/web/src/app/api/leave-requests/route.ts (absent)
        status: pass
    human_judgment: false
  - id: D4
    description: Signed-in submit on the existing form POSTs /api/leave-requests (not PostgREST) and manager self-leave auto-approves without a second client approve call
    requirement: AUTHZ-01
    verification: []
    human_judgment: true
    rationale: Requires a browser session cookie and live local Supabase JWT secret; not covered by node:test

duration: 4min
completed: 2026-08-29
status: complete
---

# Phase 2 Plan 02: Session-Gated Create-Leave Tracer Summary

**Session-gated GET/POST /api/leave-requests using getServerSession, minted HS256 tenant JWT, request-scoped IDatabaseService, and dashboard create swapped to fetch**

## Performance

- **Duration:** 4 min
- **Started:** 2026-08-29T13:22:32Z
- **Completed:** 2026-08-29T13:26:30Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments

- `SUPABASE_JWT_SECRET` and `SUPABASE_SERVICE_ROLE_KEY` are required on `EnvironmentConfig`; `env.example` has a `SUPABASE_JWT_SECRET=` placeholder (no real secret)
- `DatabaseServiceFactory.create` always constructs a new factory; `DatabaseService` uses `create`, not `getInstance`
- `createTenantDatabaseService` mints via `mintTenantAccessToken` and `createClient({ accessToken })` with `persistSession: false`, then `createDatabaseService`
- `GET`/`POST` `/api/leave-requests` call `getServerSession(authOptions)` themselves (middleware still excludes `/api`), bind `user_id` from the session, and auto-approve manager self-leave in the handler
- Dashboard `createLeaveRequest` mutationFn `fetch`es `POST /api/leave-requests` with `credentials: 'include'` and does not call `databaseService.createLeaveRequest`

## Task Commits

Each task was committed atomically:

1. **Task 1: Request-scoped tenant client and required JWT secret** - `4887d9b` (feat)
2. **Task 2: End-to-end create own leave request — one path** - `424af38` (feat)
3. **Task 3: Confirm factory create is used by tenant BFF** - verification only (no code change; no commit)

**Plan metadata:** (this commit)

## Files Created/Modified

- `apps/web/src/lib/env.ts` - Required `SUPABASE_JWT_SECRET` and `SUPABASE_SERVICE_ROLE_KEY`; Proxy lazy getEnv unchanged
- `apps/web/env.example` - `SUPABASE_JWT_SECRET=` placeholder
- `packages/database/src/modules/database-service.ts` - `DatabaseServiceFactory.create`
- `packages/database/src/index.ts` - `DatabaseService` constructor uses `create`; default `databaseService` left for the browser provider until 02-04
- `apps/web/src/lib/tenant-supabase.ts` - Server-only `createTenantDatabaseService`
- `apps/web/src/lib/validation.ts` - `leaveRequestCreateBodySchema` (no `user_id` / `company_id` / `approver_id`)
- `apps/web/src/app/api/leave-requests/route.ts` - Session-gated GET own list and POST create
- `apps/web/src/hooks/use-dashboard-data.ts` - Create mutationFn fetch; GET queryFns still on `databaseService` (02-04)

## Decisions Made

- Always insert `status: pending` and ignore body `status` so a client cannot self-approve
- Compute `total_days` on the server from dates and `is_half_day`; Zod strips client `total_days`
- Point every `createDatabaseService` caller at `Factory.create` so two overlapping POSTs cannot share one `accessToken` in one isolate

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Ignore body status on create**
- **Found during:** Task 2
- **Issue:** Schema allows optional `status`; honoring it would let an employee POST `status: approved`
- **Fix:** Always insert `pending`; manager/admin/hr auto-approve uses `session.user.id` afterward
- **Files modified:** `apps/web/src/app/api/leave-requests/route.ts`
- **Verification:** Route always passes `status: 'pending'` into `createLeaveRequest`
- **Committed in:** `424af38` (Task 2)

**2. [Rule 2 - Missing Critical] Server-computed total_days**
- **Found during:** Task 2
- **Issue:** `createLeaveRequest` requires `total_days`; schema must not take `user_id` and did not list `total_days`
- **Fix:** `calculateTotalDays` on the server; half-day halves the count (same as the existing form header)
- **Files modified:** `apps/web/src/app/api/leave-requests/route.ts`
- **Verification:** `npm test --workspace=@timeoff/web` still 64 passing
- **Committed in:** `424af38` (Task 2)

---

**Total deviations:** 2 auto-fixed (2 missing critical)
**Impact on plan:** Both required for correct/secure create. No scope creep.

## Authentication Gates

None during execution. Live PostgREST round-trip needs human env (see User Setup); unit tests mint JWTs with a test-only secret in `supabase-jwt.test.ts`.

## Issues Encountered

None

## User Setup Required

**External services require manual configuration.** See [02-USER-SETUP.md](./02-USER-SETUP.md) for:
- `SUPABASE_JWT_SECRET` and `SUPABASE_SERVICE_ROLE_KEY` in `apps/web/.env.local` from `npx supabase status -o env` (never `NEXT_PUBLIC_`)
- `npm run supabase:start` if local Supabase is down

## Next Phase Readiness

Ready for 02-03 (approve/reject/cancel/bulk). Create/list-own tracer is in place. GET queryFns on the dashboard still use the browser `databaseService` until 02-04/02-07. AUTHZ-01 stays incomplete at the requirement level until sibling plans finish (shared-ID gate). Live create needs JWT secret + service role in `.env.local`.

## Self-Check: PASSED
