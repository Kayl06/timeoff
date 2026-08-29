---
phase: 01-company-signup-and-invites
verified: 2026-08-29T11:44:07Z
status: passed
score: 22/32 must-haves verified
behavior_unverified: 10
overrides_applied: 0
decision_coverage:
  skipped: true
  reason: "No phase CONTEXT.md; no <decisions> block"
re_verification:
  previous_status: human_needed
  previous_score: 12/20
  gaps_closed:

    - "G-01-1: signup client password rules match PASSWORD_REQUIREMENTS (min 12 + composition); 400 details map onto errors.*; toasts use sonner"
    - "G-01-4 create: POST /api/auth/invites 409s any existing users.email (global lookup) with distinct this-company vs other-company copy"
    - "G-01-4 preview/UI: GET preview 409 EMAIL_EXISTS_ERROR; accept-invite shows existing-account card before the join form"
    - "G-01-4 bind: accept_invite_with_employee RPC; Google other-company / 23505 maps to ACCOUNT_EXISTS_PATH not InviteRequired"
  gaps_remaining: []
  regressions: []
deferred:

  - truth: "An invitee cannot read other companies' rows via PostgREST (open RLS USING true)"
    addressed_in: "Phase 2"
    evidence: "Phase 2 goal/success criteria: Company A cannot read or change Company B’s people, requests, balances, calendars, notifications, or audit. TENANT-04 / AUTHZ-02. Phase 1 PLAN prohibition: cannot see other companies means join binding, not PostgREST isolation."
behavior_unverified_items:

  - truth: "First user at signup creates a company and owns that org"
    test: "Submit credentials signup with a unique email and company name, then sign in."
    expected: "A companies row exists with owner_id equal to that user; users.company_id is set; role is admin; session.isOwner is true."
    why_human: "Route and RPC are wired; no test invokes create_company_with_owner or asserts the persisted owner_id."

  - truth: "That owner can invite people by email into only their company"
    test: "Sign in as owner, send an invite, inspect the stored row; try POST /api/auth/invites as a non-owner."
    expected: "company_invites.company_id equals the owner's company; 403 for non-owner; client cannot pass another company_id. UAT test 3 already passed copy-link; re-check only if invite create regressed."
    why_human: "Owner gate helper is unit-tested; the HTTP persist path is not."

  - truth: "An invitee joins that company and cannot see any other company"
    test: "Open a copy-link, complete credentials join, confirm the new user has only that company_id."
    expected: "users.company_id equals the invite's company_id; no company picker; role employee."
    why_human: "companyIdFromInvite is unit-tested; accept_invite_with_employee persist is not exercised by a test. Cross-tenant reads are Phase 2."

  - truth: "Google sign-in does not place a user in the wrong company or a global employee pool"
    test: "With Google OAuth configured, sign in with an unknown Gmail on /auth/signin (no pending cookies)."
    expected: "Redirect to /auth/error?error=InviteRequired; no new users row."
    why_human: "decideGoogleSignIn is unit-tested; auth.ts insert-deny and live Google callback are not. GOOGLE_CLIENT_ID/SECRET are absent in apps/web/.env.local."

  - truth: "Second credentials signup with the same email is 409 and must not create a second company"
    test: "POST /api/auth/signup twice with the same email."
    expected: "Second response is 409 User with this email already exists; only one companies row for that owner email."
    why_human: "Duplicate check and 23505 mapping exist in the route; no test hits Postgres."

  - truth: "Concurrent signup: one winner; loser is 409; no company row without owner_id"
    test: "Fire two overlapping signups for the same email against a DB that has the RPC."
    expected: "One 201, one 409; no companies.owner_id NULL leftover."
    why_human: "RPC is a single plpgsql transaction, but concurrency is untested."

  - truth: "Accept binds users.company_id to the invite's company_id only"
    test: "POST /api/auth/invites/accept with a valid token and extra JSON fields attempting another company id."
    expected: "Created user.company_id equals invite.company_id; extra body fields ignored; schema has no companyId/email."
    why_human: "Mapper is unit-tested; accept RPC persist is not."

  - truth: "Google accept: pending invite cookie; Google email must match invite.email or mismatch URL"
    test: "Accept-invite Continue with Google using a Google account that does not match the invited email."
    expected: "Redirect to /auth/accept-invite?error=mismatch; no employee insert."
    why_human: "Mismatch string is in auth.ts; no test drives the Google signIn callback."

  - truth: "Credentials POST /api/auth/invites/accept inserts the employee and marks the invite accepted in one Postgres function; a failed status update does not leave a live users row with a still-pending invite (G-01-4 / WR-04)"
    test: "Call accept_invite_with_employee with a non-pending invite id (or fail the UPDATE) and inspect users + company_invites."
    expected: "No leftover users row; invite stays pending; route maps invite_not_pending to 404."
    why_human: "SQL has INSERT then UPDATE WHERE pending / RAISE invite_not_pending; no test runs the function."

  - truth: "Google bind uses the same RPC with p_password null; unique-violation 23505 and other-company existing member redirect to ACCOUNT_EXISTS_PATH, not InviteRequired (G-01-4)"
    test: "Accept-invite Continue with Google using an account whose email already belongs to another company."
    expected: "Redirect to /auth/error?error=AccountExists; Sign in CTA goes to /auth/signin; no second users row."
    why_human: "auth.ts branches and ACCOUNT_EXISTS_PATH constant are present; no test drives the Google signIn callback. Live OAuth remains third-party blocked without GOOGLE_CLIENT_ID."
