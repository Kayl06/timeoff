---
phase: 01-company-signup-and-invites
plan: 05
subsystem: auth
tags: [next-auth, invites, sha256, accept-invite, google]

requires:
  - phase: 01-company-signup-and-invites
    provides: hashInviteTokenHex VARCHAR(64), owner invite APIs, pending invite cookie, decideGoogleSignIn
provides:
  - GET /api/auth/invites/preview hashed token lookup
  - POST /api/auth/invites/accept credentials join
  - /auth/accept-invite Join company UI
  - Google pending-invite bind in auth.ts signIn
affects:
  - Phase 2 tenant RLS (join binding only this phase)

actuals:
  tokens: 9151
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - Preview/accept lookup company_invites.token_hash via hashInviteTokenHex (64 lowercase hex)
    - users.email and company_id on accept come from the invite row, never the JSON body
    - Google invite bind in auth.ts; decideGoogleSignIn still returns true for pendingInvite

key-files:
  created:
    - apps/web/src/lib/invite-accept.ts
    - apps/web/src/lib/invite-accept.test.ts
    - apps/web/src/app/api/auth/invites/preview/route.ts
    - apps/web/src/app/api/auth/invites/accept/route.ts
    - apps/web/src/app/auth/accept-invite/page.tsx
  modified:
    - apps/web/src/lib/validation.ts
    - apps/web/src/lib/auth.ts
    - apps/web/package.json

key-decisions:
  - "Accept/preview writes and reads use supabase in the route; IDatabaseService unchanged"
  - "Google invite bind runs in auth.ts signIn after decideGoogleSignIn allows pendingInvite"
  - "Credentials and Google inserts set users.email from invite.email only"

patterns-established:
  - "Invitee role is employee; company_id from companyIdFromInvite only"
  - "Email mismatch is a string redirect to /auth/accept-invite?error=mismatch, never boolean deny"

requirements-completed: [TENANT-03, TENANT-05]

coverage:
  - id: D1
    description: GET preview and POST credentials accept bind company_id and users.email from the invite row via hashInviteTokenHex
    requirement: TENANT-03
    verification:
      - kind: unit
        ref: apps/web/src/lib/invite-accept.test.ts#companyIdFromInvite
        status: pass
      - kind: unit
        ref: apps/web/src/lib/invite-accept.test.ts#inviteIsUsable
        status: pass
      - kind: other
        ref: npm test --workspace=@timeoff/web
        status: pass
    human_judgment: true
    rationale: Helpers are unit-tested; live 200/404/201/409 against Postgres need a real invite token
  - id: D2
    description: /auth/accept-invite Join company UI with no company picker, invalid/expired and mismatch copy
    requirement: TENANT-03
    verification:
      - kind: other
        ref: grep Join company, Show password, /api/auth/invites/preview, no select
        status: pass
    human_judgment: true
    rationale: Card chrome, spinner, and copy need a human opening a real invite link
  - id: D3
    description: Google join via pending invite cookie; mismatch redirects to accept-invite?error=mismatch
    requirement: TENANT-05
    verification:
      - kind: other
        ref: grep ACCEPT_INVITE_MISMATCH_PATH and pendingInvite bind in auth.ts
        status: pass
      - kind: other
        ref: npm test --workspace=@timeoff/web
        status: pass
    human_judgment: true
    rationale: Live Google OAuth with matching vs wrong account needs a human session

duration: 4min
completed: 2026-08-29
status: complete
---

# Phase 01 Plan 05: Invite Accept Summary

**Invitees join only the invite's company via hashed-token preview/accept APIs or Google pending-invite cookie; credentials never take email or company_id from the client**

## Performance

- **Duration:** 4 min
- **Started:** 2026-08-29T09:28:37Z
- **Completed:** 2026-08-29T09:32:25Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments

- `companyIdFromInvite` / `inviteIsUsable` bind join to `invite.company_id` and pending+unexpired status only
- `GET /api/auth/invites/preview` and `POST /api/auth/invites/accept` look up `token_hash` with `hashInviteTokenHex`; accept inserts `users.email` from `invite.email`, role `employee`, department/team `Unassigned`
- `/auth/accept-invite` clones signup Card chrome with **Join company** / **Joining...**, no company picker, invalid/expired and email-mismatch copy, Back to sign in
- Google `signIn` consumes the pending invite cookie, requires case-insensitive email match, inserts or allows only that company, and redirects mismatch to `/auth/accept-invite?error=mismatch`
- `npm test --workspace=@timeoff/web` exits 0 (29 tests)

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: Invite accept helper tests** - `614dec1` (test)
2. **Task 1 GREEN: Preview and credentials accept APIs** - `b116d1c` (feat)
3. **Task 2: Accept-invite page** - `811aed2` (feat)
4. **Task 3: Google pending-invite bind** - `a238c7d` (feat)

