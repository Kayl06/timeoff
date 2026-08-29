---
status: testing
phase: 01-company-signup-and-invites
source: [01-VERIFICATION.md]
started: 2026-08-29T09:40:00Z
updated: 2026-08-29T09:40:00Z
---

## Current Test

number: 1
name: Credentials create-company on /auth/signup
expected: |
  Company name field above Google, heading Create your company, Create company CTA.
  Unique email creates the company; same email shows duplicate copy; loading keeps the card visible.
awaiting: user response

## Tests

### 1. Credentials create-company
expected: Company name field, Create your company, Create company / Creating company.... Success toast Company created. Sign in with your new credentials. then /auth/signin. Duplicate: An account with this email already exists. Sign in, or ask your admin for an invite. Owner can sign in with isOwner.
result: [pending]

### 2. Live Google OAuth
expected: Unknown Gmail lands on Invite required with Create a company and Back to sign in; no users row in a global pool. Signup Google creates an owner via create_company_with_owner with p_password null.
result: [pending]

### 3. Owner copy-link invites
expected: Owner-only nav item; 201 with acceptUrl; hashed token at rest; dialog stays open with Copy invite link. Non-owner 403.
result: [pending]

### 4. Accept invite
expected: Join {company name}; credentials join lands on dashboard. Invalid token: This invite is invalid or has expired. Ask your admin to send a new invite. Wrong Google: This invite was sent to a different email....
result: [pending]

### 5. Hosted vs local Supabase
expected: The same project the app uses has the Phase 1 migration applied. Signup/invite/accept hit that schema, not a stale hosted DB.
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