human_verification:

  - test: "UAT G-01-1 re-test on /auth/signup. Type an 8-character password: Create company stays disabled and the length checklist row is unmet. Type 12 letters with no number/special: still disabled with a password field or checklist miss. A valid 12+ composition password enables the CTA. Submit a unique email and confirm success toast + /auth/signin. Repeat the same email and confirm duplicate copy on the email field."
    expected: "Visible password errors (Password must be at least 12 characters and composition messages). Success: Company created. Sign in with your new credentials. Duplicate: An account with this email already exists. Sign in, or ask your admin for an invite. Owner can sign in with isOwner."
    why_human: "Planner deferred this to end-of-phase; diagnosed UAT G-01-1 must be re-tested in the browser. Do not treat code presence as UAT pass."

  - test: "UAT G-01-4 owner path. As owner, invite an email already in this company, then an email that already signed up on another company. Confirm no copy-link on 409."
    expected: "This-company: That email is already in this company. Other-company: An account with this email already exists. Sign in, or ask your admin for an invite. No acceptUrl."
    why_human: "Dialog copy and live 409 against a session cookie need a browser. Helper tests do not prove the HTTP path."

  - test: "UAT G-01-4 accept path. Open a leftover/raced invite link for an email that already has an account. Then join with a new email on a fresh invite. Try a junk token."
    expected: "Existing email: existing-account sentence and Back to sign in, not Join {company}. New email: Join {company}; credentials join lands on dashboard. Invalid: This invite is invalid or has expired. Ask your admin to send a new invite."
    why_human: "Diagnosed UAT G-01-4 must be re-tested. Preview/accept persist and the exists card are runtime UI."

  - test: "Configure Google OAuth (GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are currently absent). Unknown Gmail on /auth/signin with no pending cookies. Signup Google with a company name filled. Optional: Google join with an email that already has an account."
    expected: "Unknown Gmail lands on Invite required with Create a company and Back to sign in; no users row in a global pool. Signup Google creates an owner via create_company_with_owner with p_password null. Existing-account Google lands on AccountExists with Sign in to /auth/signin, not Invite required."
    why_human: "Live Google OAuth remains third-party blocked without GOOGLE_CLIENT_ID. Unit tests cover decideGoogleSignIn and ACCOUNT_EXISTS_PATH only."
---

# Phase 1: Company Signup and Invites Verification Report

**Phase Goal:** A client company can create itself at signup; later people join only that company by invite; Google cannot drop a user into a global pool.
**Verified:** 2026-08-29T11:44:07Z
**Status:** human_needed
**Re-verification:** Yes — after gap-closure plans 01-06 through 01-09 (UAT G-01-1 and G-01-4)
**Mode:** mvp (ROADMAP). ROADMAP goal is not user-story formatted (`user-story.validate` → false). PLAN objective is a valid user story and is used for User Flow Coverage. Verification continued rather than refusing, because the orchestrator asked to verify this phase and the plan-level story matches `/^As a .+, I want to .+, so that .+\.$/`.

## User Flow Coverage

User story: As a first user of a client company, I want to create my company at signup and invite teammates by email, so that later people join only that company and Google cannot drop anyone into a global employee pool.

