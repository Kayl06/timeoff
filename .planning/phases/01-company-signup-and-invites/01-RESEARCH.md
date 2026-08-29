# Phase 1: Company Signup and Invites - Research

**Researched:** 2026-08-29
**Domain:** Multi-tenant company onboarding on Next.js 14 App Router + NextAuth v4 JWT + Supabase Postgres
**Confidence:** HIGH (brownfield + official NextAuth/Node docs); MEDIUM on OAuth cookie transport and invite TTL

<user_constraints>
## User Constraints (from CONTEXT.md)

No CONTEXT.md exists for this phase — there are no discuss-phase locked decisions. Do not invent them.

### Planning constraints (from PROJECT.md, ROADMAP.md, UI-SPEC, CLAUDE.md — honor these)

- Stay on Next.js App Router (`apps/web`), NextAuth, `@timeoff/database` modules, Supabase Postgres. Do not add a second ORM or a parallel app.
- Do not rebuild shipped dashboards, request form, calendar chrome, forgot-password, or reset-password. Do not finish stub `/(admin)/users`.
- Onboarding is first-user signup + invites. Phase 2 owns RLS / server authz hardening — Phase 1 must not pretend isolation is finished, but invite/join MUST bind users to the creating company only.
- UI-SPEC approved 2026-08-29: reuse shadcn New York auth chrome. Surfaces: `/auth/signup`, `/auth/signin`, new `/auth/accept-invite`, `/auth/error?error=InviteRequired`, owner-only Invite teammates Dialog. Copy is specified in the UI-SPEC — implement against existing auth/DB, do not restyle.
- No mailer is wired (`INTEGRATIONS.md`). Phase 1 delivery is copy-invite-link (UI-SPEC success helper). Do not add Resend/SendGrid/Nodemailer this phase.
- Prefer modifying auth in place over a greenfield rewrite.

### Claude's Discretion (recommendations — not user-locked)

- Represent “owner” as `companies.owner_id`, not a new `UserRole` value. First user role = existing `'admin'`; invitees = `'employee'`.
- Invite TTL = 7 days (no product decision exists).
- Pass company name / invite token through Google via a short-lived httpOnly cookie, not OAuth `state` (NextAuth overrides `state`).
- Create company + owner in one Postgres RPC so `users.company_id` and `companies.owner_id` cannot diverge.
- Invite/list/accept APIs are Next.js Route Handlers with `getServerSession` — do not add invite writes to the browser `IDatabaseService` facade.
- Wave 0 tests use Node built-in `node:test` (no new Vitest install).

### Deferred Ideas (OUT OF SCOPE)

- TENANT-04 / AUTHZ-01–03 (Phase 2): real RLS, stop anon-key mutations, Company A cannot read Company B rows.
- BAL-02: default `leave_balances` on signup (Phase 3).
- AUTH-01–04 password reset mail (Phase 6).
- ADMIN-01 / stub `/(admin)/users`.
- Working-day math, `leave_policies` enforcement, mailer productization.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TENANT-01 | First user can create a company at signup and owns that org | Extend `POST /api/auth/signup` + Google-from-signup: insert `companies` row, set `users.company_id`, set `companies.owner_id` to that user. RPC `create_company_with_owner`. Role `'admin'`. Redirect to `/auth/signin` after credentials signup (existing success path). |
| TENANT-02 | That user can invite people by email into only their company | Owner-only `POST /api/auth/invites` using `getServerSession`; insert `company_invites` with `company_id` from the owner’s company only; return accept URL; Dialog lists pending invites for that company. |
| TENANT-03 | Invitee joins that company and cannot see any other company | Accept path binds `users.company_id` to the invite’s `company_id` only. No company picker. Phase 1 does **not** close RLS (`USING (true)` remains). “Cannot see” = join binding + no picker. Cross-tenant PostgREST reads stay a Phase 2 hole. |
| TENANT-05 | Google sign-in does not place a user in the wrong company or a global pool | Stop auto-insert of unknown Google users as `'employee'` with `'Unassigned'`. Unknown Google on `/auth/signin` → `signIn` callback returns `'/auth/error?error=InviteRequired'`. Google on signup requires pending company cookie. Google on accept-invite requires pending invite cookie and email match. |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

Actionable directives the planner must not contradict:

