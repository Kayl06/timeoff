---
phase: 02-tenant-isolation-and-server-authz
plan: 05
subsystem: auth
tags: [next-auth, supabase, service-role, identity, AUTHZ-03]

requires:
  - phase: 02-tenant-isolation-and-server-authz
    provides: required SUPABASE_SERVICE_ROLE_KEY on EnvironmentConfig, createTenantDatabaseService
provides:
  - identitySupabase server client (service_role, persistSession false)
  - auth.ts authorize/session/Google identity queries on identitySupabase
  - signup and invite preview/create/accept on identitySupabase
  - GET /api/test-connection without users row payload
affects:
  - 02-06 REVOKE from anon (identity must land first so authorize SELECT on users does not fail)

actuals:
  tokens: 3876
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - Server-only identitySupabase with persistSession false and autoRefreshToken false
    - Identity routes import identitySupabase; mapUserFromDatabase stays in supabase.ts
    - Tenant BFF stays on createTenantDatabaseService (minted JWT); never service_role

key-files:
  created:
    - apps/web/src/lib/service-role-supabase.ts
  modified:
    - apps/web/src/lib/auth.ts
    - apps/web/src/app/api/auth/signup/route.ts
    - apps/web/src/app/api/auth/invites/route.ts
    - apps/web/src/app/api/auth/invites/accept/route.ts
    - apps/web/src/app/api/auth/invites/preview/route.ts
    - apps/web/src/app/api/test-connection/route.ts

key-decisions:
  - "Identity uses service_role with persistSession false; tenant leave BFF stays on minted authenticated JWT"
  - "GET /api/test-connection returns env SET/NOT SET only; no users rows and no testSupabaseConnection"

patterns-established:
  - "Pre-session identity: identitySupabase from service-role-supabase.ts; never import from use client"
  - "Diagnostics: url/key SET versus NOT SET; never dump people"

requirements-completed: [AUTHZ-03, AUTHZ-01]

coverage:
  - id: D1
    description: identitySupabase exported from service-role-supabase.ts; auth.ts and signup use it for users queries and create_company_with_owner; file is not use client
    requirement: AUTHZ-03
    verification:
      - kind: other
        ref: npm test --workspace=@timeoff/web
        status: pass
      - kind: other
        ref: rg export const identitySupabase apps/web/src/lib/service-role-supabase.ts
        status: pass
      - kind: other
        ref: rg identitySupabase apps/web/src/lib/auth.ts apps/web/src/app/api/auth/signup/route.ts
        status: pass
    human_judgment: false
  - id: D2
    description: Invite GET/POST, accept, and preview import identitySupabase and do not import tenant-supabase; owner gate and hashInviteTokenHex remain
    requirement: AUTHZ-03
    verification:
      - kind: other
        ref: npm test --workspace=@timeoff/web
        status: pass
      - kind: other
        ref: rg identitySupabase apps/web/src/app/api/auth/invites/route.ts apps/web/src/app/api/auth/invites/accept/route.ts apps/web/src/app/api/auth/invites/preview/route.ts
        status: pass
      - kind: other
        ref: rg tenant-supabase apps/web/src/app/api/auth/invites (absent)
        status: pass
    human_judgment: false
  - id: D3
    description: GET /api/test-connection does not call from('users') or testSupabaseConnection and does not return a users array
    requirement: AUTHZ-03
    verification:
      - kind: other
        ref: npm test --workspace=@timeoff/web
        status: pass
      - kind: other
        ref: rg from\('users'\)|testSupabaseConnection apps/web/src/app/api/test-connection/route.ts (absent)
        status: pass
    human_judgment: false
  - id: D4
    description: Credentials sign-in, signup create-company, and invite preview/accept still work against local Supabase; GET /api/test-connection does not include other users' emails
    requirement: AUTHZ-03
    verification: []
    human_judgment: true
    rationale: Requires a browser session cookie and live local Supabase; not covered by node:test

duration: 2min
completed: 2026-08-29
status: complete
---

# Phase 2 Plan 05: Service-Role Identity Client Summary

**Server-only identitySupabase (service_role, persistSession false) for authorize, session enrich, signup, and invites; GET /api/test-connection no longer lists users**

## Performance

- **Duration:** 2 min
- **Started:** 2026-08-29T13:46:58Z
- **Completed:** 2026-08-29T13:49:17Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments

- `identitySupabase` is a server-only `createClient` with `env.SUPABASE_SERVICE_ROLE_KEY`, `persistSession: false`, and `autoRefreshToken: false`
- Credentials `authorize`, session user re-read, Google sign-in, signup `create_company_with_owner`, and invite preview/create/accept use that client; `mapUserFromDatabase` stays in `supabase.ts`
- Invite GET/POST still use `getServerSession` for the owner gate; tenant leave/notification BFF stays on minted authenticated JWT
- `GET /api/test-connection` returns url/key SET versus NOT SET only — no `from('users')`, no `testSupabaseConnection`, no users array

## Task Commits

Each task was committed atomically:

1. **Task 1: Service-role identity client for auth and signup** - `65e3906` (feat)
2. **Task 2: Invite routes use identity client** - `df2bd2a` (feat)
3. **Task 3: Close test-connection user listing** - `7f0e101` (feat)

**Plan metadata:** (this commit)

## Files Created/Modified

- `apps/web/src/lib/service-role-supabase.ts` - Named export `identitySupabase`; JSDoc forbids use-client import
- `apps/web/src/lib/auth.ts` - All `from('users')` / RPC / company / invite queries on `identitySupabase`
- `apps/web/src/app/api/auth/signup/route.ts` - User lookup and `create_company_with_owner` on `identitySupabase`
- `apps/web/src/app/api/auth/invites/route.ts` - Owner-gated list/create uses identity client
- `apps/web/src/app/api/auth/invites/accept/route.ts` - Hash lookup and `accept_invite_with_employee` on identity client
- `apps/web/src/app/api/auth/invites/preview/route.ts` - Token-hash preview on identity client
- `apps/web/src/app/api/test-connection/route.ts` - Env SET/NOT SET probe only

## Decisions Made

- Identity uses service_role with `persistSession: false`; tenant leave BFF stays on minted authenticated JWT (`createTenantDatabaseService`)
- `GET /api/test-connection` stays unauthenticated but returns env SET/NOT SET only (no session gate required by the plan)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Dropped anon connection probe from signup**
- **Found during:** Task 1
- **Issue:** Signup called `testSupabaseConnection()`, which probes `users` via the browser anon client and would fail after 02-06 REVOKE
- **Fix:** Removed the probe; signup user lookup and RPC use `identitySupabase` only
- **Files modified:** `apps/web/src/app/api/auth/signup/route.ts`
- **Verification:** Signup no longer imports `testSupabaseConnection`; `npm test --workspace=@timeoff/web` 71 passing
- **Committed in:** `65e3906` (Task 1)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Required so identity does not keep an anon `users` probe. No scope creep.

## Authentication Gates

Env checkpoint before this continuation: `apps/web/.env.local` gained `SUPABASE_JWT_SECRET` and `SUPABASE_SERVICE_ROLE_KEY` (gitignored). Boolean name check passed; values were not printed or committed. User signal: `verified`.

## Issues Encountered

None

## User Setup Required

None for this plan (`user_setup: []`). Live identity still needs the secrets already documented in [02-USER-SETUP.md](./02-USER-SETUP.md).

## Next Phase Readiness

Ready for 02-06 (REVOKE from anon + tenant RLS). Identity SELECT/RPC will survive grant drop. Tenant BFF remains on minted JWT. Do not use `identitySupabase` on leave/notification routes.

## Self-Check: PASSED
