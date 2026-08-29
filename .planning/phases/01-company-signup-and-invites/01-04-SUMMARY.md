---
phase: 01-company-signup-and-invites
plan: 04
subsystem: auth
tags: [next-auth, invites, sha256, sonner, dialog]

requires:
  - phase: 01-company-signup-and-invites
    provides: session.user.isOwner, hashInviteTokenHex VARCHAR(64), companies.owner_id
provides:
  - GET/POST /api/auth/invites with getServerSession owner gate
  - inviteOwnerRejectStatus 401/403
  - InviteTeammatesDialog copy-link flow
  - Owner-only Invite teammates nav item
  - Dashboard empty copy when teammateCount is 0
affects:
  - 01-05 accept-invite lookup via hashInviteTokenHex

actuals:
  tokens: 5806
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - Invite APIs check getServerSession in the route (middleware excludes api/**)
    - token_hash stored as hashInviteTokenHex (64 lowercase hex), never bytea
    - Invite writes use supabase in the route, not IDatabaseService

key-files:
  created:
    - apps/web/src/lib/invite-auth.ts
    - apps/web/src/lib/invite-auth.test.ts
    - apps/web/src/app/api/auth/invites/route.ts
    - apps/web/src/components/invite-teammates-dialog.tsx
  modified:
    - apps/web/src/lib/validation.ts
    - apps/web/src/components/navigation.tsx
    - apps/web/src/components/dashboard/dashboard-view.tsx
    - apps/web/package.json

key-decisions:
  - "Invite writes stay on supabase in the route; IDatabaseService unchanged"
  - "invite-auth.ts imports ./company-owner.ts so Node 26 tests resolve the leaf module"

patterns-established:
  - "Owner invite APIs: getServerSession + inviteOwnerRejectStatus; company_id never from the client"
  - "Copy-link only; raw token returned once in acceptUrl, hash stored"

requirements-completed: [TENANT-02]

coverage:
  - id: D1
    description: GET/POST /api/auth/invites with getServerSession owner gate, hashed token_hash, company bound to owner
    requirement: TENANT-02
    verification:
      - kind: unit
        ref: apps/web/src/lib/invite-auth.test.ts#inviteOwnerRejectStatus
        status: pass
      - kind: other
        ref: npm test --workspace=@timeoff/web
        status: pass
    human_judgment: true
    rationale: Gate helper is unit-tested; live 201/409 and hashed insert need a signed-in owner session against Postgres
  - id: D2
    description: Invite teammates dialog and owner-only avatar menu item with copy-link
    requirement: TENANT-02
    verification:
      - kind: other
        ref: grep InviteTeammatesDialog, Invite teammates, sonner toast
        status: pass
    human_judgment: true
    rationale: Menu placement, copy-link, and stay-open after send need a human on the dashboard as owner and non-owner
  - id: D3
    description: Dashboard empty copy for owners with teammateCount === 0
    requirement: TENANT-02
    verification:
      - kind: other
        ref: grep dashboard-view.tsx No teammates yet
        status: pass
    human_judgment: true
    rationale: Empty copy visibility after session load needs a human signed in as a solo owner

duration: 4min
completed: 2026-08-29
status: complete
---

# Phase 01 Plan 04: Owner Invite APIs Summary

**Owner-only GET/POST /api/auth/invites store SHA-256 hex token_hash, return a copy-link acceptUrl, and expose Invite teammates from the avatar menu**

## Performance

- **Duration:** 4 min
- **Started:** 2026-08-29T09:22:40Z
- **Completed:** 2026-08-29T09:26:55Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments

- `inviteOwnerRejectStatus` maps missing session to 401 and non-owner to 403 with copy Only the company owner can invite teammates
- `GET`/`POST` `/api/auth/invites` use `getServerSession(authOptions)`; `company_id` is the owner's company only; POST body is email only
- `token_hash` is `hashInviteTokenHex` (64-char lowercase hex); raw token is returned once in `acceptUrl` and never stored or logged
- 409 when the email is already a user in the company or has a pending invite
- `InviteTeammatesDialog` copy-link flow with sonner toasts; nav item **Invite teammates** only when `session.user.isOwner`
- Dashboard empty heading **No teammates yet** for owners with `teammateCount === 0`; no `/(admin)/users` work
- `npm test --workspace=@timeoff/web` exits 0 (24 tests)

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: Invite owner reject status tests** - `a486229` (test)
2. **Task 1 GREEN: Owner invite create and list APIs** - `5abee7c` (feat)
3. **Task 2: Invite teammates dialog and nav item** - `764a996` (feat)
4. **Task 3: Dashboard empty copy for owners with no teammates** - `8bc921e` (feat)

**Plan metadata:** this docs commit (`docs(01-04): complete owner invite APIs plan`)

_Note: TDD tasks may have multiple commits (test → feat → refactor)_

## Files Created/Modified

- `apps/web/src/lib/invite-auth.ts` - `inviteOwnerRejectStatus` 401/403/null
- `apps/web/src/lib/invite-auth.test.ts` - node:test for missing session, non-owner, owner
- `apps/web/src/app/api/auth/invites/route.ts` - GET pending list + POST hashed invite
- `apps/web/src/lib/validation.ts` - `inviteEmailSchema` / `InviteEmailInput`
- `apps/web/src/components/invite-teammates-dialog.tsx` - owner dialog, copy link, pending list
- `apps/web/src/components/navigation.tsx` - Invite teammates between Settings and Log out
- `apps/web/src/components/dashboard/dashboard-view.tsx` - empty copy when teammateCount is 0
- `apps/web/package.json` - includes invite-auth.test.ts

## Decisions Made

- Invite inserts go through `supabase` in the route handler, matching signup. `IDatabaseService` has no new methods.
- `invite-auth.ts` imports `./company-owner.ts` (explicit `.ts`) so Node 26 `--experimental-strip-types` can resolve the dependency during tests.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Explicit `.ts` import for Node test runner**
- **Found during:** Task 1 GREEN
- **Issue:** `invite-auth.ts` importing `./company-owner` failed under `node --test --experimental-strip-types` (`ERR_MODULE_NOT_FOUND`)
- **Fix:** Import `./company-owner.ts` so the test runner can load the leaf module (same Node 26 ESM constraint as 01-01)
- **Files modified:** `apps/web/src/lib/invite-auth.ts`
- **Verification:** `npm test --workspace=@timeoff/web` exits 0
- **Committed in:** `5abee7c` (Task 1 GREEN)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Required for the TDD verify command. No scope creep.

## Issues Encountered

None

## Authentication Gates

None

## User Setup Required

None - no external service configuration required. Copy-link only; no mailer.

## Next Phase Readiness

- Ready for 01-05 (accept-invite): lookup `company_invites.token_hash` with `hashInviteTokenHex`; do not pass a Buffer
- `/auth/accept-invite` is not built in this plan; `acceptUrl` points there for 01-05
- Do not implement plan 05 in this wave
- Live UAT (owner send/copy, non-owner 403) needs a signed-in owner session

---
*Phase: 01-company-signup-and-invites*
*Completed: 2026-08-29*

## Self-Check: PASSED

- FOUND: apps/web/src/lib/invite-auth.ts
- FOUND: apps/web/src/lib/invite-auth.test.ts
- FOUND: apps/web/src/app/api/auth/invites/route.ts
- FOUND: apps/web/src/components/invite-teammates-dialog.tsx
- FOUND: .planning/phases/01-company-signup-and-invites/01-04-SUMMARY.md
- FOUND: a486229 test(01-04): add failing test for invite owner reject status
- FOUND: 5abee7c feat(01-04): implement owner invite create and list APIs
- FOUND: 764a996 feat(01-04): add invite teammates dialog and owner nav item
- FOUND: 8bc921e feat(01-04): show dashboard empty copy for owners with no teammates
- FOUND: npm test --workspace=@timeoff/web exits 0 (24 tests)
