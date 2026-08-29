---
status: complete
phase: 01-company-signup-and-invites
source: [01-VERIFICATION.md]
started: 2026-08-29T09:40:00Z
updated: 2026-08-29T12:12:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Credentials create-company
expected: Password shorter than 12 characters, or missing uppercase/lowercase/number/special, cannot submit Create company; a visible field or checklist error appears (not a silent 500). Valid 12+ composition password with unique email creates the company. Duplicate email shows An account with this email already exists. Sign in, or ask your admin for an invite.
result: pass
retest_of: issue
previous: "No error message when password not meet the Verification"

### 2. Live Google OAuth
expected: Unknown Gmail lands on Invite required with Create a company and Back to sign in; no users row in a global pool. Signup Google creates an owner via create_company_with_owner with p_password null.
result: pass

### 3. Owner copy-link invites
expected: Owner-only nav item; 201 with acceptUrl; hashed token at rest; dialog stays open with Copy invite link. Non-owner 403.
result: pass

### 4. Accept invite
expected: Join {company name} for a new email; credentials join lands on dashboard. Inviting an email that already has an account 409s (this-company vs existing-account copy). Accept-invite for an existing email shows the existing-account card, not Join. Invalid token: This invite is invalid or has expired. Ask your admin to send a new invite.
result: pass
retest_of: issue
previous: "Need verification if invited email already exists"

### 5. Hosted vs local Supabase
expected: The same project the app uses has the Phase 1 migration applied. Signup/invite/accept hit that schema, not a stale hosted DB.
result: pass

## Summary

total: 5
passed: 5
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

- gap_id: G-01-1
  truth: "Company name field, Create your company, Create company / Creating company.... Success toast Company created. Sign in with your new credentials. then /auth/signin. Duplicate: An account with this email already exists. Sign in, or ask your admin for an invite. Owner can sign in with isOwner."
  status: resolved
  resolved_by: 01-06-PLAN.md
  resolved_at: 2026-08-29
  reason: "User reported: No error message when password not meet the Verification"
  severity: major
  test: 1
  root_cause: "Signup client treats passwords as valid at 8 characters with advisory-only complexity, while the API passwordSchema requires 12 plus composition; 400 responses put messages in details which the page never maps to field errors; toasts use react-hot-toast whose Toaster is unmounted (only Sonner is mounted), so rejection is invisible."
  artifacts:
    - path: "apps/web/src/app/auth/signup/page.tsx"
      issue: "Client min length 8; composition does not block submit; 400 details unused; toasts via unmounted react-hot-toast"
    - path: "apps/web/src/lib/validation.ts"
      issue: "API source of truth is minLength 12 plus complexity"
    - path: "apps/web/src/app/api/auth/signup/route.ts"
      issue: "Returns generic error plus field details the UI never shows"
    - path: "apps/web/src/providers/session-provider.tsx"
      issue: "react-hot-toast Toaster commented out; only Sonner mounted"
  missing:
    - "Align signup client checks and checklist with PASSWORD_REQUIREMENTS / passwordSchema (length 12 + composition)"
    - "Map 400 details onto errors.* field messages"
    - "Switch signup toasts to Sonner (or remount react-hot-toast)"
  debug_session: ".planning/debug/signup-password-validation-feedback.md"

- gap_id: G-01-4
  truth: "Join {company name}; credentials join lands on dashboard. Invalid token: This invite is invalid or has expired. Ask your admin to send a new invite. Wrong Google: This invite was sent to a different email...."
  status: resolved
  resolved_by: 01-07-PLAN.md
  resolved_at: 2026-08-29
  reason: "User reported: Need verification if invited email already exists"
  severity: major
  test: 4
  root_cause: "POST /api/auth/invites 409s only when the email is already a users row in the owner's company or has a pending invite for that company. users.email is globally UNIQUE, so an email with an account elsewhere still gets 201 and a copy-link. Preview never checks users, so accept-invite still shows Join {company}. Credentials accept then 409s globally after submit. Google other-company / 23505 goes to Invite required. Insert user then invite-status update is not atomic."
  artifacts:
    - path: "apps/web/src/app/api/auth/invites/route.ts"
      issue: "Existing-user 409 is same-company only; cross-tenant emails get 201"
    - path: "apps/web/src/app/api/auth/invites/preview/route.ts"
      issue: "No users check; join form always shown for a usable token"
    - path: "apps/web/src/app/api/auth/invites/accept/route.ts"
      issue: "Global 409 after submit; insert + accept update not in one transaction"
    - path: "apps/web/src/app/auth/accept-invite/page.tsx"
      issue: "409 is toast-only; no load-time existing-account card"
    - path: "apps/web/src/lib/auth.ts"
      issue: "Google other-company / 23505 → Invite required; same non-atomic insert/update"
    - path: "apps/web/src/components/invite-teammates-dialog.tsx"
      issue: "409 copy assumes same-company member"
    - path: "packages/database/migrations/001_initial_schema.sql"
      issue: "Global unique email makes a 201 cross-tenant invite unredeemable"
  missing:
    - "409 invite create on any existing users.email with distinct copy if they are in another company"
    - "Preview should surface existing-account before the join form"
    - "Map Google other-company / unique-violation to the same copy and sign-in, not Invite required"
    - "Perform user insert + invite accept in one RPC or roll back the user if the status update fails"
  debug_session: ".planning/debug/invite-existing-email.md"
