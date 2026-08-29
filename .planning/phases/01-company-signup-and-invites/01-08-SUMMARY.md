---
phase: 01-company-signup-and-invites
plan: 08
subsystem: auth
tags: [invites, preview, existing-email, gap-closure]

requires:
  - phase: 01-company-signup-and-invites
    provides: EMAIL_EXISTS_ERROR, inviteIsUsable, GET /api/auth/invites/preview, accept-invite Join UI
provides:
  - invitePreviewPageState invalid/exists/ready
  - GET /api/auth/invites/preview 409 EMAIL_EXISTS_ERROR when users.email exists
  - accept-invite existing-account card before the join form
affects:
  - Phase 1 UAT G-01-4 accept-page path
  - Plan 01-09 atomic accept and Google existing-account copy

actuals:
  tokens: 1791
  tasks: 2
  commits: 4

tech-stack:
  added: []
  patterns:
    - invitePreviewPageState maps usable + existingUser after usability, never Join-ready for an existing email
    - Preview looks up users by invite.email only after inviteIsUsable; 409 JSON is { error } with EMAIL_EXISTS_ERROR
    - Accept-invite 409 (non-mismatch) is an exists card, not toast-only

key-files:
  created: []
  modified:
    - apps/web/src/lib/invite-accept.ts
    - apps/web/src/lib/invite-accept.test.ts
    - apps/web/src/app/api/auth/invites/preview/route.ts
    - apps/web/src/app/auth/accept-invite/page.tsx

key-decisions:
  - "Preview users lookup is email-only after usability; select id so company_id never enters JSON"
  - "Reused EMAIL_EXISTS_ERROR from invite-auth; 409 never leaks other company identity"
  - "Credentials accept 409 (not mismatch) sets exists; sonner toast without a second Toaster"

patterns-established:
  - "invitePreviewPageState owns invalid/exists/ready; unusable invites stay invalid even if a users row exists"
  - "Preview 409 copy matches signup/accept duplicate sentence"

requirements-completed: [TENANT-03]

coverage:
  - id: D1
    description: invitePreviewPageState returns invalid/exists/ready; GET preview queries users by invite.email and 409s with EMAIL_EXISTS_ERROR
    requirement: TENANT-03
    verification:
      - kind: unit
        ref: apps/web/src/lib/invite-accept.test.ts#invitePreviewPageState
        status: pass
      - kind: other
        ref: grep from('users') and EMAIL_EXISTS_ERROR 409 in preview/route.ts
        status: pass
      - kind: other
        ref: npm test --workspace=@timeoff/web
        status: pass
    human_judgment: false
  - id: D2
    description: /auth/accept-invite shows existing-account card (EMAIL_EXISTS_ERROR + Back to sign in) instead of Join {company} on preview/accept 409
    requirement: TENANT-03
    verification:
      - kind: other
        ref: grep PageState exists, loadPreview 409, EMAIL_EXISTS_ERROR, toast from sonner in accept-invite/page.tsx
        status: pass
      - kind: other
        ref: npm test --workspace=@timeoff/web
        status: pass
    human_judgment: true
    rationale: Existing-account card vs Join {company} on a live leftover token needs a human opening a real invite link

duration: 2min
completed: 2026-08-29
status: complete
---

# Phase 1 Plan 08: Preview existing-account before join form Summary

**GET preview 409s with EMAIL_EXISTS_ERROR when invite.email already has a users row, and /auth/accept-invite shows that existing-account card instead of Join {company}.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-08-29T11:28:50Z
- **Completed:** 2026-08-29T11:30:36Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- `invitePreviewPageState` returns `invalid` when not usable, `exists` when usable and a users row exists, `ready` when usable and the email is free
- GET `/api/auth/invites/preview` looks up `users` by `invite.email` only after `inviteIsUsable` and company name resolve; existing row returns `{ error: EMAIL_EXISTS_ERROR }` 409 with no `company_id`
- Accept-invite `PageState` includes `exists`; preview HTTP 409 and query `error=exists` show `InviteStatusCard` with `EMAIL_EXISTS_ERROR` and Back to sign in; join form only when `ready`
- Credentials accept 409 that is not mismatch sets `exists` (not toast-only); 400 `details` merge onto name/password field errors; toasts import `sonner` without a second toaster

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: Preview 409 when invite email already exists** - `a0237d4` (test)
2. **Task 1 GREEN: Preview 409 when invite email already exists** - `4e57a6a` (feat)
3. **Task 2: Accept-invite existing-account card** - `9ed5783` (feat)

**Plan metadata:** (this commit)

_Note: TDD tasks may have multiple commits (test → feat → refactor)_

## TDD Gate Compliance

- RED: `a0237d4` `test(01-08): add failing test for invite preview page state` — failed with missing export `invitePreviewPageState`
- GREEN: `4e57a6a` `feat(01-08): 409 preview when invite email already exists` — `npm test --workspace=@timeoff/web` 47 pass / 0 fail
- REFACTOR: skipped (implementation stayed minimal)

## Files Created/Modified

- `apps/web/src/lib/invite-accept.ts` - `invitePreviewPageState` after usability + existing email
- `apps/web/src/lib/invite-accept.test.ts` - node:test for invalid, exists, and ready
- `apps/web/src/app/api/auth/invites/preview/route.ts` - users.email lookup; 409 `EMAIL_EXISTS_ERROR`
- `apps/web/src/app/auth/accept-invite/page.tsx` - exists pageState, existing-account card, sonner toast

## Decisions Made

- Preview users lookup is email-only after usability; select `id` so `company_id` never enters JSON
- Reused `EMAIL_EXISTS_ERROR` from invite-auth; 409 never leaks other company identity
- Credentials accept 409 (not mismatch) sets exists; sonner toast without a second Toaster

## Deviations from Plan

None - plan executed exactly as written.

**Total deviations:** 0 auto-fixed
**Impact on plan:** None

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- G-01-4 preview/UI path closed in code: leftover tokens for an existing email show the existing-account card before Join
- Ready for 01-09 (atomic accept + Google existing-account copy)
- Visual UAT of the exists card vs Join {company} remains an end-of-phase human check

---
*Phase: 01-company-signup-and-invites*
*Completed: 2026-08-29*

## Self-Check: PASSED