- **Stack:** Next.js App Router `apps/web`, NextAuth v4 `NextAuthOptions` (not Auth.js v5), `@timeoff/database` repository → service → factory, Supabase JS only (no Prisma/Drizzle, no `DATABASE_URL` driver).
- **App Next major:** `apps/web` is Next `^14.2.18`. Do not use Next 15 async `params` / async `cookies()` APIs. Root `package.json` lists `next` `15.4.6` — ignore that for app code.
- **Identity vs domain:** Auth/signup already talk to `users` via `apps/web/src/lib/supabase.ts`. Keep that split for company/invite writes, or migrate onto `UserService` — do not invent a third client.
- **No domain HTTP API for leave:** Leave stays on `IDatabaseService`. Company/invite **are** identity onboarding — Route Handlers next to signup are the existing BFF pattern.
- **Conventions:** kebab-case files (`invite-teammates-dialog.tsx`, `accept-invite/page.tsx`); database modules `types.ts` / `repository.ts` / `service.ts` / `index.ts`; migrations in `packages/database/migrations/` with numeric or timestamp prefix; API handlers named `GET`/`POST`; Zod schemas in `apps/web/src/lib/validation.ts`; session augmentation in `apps/web/src/types/next-auth.d.ts`.
- **Errors:** API `try/catch`, `NextResponse.json` with 400 / 409 / 500; `validateInput` + `formatValidationErrors`; `devLog` in `apps/web`; `DatabaseUtils.handleDatabaseError` maps `PGRST116` → `NOT_FOUND`, `23505` → `DUPLICATE_ENTRY`, `23503` → `FOREIGN_KEY_VIOLATION`.
- **UI:** Import shadcn from `@/components/ui/*`; sonner for signed-in mutations (invite dialog); auth pages may keep `react-hot-toast`. Do not add a dashboard header CTA next to `LeaveRequestForm`.
- **Admin IA:** Do not build `/(admin)/users`.
- **GSD workflow:** Execution of planned work goes through `/gsd-execute-phase` (this research file is the planning artifact).

## Summary

Phase 1 is a **schema + identity-flow** change on a single-directory app. There is no company foreign key today. Credentials signup inserts a global `users` row with `department: 'Unassigned'`, `team: 'Unassigned'`, `role: 'employee'`. Google `signIn` auto-inserts the same shape for any unknown Gmail. That is the TENANT-05 leak. The shipped UI already has signup, sign-in, NextAuth Google, an error page with `getErrorDetails()`, and an avatar `DropdownMenu` — the UI-SPEC is copy and a few fields/routes, not a new design system.

The standard approach for this stack: add `companies` + `company_invites`, bind every new `users` row to exactly one `company_id`, treat owner as `companies.owner_id`, and run join/invite through **session-authenticated Route Handlers** (middleware does not protect `/api`). Use NextAuth’s documented `signIn` callback **string return** to land unknown Google users on `/auth/error?error=InviteRequired`. Do not `return false` (that becomes `AccessDenied`). Do not store raw invite tokens. Do not install a mailer. Do not restore RLS this phase.

**Primary recommendation:** Add `companies` / `company_invites` + a `create_company_with_owner` RPC; extend signup and NextAuth Google; add invite/accept Route Handlers; reuse shadcn Dialog + auth cards per UI-SPEC.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Create company + owner at credentials signup | API / Backend (`POST /api/auth/signup`) | Database / Storage (RPC + tables) | Password hash and org insert already live on the signup route, not in the browser |
| Google create-company / join-invite / deny-unknown | Frontend Server (NextAuth callbacks in `auth.ts`) | Browser (set pending cookie, then `signIn('google')`) | OAuth code exchange is server-side; UI only starts the flow |
| Invite create + pending list | API / Backend (`/api/auth/invites`) | Browser (Dialog form/list) | Owner check must use JWT session; middleware excludes `api/**` |
| Accept invite (credentials + Google) | API / Backend + NextAuth `signIn` | Browser (`/auth/accept-invite`) | Token lookup and `company_id` bind must not run with the anon key from the client |
| Session `companyId` / `isOwner` for nav | Frontend Server (jwt + session callbacks) | Browser (hide menu item) | UI hide is UX; API still 403s non-owners |
| Tenant isolation (row visibility) | Database / Storage (Phase 2 RLS) | API / Backend (Phase 2) | Phase 1 binds `company_id` only; `USING (true)` stays |

## Standard Stack

Reuse existing packages. **Do not add runtime dependencies.**

### Core

