---
phase: 01-company-signup-and-invites
plan: 09
subsystem: auth
tags: [invites, rpc, google, account-exists, gap-closure]

requires:
  - phase: 01-company-signup-and-invites
    provides: create_company_with_owner, buildCreateCompanyWithOwnerArgs, EMAIL_EXISTS_ERROR, decideGoogleSignIn, INVITE_REQUIRED_PATH, credentials accept route
provides:
  - accept_invite_with_employee RPC (nullable p_password, not STRICT)
  - buildAcceptInviteWithEmployeeArgs always includes p_password
  - ACCOUNT_EXISTS_PATH /auth/error?error=AccountExists
  - Credentials and Google join via one atomic RPC
affects:
  - Phase 1 UAT G-01-4 remaining bind
  - Phase 2 RLS (RPC still granted to anon)

actuals:
  tokens: 3597
  tasks: 3
  commits: 5

tech-stack:
  added: []
  patterns:
    - accept_invite_with_employee inserts employee then UPDATE ... WHERE status = pending; IF NOT FOUND RAISE rolls back
    - buildAcceptInviteWithEmployeeArgs always includes p_password (hash or null), same as create-company
    - Google other-company and 23505 use ACCOUNT_EXISTS_PATH; unknown Google stays INVITE_REQUIRED_PATH

key-files:
  created:
    - packages/database/migrations/20250818193734_accept_invite_with_employee.sql
    - apps/web/src/lib/accept-invite-rpc.ts
    - apps/web/src/lib/accept-invite-rpc.test.ts
  modified:
    - apps/web/src/app/api/auth/invites/accept/route.ts
    - apps/web/src/lib/auth.ts
    - apps/web/src/lib/google-signin-gate.ts
    - apps/web/src/lib/google-signin-gate.test.ts
    - apps/web/src/app/auth/error/page.tsx
    - apps/web/package.json

key-decisions:
  - "Credentials and Google join share accept_invite_with_employee; Google passes passwordHash null"
  - "Other-company Google and unique-violation 23505 redirect to ACCOUNT_EXISTS_PATH with Sign in, not InviteRequired"
  - "Same-company existing Google member still marks the invite accepted and returns true (no second users row)"

patterns-established:
  - "Invite accept is one plpgsql function; failed status update cannot leave a live users row with a pending invite"
  - "ACCOUNT_EXISTS_PATH is /auth/error?error=AccountExists; error card Sign in goes to /auth/signin"

requirements-completed: [TENANT-03, TENANT-05]

coverage:
  - id: D1
    description: accept_invite_with_employee inserts employee and marks invite accepted in one transaction; credentials POST uses the RPC after global email 409 and bcrypt
    requirement: TENANT-03
    verification:
      - kind: unit
        ref: apps/web/src/lib/accept-invite-rpc.test.ts#buildAcceptInviteWithEmployeeArgs
        status: pass
      - kind: other
        ref: grep accept_invite_with_employee and buildAcceptInviteWithEmployeeArgs in accept/route.ts
        status: pass
      - kind: other
        ref: docker exec supabase_db_timeoff psql — accept_invite_with_employee exists, p_password text, proisstrict false
        status: pass
      - kind: other
        ref: npm test --workspace=@timeoff/web
        status: pass
    human_judgment: false
  - id: D2
    description: Google other-company and unique-violation 23505 return ACCOUNT_EXISTS_PATH; unknown Google still INVITE_REQUIRED_PATH; Google join uses the same RPC with passwordHash null
    requirement: TENANT-05
    verification:
      - kind: unit
        ref: apps/web/src/lib/google-signin-gate.test.ts#ACCOUNT_EXISTS_PATH
        status: pass
      - kind: unit
        ref: apps/web/src/lib/google-signin-gate.test.ts#decideGoogleSignIn unknown path INVITE_REQUIRED_PATH
        status: pass
      - kind: other
        ref: grep ACCOUNT_EXISTS_PATH and accept_invite_with_employee in auth.ts
        status: pass
      - kind: other
        ref: npm test --workspace=@timeoff/web
        status: pass
    human_judgment: false
  - id: D3
    description: Error card AccountExists title An account with this email already exists. description Sign in, or ask your admin for an invite. Primary action Sign in goes to /auth/signin
    requirement: TENANT-03
    verification:
      - kind: other
        ref: grep AccountExists, Sign in, /auth/signin in error/page.tsx
        status: pass
    human_judgment: true
    rationale: Copy and CTA on the live /auth/error?error=AccountExists card need a human opening that URL

duration: 3min
completed: 2026-08-29
status: complete
---

# Phase 1 Plan 09: Atomic accept and Google AccountExists Summary

**Credentials and Google invite join use `accept_invite_with_employee` (nullable `p_password`); other-company / unique-violation Google redirects to AccountExists with Sign in, not Invite required.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-08-29T11:32:12Z
- **Completed:** 2026-08-29T11:35:37Z
- **Tasks:** 3
- **Files modified:** 9

