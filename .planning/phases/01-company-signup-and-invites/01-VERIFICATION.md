---
phase: 01-company-signup-and-invites
verified: 2026-08-29T09:36:53Z
status: human_needed
score: 12/20 must-haves verified
behavior_unverified: 8
overrides_applied: 0
decision_coverage:
  skipped: true
  reason: "No phase CONTEXT.md; no <decisions> block"
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
    expected: "company_invites.company_id equals the owner's company; 403 for non-owner; client cannot pass another company_id."
    why_human: "Owner gate helper is unit-tested; the HTTP persist path is not."
  - truth: "An invitee joins that company and cannot see any other company"
    test: "Open a copy-link, complete credentials join, confirm the new user has only that company_id."
    expected: "users.company_id equals the invite's company_id; no company picker; role employee."
    why_human: "companyIdFromInvite is unit-tested; accept INSERT is not exercised by a test. Cross-tenant reads are Phase 2."
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
    why_human: "Mapper is unit-tested; accept route INSERT is not."
  - truth: "Google accept: pending invite cookie; Google email must match invite.email or mismatch URL"
    test: "Accept-invite Continue with Google using a Google account that does not match the invited email."
    expected: "Redirect to /auth/accept-invite?error=mismatch; no employee insert."
    why_human: "Mismatch string is in auth.ts; no test drives the Google signIn callback."
human_verification:
  - test: "Open /auth/signup. Confirm company name is above Google, heading Create your company, Create company CTA uses the primary gradient, and submitting a unique email creates the company. Repeat the same email and confirm the duplicate copy. Loading keeps the card visible."
    expected: "Company name field, Create your company, Create company / Creating company.... Success toast Company created. Sign in with your new credentials. then /auth/signin. Duplicate: An account with this email already exists. Sign in, or ask your admin for an invite. Owner can sign in with isOwner."
    why_human: "Visual layout, loading, and live RPC persist cannot be proven by grep. Schema may be local-only while .env.local points at hosted Supabase."
  - test: "Configure Google OAuth (GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are currently absent). Unknown Gmail on /auth/signin with no pending cookies. Then signup Google with a company name filled."
    expected: "Unknown Gmail lands on Invite required with Create a company and Back to sign in; no users row in a global pool. Signup Google creates an owner via create_company_with_owner with p_password null."
    why_human: "Live Google OAuth and the NextAuth callback cannot be proven without credentials and a real Google account."
  - test: "Sign in as company owner. Open the avatar menu: Invite teammates between Settings and Log out. Send invite, copy the link, keep the dialog open. As a non-owner, confirm the item is hidden and POST /api/auth/invites returns 403 Only the company owner can invite teammates."
    expected: "Owner-only nav item; 201 with acceptUrl; hashed token at rest; dialog stays open with Copy invite link. Non-owner 403."
    why_human: "Nav visibility, copy-link UX, and live 401/403 against a session cookie need a browser."
  - test: "In a second browser, open the copy-link. Join with credentials. Try a junk token. Try Google with the wrong account."
    expected: "Join {company name}; credentials join lands on dashboard. Invalid token: This invite is invalid or has expired. Ask your admin to send a new invite. Wrong Google: This invite was sent to a different email...."
    why_human: "Accept persist, expired copy, and Google mismatch are runtime flows."
  - test: "Confirm the database behind NEXT_PUBLIC_SUPABASE_URL (hosted/remote in this checkout) actually has create_company_with_owner, users.company_id, and company_invites.token_hash VARCHAR(64). SUMMARY recorded db push --local only; hosted link needed a database password."
    expected: "The same project the app uses has the Phase 1 migration applied. Signup/invite/accept hit that schema, not a stale hosted DB."
    why_human: "Code cannot prove which Supabase the running app talks to, or that local push reached hosted."
---

# Phase 1: Company Signup and Invites Verification Report

**Phase Goal:** A client company can create itself at signup; later people join only that company by invite; Google cannot drop a user into a global pool.
**Verified:** 2026-08-29T09:36:53Z
**Status:** human_needed
**Re-verification:** No — initial verification
**Mode:** mvp (ROADMAP). ROADMAP goal is not user-story formatted (`user-story.validate` → false). PLAN objective is a valid user story and is used for User Flow Coverage. Verification continued rather than refusing, because the orchestrator asked to verify this phase and the plan-level story matches `/^As a .+, I want to .+, so that .+\.$/`.

