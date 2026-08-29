---
phase: 01-company-signup-and-invites
plan: 01
subsystem: auth
tags: [node:test, node:crypto, sha256, next-auth, tenant]

requires: []
provides:
  - generateInviteToken / hashInviteToken / hashInviteTokenHex / inviteTokenMatches
  - decideGoogleSignIn + INVITE_REQUIRED_PATH
  - isCompanyOwner
  - apps/web npm test script (node:test + experimental-strip-types)
affects:
  - 01-02 company schema and signup
  - 01-03 NextAuth Google signIn wiring
  - 01-04 invite APIs
  - 01-05 accept-invite lookup

actuals:
  tokens: 2191
  tasks: 3
  commits: 7

tech-stack:
  added: []
  patterns:
    - node:test + node:assert/strict with --experimental-strip-types
    - Pure lib helpers analog to date-utils.ts (kebab-case, named exports, file-level JSDoc)

key-files:
  created:
    - apps/web/src/lib/invite-token.ts
    - apps/web/src/lib/invite-token.test.ts
    - apps/web/src/lib/google-signin-gate.ts
    - apps/web/src/lib/google-signin-gate.test.ts
    - apps/web/src/lib/company-owner.ts
    - apps/web/src/lib/company-owner.test.ts
  modified:
    - apps/web/package.json

key-decisions:
  - "Did not set package.json type:module; Next configs stay CJS and Node 26 re-parses TS tests as ESM with a warning"
  - "hashInviteTokenHex is the only persistence form for company_invites.token_hash (64 lowercase hex)"

patterns-established:
  - "Wave 0 helpers are pure functions with colocated node:test files; no vitest/tsx"
  - "Google deny path is a string URL (/auth/error?error=InviteRequired), never boolean false"

requirements-completed: [TENANT-01, TENANT-05]

coverage:
  - id: D1
    description: Invite token helpers (CSPRNG 64-hex, SHA-256 digest, hex storage form, timingSafeEqual match)
    requirement: TENANT-01
    verification:
      - kind: unit
        ref: apps/web/src/lib/invite-token.test.ts#generateInviteToken
        status: pass
      - kind: unit
        ref: apps/web/src/lib/invite-token.test.ts#hashInviteToken
        status: pass
      - kind: unit
        ref: apps/web/src/lib/invite-token.test.ts#hashInviteTokenHex
        status: pass
      - kind: unit
        ref: apps/web/src/lib/invite-token.test.ts#inviteTokenMatches
        status: pass
    human_judgment: false
  - id: D2
    description: decideGoogleSignIn allows existing user / pending company / pending invite; otherwise InviteRequired URL
    requirement: TENANT-05
    verification:
      - kind: unit
        ref: apps/web/src/lib/google-signin-gate.test.ts#decideGoogleSignIn
        status: pass
      - kind: unit
        ref: apps/web/src/lib/google-signin-gate.test.ts#INVITE_REQUIRED_PATH
        status: pass
    human_judgment: false
  - id: D3
    description: isCompanyOwner true only when both ids are non-empty and equal
    requirement: TENANT-01
    verification:
      - kind: unit
        ref: apps/web/src/lib/company-owner.test.ts#isCompanyOwner
        status: pass
    human_judgment: false
  - id: D4
    description: apps/web test script runs node:test with experimental-strip-types on all three Wave 0 files
    verification:
      - kind: other
        ref: npm test --workspace=@timeoff/web
        status: pass
    human_judgment: false

duration: 2min
completed: 2026-08-29
status: complete
---

# Phase 1 Plan 01: Wave 0 Nyquist Helpers Summary

**SHA-256 invite tokens, TENANT-05 Google deny-by-default gate, and owner_id equality predicate with node:test on @timeoff/web**

## Performance

- **Duration:** 2 min
- **Started:** 2026-08-29T08:26:36Z
- **Completed:** 2026-08-29T08:28:32Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments
- Invite tokens are 32-byte CSPRNG hex; at rest they are SHA-256, compared with timingSafeEqual, stored as 64-char lowercase hex
- Google sign-in gate returns true for existing user, pending company, or pending invite; otherwise `/auth/error?error=InviteRequired`
- `isCompanyOwner` is true only when both ids are non-empty and equal
- `npm test --workspace=@timeoff/web` runs all three Wave 0 files (13 passing)

## Task Commits

Each task was committed atomically (TDD RED then GREEN):

1. **Task 1 RED: failing invite-token tests** - `4db191c` (test)
2. **Task 1 GREEN: invite token helpers** - `b51507f` (feat)
3. **Task 2 RED: failing Google sign-in gate tests** - `a350936` (test)
4. **Task 2 GREEN: Google sign-in gate** - `35e2746` (feat)
5. **Task 3 RED: failing company-owner tests** - `ce4b67b` (test)
6. **Task 3 GREEN: company owner predicate** - `2c46dd6` (feat)

**Plan metadata:** `c1794f5` (docs: complete plan)

_Note: TDD tasks have multiple commits (test → feat)_

## Files Created/Modified
- `apps/web/src/lib/invite-token.ts` - generateInviteToken, hashInviteToken, hashInviteTokenHex, inviteTokenMatches
- `apps/web/src/lib/invite-token.test.ts` - node:test coverage for token helpers
- `apps/web/src/lib/google-signin-gate.ts` - decideGoogleSignIn + INVITE_REQUIRED_PATH
- `apps/web/src/lib/google-signin-gate.test.ts` - existing user, pending company, pending invite, deny URL
- `apps/web/src/lib/company-owner.ts` - isCompanyOwner
- `apps/web/src/lib/company-owner.test.ts` - equal, mismatch, empty pair, empty ownerId
- `apps/web/package.json` - test script listing all three Wave 0 files

## Decisions Made
- Left `apps/web/package.json` without `"type": "module"` so Next.js CJS configs stay valid; Node 26 re-parses the TS tests as ESM and emits MODULE_TYPELESS_PACKAGE_JSON (non-fatal)
- `hashInviteTokenHex` is the only form later plans store or look up in `company_invites.token_hash`

## Deviations from Plan

None - plan executed exactly as written.

---

**Total deviations:** 0 auto-fixed
**Impact on plan:** None

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
Ready for 01-02 (companies schema + signup RPC). Helpers are unwired; 01-03 must call `decideGoogleSignIn` before any Google insert. TENANT-01 and TENANT-05 remain shared with later plans and must not be marked complete until those plans ship.

## Self-Check: PASSED

- FOUND: apps/web/src/lib/invite-token.ts
- FOUND: apps/web/src/lib/invite-token.test.ts
- FOUND: apps/web/src/lib/google-signin-gate.ts
- FOUND: apps/web/src/lib/google-signin-gate.test.ts
- FOUND: apps/web/src/lib/company-owner.ts
- FOUND: apps/web/src/lib/company-owner.test.ts
- FOUND: 4db191c, b51507f, a350936, 35e2746, ce4b67b, 2c46dd6
- `npm test --workspace=@timeoff/web` exits 0 (13 pass)

---
*Phase: 01-company-signup-and-invites*
*Completed: 2026-08-29*