| Step | Expected | Evidence | Status |
|------|----------|----------|--------|
| Create company at signup | First user submits company name + owner account and becomes owner; invalid passwords are visible (G-01-1) | `signup/page.tsx` POSTs camelCase `companyName`; `passwordMeetsApiRules` / `firstPasswordError` / `mergeSignupFieldErrors`; sonner toasts; route calls `create_company_with_owner` | ⚠️ present + wired; persist untested; G-01-1 UX needs human re-test |
| Invite teammates by email | Owner invites into only their company; globally existing email 409s (G-01-4) | Nav `isOwner` → dialog → POST `/api/auth/invites`; `inviteCreateConflict` after email-only users lookup; UAT test 3 previously passed copy-link | ⚠️ present + wired; other-company 409 needs human |
| Later people join only that company | Invitee joins the invite's company; existing email verified before join form (G-01-4) | No `<select>`; preview 409 `EMAIL_EXISTS_ERROR`; exists card; `accept_invite_with_employee` | ⚠️ present + wired; persist untested; G-01-4 accept needs human re-test |
| Google cannot dump into a global pool | Unknown Google without pending cookies is denied; existing-account Google is AccountExists not InviteRequired | `decideGoogleSignIn` deny → `INVITE_REQUIRED_PATH`; other-company / 23505 → `ACCOUNT_EXISTS_PATH`; Google provider omitted unless env is set | ⚠️ present + wired; live OAuth unconfigured (third-party blocked) |
| Outcome | Teammates join only that company; Google cannot drop anyone into a global employee pool | Join binding + default-deny Google gate + G-01-1/G-01-4 code; live outcome needs human | ⚠️ pending human |

## Goal Achievement

### Observable Truths

Previous 20 truths kept for regression. Truths 21–32 are gap-closure must-haves from plans 01-06 through 01-09.