## User Flow Coverage

User story: As a first user of a client company, I want to create my company at signup and invite teammates by email, so that later people join only that company and Google cannot drop anyone into a global employee pool.

| Step | Expected | Evidence | Status |
|------|----------|----------|--------|
| Create company at signup | First user submits company name + owner account and becomes owner | `apps/web/src/app/auth/signup/page.tsx` POSTs camelCase `companyName` to `/api/auth/signup`; route calls `create_company_with_owner` with bcrypt hash; RPC sets `owner_id` and role `admin` | ⚠️ present + wired; persist untested |
| Invite teammates by email | Owner invites into only their company and copies a link | Nav `isOwner` → `InviteTeammatesDialog` → GET/POST `/api/auth/invites`; `company_id` from session owner company; `hashInviteTokenHex` stored | ⚠️ present + wired; persist untested |
| Later people join only that company | Invitee joins the invite's company; no company picker | `/auth/accept-invite` has no `<select>`; preview/accept lookup by `token_hash`; insert uses `companyIdFromInvite` | ⚠️ present + wired; persist untested |
| Google cannot dump into a global pool | Unknown Google without pending cookies is denied | `decideGoogleSignIn` deny → `INVITE_REQUIRED_PATH`; `auth.ts` has no missing-user insert; Google provider omitted unless env is set | ⚠️ present + wired; live OAuth unconfigured |
| Outcome | Teammates join only that company; Google cannot drop anyone into a global employee pool | Join binding + default-deny Google gate in code; live outcome needs human | ⚠️ pending human |

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | ------- | ---------- | -------------- |
| 1 | First user at signup creates a company and owns that org | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | Signup page → POST `/api/auth/signup` → `supabase.rpc('create_company_with_owner', …)` with hashed password. SQL inserts company, admin user, then `owner_id`. No test runs the RPC. |
| 2 | That owner can invite people by email into only their company | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | `inviteEmailSchema` is email-only. POST insert uses `company.id` from `owner_id = session.user.id`, never body `company_id`. `inviteOwnerRejectStatus` tests pass. HTTP persist untested. |
| 3 | An invitee joins that company and cannot see any other company | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | Accept has no company picker; `companyIdFromInvite` tests ignore extra ids; accept/Google insert `company_id` from invite. PostgREST isolation deferred to Phase 2 (open RLS). |
| 4 | Google sign-in does not place a user in the wrong company or a global employee pool | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | `decideGoogleSignIn` tests cover allow/deny. `auth.ts` returns `INVITE_REQUIRED_PATH` when the gate denies; no missing-user insert. `GOOGLE_CLIENT_*` absent in `.env.local`. |
| 5 | hashInviteToken is SHA-256; hashInviteTokenHex is 64-char lowercase hex; inviteTokenMatches uses timingSafeEqual | ✓ VERIFIED | `invite-token.ts` + passing `invite-token.test.ts` (`npm test --workspace=@timeoff/web`). |
| 6 | decideGoogleSignIn returns true when existingUser, pendingCompany, or pendingInvite; else InviteRequired path | ✓ VERIFIED | Passing `google-signin-gate.test.ts`; `INVITE_REQUIRED_PATH` equals `/auth/error?error=InviteRequired`. |
| 7 | isCompanyOwner returns true only when userId equals ownerId and both are non-empty | ✓ VERIFIED | Passing `company-owner.test.ts`. |
| 8 | apps/web test script runs node:test with experimental-strip-types on the Wave 0+ helper tests | ✓ VERIFIED | `apps/web/package.json` `test` lists all seven `src/lib/*.test.ts` files; 29/29 passed. |
| 9 | Second credentials signup with the same email is 409 and must not create a second company | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | Route 409 on existing email and on Postgres `23505`. Client maps UI-SPEC duplicate copy. No DB test. |
| 10 | Concurrent signup: one winner; loser 409; no company row without owner_id | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | RPC is one plpgsql transaction (null owner only inside the transaction). No concurrent test. |
| 11 | create_company_with_owner p_password is nullable; helper always includes the key | ✓ VERIFIED | SQL `p_password TEXT`; `buildCreateCompanyWithOwnerArgs` tests hash and `null` with `hasOwnProperty`. Google path passes `passwordHash: null`. |
| 12 | company_invites.token_hash is VARCHAR(64) storing lowercase SHA-256 hex | ✓ VERIFIED | Migration `token_hash VARCHAR(64) NOT NULL UNIQUE`; store/lookup use `hashInviteTokenHex`. Live column type on hosted DB is human (see below). |
| 13 | Session.user includes companyId and isOwner after credentials or Google success | ✓ VERIFIED | `next-auth.d.ts` Session/User/JWT; `mapUserFromDatabase` maps `company_id`; session/jwt callbacks call `resolveIsOwner`. |
| 14 | POST /api/auth/invites: no session 401; non-owner 403; error Only the company owner can invite teammates | ✓ VERIFIED | `invite-auth.test.ts` covers 401/403/null. Route uses `getServerSession(authOptions)` then `inviteOwnerRejectStatus`. |
| 15 | Invite token_hash stored via hashInviteTokenHex; raw token not stored; 201 includes acceptUrl | ✓ VERIFIED | POST insert `{ token_hash }`; `acceptUrl` built from raw token; `devLog` logs invite id only. |
| 16 | Accept binds users.company_id to the invite's company_id only; UI has no company picker | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | `inviteAcceptSchema` has no company/email; page has no `<select>`. INSERT uses `companyIdFromInvite`. Persist untested. |
| 17 | Credentials accept inserts users.email from invite.email, never from the JSON body; 409 if email exists | ✓ VERIFIED | Schema has no email field; `email: inviteRow.email`; 409 if a user already has that email. |
| 18 | Invitee role is employee; they never become owner via accept | ✓ VERIFIED | Credentials and Google invite inserts set `role: 'employee'`. RPC owner path is signup-only (`admin` + `owner_id`). |
| 19 | Google accept: pending invite cookie; email must match invite.email or mismatch URL | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | `auth.ts` hashes cookie token, compares emails case-insensitively, returns `/auth/accept-invite?error=mismatch`. Accept page handles `error=mismatch`. No callback test. |
| 20 | Signup POST body is camelCase including companyName; 201 then toast and redirect /auth/signin | ✓ VERIFIED | Page JSON keys include `firstName`, `lastName`, `confirmPassword`, `companyName`. Toast and `router.push('/auth/signin')` after 201. |