| Library | Version (declared / lockfile from STACK.md) | Purpose | Why Standard |
|---------|-----------------------------------------------|---------|--------------|
| next | `^14.2.18` (lockfile `14.2.35`) in `apps/web` | App Router pages + Route Handlers | Brownfield app to extend; do not use Next 15 APIs |
| next-auth | `^4.24.5` (lockfile `4.24.15`; npm current `4.24.15` 2026-07-20) | JWT session, Google, credentials | Already wired in `apps/web/src/lib/auth.ts` |
| @supabase/supabase-js | `^2.53.0` in `apps/web` | Postgres via PostgREST | Only data client; no second ORM |
| zod | `^3.25.76` in `apps/web` (registry latest is 4.x — **do not upgrade**) | Request validation | `userRegistrationSchema` / `validateInput` already here |
| bcryptjs | `^3.0.2` | Password hash 12 rounds | Signup + credentials `authorize` |
| node:crypto | Node `>=18.0.0` | Invite token + SHA-256 | Built-in; no `uuid`/`nanoid` package |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-hook-form + @hookform/resolvers | existing | Forms | Optional for invite dialog; signup today is manual `useState` — match signup unless you already use RHF on that page |
| sonner | `^2.0.7` | Toasts on signed-in invite dialog | UI-SPEC: invite dialog uses sonner |
| react-hot-toast | `^2.4.1` | Auth page toasts | Keep on signup/accept-invite; do not migrate forgot/reset |
| lucide-react | existing | `Building2`, `Mail`, `Loader2` | UI-SPEC icons |
| shadcn Dialog / DropdownMenu / Input / Button / Card / Badge | already in `apps/web/src/components/ui/` | Invite UI | No new primitive; UI-SPEC registry: none new |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Cookie for Google extra data | OAuth `state` / `authorizationParams` | NextAuth overrides `state`; third `signIn` arg goes to Google, not `signIn` callback `[CITED: next-auth.js.org/getting-started/client]` |
| `companies.owner_id` | New `role = 'owner'` | `users.role` CHECK is only `'employee', 'supervisor', 'admin', 'hr'` — altering CHECK is unnecessary |
| Copy invite link | Resend/Nodemailer | No mailer wired; Phase 4/6 own mail |
| Vitest 4 | `node:test` | Vitest 4 engines Node 20+; latest `vitest` legitimacy `SUS` (too-new); Docker image is `node:18-alpine` |
| Client `IDatabaseService.createInvite` | Route Handler | Anon key + `USING (true)` would let anyone insert invites |

**Installation:**

```bash
# No new runtime packages.
# Wave 0 tests: Node built-in test runner (see Validation Architecture).
```

**Version verification:** `npm view next-auth version` → `4.24.15`. `npm view zod version` → `4.5.2` (do not switch the app to Zod 4). `npm view bcryptjs version` → `3.0.3`. `npm view vitest version` → `4.1.11` (do not install).

## Package Legitimacy Audit

> Phase 1 installs **no** new runtime packages. Wave 0 uses `node:test`.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| next-auth (existing) | npm | years | ~6M/wk | github.com/nextauthjs/next-auth | OK | Already in `apps/web` |
| bcryptjs (existing) | npm | years | ~13M/wk | github.com/dcodeIO/bcrypt.js | OK | Already in `apps/web` |
| zod (existing `^3.25.76`) | npm | years | high | github.com/colinhacks/zod | latest tag flagged SUS too-new | **Do not upgrade to Zod 4** |
| vitest (not recommended) | npm | latest 4.1.11 published 2026-08 | high | github.com/vitest-dev/vitest | SUS (too-new on latest) | **REMOVED from recommendations** |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** `vitest` (latest), `zod` latest 4.x — planner must not `npm install vitest` or `zod@4`. Keep existing Zod 3 in the app.

No `postinstall` scripts on `next-auth` / `vitest` (checked via `npm view … scripts.postinstall`).

## Architecture Patterns

### System Architecture Diagram

```
Credentials signup:
  Browser /auth/signup
    → POST /api/auth/signup { companyName, firstName, lastName, email, password, … }
    → Zod validate
    → duplicate email? 409
    → bcrypt(12)
    → RPC create_company_with_owner
         → INSERT companies(name)
         → INSERT users(..., company_id, role='admin')
         → UPDATE companies.owner_id
    → 201 → toast → /auth/signin

Google create company:
  Browser: POST /api/auth/pending-context { kind:'company', companyName }
    → Set-Cookie httpOnly pending
    → signIn('google', { callbackUrl: '/dashboard' })
  NextAuth Google callback
    → signIn({ account.provider==='google' })
    → cookies: pending company name?
         yes + no existing user → RPC create_company_with_owner (Google names, no password)
         yes + existing user → deny or ignore (duplicate email)
         no + existing user with company_id → allow
         no + unknown email → return '/auth/error?error=InviteRequired'

Owner invite:
  Browser Dialog → POST /api/auth/invites { email }  (session cookie)
    → getServerSession(authOptions)
    → 401 if no session; 403 if user.id !== companies.owner_id
    → 409 if email already in this company
    → randomBytes(32) hex token; store sha256(token); expires_at = now+7d
    → 201 { email, acceptUrl, expiresAt }
    → GET /api/auth/invites → pending rows for this company only

Accept invite:
  GET /auth/accept-invite?token=  → GET /api/auth/invites/preview?token=
    → invalid/expired → error card copy
  Credentials join → POST /api/auth/invites/accept { token, firstName, lastName, password }
    → hash lookup; email match; insert user company_id = invite.company_id role='employee'; mark accepted
    → then signIn credentials → /dashboard
  Google join → pending-context { kind:'invite', token } then signIn('google')
    → signIn callback: invite token cookie; Google email must match invite.email
```