| # | Truth | Status | Evidence |
| --- | ------- | ---------- | -------------- |
| 1 | First user at signup creates a company and owns that org | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | Signup page → POST `/api/auth/signup` → `supabase.rpc('create_company_with_owner', …)` with hashed password. SQL inserts company, admin user, then `owner_id`. No test runs the RPC. |
| 2 | That owner can invite people by email into only their company | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | `inviteEmailSchema` is email-only. POST insert uses `company.id` from `owner_id = session.user.id`. `inviteOwnerRejectStatus` tests pass. HTTP persist untested. UAT test 3 previously passed copy-link. |
| 3 | An invitee joins that company and cannot see any other company | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | Accept has no company picker; `companyIdFromInvite` tests ignore extra ids; accept/Google use `accept_invite_with_employee` with invite `company_id`. PostgREST isolation deferred to Phase 2 (open RLS). |
| 4 | Google sign-in does not place a user in the wrong company or a global employee pool | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | `decideGoogleSignIn` tests cover allow/deny. `auth.ts` returns `INVITE_REQUIRED_PATH` when the gate denies; no missing-user insert. `GOOGLE_CLIENT_*` absent in `.env.local`. |
| 5 | hashInviteToken is SHA-256; hashInviteTokenHex is 64-char lowercase hex; inviteTokenMatches uses timingSafeEqual | ✓ VERIFIED | `invite-token.ts` + passing `invite-token.test.ts` (`npm test --workspace=@timeoff/web`, 51/51). |
| 6 | decideGoogleSignIn returns true when existingUser, pendingCompany, or pendingInvite; else InviteRequired path | ✓ VERIFIED | Passing `google-signin-gate.test.ts`; `INVITE_REQUIRED_PATH` equals `/auth/error?error=InviteRequired`. |
| 7 | isCompanyOwner returns true only when userId equals ownerId and both are non-empty | ✓ VERIFIED | Passing `company-owner.test.ts`. |
| 8 | apps/web test script runs node:test with experimental-strip-types on the helper tests | ✓ VERIFIED | `apps/web/package.json` `test` lists nine `src/lib/*.test.ts` files including `password-client.test.ts` and `accept-invite-rpc.test.ts`; 51/51 passed. |
| 9 | Second credentials signup with the same email is 409 and must not create a second company | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | Route 409 on existing email and on Postgres `23505`. Client maps UI-SPEC duplicate copy. No DB test. |
| 10 | Concurrent signup: one winner; loser 409; no company row without owner_id | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | RPC is one plpgsql transaction (null owner only inside the transaction). No concurrent test. |
| 11 | create_company_with_owner p_password is nullable; helper always includes the key | ✓ VERIFIED | SQL `p_password TEXT`; `buildCreateCompanyWithOwnerArgs` tests hash and `null` with `hasOwnProperty`. Google path passes `passwordHash: null`. |
| 12 | company_invites.token_hash is VARCHAR(64) storing lowercase SHA-256 hex | ✓ VERIFIED | Migration `token_hash VARCHAR(64) NOT NULL UNIQUE`; store/lookup use `hashInviteTokenHex`. Hosted schema previously passed UAT test 5. |
| 13 | Session.user includes companyId and isOwner after credentials or Google success | ✓ VERIFIED | `next-auth.d.ts` Session/User/JWT; `mapUserFromDatabase` maps `company_id`; session/jwt callbacks call `resolveIsOwner`. |
| 14 | POST /api/auth/invites: no session 401; non-owner 403; error Only the company owner can invite teammates | ✓ VERIFIED | `invite-auth.test.ts` covers 401/403/null. Route uses `getServerSession(authOptions)` then `inviteOwnerRejectStatus`. |
| 15 | Invite token_hash stored via hashInviteTokenHex; raw token not stored; 201 includes acceptUrl | ✓ VERIFIED | POST insert `{ token_hash }` only after `inviteCreateConflict` is null; `acceptUrl` built from raw token. |
| 16 | Accept binds users.company_id to the invite's company_id only; UI has no company picker | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | `inviteAcceptSchema` has no company/email; page has no `<select>`. RPC args use `companyIdFromInvite`. Persist untested. |
| 17 | Credentials accept inserts users.email from invite.email, never from the JSON body; 409 if email exists | ✓ VERIFIED | Schema has no email field; `buildAcceptInviteWithEmployeeArgs` uses `inviteRow.email`; global users lookup 409 `EMAIL_EXISTS_ERROR` before RPC. |
| 18 | Invitee role is employee; they never become owner via accept | ✓ VERIFIED | RPC hardcodes `role` employee. Credentials and Google join call that RPC. Owner path is signup-only (`admin` + `owner_id`). |
| 19 | Google accept: pending invite cookie; email must match invite.email or mismatch URL | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | `auth.ts` hashes cookie token, compares emails case-insensitively, returns `/auth/accept-invite?error=mismatch`. Accept page handles `error=mismatch`. No callback test. |
| 20 | Signup POST body is camelCase including companyName; 201 then toast and redirect /auth/signin | ✓ VERIFIED | Page JSON keys include `firstName`, `lastName`, `confirmPassword`, `companyName`. Sonner success toast then `router.push('/auth/signin')` after 201. |
| 21 | On /auth/signup, a password shorter than 12 cannot submit Create company; password field shows Password must be at least 12 characters (G-01-1) | ✓ VERIFIED | `firstPasswordError('short8!!')` returns that message; `passwordMeetsApiRules` is false; `isFormReady` requires `passwordMeetsApiRules`; Create company is `disabled={isLoading \|\| !isFormReady}`; `errors.password` is rendered. Passing `password-client.test.ts`. |
| 22 | A 12-character password missing uppercase, lowercase, number, or special cannot submit; matching passwordSchema message appears before the request is sent (G-01-1) | ✓ VERIFIED | `passwordMeetsApiRules('abcdefghijkl')` is false; `firstPasswordError` returns the uppercase schema message; composition regexes match `passwordSchema`. `validateForm` sets `errors.password` from `firstPasswordError` before fetch. |
| 23 | If POST /api/auth/signup still returns 400, the page copies details.* onto errors.*; it does not rely on an unmounted toaster for the rule text (G-01-1) | ✓ VERIFIED | `mergeSignupFieldErrors` tests copy `details.password`; `handleTraditionalSignUp` calls `setErrors` with merged details; `toast.error` only when `fieldErrors` is empty. Signup imports `toast` from `sonner`. |
| 24 | Visible toasts on signup use sonner (G-01-1) | ✓ VERIFIED | `signup/page.tsx` `import { toast } from 'sonner'`. `SessionProvider` mounts `<Sonner richColors />`. No `react-hot-toast` on signup. `handleGoogleSignUp` does not reference `GOOGLE_CLIENT_ID`. |
| 25 | POST /api/auth/invites returns 409 when any users row has that email, not only a row in the owner's company (G-01-4) | ✓ VERIFIED | POST users lookup is `.eq('email', email)` with no `company_id` filter. `inviteCreateConflict` tests cover same-company, other-company, pending, none. 409 JSON is `{ error }` with no `acceptUrl`. |
| 26 | Invite teammates dialog shows the API 409 error string inline (distinct copy for other-company vs this-company) (G-01-4) | ✓ VERIFIED | 409 handler uses `payload.error` when non-empty; fallback `ALREADY_IN_COMPANY_ERROR` only. Constants: this-company `That email is already in this company.`; other-company matches signup duplicate sentence. |
| 27 | GET preview for a usable token whose invite.email already has a users row returns 409 EMAIL_EXISTS_ERROR; accept-invite shows that copy and Back to sign in before the join form (G-01-4) | ✓ VERIFIED | Preview queries `users` by invite email after `inviteIsUsable`; 409 `{ error: EMAIL_EXISTS_ERROR }`. Page `PageState` includes `exists`; `loadPreview` 409 → `exists`; `InviteStatusCard copy={EMAIL_EXISTS_ERROR}`. Join form only after invalid/mismatch/exists early returns. `invitePreviewPageState` unit-tested (helper not imported by the page; route/page implement the same states via HTTP). |
| 28 | Credentials accept 409 with EMAIL_EXISTS_ERROR switches to the exists card, not toast-only (G-01-4) | ✓ VERIFIED | `handleJoinCompany` on status 409 (non-mismatch) `setPageState('exists')` and returns. Remaining errors use sonner. Invalid/expired copy unchanged (`INVALID_COPY`). |
| 29 | Credentials accept inserts the employee and marks the invite accepted in one Postgres function; a failed status update does not leave a live users row with a still-pending invite (G-01-4) | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | Migration `20250818193734_accept_invite_with_employee.sql`: INSERT employee then `UPDATE … WHERE status = 'pending'`; `IF NOT FOUND RAISE EXCEPTION 'invite_not_pending'`. Accept route calls `supabase.rpc('accept_invite_with_employee', …)` after bcrypt; no split insert/update. Helper tests pass. No test runs the function or asserts rollback. |
| 30 | Google bind uses the same RPC with p_password null; 23505 and other-company existing member redirect to ACCOUNT_EXISTS_PATH, not InviteRequired (G-01-4) | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | `auth.ts` other-company member: `clearPendingAuthCookies` then `ACCOUNT_EXISTS_PATH`. New Google user: RPC with `passwordHash: null`. `rpcError.code === '23505'` → `ACCOUNT_EXISTS_PATH`. Unknown Google still `INVITE_REQUIRED_PATH`. Same-company member updates invite accepted and returns true. No callback test. |
| 31 | ACCOUNT_EXISTS_PATH is /auth/error?error=AccountExists; error card shows existing-account copy; Sign in goes to /auth/signin | ✓ VERIFIED | Passing `google-signin-gate.test.ts` constant assertion. `error/page.tsx` `AccountExists` title/description/action; `handleAction` `router.push('/auth/signin')`. InviteRequired still goes to `/auth/signup`. |
| 32 | Google OAuth env is not required for credentials signup (G-01-1) | ✓ VERIFIED | `handleGoogleSignUp` only requires a non-empty company name and POSTs pending-context; no `GOOGLE_CLIENT_ID` read. Credentials signup does not skip when Google vars are empty. |

