---
status: partial
phase: 01-company-signup-and-invites
source: [01-VERIFICATION.md]
started: 2026-08-29T09:40:00Z
updated: 2026-08-29T10:41:00Z
---

## Current Test

[testing paused — 1 items outstanding]

## Tests

### 1. Credentials create-company
expected: Company name field, Create your company, Create company / Creating company.... Success toast Company created. Sign in with your new credentials. then /auth/signin. Duplicate: An account with this email already exists. Sign in, or ask your admin for an invite. Owner can sign in with isOwner.
result: issue
reported: "No error message when password not meet the Verification"
severity: major

### 2. Live Google OAuth
expected: Unknown Gmail lands on Invite required with Create a company and Back to sign in; no users row in a global pool. Signup Google creates an owner via create_company_with_owner with p_password null.
result: blocked
blocked_by: third-party
reason: "No setup Google supabase auth yet"

### 3. Owner copy-link invites
expected: Owner-only nav item; 201 with acceptUrl; hashed token at rest; dialog stays open with Copy invite link. Non-owner 403.
result: pass

### 4. Accept invite
expected: Join {company name}; credentials join lands on dashboard. Invalid token: This invite is invalid or has expired. Ask your admin to send a new invite. Wrong Google: This invite was sent to a different email....
result: issue
reported: "Need verification if invited email already exists"
severity: major

### 5. Hosted vs local Supabase
expected: The same project the app uses has the Phase 1 migration applied. Signup/invite/accept hit that schema, not a stale hosted DB.
result: pass

## Summary

total: 5
passed: 2
issues: 2
pending: 0
skipped: 0
blocked: 1

## Gaps

- gap_id: G-01-1
  truth: "Company name field, Create your company, Create company / Creating company.... Success toast Company created. Sign in with your new credentials. then /auth/signin. Duplicate: An account with this email already exists. Sign in, or ask your admin for an invite. Owner can sign in with isOwner."
  status: failed
  reason: "User reported: No error message when password not meet the Verification"
  severity: major
  test: 1
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- gap_id: G-01-4
  truth: "Join {company name}; credentials join lands on dashboard. Invalid token: This invite is invalid or has expired. Ask your admin to send a new invite. Wrong Google: This invite was sent to a different email...."
  status: failed
  reason: "User reported: Need verification if invited email already exists"
  severity: major
  test: 4
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""