### Recommended Project Structure

```
packages/database/migrations/20260829HHMMSS_add_companies_and_invites.sql
packages/database/src/modules/companies/     # types, repository, service, index — server/future use
packages/database/src/modules/company-invites/
apps/web/src/lib/invite-token.ts            # hashInviteToken, generateInviteToken (node:crypto)
apps/web/src/lib/pending-auth-cookie.ts     # cookie name + maxAge helpers
apps/web/src/app/api/auth/signup/route.ts   # extend existing
apps/web/src/app/api/auth/invites/route.ts  # GET list, POST create
apps/web/src/app/api/auth/invites/accept/route.ts
apps/web/src/app/api/auth/invites/preview/route.ts
apps/web/src/app/api/auth/pending-context/route.ts
apps/web/src/app/auth/accept-invite/page.tsx
apps/web/src/components/invite-teammates-dialog.tsx
apps/web/src/lib/auth.ts                    # Google signIn rewrite
apps/web/src/types/next-auth.d.ts           # companyId, isOwner
apps/web/src/lib/validation.ts              # companyName + inviteEmail schemas
apps/web/src/lib/invite-token.test.ts       # node:test
```

Do **not** add invite methods to `IDatabaseService` in `packages/database/src/index.ts` this phase.

### Pattern 1: NextAuth signIn allow / deny / custom error URL

**What:** `signIn` callback returns `true`, `false`, or a URL string. String redirects **cancel** the auth flow.

**When to use:** Unknown Google on sign-in; failed invite email match.

**Example:**

```ts
// Source: https://next-auth.js.org/configuration/callbacks
callbacks: {
  async signIn({ user, account, profile, email, credentials }) {
    const isAllowedToSignIn = true
    if (isAllowedToSignIn) {
      return true
    } else {
      // Return false to display a default error message
      return false
      // Or you can return a URL to redirect to:
      // return '/unauthorized'
    }
  }
}
```

Phase 1 unknown Google (no pending company, no pending invite, no existing `users` row):

```ts
return '/auth/error?error=InviteRequired'
```

Do not `return false` — that becomes `AccessDenied` on `pages.error` `[CITED: next-auth.js.org/configuration/pages]`.

### Pattern 2: getServerSession on Route Handlers

**What:** Server session without an extra `/api/auth/session` fetch.

**When to use:** Every invite POST/GET. Middleware matcher excludes `api`.

**Example:**

```ts
// Source: https://next-auth.js.org/configuration/nextjs
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Only the company owner can invite teammates.' }, { status: 401 })
  }
  // then owner_id check → 403 with same UI-SPEC unauthorized copy
}
```

App Router call is `getServerSession(authOptions)` (no req/res) `[CITED: next-auth.js.org/configuration/nextjs]`.

### Pattern 3: Invite token = raw URL secret, hashed at rest

**What:** `randomBytes(32).toString('hex')` in the link; store `createHash('sha256').update(token).digest()`.

**When to use:** All invite create/accept.

**Example:**

```ts
// Source: https://nodejs.org/docs/latest-v18.x/api/crypto.html
import { randomBytes, createHash, timingSafeEqual } from 'node:crypto'

export function generateInviteToken(): string {
  return randomBytes(32).toString('hex')
}

export function hashInviteToken(token: string): Buffer {
  return createHash('sha256').update(token, 'utf8').digest()
}

export function inviteTokenMatches(token: string, storedHash: Buffer): boolean {
  const a = hashInviteToken(token)
  if (a.length !== storedHash.length) return false
  return timingSafeEqual(a, storedHash)
}
```

Look up by hash (unique index), then `timingSafeEqual` if you compare in app code. Prefer `eq('token_hash', hex)` after hashing the query token so you never scan raw tokens.

### Anti-Patterns to Avoid