## Accomplishments

- `accept_invite_with_employee` inserts `users` (role `employee`, Unassigned department/team, email from invite) then `UPDATE company_invites ... WHERE status = pending`; `IF NOT FOUND` raises `invite_not_pending` so the insert rolls back
- `buildAcceptInviteWithEmployeeArgs` always includes `p_password` (bcrypt hash or `null`)
- Credentials `POST /api/auth/invites/accept` keeps the global email 409, then calls the RPC; `23505` / `unique_violation` stays 409 `EMAIL_EXISTS_ERROR`; `invite_not_pending` is 404 `invalid_or_expired`
- Google other-company member and RPC `23505` clear pending cookies and return `ACCOUNT_EXISTS_PATH`; unknown Google still `INVITE_REQUIRED_PATH`; same-company existing member still accepts the invite and returns `true`
- `/auth/error?error=AccountExists` shows existing-account copy with Sign in → `/auth/signin`
- RPC applied on local Postgres (`npm run supabase:db:push -- --yes --local`); `p_password` is nullable and the function is not STRICT

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: Atomic accept_invite_with_employee for credentials** - `1ebc128` (test)
2. **Task 1 GREEN: Atomic accept_invite_with_employee for credentials** - `57e9f0c` (feat)
3. **Task 2 RED: Google other-company maps to AccountExists** - `9bad25d` (test)
4. **Task 2 GREEN: Google other-company maps to AccountExists** - `54adc61` (feat)
5. **Task 3: Push accept_invite_with_employee to local Postgres** - no extra commit (migration already in `57e9f0c`; applied with `supabase db push --yes --local`)

**Plan metadata:** (this commit)

_Note: TDD tasks may have multiple commits (test → feat → refactor)_

## TDD Gate Compliance

- RED: `1ebc128` `test(01-09): add failing test for accept-invite RPC args` — failed with `ERR_MODULE_NOT_FOUND` for `accept-invite-rpc.ts`
- GREEN: `57e9f0c` `feat(01-09): implement atomic accept_invite_with_employee` — `npm test --workspace=@timeoff/web` 50 pass / 0 fail
- RED: `9bad25d` `test(01-09): add failing test for ACCOUNT_EXISTS_PATH` — failed with missing export `ACCOUNT_EXISTS_PATH`
- GREEN: `54adc61` `feat(01-09): map Google collisions to AccountExists` — 51 pass / 0 fail
- REFACTOR: skipped (implementation stayed minimal)

## Files Created/Modified

- `packages/database/migrations/20250818193734_accept_invite_with_employee.sql` - plpgsql RPC + GRANT to anon, authenticated, service_role
- `apps/web/src/lib/accept-invite-rpc.ts` - `buildAcceptInviteWithEmployeeArgs`
- `apps/web/src/lib/accept-invite-rpc.test.ts` - hash vs null `p_password` and arg keys
- `apps/web/src/app/api/auth/invites/accept/route.ts` - RPC after existing-user 409 and bcrypt
- `apps/web/src/lib/google-signin-gate.ts` - `ACCOUNT_EXISTS_PATH`
- `apps/web/src/lib/google-signin-gate.test.ts` - constant assertion; unknown-Google deny unchanged
- `apps/web/src/lib/auth.ts` - other-company / 23505 → AccountExists; Google join via RPC
- `apps/web/src/app/auth/error/page.tsx` - AccountExists card + Sign in
- `apps/web/package.json` - includes accept-invite-rpc test

## Decisions Made

- Credentials and Google join share `accept_invite_with_employee`; Google passes `passwordHash` null
- Other-company Google and unique-violation 23505 redirect to `ACCOUNT_EXISTS_PATH` with Sign in, not InviteRequired
- Same-company existing Google member still marks the invite accepted and returns true (no second users row)

## Deviations from Plan

None - plan executed exactly as written.

**Total deviations:** 0 auto-fixed
**Impact on plan:** None

## Issues Encountered

None. Local `supabase db push --yes --local` applied `20250818193734_accept_invite_with_employee.sql`. Hosted project was not linked (same as 01-02).

## User Setup Required

None for this plan — local Supabase was already running from Phase 1 UAT; the new RPC was pushed with `--local`. Google OAuth live test remains optional (see [01-USER-SETUP.md](./01-USER-SETUP.md)); unit tests do not require `GOOGLE_CLIENT_ID`.

## Next Phase Readiness

- G-01-4 remaining bind closed in code: atomic accept; Google existing-account copy + Sign in
- TENANT-05 deny for unknown Google preserved
- Phase 1 plans complete; ready for phase verification / UAT of credentials join and AccountExists card
- Hosted Supabase still needs `supabase link` (database password) before the RPC exists remotely

---
*Phase: 01-company-signup-and-invites*
*Completed: 2026-08-29*

## Self-Check: PASSED
