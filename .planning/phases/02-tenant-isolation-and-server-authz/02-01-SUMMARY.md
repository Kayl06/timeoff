---
phase: 02-tenant-isolation-and-server-authz
plan: 01
subsystem: auth
tags: [node:test, jose, jwt, hs256, next-auth, tenant, session]

requires:
  - phase: 01-company-signup-and-invites
    provides: node:test web script, invite-auth fail-closed mapper analog
provides:
  - tenantSessionRejectStatus (401 when userId or companyId missing/empty)
  - bindLeaveCreateActor / bindLeaveApprover (session overwrite of actor ids)
  - mintTenantAccessToken (HS256 role authenticated, sub, company_id)
  - jose 4.15.9 direct dependency on @timeoff/web
affects:
  - 02-02 leave-requests BFF tracer
  - 02-03 approve/reject/cancel/bulk
  - 02-06 tenant RLS JWT fixtures

actuals:
  tokens: 1999
  tasks: 3
  commits: 6

tech-stack:
  added:
    - jose@4.15.9
  patterns:
    - node:test + node:assert/strict with --experimental-strip-types
    - Pure lib helpers analog to invite-auth.ts / create-company-rpc.ts (kebab-case, named exports, file-level JSDoc)
    - jose SignJWT HS256 for PostgREST; never node:crypto HMAC

key-files:
  created:
    - apps/web/src/lib/require-tenant-session.ts
    - apps/web/src/lib/require-tenant-session.test.ts
    - apps/web/src/lib/bind-leave-actor.ts
    - apps/web/src/lib/bind-leave-actor.test.ts
    - apps/web/src/lib/supabase-jwt.ts
    - apps/web/src/lib/supabase-jwt.test.ts
  modified:
    - apps/web/package.json

key-decisions:
  - "Pin jose as exact 4.15.9 (not caret, not 6.x) as a direct @timeoff/web dependency"
  - "tenantSessionRejectStatus returns 401|null only; no owner 403"
  - "mintTenantAccessToken puts company_id as a top-level HS256 claim, not user_metadata"

patterns-established:
  - "Wave 0 helpers are pure functions with colocated node:test files; no Vitest"
  - "Actor bind overwrites user_id/approver_id from session; body copies are ignored, not 400ed"
  - "PostgREST JWT mint uses jose SignJWT HS256 with 5m exp; never log secret or token"

requirements-completed: [AUTHZ-01, AUTHZ-02]

coverage:
  - id: D1
    description: tenantSessionRejectStatus returns 401 when userId or companyId is missing or empty; otherwise null
    requirement: AUTHZ-01
    verification:
      - kind: unit
        ref: apps/web/src/lib/require-tenant-session.test.ts#tenantSessionRejectStatus
        status: pass
      - kind: other
        ref: npm test --workspace=@timeoff/web
        status: pass
    human_judgment: false
  - id: D2
    description: bindLeaveCreateActor and bindLeaveApprover overwrite actor ids from the session; body copies are ignored
    requirement: AUTHZ-01
    verification:
      - kind: unit
        ref: apps/web/src/lib/bind-leave-actor.test.ts#bindLeaveCreateActor
        status: pass
      - kind: unit
        ref: apps/web/src/lib/bind-leave-actor.test.ts#bindLeaveApprover
        status: pass
    human_judgment: false
  - id: D3
    description: mintTenantAccessToken payload has role authenticated, sub equal to userId, company_id equal to companyId; jose pinned to 4.15.9
    requirement: AUTHZ-02
    verification:
      - kind: unit
        ref: apps/web/src/lib/supabase-jwt.test.ts#mintTenantAccessToken
        status: pass
      - kind: unit
        ref: apps/web/src/lib/supabase-jwt.test.ts#jose pin
        status: pass
    human_judgment: false
  - id: D4
    description: apps/web test script still runs all Phase 1 node:test files plus the three new Wave 0 files; no Vitest
    requirement: AUTHZ-01
    verification:
      - kind: other
        ref: npm test --workspace=@timeoff/web
        status: pass
    human_judgment: false

duration: 4min
completed: 2026-08-29
status: complete
---

# Phase 2 Plan 01: Wave 0 Session/Bind/JWT Unit Tests Summary

**Fail-closed tenant session mapper, session-bound leave actor bind, and HS256 mint via jose@4.15.9 unit-tested with node:test before any BFF route or RLS migration**

## Performance

- **Duration:** 4 min
- **Started:** 2026-08-29T13:14:32Z
- **Completed:** 2026-08-29T13:19:31Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments

- `tenantSessionRejectStatus` maps missing or empty userId/companyId to 401 and both present to null (no 403)
- `bindLeaveCreateActor` / `bindLeaveApprover` always set actor ids from the session argument; spoofed body ids are ignored
- `mintTenantAccessToken` signs HS256 JWTs with `role: authenticated`, `sub`, and top-level `company_id`; jose pinned to exact `4.15.9`
- Web `npm test` still runs every Phase 1 node:test file plus the three Wave 0 files (64 passing)

## Task Commits

Each TDD task produced RED then GREEN commits:

1. **Task 1 RED: tenant session reject status** - `1fdeb9c` (test)
2. **Task 1 GREEN: tenant session reject status** - `65135f0` (feat)
3. **Task 2 RED: bind leave actor from session** - `0557f8b` (test)
4. **Task 2 GREEN: bind leave actor from session** - `667d984` (feat)
5. **Task 3 RED: mint tenant access token** - `51c7066` (test)
6. **Task 3 GREEN: mint tenant access token with jose 4.15.9** - `72dc219` (feat)

## Files Created/Modified

- `apps/web/src/lib/require-tenant-session.ts` - Pure 401/null mapper for tenant BFF session gate
- `apps/web/src/lib/require-tenant-session.test.ts` - node:test coverage for missing/empty/null ids
- `apps/web/src/lib/bind-leave-actor.ts` - Overwrite `user_id` / `approver_id` from session
- `apps/web/src/lib/bind-leave-actor.test.ts` - Object-in/object-out bind tests
- `apps/web/src/lib/supabase-jwt.ts` - jose SignJWT HS256 mint; never logs secret or token
- `apps/web/src/lib/supabase-jwt.test.ts` - decodeJwt claim assertions plus jose pin
- `apps/web/package.json` - Exact `jose` `4.15.9`; test script lists all Wave 0 files

## Decisions Made

- Pin jose as exact `4.15.9` with `--save-exact` so `dependencies.jose` is not a caret range and cannot resolve 6.x
- `tenantSessionRejectStatus` returns `401 | null` only; owner-only 403 stays on `inviteOwnerRejectStatus`
- `company_id` is a top-level JWT claim minted server-side (not `user_metadata`); secret is passed in, not read from env in this plan

## Deviations from Plan

None - plan executed exactly as written.

**Total deviations:** 0 auto-fixed
**Impact on plan:** None

## TDD Gate Compliance

Plan type is `execute` with per-task `tdd="true"`. Each task has a `test(02-01)` RED commit followed by a `feat(02-01)` GREEN commit. No REFACTOR commits (implementations were already minimal).

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for 02-02 (session-gated create-leave tracer). Helpers are unit-tested; routes should call `getServerSession` then `tenantSessionRejectStatus`, bind actors, and mint JWT — no `getServerSession` in these files. AUTHZ-01/AUTHZ-02 remain incomplete at the requirement level until sibling plans finish (shared-ID gate).

## Self-Check: PASSED