**Score:** 12/20 truths verified (8 present, behavior-unverified)

### Deferred Items

| # | Item | Addressed In | Evidence |
|---|------|-------------|----------|
| 1 | Invitee cannot read other companies' people/requests via PostgREST | Phase 2 | Phase 2 SC: Company A cannot read or change Company B. TENANT-04. Phase 1 open policies match 009. |

### Required Artifacts

gsd-tools `verify.artifacts` all_passed for plans 01–05 (23/23 paths exist). Level 2–4 checked in source:

| Artifact | Expected | Status | Details |
| -------- | ----------- | ------ | ------- |
| `apps/web/src/lib/invite-token.ts` | Token hash helpers | ✓ VERIFIED | Exports generate/hash/hex/matches; wired into invites + accept + Google bind |
| `apps/web/src/lib/google-signin-gate.ts` | Google deny table | ✓ VERIFIED | Imported by `auth.ts` |
| `apps/web/src/lib/company-owner.ts` | Owner predicate | ✓ VERIFIED | Used by invite-auth and `resolveIsOwner` |
| `apps/web/package.json` | node:test script | ✓ VERIFIED | `experimental-strip-types` + seven test files |
| `packages/database/migrations/20250818193733_add_companies_and_invites.sql` | Tenant schema + RPC | ✓ VERIFIED | companies, company_invites, `users.company_id` NOT NULL, `create_company_with_owner`, GRANT anon |
| `apps/web/src/lib/create-company-rpc.ts` | RPC args mapper | ✓ VERIFIED | Used by signup route and Google create-company |
| `packages/types/src/index.ts` | `User.company_id` | ✓ VERIFIED | Field present |
| `apps/web/src/app/api/auth/signup/route.ts` | POST via RPC | ✓ VERIFIED | bcrypt 12 then RPC; 409 duplicate |
| `apps/web/src/app/auth/signup/page.tsx` | Create company UI | ✓ VERIFIED | Copy + camelCase fetch; company name above Google |
| `apps/web/src/lib/validation.ts` | companyName, pending, invite schemas | ✓ VERIFIED | All present |
| `apps/web/src/lib/pending-auth-cookie.ts` | httpOnly cookies | ✓ VERIFIED | Names, maxAge 600, sync `cookies()` |
| `apps/web/src/app/api/auth/pending-context/route.ts` | POST pending cookies | ✓ VERIFIED | 204; no OAuth state |
| `apps/web/src/lib/auth.ts` | Google gate + bind | ✓ VERIFIED | `decideGoogleSignIn`, null password RPC, invite bind, mismatch URL |
| `apps/web/src/app/auth/error/page.tsx` | InviteRequired | ✓ VERIFIED | Title/description/actions; Suspense `h-8 w-8` spinner |
| `apps/web/src/lib/invite-auth.ts` | 401/403 mapper | ✓ VERIFIED | Used by invites route |
| `apps/web/src/app/api/auth/invites/route.ts` | GET/POST owner invites | ✓ VERIFIED | Session + hash store + company from owner |
| `apps/web/src/components/invite-teammates-dialog.tsx` | Owner dialog | ✓ VERIFIED | sonner; GET/POST `/api/auth/invites`; copy link |
| `apps/web/src/components/navigation.tsx` | Invite teammates item | ✓ VERIFIED | Between Settings and Log out; `isOwner` |
| `apps/web/src/app/api/auth/invites/preview/route.ts` | GET preview by hash | ✓ VERIFIED | Returns `{ companyName, email }` |
| `apps/web/src/app/api/auth/invites/accept/route.ts` | POST credentials accept | ✓ VERIFIED | Email from invite; role employee |
| `apps/web/src/app/auth/accept-invite/page.tsx` | Join company UI | ✓ VERIFIED | No picker; preview + accept + pending-context Google |
| `apps/web/src/lib/invite-accept.ts` | companyIdFromInvite, inviteIsUsable | ✓ VERIFIED | Tests pass; used by accept + auth.ts |

