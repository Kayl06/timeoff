---
status: diagnosed
trigger: "Investigate issue: G-01-4 — Invite/accept flow needs verification when the invited email already exists."
created: 2026-08-29T10:44:00Z
updated: 2026-08-29T10:52:00Z
symptoms_prefilled: true
goal: find_root_cause_only
---

## Current Focus

hypothesis: "POST /api/auth/invites 409s only for same-company users/pending invites; users.email is globally UNIQUE, so a cross-tenant existing email still gets 201 + a copy-link that credentials-accept 409s and Google-bind sends to InviteRequired. Preview never checks users. Accept insert then invite-status update is not atomic."
test: "Read invite POST, preview, accept, accept-invite page, Google signIn bind, users.email UNIQUE, UI-SPEC/01-REVIEW WR-03/WR-04."
expecting: "Confirm planning notes; document status codes and copy per path."
next_action: "Return ROOT CAUSE FOUND (diagnose-only; no fix)."
bug_class: bohrbug
known_pattern_candidate: none (knowledge-base.md absent; mempalace search returned nothing)
sbfl: skipped — no failing test + per-test coverage for invite existing-email; helpers only cover inviteIsUsable / inviteOwnerRejectStatus

reasoning_checkpoint:
  hypothesis: "Invite POST scopes existing-user lookup to company_id, so globally unique emails in other companies get 201; accept/preview/Google then fail or confuse instead of a verified existing-account path."
  confirming_evidence:
    - "invites/route.ts:140-165 filters .eq('email', email).eq('company_id', company.id); 409 only if existingUser OR pending invite in this company"
    - "001_initial_schema.sql:7 users.email VARCHAR(255) UNIQUE NOT NULL"
    - "accept/route.ts:56-68 looks up email globally and returns 409 EMAIL_EXISTS_ERROR; preview/route.ts has no users lookup"
    - "auth.ts:170-173 other-company member → INVITE_REQUIRED_PATH; 203-207 23505 → INVITE_REQUIRED_PATH; 175-184 same-company existing → silent accept"
    - "accept/route.ts:72-104 insert users then update invite; no transaction (auth.ts:189-220 same)"
  falsification_test: "If invite POST looked up users by email only (no company_id) and returned 409 for any existing row, the 201-unredeemable-link path would not exist."
  fix_rationale: "N/A diagnose-only — gap-closure should 409 invite on any existing users.email, preview existing-account before the join form, map Google other-company/23505 to existing-account copy, and atomically accept."
  blind_spots: "Did not execute live HTTP against a two-company fixture; diagnosis is from complete route/schema reads. Credentials 409 toast was not browser-exercised in this session."
  candidate_causes:
    - "code: invite POST existing-user query includes company_id; preview omits users check; Google bind maps collisions to InviteRequired"
    - "config: users.email is globally UNIQUE (001_initial_schema.sql) so a second company cannot attach the same email even after 201"
    - "data: an existing users row for that email (other tenant, or credentials vs Google password-null) is the input that triggers the gap"
  and_gate: "yes — owner 201 + unredeemable invite requires company-scoped lookup AND global unique email. Preview/Google copy gaps are additional independent (OR) contributors to 'not shown to the user'."

## Symptoms

expected: Accept invite joins the invited company; credentials join lands on dashboard. Invalid token shows: This invite is invalid or has expired. Ask your admin to send a new invite. Wrong Google email shows: This invite was sent to a different email.... Inviting or accepting an email that already has an account should be verified and shown to the user (not silent success or a confusing failure).
actual: Need verification if invited email already exists
errors: None reported
reproduction: Test 4 in UAT (.planning/phases/01-company-signup-and-invites/01-UAT.md) — Accept invite. Also check owner Invite teammates POST /api/auth/invites.
started: Discovered during Phase 1 UAT

## Eliminated

- hypothesis: "Invite POST never 409s on existing emails (silent 201 always)."
  evidence: "Same-company existing user or pending invite returns 409 with 'That email is already in this company.' Dialog maps 409 to inline emailError (invite-teammates-dialog.tsx:118-120). 01-04-PLAN truth only required this-company 409."
  timestamp: 2026-08-29T10:50:00Z
- hypothesis: "Credentials accept never checks existing users (silent overwrite or generic 500)."
  evidence: "accept/route.ts:56-68 global email lookup returns 409 EMAIL_EXISTS_ERROR; 23505 also 409. Page toasts that error (accept-invite/page.tsx:252-254). No UPDATE of an existing users row on credentials accept."
  timestamp: 2026-08-29T10:50:00Z
- hypothesis: "Preview API returns an existing-account error that the page ignores."
  evidence: "preview/route.ts returns only companyName+email when inviteIsUsable; no users table query. Page has no pageState for existing email."
  timestamp: 2026-08-29T10:50:00Z

## Evidence