**Score:** 22/32 truths verified (10 present, behavior-unverified)

### Deferred Items

| # | Item | Addressed In | Evidence |
|---|------|-------------|----------|
| 1 | Invitee cannot read other companies' people/requests via PostgREST | Phase 2 | Phase 2 SC: Company A cannot read or change Company B. TENANT-04. Phase 1 open policies match 009. Open RLS `USING (true)` is not a Phase 1 miss. |

### Required Artifacts

gsd-tools `verify.artifacts` all_passed for plans 01-06–01-09 (12/12 paths exist). Previous plans 01–05 artifacts still present (regression existence check). Level 2–4 checked in source:

| Artifact | Expected | Status | Details |
| -------- | ----------- | ------ | ------- |
| `apps/web/src/lib/password-client.ts` | Client checks aligned to PASSWORD_REQUIREMENTS | ✓ VERIFIED | Exports `passwordMeetsApiRules`, `firstPasswordError`, `passwordRequirementItems`, `mergeSignupFieldErrors`; wired into signup page |
| `apps/web/src/lib/password-client.test.ts` | node:test coverage for length, composition, 400 details | ✓ VERIFIED | On web test script; tests pass |
| `apps/web/src/app/auth/signup/page.tsx` | Visible password validation | ✓ VERIFIED | `passwordMeetsApiRules`, `mergeSignupFieldErrors`, `data.details`, sonner |
| `apps/web/src/lib/invite-auth.ts` | `inviteCreateConflict` + 409 copy constants | ✓ VERIFIED | Used by POST invites, preview, accept, accept-invite page |
| `apps/web/src/lib/invite-auth.test.ts` | same-company / other-company / pending / none | ✓ VERIFIED | 5 `inviteCreateConflict` cases pass |
| `apps/web/src/app/api/auth/invites/route.ts` | Global users.email lookup on POST | ✓ VERIFIED | Email-only lookup; pending still company-scoped |
| `apps/web/src/lib/invite-accept.ts` | `invitePreviewPageState` | ⚠️ ORPHANED helper | Exported and unit-tested; page/route do not import it. Equivalent states wired via preview 409 + `PageState` `exists` |
| `apps/web/src/app/api/auth/invites/preview/route.ts` | users.email check on preview | ✓ VERIFIED | `.from('users').select('id').eq('email', inviteEmail)` after usable; 409 `EMAIL_EXISTS_ERROR` |
| `apps/web/src/app/auth/accept-invite/page.tsx` | exists pageState + InviteStatusCard | ✓ VERIFIED | `exists` card; join form only when ready; sonner |
| `apps/web/src/lib/accept-invite-rpc.ts` | RPC args always include `p_password` | ✓ VERIFIED | Used by accept route and `auth.ts` |
| `apps/web/src/lib/google-signin-gate.ts` | `ACCOUNT_EXISTS_PATH` | ✓ VERIFIED | Exported next to `INVITE_REQUIRED_PATH`; imported by `auth.ts` |
| `apps/web/src/app/auth/error/page.tsx` | AccountExists copy and Sign in CTA | ✓ VERIFIED | Contains `AccountExists`; Sign in → `/auth/signin` |
| `packages/database/migrations/20250818193734_accept_invite_with_employee.sql` | Atomic accept RPC | ✓ VERIFIED | Nullable `p_password`; not STRICT; GRANT anon/authenticated/service_role |
| Prior Wave 0–5 artifacts (invite-token, company-owner, signup route, invites dialog, navigation, create-company RPC, pending cookies) | Unchanged contract | ✓ VERIFIED | Existence + wiring regression; no stub regressions found |