- **Google auto-provision into a global pool:** Current `auth.ts` inserts `role: 'employee'` + `'Unassigned'` when no row exists. Delete that branch.
- **`return false` for InviteRequired:** Lands on AccessDenied copy, not UI-SPEC Invite required.
- **Putting company name in OAuth `state` or `authorizationParams`:** Third `signIn` argument is for the provider authorize URL; `state` is reserved `[CITED: next-auth.js.org/getting-started/client]`.
- **`await cookies()`:** Next 15 API. App is Next 14 — `cookies()` is synchronous `[CITED: nextjs.org/docs/app/api-reference/functions/cookies]`.
- **Exposing invites on `IDatabaseService` in the browser:** Anon key + `USING (true)`.
- **Storing raw tokens in `company_invites`.**
- **Adding `'owner'` to `users.role` CHECK** unless you also migrate every role comparison (`isAdminOrHR`).
- **Building `/(admin)/users` or a dashboard teammate table.**
- **Seeding `leave_balances` this phase** (BAL-02 / Phase 3).
- **Using Next 15 `cookies()` async or Auth.js v5.**

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session on API routes | Manual JWT parse | `getServerSession(authOptions)` from `next-auth/next` | Cookie/JWT format is NextAuth’s |
| Invite token CSPRNG | `Math.random()` / short codes | `crypto.randomBytes` | Guessable tokens = join any company |
| Password hashing | Custom hash | existing `bcryptjs` 12 rounds | Already the credentials path |
| Org+user atomic insert | Three unscoped inserts | Postgres `FUNCTION` RPC via `supabase.rpc` | Circular FK `companies.owner_id` ↔ `users.company_id` |
| Email sending | Nodemailer this phase | Copy link in Dialog | No mailer; UI-SPEC helper copy |
| New component library | Custom modal | existing shadcn `Dialog` | UI-SPEC: no new primitives |
| Zod 4 rewrite | New schemas in a new file format | extend `apps/web/src/lib/validation.ts` (Zod 3) | App already on Zod 3 |

**Key insight:** The hard parts are OAuth extra-data (cookie, not state) and atomic company+owner insert. Everything else is extending files that already exist.

## Common Pitfalls

### Pitfall 1: Signup body keys do not match Zod (already broken)

**What goes wrong:** Signup page POSTs `first_name` / `last_name` and omits `confirmPassword`; `userRegistrationSchema` expects `firstName`, `lastName`, `confirmPassword`. Validation returns 400.

**Why it happens:** Dual naming (snake on the form, camel on the API).

**How to avoid:** Align the page with the schema (camelCase + `confirmPassword`) **and** add `companyName`. Map UI-SPEC 409 copy in the client when status is 409 (`User with this email already exists`).

**Warning signs:** Create company always shows validation failed; no `users` row.

### Pitfall 2: Google unknown user still inserted

**What goes wrong:** TENANT-05 fails; every Gmail becomes a global employee.

**Why it happens:** `signIn` currently inserts when `!existingUser`.

**How to avoid:** Invert the default: insert only if pending company cookie (signup) or valid pending invite cookie (accept). Else string-redirect InviteRequired.

**Warning signs:** New Google account on `/auth/signin` reaches `/dashboard`.

### Pitfall 3: `return false` vs InviteRequired copy

**What goes wrong:** User sees “Access Denied” / “You do not have permission to sign in.”

**Why it happens:** Official `pages.error` codes are Configuration, AccessDenied, Verification, Default `[CITED: next-auth.js.org/configuration/pages]`. `false` → AccessDenied.

**How to avoid:** `return '/auth/error?error=InviteRequired'` and add that branch in `getErrorDetails()` with UI-SPEC copy and primary **Create a company**.

**Warning signs:** Error card title is Access Denied after Google.

### Pitfall 4: Invite APIs unauthenticated

**What goes wrong:** Anyone POSTs invites for any `company_id`.

**Why it happens:** `matcher` excludes `api`.

**How to avoid:** `getServerSession` + compare `session.user.id` to `companies.owner_id` (not merely `role === 'admin'`).

**Warning signs:** Non-owner can call POST `/api/auth/invites` and get 201.

### Pitfall 5: Circular FK without a transaction

**What goes wrong:** Company without owner, or user without `company_id`.

**Why it happens:** `owner_id` REFERENCES `users(id)` and `company_id` REFERENCES `companies(id)`.

**How to avoid:** RPC: insert company (nullable `owner_id`), insert user, update `owner_id`. Call `supabase.rpc` from the signup route.

**Warning signs:** Orphan companies; signup 500 on FK `23503`.

### Pitfall 6: Next 15 cookies in a Next 14 app

**What goes wrong:** Type/runtime errors on `await cookies()`.

**Why it happens:** Current Next docs default to async cookies (v15).

**How to avoid:** Sync `cookies().get(...)` in Next 14 Route Handlers and in `auth.ts` callbacks.

**Warning signs:** Build/type errors on `cookies()`.

### Pitfall 7: Migration filename order

**What goes wrong:** `014_add_companies.sql` runs **before** timestamped `202508…` files on a fresh `db reset`.

**Why it happens:** Supabase applies by filename. `scripts/create-migration.js` takes `Math.max` of `^(\d+)_` prefixes (including timestamps) then `+ 1`.

**How to avoid:** Use `node scripts/create-migration.js add_companies_and_invites` (will produce `20250818193733_*.sql` given current max timestamp `20250818193732`) **or** a `20260829…` timestamp after all existing files. Never `014_`.

**Warning signs:** Reset fails because `company_id` is added before later column migrations, or the new migration is skipped.

### Pitfall 8: Pretending TENANT-03 is RLS

**What goes wrong:** Phase 1 over-scopes into Phase 2 or ships a false “isolated” claim.

