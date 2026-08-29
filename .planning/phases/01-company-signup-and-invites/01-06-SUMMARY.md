---
phase: 01-company-signup-and-invites
plan: 06
subsystem: auth
tags: [signup, password, sonner, validation, gap-closure]

requires:
  - phase: 01-company-signup-and-invites
    provides: userRegistrationSchema / passwordSchema (min 12 + composition), POST /api/auth/signup 400 details, Sonner in SessionProvider
provides:
  - Client password checks aligned to PASSWORD_REQUIREMENTS
  - Visible signup field errors from 400 details
  - sonner toasts on /auth/signup
affects:
  - Phase 1 UAT G-01-1 closed for credentials create-company

actuals:
  tokens: 2516
  tasks: 2
  commits: 3

tech-stack:
  added: []
  patterns:
    - Client password UX gates on PASSWORD_REQUIREMENTS; API passwordSchema stays source of truth
    - 400 details copied onto errors.* via mergeSignupFieldErrors; sonner toast.error only when details empty
    - Signup toasts import from sonner (SessionProvider already mounts Sonner)

key-files:
  created:
    - apps/web/src/lib/password-client.ts
    - apps/web/src/lib/password-client.test.ts
  modified:
    - apps/web/src/app/auth/signup/page.tsx
    - apps/web/package.json

key-decisions:
  - "Client helpers re-check PASSWORD_REQUIREMENTS in schema order; passwordSchema stays unexported"
  - "400 details win on field errors; toast.error is fallback only when details is missing or empty"
  - "Google OAuth env is not required for credentials signup"

patterns-established:
  - "password-client.ts imports ./validation.ts with .ts suffix for Node 26 tests"
  - "Signup Create company stays disabled until passwordMeetsApiRules plus name/email/confirm/terms"

requirements-completed: [TENANT-01]

coverage:
  - id: D1
    description: Client passwordMeetsApiRules / firstPasswordError / passwordRequirementItems match PASSWORD_REQUIREMENTS (min 12 + composition)
    requirement: TENANT-01
    verification:
      - kind: unit
        ref: apps/web/src/lib/password-client.test.ts#passwordMeetsApiRules
        status: pass
      - kind: unit
        ref: apps/web/src/lib/password-client.test.ts#firstPasswordError
        status: pass
      - kind: unit
        ref: apps/web/src/lib/password-client.test.ts#passwordRequirementItems
        status: pass
      - kind: other
        ref: npm test --workspace=@timeoff/web
        status: pass
    human_judgment: false
  - id: D2
    description: /auth/signup maps 400 details onto field errors, gates Create company on passwordMeetsApiRules, and uses sonner
    requirement: TENANT-01
    verification:
      - kind: unit
        ref: apps/web/src/lib/password-client.test.ts#mergeSignupFieldErrors
        status: pass
      - kind: other
        ref: grep passwordMeetsApiRules, mergeSignupFieldErrors, from 'sonner', data.details in signup/page.tsx
        status: pass
    human_judgment: true
    rationale: 8-character and composition-miss UX on Create company needs a human on /auth/signup
  - id: D3
    description: Duplicate-email 409 still sets DUPLICATE_EMAIL_COPY; handleGoogleSignUp does not read GOOGLE_CLIENT_ID
    requirement: TENANT-01
    verification:
      - kind: other
        ref: grep DUPLICATE_EMAIL_COPY and absent GOOGLE_CLIENT_ID in signup/page.tsx
        status: pass
      - kind: other
        ref: npm test --workspace=@timeoff/web
        status: pass
    human_judgment: false

duration: 2min
completed: 2026-08-29
status: complete
---

# Phase 1 Plan 06: Signup password validation visibility Summary

**Signup client now matches API passwordSchema (min 12 + composition), maps 400 `details` onto field errors, and toasts via sonner so G-01-1 is no longer a silent 400.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-08-29T11:20:15Z
- **Completed:** 2026-08-29T11:22:13Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- `password-client` helpers reject `short8!!` and `abcdefghijkl`, accept `Abcdefghij1!`, and copy 400 `details` onto field errors
- `/auth/signup` uses `firstPasswordError` / `passwordMeetsApiRules` / `passwordRequirementItems`; Create company stays disabled until API-equivalent rules pass
- Failed POST maps `data.details` onto `errors.*`; `toast.error` only when details is missing or empty; success still reads `Company created. Sign in with your new credentials.`
- Duplicate-email 409 and Google-without-env paths unchanged; session-provider and signup route untouched

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: End-to-end signup password rejection is visible** - `3846bf1` (test)
2. **Task 1 GREEN: End-to-end signup password rejection is visible** - `fee424f` (feat)
3. **Task 2: Keep duplicate-email and Google-without-env paths intact** - verification only (no extra commit)

**Plan metadata:** (this commit)

_Note: TDD tasks may have multiple commits (test → feat → refactor)_

## TDD Gate Compliance

- RED: `3846bf1` `test(01-06): add failing test for signup password client rules` — failed with `ERR_MODULE_NOT_FOUND` for `password-client.ts`
- GREEN: `fee424f` `feat(01-06): align signup password checks with API rules` — `npm test --workspace=@timeoff/web` 39 pass / 0 fail
- REFACTOR: skipped (implementation stayed minimal)

## Files Created/Modified

- `apps/web/src/lib/password-client.ts` - Client checks aligned to PASSWORD_REQUIREMENTS
- `apps/web/src/lib/password-client.test.ts` - node:test coverage for length, composition, checklist, 400 merge
- `apps/web/src/app/auth/signup/page.tsx` - Visible password validation, details mapping, sonner
- `apps/web/package.json` - Includes `password-client.test.ts` in the web test script

## Decisions Made

- Client helpers re-check PASSWORD_REQUIREMENTS in schema order rather than exporting `passwordSchema` (it is not a public export)
- 400 `details` win on field errors; generic `data.error` toast is fallback only
- Google OAuth env is not required; `handleGoogleSignUp` still only needs a non-empty company name

## Deviations from Plan

None - plan executed exactly as written.

**Total deviations:** 0 auto-fixed
**Impact on plan:** None

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- G-01-1 closed in code: invalid passwords cannot submit Create company and 400 details show on the password field
- Ready for remaining Phase 1 gap-closure plans 01-07–01-09
- Visual UAT of the 8-character / composition checklist remains an end-of-phase human check

---
*Phase: 01-company-signup-and-invites*
*Completed: 2026-08-29*

## Self-Check: PASSED