### Key Link Verification

gsd-tools `verify.key-links` all_verified for 01-06, 01-07, 01-09. Plan 01-08 reported preview → users as unverified (`from('users')` pattern miss). Manual read of `preview/route.ts` shows `.from('users')` after `inviteIsUsable` — **WIRED**; gsd-tools false negative on dotted call.

| From | To | Via | Status | Details |
| ---- | --- | --- | ------ | ------- |
| signup/page.tsx | password-client.ts | `passwordMeetsApiRules` | ✓ WIRED | validateForm, isFormReady, checklist |
| signup/page.tsx | signup/route.ts | `data.details` mapped onto errors.* | ✓ WIRED | `mergeSignupFieldErrors` |
| signup/page.tsx | session-provider sonner | `from 'sonner'` | ✓ WIRED | Toaster already mounted |
| invites/route.ts | invite-auth.ts | `inviteCreateConflict` | ✓ WIRED | After email-only users lookup |
| invite-teammates-dialog.tsx | POST invites 409 | `payload.error` | ✓ WIRED | Distinct copy |
| preview/route.ts | users table | `.from('users')` by invite email | ✓ WIRED | Manual; gsd-tools missed |
| accept-invite/page.tsx | GET preview | HTTP 409 → `pageState` exists | ✓ WIRED | |
| accept/route.ts | `accept_invite_with_employee` | `supabase.rpc` after bcrypt | ✓ WIRED | No users.insert |
| auth.ts | `ACCOUNT_EXISTS_PATH` | other-company and 23505 | ✓ WIRED | |
| auth.ts | `accept_invite_with_employee` | Google `passwordHash: null` | ✓ WIRED | |
| signup/page.tsx | signup/route.ts | `fetch('/api/auth/signup')` camelCase | ✓ WIRED | Regression |
| signup/route.ts | migration RPC | `create_company_with_owner` | ✓ WIRED | Regression |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| signup/route.ts | newUser | `supabase.rpc('create_company_with_owner')` | Yes (RPC) | ✓ FLOWING |
| signup/page.tsx | errors.password | `firstPasswordError` / `data.details` | Yes (client + API details) | ✓ FLOWING |
| invites/route.ts GET | invites, teammateCount, companyName | `company_invites` + `users` count + `companies.name` | Yes | ✓ FLOWING |
| invites/route.ts POST | token_hash, company_id / 409 error | `hashInviteTokenHex` + session owner company; conflict from global users row | Yes | ✓ FLOWING |
| preview/route.ts | companyName, email or 409 | invite join `companies(name)`; users by invite.email | Yes | ✓ FLOWING |
| accept/route.ts | users.email, company_id | `invite.email`, `companyIdFromInvite` → RPC | Yes (RPC) | ✓ FLOWING |
| error AccountExists | title/description | static `getErrorDetails` (correct for this surface) | N/A copy | ✓ FLOWING |

No hollow props on invite/signup/accept. Dashboard `User` mapping still uses mock `created_at`/`updated_at` (pre-existing; not Phase 1 tenant data).

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Helper unit tests | `npm test --workspace=@timeoff/web` | 51 pass, 0 fail, 0 skip | ✓ PASS |
| passwordMeetsApiRules rejects short8!! | same suite | pass | ✓ PASS |
| inviteCreateConflict other-company | same suite | pass | ✓ PASS |
| invitePreviewPageState exists | same suite | pass | ✓ PASS |
| ACCOUNT_EXISTS_PATH constant | same suite | pass | ✓ PASS |
| decideGoogleSignIn deny | same suite | pass | ✓ PASS |
| Live signup RPC | not run (would mutate DB / needs server) | — | ? SKIP |
| Live Google OAuth | env GOOGLE_CLIENT_* absent | cannot run | ? SKIP |
| accept_invite_with_employee rollback | not run (needs Postgres) | — | ? SKIP |

### Probe Execution