**Why it happens:** Success criterion “cannot see any other company” sounds like RLS.

**How to avoid:** Bind `company_id` on join; no picker; document open RLS. Do not add `USING (company_id = …)` policies this phase (recursion history in `004`).

**Warning signs:** Phase 1 plan includes rewriting `009_fix_rls_for_nextauth.sql`.

### Pitfall 9: Client password rule 8 vs API 12

**What goes wrong:** Signup UI allows 8-char passwords; API `PASSWORD_REQUIREMENTS.minLength` is 12.

**Why it happens:** Split validation.

**How to avoid:** Keep API as source of truth; UI-SPEC says do not restyle password-requirement strings on signup — still send `confirmPassword` and let the API enforce 12.

**Warning signs:** 400 `Password must be at least 12 characters` after a “valid” form.

## Code Examples

### Extend session types (add only fields that will be quoted from this file as recommendations)

Existing session user fields `[VERIFIED: apps/web/src/types/next-auth.d.ts:6-19]`:

```
      id: string
      email?: string | null
      name?: string | null
      image?: string | null
      first_name: string
      last_name: string
      department: string
      team: string
      role: UserRole
      managerId?: string
      hireDate: Date
      isActive: boolean
```

Add `companyId: string` and `isOwner: boolean` on `Session.user`, `User`, and `JWT`. Populate in `jwt` on first sign-in and in `session` from the `users` + `companies` lookup (same place that already `select('*')` by email).

### Owner menu item placement

Existing order `[VERIFIED: apps/web/src/components/navigation.tsx:95-107]`:

```
                  <DropdownMenuItem>
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut({ callbackUrl: '/auth/signin' })}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
```

Insert **Invite teammates** between Settings and the separator before Log out. Hide when `!session.user.isOwner`. Do not implement Settings.

### Duplicate email HTTP status

Signup already returns `[VERIFIED: apps/web/src/app/api/auth/signup/route.ts:36-40]`:

```
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      )
    }
```

Keep 409; map UI-SPEC copy in the signup page.

### First-user role must be an existing CHECK value

`users.role` `[VERIFIED: packages/database/migrations/001_initial_schema.sql:13]`:

```
    role VARCHAR(20) NOT NULL DEFAULT 'employee' CHECK (role IN ('employee', 'supervisor', 'admin', 'hr')),
```

`UserRole` `[VERIFIED: packages/types/src/index.ts:18-23]`:

```
export enum UserRole {
  EMPLOYEE = 'employee',
  SUPERVISOR = 'supervisor',
  ADMIN = 'admin',
  HR = 'hr'
}
```

Dashboard treats admin as elevated `[VERIFIED: apps/web/src/hooks/use-dashboard-data.ts:51-52]`:

```
  const isManager = user.role === 'supervisor' || user.role === 'admin' || user.role === 'hr'
  const isAdminOrHR = user.role === 'admin' || user.role === 'hr'
```

Recommendation: first user `'admin'` so existing admin/HR tabs work; invitees `'employee'`.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Supabase Auth `auth.uid()` RLS | NextAuth JWT + `USING (true)` | migration `009` | Phase 1 must not reintroduce `auth.uid()` policies |
| Open Google auto-provision | Invite or create-company gated Google | this phase | TENANT-05 |
| Auth.js v5 | Stay on next-auth v4 `NextAuthOptions` | n/a | Brownfield lock |
| Vitest 4 as default test install | `node:test` on Node 18+ | Vitest 4 engines 20+ | Avoid new dep + engine clash |

**Deprecated/outdated:**

- NextAuth `getSession` on the server — use `getServerSession`.
- Passing extra app data via OAuth `state` under NextAuth v4.
- `await cookies()` in this app (Next 14).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Invite TTL is 7 days | Discretion | Product wanted 24h or 30d; only copy says “expired” |
| A2 | First user `role = 'admin'` | Discretion | If product wanted `employee` owner, admin dashboard tabs would be hidden |
| A3 | Cookie names `timeoff_pending_kind` + `timeoff_pending_value` | Architecture | Cosmetic; must be httpOnly, short `maxAge` (~10 min) |
| A4 | RPC name `create_company_with_owner` | Architecture | Any unique name is fine |
| A5 | Invite statuses `'pending'`, `'accepted'`, `'expired'` | Schema | Need a CHECK; expired can be computed from `expires_at` instead of stored |
| A6 | Existing seed users backfilled into one seed company owned by `admin@company.com` | Seed | Local demo data must keep working after NOT NULL `company_id` |
| A7 | Phase 1 “cannot see other companies” is join-binding, not RLS | TENANT-03 | If stakeholders require RLS now, that is Phase 2 work pulled forward |

## Open Questions

1. **Invite TTL**
   - What we know: UI-SPEC has invalid/expired copy; no duration.
   - What's unclear: 7 vs 14 days.
   - Recommendation: 7 days in SQL `expires_at`; planner can proceed.