### Key Link Verification

gsd-tools `verify.key-links` all_verified for plans 01–05. Manual wiring:

| From | To | Via | Status | Details |
| ---- | --- | --- | ------ | ------- |
| signup/page.tsx | signup/route.ts | `fetch('/api/auth/signup')` camelCase | ✓ WIRED | Includes companyName |
| signup/route.ts | migration RPC | `supabase.rpc('create_company_with_owner')` | ✓ WIRED | Real RPC, not static JSON |
| signup/page.tsx | pending-context/route.ts | POST `{ kind: 'company', companyName }` then `signIn('google')` | ✓ WIRED | Empty name blocked |
| auth.ts | google-signin-gate.ts | `decideGoogleSignIn` in Google `signIn` | ✓ WIRED | Deny returns `INVITE_REQUIRED_PATH` |
| auth.ts | error/page.tsx | `error=InviteRequired` | ✓ WIRED | `getErrorDetails` case |
| invite-teammates-dialog.tsx | invites/route.ts | GET/POST `/api/auth/invites` credentials include | ✓ WIRED | |
| invites/route.ts | invite-auth.ts | `inviteOwnerRejectStatus` | ✓ WIRED | |
| navigation.tsx | invite-teammates-dialog.tsx | `isOwner` opens dialog | ✓ WIRED | |
| accept-invite/page.tsx | preview/route.ts | GET `?token=` | ✓ WIRED | |
| accept-invite/page.tsx | accept/route.ts | POST token, names, passwords | ✓ WIRED | No email/companyId |
| auth.ts | pending invite cookie | `pendingInvite` + `hashInviteTokenHex` | ✓ WIRED | Bind/mismatch in signIn |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| signup/route.ts | newUser | `supabase.rpc('create_company_with_owner')` | Yes (RPC) | ✓ FLOWING |
| invites/route.ts GET | invites, teammateCount, companyName | `company_invites` + `users` count + `companies.name` | Yes | ✓ FLOWING |
| invites/route.ts POST | token_hash, company_id | `hashInviteTokenHex` + session owner company | Yes | ✓ FLOWING |
| preview/route.ts | companyName, email | invite join `companies(name)` | Yes | ✓ FLOWING |
| accept/route.ts | users.email, company_id | `invite.email`, `companyIdFromInvite` | Yes | ✓ FLOWING |
| dashboard-view.tsx | teammateCount | GET `/api/auth/invites` | Yes | ✓ FLOWING |
| error InviteRequired | title/description | static `getErrorDetails` (correct for this surface) | N/A copy | ✓ FLOWING |