- timestamp: 2026-08-29T10:44:00Z
  checked: ".planning/debug/knowledge-base.md and mempalace search"
  found: "KB_ABSENT; mempalace CLI produced no hits."
  implication: "No prior resolved pattern to test first."

- timestamp: 2026-08-29T10:46:00Z
  checked: "POST apps/web/src/app/api/auth/invites/route.ts:140-165"
  found: "Lookup is .from('users').select('id').eq('email', email).eq('company_id', company.id) plus pending company_invites for same email+company. If either exists → 409 ALREADY_IN_COMPANY_ERROR. Else insert + 201 {email, acceptUrl, expiresAt}."
  implication: "Confirmed: invite 409 only same-company. Cross-tenant existing email → 201."

- timestamp: 2026-08-29T10:46:30Z
  checked: "packages/database/migrations/001_initial_schema.sql:7 users.email UNIQUE"
  found: "email VARCHAR(255) UNIQUE NOT NULL. No per-company uniqueness; one email globally."
  implication: "A 201 invite for an email that already has a users row cannot be redeemed by inserting another user."

- timestamp: 2026-08-29T10:47:00Z
  checked: "GET preview/route.ts and accept-invite/page.tsx loadPreview"
  found: "Preview does not query users. Usable token → 200 companyName+email. Page goes pageState 'ready' (Join {company}) with no existing-account card. 409 from accept is handled only after Join company submit as toast.error."
  implication: "Existing-email is not verified on the accept page before the user fills the form. No dedicated UI copy for that case on load."

- timestamp: 2026-08-29T10:47:30Z
  checked: "POST accept/route.ts:56-104"
  found: "Global .eq('email', inviteRow.email) maybeSingle; if row exists → 409 { error: 'An account with this email already exists. Sign in, or ask your admin for an invite.' }. Insert then separate update status=accepted. 23505 → same 409. Update failure throws → catch 500 Internal server error. Invite left pending."
  implication: "Confirmed: accept insert/update not atomic. Credentials existing-email is 409 with signup duplicate copy, toast-only on the client."

- timestamp: 2026-08-29T10:48:00Z
  checked: "Google bind auth.ts:134-220"
  found: "pendingInvite runs before existingUser allow. Email mismatch → /auth/accept-invite?error=mismatch (copy exists). Same-company existing member → update invite accepted, return true (silent success). Other-company member → INVITE_REQUIRED_PATH without clearing cookies. Insert 23505 → INVITE_REQUIRED_PATH. Insert then accept update; acceptError throws → catch INVITE_REQUIRED_PATH."
  implication: "Google existing-email in another company or unique-violation is Invite required (auth/error InviteRequired copy), not the existing-account sentence. Same-company existing is silent success."

- timestamp: 2026-08-29T10:48:30Z
  checked: "invite-teammates-dialog.tsx 409 handling; 01-04-PLAN same-company 409 truth; 01-REVIEW WR-03 WR-04; 01-05-PLAN TENANT-03 409 if email already exists"
  found: "Dialog shows inline 'That email is already in this company.' for any 409. Plan 04 only required this-company. Plan 05 required credentials accept 409 if that email already exists (implemented). Review already named WR-03 (invite company-scoped) and WR-04 (non-atomic accept)."
  implication: "UAT G-01-4 is the untested/unclosed gap around global existing email + Google/preview UX, matching WR-03 and WR-04."

- timestamp: 2026-08-29T10:49:00Z
  checked: "Phase 1.25 SBFL; tests under apps/web/src/lib/invite-*.test.ts"
  found: "No route tests for POST /invites or POST /invites/accept existing-email. Helpers only."
  implication: "SBFL skipped; no gate would have caught company-scoped 409 vs global UNIQUE."

- timestamp: 2026-08-29T10:49:30Z
  checked: "common-bug-patterns Data Shape / Error Handling; taxonomy"
  found: "Missing required check on invite create (data-shape/API contract). Swallowed Google collision as InviteRequired. Deterministic given two companies + same email."
  implication: "bug_class bohrbug. Pattern: incomplete duplicate check + wrong error mapping."

## Resolution

root_cause: "POST /api/auth/invites 409s only when the email is already a users row or pending invite in the owner's company (lookup filters company_id); users.email is globally UNIQUE, so an email that already has an account in another company still gets 201 and a copy-link. GET preview never checks users, so /auth/accept-invite still shows Join {company}. Credentials POST /invites/accept 409s globally with 'An account with this email already exists...' as a toast after submit (no overwrite). Google bind: same-company existing member silently accepts; other-company or 23505 redirects to Invite required. Credentials and Google accept insert the user then update invite status in two statements (not atomic); update failure is 500/InviteRequired with a live users row and a still-pending invite, and retry is 409."
fix: ""
verification: ""
files_changed: []
oracle_type: specified