2. **Existing production/live rows without `company_id`**
   - What we know: seed inserts five users with no company `[VERIFIED: packages/database/seed.sql:21-26]`.
   - What's unclear: whether hosted Supabase has extra rows.
   - Recommendation: NOT NULL `company_id` + seed company backfill; live backfill script if remote data exists (human checkpoint).

3. **Google + credentials same email**
   - What we know: `users.email` is UNIQUE `[VERIFIED: packages/database/migrations/001_initial_schema.sql:7]`.
   - What's unclear: linking Google to an existing credentials owner.
   - Recommendation: If email exists, allow Google sign-in to that row (do not create a second user). Do not create a new company.

4. **Owner leaves / transfer**
   - What we know: UI-SPEC has no revoke/delete-company.
   - Recommendation: single `owner_id`; no transfer UI this phase.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | App + `node:test` + `node:crypto` | ✓ | v26.6.0 local; engines `>=18.0.0` | — |
| npm | workspaces | ✓ | 11.18.0 (packageManager pin `npm@10.2.4`) | — |
| Supabase CLI | `supabase db push` / reset | ✓ | 2.33.9 | — |
| Docker | local full stack | ✗ | — | Use hosted/local supabase already configured; not blocking for this phase |
| Vitest | optional tests | not installed | — | Use `node:test` |
| Mailer | invite email | ✗ | — | Copy invite link (in scope) |

**Missing dependencies with no fallback:** none for Phase 1 code.

**Missing dependencies with fallback:** Docker (not required if Supabase remote/local already runs); mailer (copy link).

`supabase/migrations` is a symlink to `packages/database/migrations` (verified `ls -la`). Apply with `npm run supabase:db:push` or `npm run supabase:db:reset` after adding the SQL file under the package migrations dir.

## Validation Architecture

Nyquist is enabled (`workflow.nyquist_validation`: true).

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Node.js `node:test` + `node:assert/strict` (built-in; Node engines `>=18.0.0`) |
| Config file | none — Wave 0 adds `apps/web` script `"test": "node --import tsx/esm --test src/lib/invite-token.test.ts"` **only if** `tsx` is added; **preferred:** compile with existing `tsc` or run **plain** tests as `apps/web/src/lib/invite-token.test.cjs` requiring a tiny compiled helper. Simplest Wave 0: `apps/web/src/lib/invite-token.test.ts` executed via `npx --no-install` is forbidden. Use: `"test": "node --test --experimental-strip-types src/lib/invite-token.test.ts"` on Node 22+ (local is 26). For Node 18 CI/Docker: emit JS tests next to the helper as `.test.cjs` **or** document that the test script requires Node 22+. **Planner: put `test` script on `apps/web/package.json` so `turbo run test` has an implementer.** |
| Quick run command | `npm test --workspace=@timeoff/web` (after Wave 0 script) |
| Full suite command | `npm test` (turbo) |

**Do not add tsx/vitest.** On Node 26, `--experimental-strip-types` (or Node 24+ type stripping) can run `.ts` tests. If the executor’s Node is 18, write `invite-token.test.cjs` that duplicates nothing — import from a `.cjs` helper, or skip type-stripping.

Practical Wave 0 (Node 18-safe, zero new packages):

- `apps/web/src/lib/invite-token.cjs` + `invite-token.test.cjs` **or** keep TypeScript helper and test file compiled by a one-off `tsc` of those two files.

**Recommended Wave 0:** `apps/web/src/lib/invite-token.ts` (used by routes) plus `apps/web/src/lib/invite-token.test.ts` run with:

```
node --test --experimental-strip-types apps/web/src/lib/invite-token.test.ts
```

Add `"test": "node --test --experimental-strip-types src/lib/invite-token.test.ts src/lib/company-owner.test.ts"` to `apps/web/package.json`. If executor Node is 18, the task falls back to compiling those files with `tsc --outDir /tmp` then `node --test`.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TENANT-01 | RPC/helper assigns `company_id` + `owner_id` to the creating user | unit | `node --test --experimental-strip-types src/lib/company-owner.test.ts` | ❌ Wave 0 |
| TENANT-02 | Non-owner invite rejected; invite `company_id` equals owner’s company | unit (pure owner check) | same + invite route tests if extracted | ❌ Wave 0 |
| TENANT-03 | Accept binds `company_id` from invite only (no picker) | unit on accept mapper | `node --test … invite-accept.test.ts` | ❌ Wave 0 |
| TENANT-05 | Unknown Google without pending cookie → InviteRequired URL; hash/compare tokens | unit | `invite-token.test.ts` + `google-signin-gate.test.ts` | ❌ Wave 0 |
| TENANT-05 | `hashInviteToken` + `timingSafeEqual` | unit | `src/lib/invite-token.test.ts` | ❌ Wave 0 |

