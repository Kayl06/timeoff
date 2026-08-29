---
phase: 01-company-signup-and-invites
plan: 03
subsystem: auth
tags: [next-auth, google-oauth, cookies, zod, tenant]

requires:
  - phase: 01-company-signup-and-invites
    provides: decideGoogleSignIn, INVITE_REQUIRED_PATH, create_company_with_owner, buildCreateCompanyWithOwnerArgs
provides:
  - httpOnly pending company/invite cookies (timeoff_pending_kind / timeoff_pending_value, maxAge 600)
  - POST /api/auth/pending-context
  - Google signIn default-deny via decideGoogleSignIn string redirect InviteRequired
  - Google create-company via same RPC with passwordHash null
  - Session.user companyId and isOwner
  - Invite required error card
  - Sign-in footer Create a company
affects:
  - 01-04 owner invite APIs (isOwner on session)
  - 01-05 accept-invite Google bind (pending invite cookie + signIn override)

actuals:
  tokens: 4844
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - Pending Google context via httpOnly cookies, not OAuth state
    - NextAuth signIn returns INVITE_REQUIRED_PATH string, never false

key-files:
  created:
    - apps/web/src/lib/pending-auth-cookie.ts
    - apps/web/src/lib/pending-context-schema.test.ts
    - apps/web/src/app/api/auth/pending-context/route.ts
  modified:
    - apps/web/src/lib/validation.ts
    - apps/web/src/lib/auth.ts
    - apps/web/src/types/next-auth.d.ts
    - apps/web/src/lib/supabase.ts
    - apps/web/src/app/auth/error/page.tsx
    - apps/web/src/app/auth/signin/page.tsx
    - apps/web/src/app/auth/signup/page.tsx
    - apps/web/package.json

key-decisions:
  - "Deny-until-01-05: pending invite + unknown Google returns InviteRequired (no global employee insert)"
  - "Pending context uses cookies().set without await (Next 14); company name never in authorizationParams"

patterns-established:
  - "Google extra data rides timeoff_pending_kind + timeoff_pending_value httpOnly cookies (10 min, SameSite lax)"
  - "Unknown Google sign-in returns '/auth/error?error=InviteRequired' not false"
  - "Google create-company uses buildCreateCompanyWithOwnerArgs with passwordHash: null"

requirements-completed: [TENANT-05, TENANT-01]

coverage:
  - id: D1
    description: pendingContextSchema and POST /api/auth/pending-context set httpOnly pending cookies for company name or invite token
    requirement: TENANT-05
    verification:
      - kind: unit
        ref: apps/web/src/lib/pending-context-schema.test.ts#pendingContextSchema
        status: pass
    human_judgment: true
    rationale: Schema tests pass; httpOnly Set-Cookie and 204 POST are not asserted in node:test
  - id: D2
    description: Unknown Google without pending cookies returns INVITE_REQUIRED_PATH; no missing-user insert; existing email does not create a second company
    requirement: TENANT-05
    verification:
      - kind: unit
        ref: apps/web/src/lib/google-signin-gate.test.ts#decideGoogleSignIn
        status: pass
      - kind: other
        ref: grep auth.ts INVITE_REQUIRED_PATH and passwordHash: null
        status: pass
    human_judgment: true
    rationale: Live Google OAuth round trip needs GOOGLE_CLIENT_ID/SECRET and a real Google account
  - id: D3
    description: Invite required error card — heading, description, Create a company, Back to sign in
    requirement: TENANT-05
    verification: []
    human_judgment: true
    rationale: Copy and both actions must be judged on /auth/error?error=InviteRequired
  - id: D4
    description: Session.user includes companyId and isOwner after credentials or Google success
    requirement: TENANT-01
    verification: []
    human_judgment: true
    rationale: JWT/session mapping is coded; no automated session assertion in this plan
  - id: D5
    description: Sign-in footer Create a company; signup Google POSTs pending-context after company name gate
    requirement: TENANT-01
    verification:
      - kind: other
        ref: grep signin Create a company; grep signup /api/auth/pending-context
        status: pass
    human_judgment: true
    rationale: UI-SPEC copy, loading state, and Google blocked toast need a human on /auth/signin and /auth/signup

duration: 4min
completed: 2026-08-29
status: complete
---

# Phase 01 Plan 03: Google Sign-In Gate Summary

**Unknown Google on sign-in redirects to Invite required; signup Google sets httpOnly pending company cookies then create_company_with_owner with p_password null**

## Performance

- **Duration:** 4 min
- **Started:** 2026-08-29T09:16:41Z
- **Completed:** 2026-08-29T09:20:38Z
- **Tasks:** 3
- **Files modified:** 11

## Accomplishments