No hollow props on invite/signup/accept. Dashboard `User` mapping still uses mock `created_at`/`updated_at` (pre-existing; not Phase 1 tenant data).

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Helper unit tests | `npm test --workspace=@timeoff/web` | 29 pass, 0 fail | ✓ PASS |
| decideGoogleSignIn deny | same suite `returns INVITE_REQUIRED_PATH when…` | pass | ✓ PASS |
| isCompanyOwner empty ids | same suite | pass | ✓ PASS |
| companyIdFromInvite ignores extra ids | same suite | pass | ✓ PASS |
| Live signup RPC | not run (would mutate DB / needs server) | — | ? SKIP |
| Live Google OAuth | env GOOGLE_CLIENT_* absent | cannot run | ? SKIP |

### Probe Execution

| Probe | Command | Result | Status |
| ----- | ------- | ------ | ------ |
| — | — | No `scripts/*/tests/probe-*.sh`; none declared in PLAN/SUMMARY | N/A |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ---------- | ----------- | ------ | -------- |
| TENANT-01 | 01-01, 01-02, 01-03 | First user can create a company at signup and owns that org | ? NEEDS HUMAN | RPC + signup UI + Google null-password path wired; persist untested; hosted vs local schema unproven |
| TENANT-02 | 01-04 | That user can invite people by email into only their company | ? NEEDS HUMAN | Owner API + dialog + nav wired; live invite untested |
| TENANT-03 | 01-05 | Invitee joins that company and cannot see any other company | ? NEEDS HUMAN | Join binding wired (no picker). “Cannot see” isolation is Phase 2 (deferred). Accept persist untested |
| TENANT-05 | 01-01, 01-03, 01-05 | Google sign-in does not place a user in the wrong company or a global pool | ? NEEDS HUMAN | Gate + auth.ts deny/bind/mismatch wired; Google env absent |

**Orphaned requirements:** none. REQUIREMENTS.md maps TENANT-01, TENANT-02, TENANT-03, TENANT-05 to Phase 1. TENANT-04 is Phase 2 (not orphaned).

**Coverage:** 0/4 requirements fully SATISFIED by runtime evidence; all four have implementation evidence and need human confirmation. None BLOCKED (no missing/stub artifacts).

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| — | — | No TBD/FIXME/XXX in Phase 1 lib/routes/auth/invite files | — | Debt-marker gate clean |
| `apps/web/src/components/dashboard/dashboard-view.tsx` | ~72 | `created_at`/`updated_at` mock on mapped User | ℹ️ Info | Pre-existing; not tenant signup data |
| `packages/database/migrations/20250818193733_add_companies_and_invites.sql` | policies | `USING (true)` on companies/company_invites | ℹ️ Info | Intentional; TENANT-04 is Phase 2 |
| `apps/web/.env.local` | — | GOOGLE_CLIENT_ID/SECRET absent; Supabase URL is hosted/remote | ⚠️ Warning | Live TENANT-05 and hosted schema need human |

No blocker stubs. `009_fix_rls_for_nextauth.sql` git diff empty. No `packages/database/src/modules/companies` or `company-invites`. `IDatabaseService` has no invite methods.

### Test Quality Audit

| Test File | Linked Req | Active | Skipped | Circular | Assertion Level | Verdict |
|-----------|-----------|--------|---------|----------|-----------------|---------|
| invite-token.test.ts | TENANT-02/03 | 4 | 0 | no | Value | OK helpers |
| google-signin-gate.test.ts | TENANT-05 | 5 | 0 | no | Value | OK decision table; does not prove auth.ts |
| company-owner.test.ts | TENANT-01/02 | 4 | 0 | no | Value | OK predicate |
| create-company-rpc.test.ts | TENANT-01 | 2 | 0 | no | Value | OK args; does not prove RPC |
| pending-context-schema.test.ts | TENANT-05 | 5 | 0 | no | Value | OK schema |
| invite-auth.test.ts | TENANT-02 | 4 | 0 | no | Value | OK status mapper; not HTTP |
| invite-accept.test.ts | TENANT-03 | 5 | 0 | no | Value | OK mappers; not accept INSERT |

**Disabled tests on requirements:** 0
**Circular patterns detected:** 0
**Insufficient assertions:** 4 requirement persist paths (signup RPC, invite insert, accept insert, Google callback) have helper tests only → WARNING, not BLOCKER (helpers are value-level and active)