Manual-only (justified): full Google OAuth in a browser (needs Google client). Smoke: credentials signup → invite → accept in local app.

### Sampling Rate

- **Per task commit:** `npm test --workspace=@timeoff/web`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `apps/web/package.json` `"test"` script (none today)
- [ ] `apps/web/src/lib/invite-token.ts` + `invite-token.test.ts`
- [ ] `apps/web/src/lib/google-signin-gate.ts` (pure function: existing user / pending company / pending invite / deny URL) + test
- [ ] No Jest/Vitest config — do not add one
- [ ] Framework install: none (`node:test`)

## Security Domain

`security_enforcement` is enabled; ASVS level 1.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | NextAuth credentials + optional Google; bcrypt 12; stop open Google provision |
| V3 Session Management | yes | JWT `strategy: 'jwt'`, `maxAge: 30 * 24 * 60 * 60` `[VERIFIED: apps/web/src/lib/auth.ts:164-167]`; `getServerSession` on invite APIs |
| V4 Access Control | yes (partial) | Owner check on invite APIs; `isOwner` UX. **Not** RLS this phase |
| V5 Input Validation | yes | Zod `companyName` max 80; email schema already `.max(255)` + lowercase transform |
| V6 Cryptography | yes | `randomBytes` + SHA-256 for invites; bcrypt for passwords; `timingSafeEqual` |

### Known Threat Patterns for NextAuth + anon Supabase

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Google account creates global employee | Elevation of privilege | Deny sign-in unless existing user, pending company, or valid invite |
| Invite token in URL leaked in logs | Information disclosure | Hash at rest; preview endpoint returns company name only, not other invites |
| Token brute force | Spoofing | 32-byte token (64 hex chars); unique hash index |
| Non-owner invites | Elevation of privilege | `getServerSession` + `owner_id` |
| Cross-tenant SELECT via anon key | Information disclosure | Phase 2 RLS — do not claim fixed in Phase 1 |
| Open signup without company | Tampering / EoP | Require `companyName`; Google signup requires cookie |
| User enumeration | Information disclosure | Existing distinct errors in `authorize` — do not worsen; 409 on duplicate email is required by UI-SPEC |
| CSRF on invite POST | Tampering | Same-origin fetch from the app + NextAuth session cookie (`SameSite`); do not add a second CSRF library |

## Sources

### Primary (HIGH confidence)

- `https://next-auth.js.org/configuration/callbacks` — `signIn` true/false/URL; URL cancels auth
- `https://next-auth.js.org/configuration/pages` — error query codes; `pages.error`
- `https://next-auth.js.org/configuration/nextjs` — `getServerSession`; App Router; middleware excludes custom API auth
- `https://next-auth.js.org/getting-started/client` — `signIn('google', { callbackUrl })`; `authorizationParams` third arg; `redirect: false` credentials-only
- `https://nodejs.org/docs/latest-v18.x/api/crypto.html` — `randomBytes`, `createHash('sha256')`, `timingSafeEqual`
- `https://nextjs.org/docs/app/api-reference/functions/cookies` — Next 14 sync `cookies()`
- In-repo: `apps/web/src/lib/auth.ts`, `signup/route.ts`, `validation.ts`, `middleware.ts`, `next-auth.d.ts`, `001_initial_schema.sql`, `002_add_auth_fields.sql`, `009_fix_rls_for_nextauth.sql`, `seed.sql`, `navigation.tsx`, `error/page.tsx`, `signin/page.tsx`, `signup/page.tsx`, UI-SPEC, REQUIREMENTS, PROJECT, STACK, ARCHITECTURE, CONCERNS, INTEGRATIONS, CLAUDE.md

### Secondary (MEDIUM confidence)

- NextAuth GitHub `packages/next-auth/src/core/routes/callback.ts` (v4): string return from `signIn` → `{ redirect: isAllowed }`; `false` → `error=AccessDenied`
- Community: extra `signIn` params do not appear in the `signIn` callback (GitHub discussion #5389) — cookie workaround

### Tertiary (LOW confidence)

- Invite TTL 7 days `[ASSUMED]`
- Exact cookie names `[ASSUMED]`

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — versions from `apps/web/package.json` + STACK.md + `npm view next-auth`
- Architecture: HIGH — brownfield files Read this session; NextAuth callbacks from official docs
- Pitfalls: HIGH — current Google insert and signup key mismatch Read this session
- Code examples: HIGH for NextAuth/Node snippets (official docs); MEDIUM for RPC/cookie names (recommendations)

**Research date:** 2026-08-29
**Valid until:** 2026-09-28 (30 days — next-auth v4 stable)

---

*Phase: 01-company-signup-and-invites*
*Research completed: 2026-08-29*
*Ready for planning: yes*