| Probe | Command | Result | Status |
| ----- | ------- | ------ | ------ |
| — | — | No `scripts/*/tests/probe-*.sh`; none declared in PLAN/SUMMARY | N/A |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ---------- | ----------- | ------ | -------- |
| TENANT-01 | 01-01, 01-02, 01-03, 01-06 | First user can create a company at signup and owns that org | ? NEEDS HUMAN | RPC + signup UI + Google null-password path + G-01-1 password UX wired; persist untested; G-01-1 human re-test required |
| TENANT-02 | 01-04, 01-07 | That user can invite people by email into only their company | ? NEEDS HUMAN | Owner API + dialog + nav wired; global 409 helper tested; UAT test 3 passed copy-link; other-company 409 needs human |
| TENANT-03 | 01-05, 01-08, 01-09 | Invitee joins that company and cannot see any other company | ? NEEDS HUMAN | Join binding + exists card + atomic RPC wired (no picker). “Cannot see” isolation is Phase 2 (deferred). Accept persist untested; G-01-4 accept human re-test required |
| TENANT-05 | 01-01, 01-03, 01-05, 01-09 | Google sign-in does not place a user in the wrong company or a global pool | ? NEEDS HUMAN | Gate + auth.ts deny/bind/mismatch/AccountExists wired; Google env absent (third-party blocked) |

**Orphaned requirements:** none. REQUIREMENTS.md maps TENANT-01, TENANT-02, TENANT-03, TENANT-05 to Phase 1. TENANT-04 is Phase 2 (not orphaned).

**Coverage:** 0/4 requirements fully SATISFIED by runtime evidence; all four have implementation evidence and need human confirmation. None BLOCKED (no missing/stub artifacts). G-01-1 and G-01-4 are implemented in code; diagnosed UAT session in `01-UAT.md` was not overwritten and still needs `/gsd-verify-work` re-test.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| — | — | No TBD/FIXME/XXX in Phase 1 lib/routes/auth/invite files | — | Debt-marker gate clean |
| `apps/web/src/lib/invite-accept.ts` | `invitePreviewPageState` | Helper used only from tests | ℹ️ Info | Preview route and accept-invite page implement the same states via HTTP 409; drift risk if one side changes |
| `apps/web/src/components/dashboard/dashboard-view.tsx` | ~72 | `created_at`/`updated_at` mock on mapped User | ℹ️ Info | Pre-existing; not tenant signup data |
| `packages/database/migrations/20250818193733_add_companies_and_invites.sql` | policies | `USING (true)` on companies/company_invites | ℹ️ Info | Intentional; TENANT-04 is Phase 2 |
| `apps/web/.env.local` | — | GOOGLE_CLIENT_ID/SECRET absent | ⚠️ Warning | Live TENANT-05 remains third-party blocked |

No blocker stubs. `009_fix_rls_for_nextauth.sql` not edited for this gap closure. No `packages/database/src/modules/companies` or `company-invites`. `IDatabaseService` has no invite methods.

### Test Quality Audit

| Test File | Linked Req | Active | Skipped | Circular | Assertion Level | Verdict |
|-----------|-----------|--------|---------|----------|-----------------|---------|
| invite-token.test.ts | TENANT-02/03 | 4 | 0 | no | Value | OK helpers |
| google-signin-gate.test.ts | TENANT-05 | 6 | 0 | no | Value | OK decision table + ACCOUNT_EXISTS_PATH; does not prove auth.ts |
| company-owner.test.ts | TENANT-01/02 | 4 | 0 | no | Value | OK predicate |
| create-company-rpc.test.ts | TENANT-01 | 2 | 0 | no | Value | OK args; does not prove RPC |
| pending-context-schema.test.ts | TENANT-05 | 5 | 0 | no | Value | OK schema |
| invite-auth.test.ts | TENANT-02 | 9 | 0 | no | Value | OK status mapper + inviteCreateConflict; not HTTP |
| invite-accept.test.ts | TENANT-03 | 8 | 0 | no | Value | OK mappers + preview pageState; not accept RPC |
| password-client.test.ts | TENANT-01 / G-01-1 | 10 | 0 | no | Value | OK length/composition/details merge; does not render the page |
| accept-invite-rpc.test.ts | TENANT-03 / G-01-4 | 3 | 0 | no | Value | OK args including null p_password; does not run SQL |

**Disabled tests on requirements:** 0
**Circular patterns detected:** 0
**Insufficient assertions:** persist paths (signup RPC, invite insert, accept RPC rollback, Google callback) have helper tests only → WARNING, not BLOCKER. `firstPasswordError` unit tests cover empty, minLength, and uppercase; lowercase/number/special messages exist in code in schema order but are not each asserted.

### Decision Coverage

Skipped — no `*-CONTEXT.md` in the phase directory.

### Prohibitions (judgment-tier)

