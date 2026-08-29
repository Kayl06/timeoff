---
phase: 01-company-signup-and-invites
plan: 07
subsystem: auth
tags: [invites, 409, existing-email, gap-closure]

requires:
  - phase: 01-company-signup-and-invites
    provides: owner copy-link POST /api/auth/invites, inviteOwnerRejectStatus, same-company 409
provides:
  - inviteCreateConflict with ALREADY_IN_COMPANY_ERROR and EMAIL_EXISTS_ERROR
  - POST /api/auth/invites 409 on any existing users.email (global lookup)
  - Invite dialog shows API 409 string (other-company vs this-company)
affects:
  - Phase 1 UAT G-01-4 owner-create path
  - Plans 01-08 preview and 01-09 accept/Google remaining G-01-4

actuals:
  tokens: 1882
  tasks: 2
  commits: 4

tech-stack:
  added: []
  patterns:
    - inviteCreateConflict decides 409 copy; POST looks up users by email only
    - Other-company copy matches signup duplicate sentence; never returns other company name or id
    - Dialog uses payload.error when non-empty; ALREADY_IN_COMPANY_ERROR is fallback only

key-files:
  created: []
  modified:
    - apps/web/src/lib/invite-auth.ts
    - apps/web/src/lib/invite-auth.test.ts
    - apps/web/src/app/api/auth/invites/route.ts
    - apps/web/src/components/invite-teammates-dialog.tsx

key-decisions:
  - "POST users lookup is email-only; pending invites stay company-scoped"
  - "EMAIL_EXISTS_ERROR matches signup duplicate copy; never leak other company id"
  - "Did not drop users.email UNIQUE; closed the 201-unredeemable path instead"

patterns-established:
  - "invite-auth.ts owns invite 409 copy constants shared by POST and the dialog"
  - "409 JSON is { error } only — no acceptUrl on conflict"

requirements-completed: [TENANT-02]

coverage:
  - id: D1
    description: inviteCreateConflict returns this-company, other-company, pending, or null as specified
    requirement: TENANT-02
    verification:
      - kind: unit
        ref: apps/web/src/lib/invite-auth.test.ts#inviteCreateConflict
        status: pass
      - kind: other
        ref: npm test --workspace=@timeoff/web
        status: pass
    human_judgment: false
  - id: D2
    description: POST /api/auth/invites looks up users by email globally and 409s via inviteCreateConflict before insert
    requirement: TENANT-02
    verification:
      - kind: other
        ref: grep inviteCreateConflict and users select id, company_id without company_id eq on POST lookup in invites/route.ts
        status: pass
      - kind: other
        ref: npm test --workspace=@timeoff/web
        status: pass
    human_judgment: false
  - id: D3
    description: Invite teammates dialog shows API 409 payload.error inline (distinct other-company vs this-company copy)
    requirement: TENANT-02
    verification:
      - kind: other
        ref: grep payload.error then ALREADY_IN_COMPANY_ERROR fallback in invite-teammates-dialog.tsx
        status: pass
    human_judgment: true
    rationale: Owner-visible other-company vs this-company copy on Invite teammates needs a human on the dashboard dialog

duration: 2min
completed: 2026-08-29
status: complete
---

# Phase 1 Plan 07: Invite 409 on globally existing email Summary

**POST /api/auth/invites now 409s on any existing `users.email` (not only same-company), with distinct this-company vs other-company copy, and the invite dialog shows that string inline.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-08-29T11:24:27Z
- **Completed:** 2026-08-29T11:26:29Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- `inviteCreateConflict` returns `ALREADY_IN_COMPANY_ERROR` for same-company members and pending invites, `EMAIL_EXISTS_ERROR` for another company's user, and `null` when the email is free
- POST looks up `users` by email only (`select id, company_id`, no `company_id` filter); pending invite lookup stays company-scoped; conflict returns `{ error }` 409 with no `acceptUrl`
- Invite teammates dialog sets `emailError` from `payload.error` when it is a non-empty string; fallback is imported `ALREADY_IN_COMPANY_ERROR`
- `users.email` UNIQUE kept; admin users page and dashboard chrome untouched

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: POST invite 409s any existing users.email** - `fbca0ba` (test)
2. **Task 1 GREEN: POST invite 409s any existing users.email** - `8bf40f0` (feat)
3. **Task 2: Dialog shows distinct 409 copy** - `94b7ff4` (feat)

**Plan metadata:** (this commit)

_Note: TDD tasks may have multiple commits (test → feat → refactor)_

## TDD Gate Compliance

- RED: `fbca0ba` `test(01-07): add failing test for invite create conflict` — failed with missing export `ALREADY_IN_COMPANY_ERROR`
- GREEN: `8bf40f0` `feat(01-07): 409 invite create on any existing email` — `npm test --workspace=@timeoff/web` 44 pass / 0 fail
- REFACTOR: skipped (implementation stayed minimal)

## Files Created/Modified

- `apps/web/src/lib/invite-auth.ts` - `inviteCreateConflict` plus shared 409 copy constants
- `apps/web/src/lib/invite-auth.test.ts` - node:test for same-company, other-company, pending, none, and combined 409
- `apps/web/src/app/api/auth/invites/route.ts` - Global users.email lookup on POST; calls `inviteCreateConflict`
- `apps/web/src/components/invite-teammates-dialog.tsx` - Inline 409 uses API `payload.error`

## Decisions Made

- POST users lookup is email-only; pending invites stay company-scoped
- `EMAIL_EXISTS_ERROR` matches signup duplicate copy so enumeration is not a new signal; never return the other company name or id
- Did not drop `users.email` UNIQUE; closed the 201-unredeemable path instead

## Deviations from Plan

None - plan executed exactly as written.

**Total deviations:** 0 auto-fixed
**Impact on plan:** None

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- G-01-4 owner-create path closed in code: no 201 copy-link for a globally existing email
- Ready for 01-08 (preview existing-account before join form) and 01-09 (atomic accept + Google existing-account copy)
- Visual UAT of distinct 409 copy on Invite teammates remains an end-of-phase human check

---
*Phase: 01-company-signup-and-invites*
*Completed: 2026-08-29*

## Self-Check: PASSED