- Pending Google context via `timeoff_pending_kind` / `timeoff_pending_value` httpOnly cookies (maxAge 600, SameSite lax, path `/`)
- `POST /api/auth/pending-context` validates with `pendingContextSchema` and returns 204 or 400
- Google `signIn` uses `decideGoogleSignIn`; unknown email with no pending cookies returns `/auth/error?error=InviteRequired` (never `false`); removed global employee insert
- Google create-company calls `create_company_with_owner` with `passwordHash: null`; existing matching email is allowed and does not create a second company
- Invite required error card plus sign-in footer **Create a company**; signup Google requires company name then POSTs pending-context
- Session/JWT `companyId` and `isOwner` from `users.company_id` and `companies.owner_id`
- `npm test --workspace=@timeoff/web` exits 0 (20 tests)

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: Pending Google context schema tests** - `011686c` (test)
2. **Task 1 GREEN: Pending Google context httpOnly cookies** - `49a9374` (feat)
3. **Task 2: Wire decideGoogleSignIn and Invite required page** - `586f98f` (feat)
4. **Task 3: Sign-in footer and signup Google company-name gate** - `45f0d5a` (feat)

**Plan metadata:** this docs commit (`docs(01-03): complete google sign-in gate plan`)

_Note: TDD tasks may have multiple commits (test → feat → refactor)_

## Files Created/Modified

- `apps/web/src/lib/pending-auth-cookie.ts` - Cookie names, maxAge 600, sync read/set/clear helpers
- `apps/web/src/lib/pending-context-schema.test.ts` - node:test for `pendingContextSchema`
- `apps/web/src/app/api/auth/pending-context/route.ts` - POST sets httpOnly cookies
- `apps/web/src/lib/validation.ts` - `pendingContextSchema` discriminated union
- `apps/web/src/lib/auth.ts` - Google gate, RPC create-company, session tenant fields
- `apps/web/src/types/next-auth.d.ts` - `companyId` and `isOwner` on Session/User/JWT
- `apps/web/src/lib/supabase.ts` - `company_id` ↔ `companyId` mapping
- `apps/web/src/app/auth/error/page.tsx` - `InviteRequired` branch
- `apps/web/src/app/auth/signin/page.tsx` - Create a company footer
- `apps/web/src/app/auth/signup/page.tsx` - Google pending-context POST
- `apps/web/package.json` - includes pending-context-schema test

## Decisions Made

- **Deny-until-01-05:** `decideGoogleSignIn` still returns `true` for `pendingInvite`, but `auth.ts` overrides unknown Google + invite cookie to `INVITE_REQUIRED_PATH` so 01-03 does not insert a global employee. 01-05 owns accept-bind.
- Pending context uses Next 14 sync `cookies().set` (no `await`); company name is never passed via `authorizationParams` or OAuth `state`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Sign-in empty-state and long-email must-haves**
- **Found during:** Task 3 (sign-in footer)
- **Issue:** Plan must-haves require Sign in disabled until both fields have values, and long emails scroll inside the input. Shipped sign-in only disabled on `isLoading` and had no overflow on the email field.
- **Fix:** Disable submit until email and password are non-empty; add `overflow-x-auto whitespace-nowrap` on the email input.
- **Files modified:** `apps/web/src/app/auth/signin/page.tsx`
- **Verification:** Footer grep; tests still pass
- **Committed in:** `45f0d5a` (Task 3)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Required for UI-SPEC E2 empty/long-text on the page this task already edited. No scope creep.

## Issues Encountered

None

## Authentication Gates

None during this plan. Google OAuth client env is unset; live Google button is blocked until [01-USER-SETUP.md](./01-USER-SETUP.md).

## User Setup Required

**External services require manual configuration.** See [01-USER-SETUP.md](./01-USER-SETUP.md) for:

- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
- Authorized redirect URI `{NEXTAUTH_URL}/api/auth/callback/google`

Hosted Supabase still needs the companies migration from 01-02 if `.env.local` points at the remote project.

## Next Phase Readiness

- Ready for 01-04 (owner invite APIs) using `session.user.isOwner` / `companyId`
- 01-05 must replace the pending-invite deny branch in `auth.ts` with accept-bind
- Do not implement plans 04–05 in this wave
- Live Google UAT waits on USER-SETUP credentials

---
*Phase: 01-company-signup-and-invites*
*Completed: 2026-08-29*

## Self-Check: PASSED

- FOUND: apps/web/src/lib/pending-auth-cookie.ts
- FOUND: apps/web/src/app/api/auth/pending-context/route.ts
- FOUND: apps/web/src/lib/pending-context-schema.test.ts
- FOUND: .planning/phases/01-company-signup-and-invites/01-03-SUMMARY.md
- FOUND: 011686c test(01-03): add failing test for pending Google context schema
- FOUND: 49a9374 feat(01-03): implement pending Google context httpOnly cookies
- FOUND: 586f98f feat(01-03): gate Google sign-in and add Invite required
- FOUND: 45f0d5a feat(01-03): restore create-company footer and Google cookie gate
- FOUND: npm test --workspace=@timeoff/web exits 0 (20 tests)