Checked in code (non-authoritative). Unverified-prohibition — human review recommended, not a silent pass:

| Statement | Code evidence |
|-----------|----------------|
| Do not rebuild `/(admin)/users` as a global operator console | No Phase 1 feature work there |
| Do not restyle dashboard/request/calendar/forgot/reset except owner invite entry | Invite is nav + dashboard empty copy only |
| Do not add a new component library, font, or brand palette | Reuses shadcn + Inter |
| Do not put invite/company writes on IDatabaseService or browser facade | Route Handlers + `@/lib/supabase`; accept uses RPC |
| Do not add a fifth `users.role` CHECK | Still employee/supervisor/admin/hr; ownership is `owner_id` |
| Do not finish tenant RLS; do not edit 009 | New tables use open policies; 009 unmodified |
| Do not add a mailer | Copy-link only |
| Do not auto-provision unknown Google into a global pool | Gate + no missing-user insert |
| Do not pass company name via OAuth state | httpOnly cookies |
| Do not use Next 15 async `cookies()` | Sync `cookies()` |
| Do not add Gmail/Calendar/Drive/People scopes | GoogleProvider with id/secret only |
| Do not add a company picker on accept-invite | No `<select>` |
| Do not remount a second toaster in session-provider | Signup/accept-invite switch to already-mounted sonner |
| Do not weaken API passwordSchema | Client matches `PASSWORD_REQUIREMENTS`; route unchanged |
| Do not require Google OAuth env for G-01-1 | No `GOOGLE_CLIENT_ID` on credentials signup |
| Do not drop the global UNIQUE on users.email | Closed the 201-unredeemable path instead |
| Do not change decideGoogleSignIn deny-by-default for unknown Google | Unknown path still `INVITE_REQUIRED_PATH` |

### Human Verification Required

`01-UAT.md` was not overwritten (diagnosed session). Re-test G-01-1 and G-01-4 via `/gsd-verify-work`.

### 1. G-01-1 credentials create-company (password UX + persist)

**Test:** Open `/auth/signup`. Type an 8-character password: Create company stays disabled and the length checklist row is unmet. Type 12 letters with no number/special: still disabled with a password field or checklist miss. A valid 12+ composition password enables the CTA. Submit a unique email. Repeat the same email.
**Expected:** Visible password errors. Success toast Company created. Sign in with your new credentials. then `/auth/signin`. Duplicate copy on the email field. Signed-in owner has `isOwner`.
**Why human:** Planner deferred this to end-of-phase. Diagnosed UAT G-01-1 must be re-tested in the browser.

### 2. G-01-4 owner invite existing email

**Test:** As owner, invite an email already in this company, then an email that already signed up on another company.
**Expected:** This-company: That email is already in this company. Other-company: An account with this email already exists. Sign in, or ask your admin for an invite. No copy-link.
**Why human:** Dialog copy and live 409 against a session cookie need a browser.

### 3. G-01-4 accept-invite existing-account + new join

**Test:** Open a leftover invite link for an email that already has an account. Join with a new email on a fresh invite. Try a junk token.
**Expected:** Existing email: existing-account card and Back to sign in, not Join {company}. New email: Join {company}; credentials join lands on dashboard. Invalid/expired copy unchanged.
**Why human:** Diagnosed UAT G-01-4 must be re-tested. Preview/accept persist are runtime.

### 4. Live Google OAuth (TENANT-05; third-party blocked)

**Test:** Add Google client env. Unknown Gmail on `/auth/signin` with no pending cookies. Signup Google with company name filled. Optional: Google join with an email that already has an account.
**Expected:** Invite required for unknown Gmail (no global `users` insert). Signup Google creates owner with `p_password` null. Existing-account Google lands on AccountExists with Sign in, not Invite required.
**Why human:** `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` are absent; callback cannot be proven from unit tests. Live Google remains third-party blocked.

### Gaps Summary

**No automated blockers.** Artifacts exist, are substantive, and are wired. Open RLS is intentional Phase 2 work (deferred). Live Google OAuth is third-party blocked without `GOOGLE_CLIENT_ID`.

UAT gaps G-01-1 and G-01-4 are implemented in code (plans 01-06 through 01-09). Helper tests pass (51/51). Signup/invite/accept/Google persist paths still have no behavioral tests. Diagnosed `01-UAT.md` was left intact; human re-test of G-01-1 and G-01-4 is still required via `/gsd-verify-work`.

Status is `human_needed`, not `passed` (human section non-empty, including 10 behavior-unverified truths) and not `gaps_found` (no FAILED truth, missing artifact, unwired link, or debt-marker blocker).

---

_Verified: 2026-08-29T11:44:07Z_
_Verifier: Claude (gsd-verifier)_