**Plan metadata:** this docs commit (`docs(01-05): complete invite accept plan`)

_Note: TDD tasks may have multiple commits (test → feat → refactor)_

## Files Created/Modified

- `apps/web/src/lib/invite-accept.ts` - `companyIdFromInvite`, `inviteIsUsable`
- `apps/web/src/lib/invite-accept.test.ts` - node:test for company id and usability
- `apps/web/src/lib/validation.ts` - `inviteAcceptSchema` / `InviteAcceptInput` (no email, no company id)
- `apps/web/src/app/api/auth/invites/preview/route.ts` - GET hashed preview `{ companyName, email }` or 404 `invalid_or_expired`
- `apps/web/src/app/api/auth/invites/accept/route.ts` - POST credentials accept, 409 if invite email already exists
- `apps/web/src/app/auth/accept-invite/page.tsx` - Join company UI, Google pending-context, mismatch Card
- `apps/web/src/lib/auth.ts` - Google invite bind; mismatch string redirect
- `apps/web/package.json` - includes `invite-accept.test.ts`

## Decisions Made

- Accept writes go through `supabase` in the route handler, matching signup and owner invites. `IDatabaseService` has no new methods.
- `decideGoogleSignIn` still returns `true` for `pendingInvite`; `auth.ts` performs the bind and email match.
- `users.email` is always `invite.email` on both credentials and Google insert paths.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Client password min 12 on accept-invite**
- **Found during:** Task 2
- **Issue:** Signup chrome validates 8 characters locally while `passwordSchema` / `inviteAcceptSchema` require 12; submitting at 8 would 400
- **Fix:** Enable Join company only when password length is at least 12 (widget copy still cloned from signup)
- **Files modified:** `apps/web/src/app/auth/accept-invite/page.tsx`
- **Verification:** grep `password.length >= 12`; `npm test --workspace=@timeoff/web` exits 0
- **Committed in:** `811aed2` (Task 2)

**2. [Rule 2 - Missing Critical] Google membership lookup by invite.email**
- **Found during:** Task 3
- **Issue:** Existing-user lookup used Google profile casing; a case-mismatched stored invite email could 23505 and bounce to InviteRequired
- **Fix:** After email match, also select `users` by `invite.email` before insert
- **Files modified:** `apps/web/src/lib/auth.ts`
- **Verification:** grep `memberByInviteEmail`; tests pass
- **Committed in:** `a238c7d` (Task 3)

**3. [Rule 2 - Missing Critical] Consume invite when Google user already in that company**
- **Found during:** Task 3
- **Issue:** Plan said return true for an existing member of that company but left the pending invite reusable
- **Fix:** Mark the invite accepted before clearing cookies
- **Files modified:** `apps/web/src/lib/auth.ts`
- **Verification:** grep accepted update in the existing-member branch
- **Committed in:** `a238c7d` (Task 3)

---

**Total deviations:** 3 auto-fixed (3 missing critical)
**Impact on plan:** Required for correct join and one-time invite consumption. No scope creep.

## Issues Encountered

None

## Authentication Gates

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 1 plans 01–05 are complete; ready for phase verification / next phase
- Join binding is application-layer only; Phase 2 still must close open RLS
- Live UAT (credentials join, invalid token copy, Google mismatch) needs a real invite link and OAuth
- Browser tools were not available in this executor; accept-invite was not clicked end-to-end

---
*Phase: 01-company-signup-and-invites*
*Completed: 2026-08-29*

## Self-Check: PASSED

- FOUND: apps/web/src/lib/invite-accept.ts
- FOUND: apps/web/src/lib/invite-accept.test.ts
- FOUND: apps/web/src/app/api/auth/invites/preview/route.ts
- FOUND: apps/web/src/app/api/auth/invites/accept/route.ts
- FOUND: apps/web/src/app/auth/accept-invite/page.tsx
- FOUND: 614dec1 test(01-05): add failing test for invite accept helpers
- FOUND: b116d1c feat(01-05): implement invite preview and credentials accept APIs
- FOUND: 811aed2 feat(01-05): add accept-invite page bound to invite company
- FOUND: a238c7d feat(01-05): bind Google sign-in to pending invite cookie
- FOUND: npm test --workspace=@timeoff/web exits 0 (29 tests)