### Decision Coverage

Skipped — no `*-CONTEXT.md` in the phase directory.

### Prohibitions (judgment-tier)

Checked in code (non-authoritative). Unverified-prohibition — human review recommended, not a silent pass:

| Statement | Code evidence |
|-----------|----------------|
| Do not rebuild `/(admin)/users` as a global operator console | No Phase 1 feature work there; dashboard empty copy instead |
| Do not restyle dashboard/request/calendar/forgot/reset except owner invite entry | Invite is nav + dashboard empty copy only; dashboard-header has no Invite CTA |
| Do not add a new component library, font, or brand palette | Reuses shadcn + Inter |
| Do not put invite/company writes on IDatabaseService or browser facade | Route Handlers + `@/lib/supabase` |
| Do not add a fifth `users.role` CHECK | Still employee/supervisor/admin/hr; ownership is `owner_id` |
| Do not finish tenant RLS; do not edit 009 | New tables use open policies; 009 unmodified |
| Do not add a mailer | Copy-link only |
| Do not auto-provision unknown Google into a global pool | Gate + no missing-user insert |
| Do not pass company name via OAuth state | httpOnly cookies |
| Do not use Next 15 async `cookies()` | Sync `cookies()` |
| Do not add Gmail/Calendar/Drive/People scopes | GoogleProvider with id/secret only |
| Do not add a company picker on accept-invite | No `<select>` |
| Do not seed leave_balances this phase | seed.sql has no new balance rows in the Phase 1 company insert path reviewed |

### Human Verification Required

### 1. Credentials create-company (UI + persist)

**Test:** Open `/auth/signup`. Confirm company name above Google, heading Create your company, primary-gradient Create company CTA. Submit a unique email. Repeat the same email. Watch loading: card stays visible.
**Expected:** Success toast Company created. Sign in with your new credentials. then `/auth/signin`. Duplicate copy An account with this email already exists. Sign in, or ask your admin for an invite. Signed-in owner has `isOwner`.
**Why human:** Visual/loading plus live RPC. Hosted DB may lack the migration.

### 2. Live Google OAuth (TENANT-05)

**Test:** Add Google client env. Unknown Gmail on `/auth/signin` with no pending cookies. Signup Google with company name filled.
**Expected:** Invite required card (heading, description, Create a company, Back to sign in); no global `users` insert. Signup Google creates owner with `p_password` null.
**Why human:** `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` are absent; callback cannot be proven from unit tests.

### 3. Owner copy-link invites

**Test:** Sign in as owner. Invite teammates between Settings and Log out. Send invite, copy link, dialog stays open. As non-owner: item hidden; POST invites 403.
**Expected:** Hashed token at rest; `acceptUrl` copyable; 403 copy Only the company owner can invite teammates.
**Why human:** Session cookie, nav visibility, copy UX.

### 4. Accept invite (credentials + invalid + Google mismatch)

**Test:** Second browser opens the copy-link. Join with credentials. Junk token. Google with the wrong account.
**Expected:** Join {company}; dashboard after credentials join. Invalid/expired copy. Mismatch copy. Invitee is employee of that company only.
**Why human:** Persist and OAuth mismatch are runtime.

### 5. Hosted vs local Supabase

**Test:** Compare `NEXT_PUBLIC_SUPABASE_URL` (hosted/remote in this checkout) with where `supabase db push --local` ran. Confirm `create_company_with_owner`, `users.company_id`, and `company_invites.token_hash` exist on the DB the app uses.
**Expected:** App and schema are the same project. Signup does not 500 on a missing RPC.
**Why human:** SUMMARY recorded local push only; hosted link needed a database password. Code cannot prove the live catalog.

### Gaps Summary

**No automated blockers.** Artifacts exist, are substantive, and are wired. Open RLS is intentional Phase 2 work (deferred).

Phase goal is implemented in code but not runtime-proven: helper tests pass; signup/invite/accept/Google persist paths have no behavioral tests; Google OAuth is unconfigured; `.env.local` points at hosted Supabase while the executor reported a local-only schema push.

Status is `human_needed`, not `passed` (human section non-empty, including 8 behavior-unverified truths) and not `gaps_found` (no FAILED truth, missing artifact, unwired link, or debt-marker blocker).

---

_Verified: 2026-08-29T09:36:53Z_
_Verifier: Claude (gsd-verifier)_
