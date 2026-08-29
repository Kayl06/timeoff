---
phase: 01-company-signup-and-invites
reviewed: 2026-08-29T09:34:00Z
depth: standard
files_reviewed: 36
files_reviewed_list:
  - apps/web/src/lib/invite-token.ts
  - apps/web/src/lib/invite-token.test.ts
  - apps/web/src/lib/google-signin-gate.ts
  - apps/web/src/lib/google-signin-gate.test.ts
  - apps/web/src/lib/company-owner.ts
  - apps/web/src/lib/company-owner.test.ts
  - apps/web/package.json
  - packages/database/migrations/20250818193733_add_companies_and_invites.sql
  - packages/database/seed.sql
  - supabase/seed.sql
  - packages/types/src/index.ts
  - packages/database/src/modules/users/types.ts
  - apps/web/src/lib/validation.ts
  - apps/web/src/lib/create-company-rpc.ts
  - apps/web/src/lib/create-company-rpc.test.ts
  - apps/web/src/app/api/auth/signup/route.ts
  - apps/web/src/app/auth/signup/page.tsx
  - apps/web/src/lib/pending-auth-cookie.ts
  - apps/web/src/lib/pending-context-schema.test.ts
  - apps/web/src/app/api/auth/pending-context/route.ts
  - apps/web/src/lib/auth.ts
  - apps/web/src/types/next-auth.d.ts
  - apps/web/src/lib/supabase.ts
  - apps/web/src/app/auth/error/page.tsx
  - apps/web/src/app/auth/signin/page.tsx
  - apps/web/src/lib/invite-auth.ts
  - apps/web/src/lib/invite-auth.test.ts
  - apps/web/src/app/api/auth/invites/route.ts
  - apps/web/src/components/invite-teammates-dialog.tsx
  - apps/web/src/components/navigation.tsx
  - apps/web/src/components/dashboard/dashboard-view.tsx
  - apps/web/src/lib/invite-accept.ts
  - apps/web/src/lib/invite-accept.test.ts
  - apps/web/src/app/api/auth/invites/preview/route.ts
  - apps/web/src/app/api/auth/invites/accept/route.ts
  - apps/web/src/app/auth/accept-invite/page.tsx
findings:
  critical: 1
  warning: 6
  info: 3
  total: 10
status: issues_found
---

# Phase 1: Code Review Report

**Reviewed:** 2026-08-29T09:34:00Z
**Depth:** standard
**Files Reviewed:** 36
**Status:** issues_found

## Narrative Findings (AI reviewer)

## Summary

Phase 1 binds company creation and invite join at the application layer. The intended TENANT-05 gate is present: unknown Google without pending cookies returns `/auth/error?error=InviteRequired` (never `false`); there is no global employee insert. Invite GET/POST uses `getServerSession(authOptions)` and stores `hashInviteTokenHex` (64 lowercase hex). `create_company_with_owner` takes nullable `p_password` and `buildCreateCompanyWithOwnerArgs` always sends the key. Credentials and Google accept insert `users.email` from `invite.email`.

Open `USING (true)` / `WITH CHECK (true)` on `companies` and `company_invites` is **not** a finding — this phase explicitly deferred tenant RLS to Phase 2.

The ship-blocking defect is Google `signIn` handling `pendingInvite` **before** `existingUser` and not clearing pending cookies on mismatch or unusable invites, so an existing member who hits an invite Google flow can be locked out of Google sign-in for the cookie TTL.

## Critical Issues

### CR-01: Pending invite cookie overrides existing Google users and is not cleared on failure

**File:** `apps/web/src/lib/auth.ts:134-158` (also `:226-228`)
**Issue:** After `decideGoogleSignIn` returns `true`, the callback enters `if (pendingInvite)` before `if (existingUser)`. Empty token, unusable/expired invite, email mismatch, and “already in another company” all return a deny/mismatch URL **without** `clearPendingAuthCookies()`. The httpOnly cookies last 600s (`pending-auth-cookie.ts:10`).

Realistic path: existing Google user opens `/auth/accept-invite?token=…`, continues with Google on the wrong account (or an expired token), lands on mismatch/InviteRequired, clicks Back to sign in, then Google again. Kind is still `invite`, so they never reach the existing-user allow at line 226. TENANT-05 requires known users to sign in; this path denies them until the cookies expire. Credentials still work; Google does not.

**Fix:** Clear pending cookies on every non-success invite outcome. If a `users` row already exists and invite bind cannot proceed (mismatch, other company, unusable token), fall through to the existing-user allow instead of denying:

```typescript
if (pendingInvite) {
  const failInvite = () => {
    clearPendingAuthCookies()
    return existingUser ? true : INVITE_REQUIRED_PATH
  }

  if (!pendingValue) {
    return failInvite()
  }
  // ... lookup invite ...
  if (!inviteRow || !inviteIsUsable(inviteRow)) {
    return failInvite()
  }
  if (googleEmail !== inviteEmail) {
    clearPendingAuthCookies()
    return existingUser ? true : ACCEPT_INVITE_MISMATCH_PATH
  }
  if (member && existingCompanyId !== companyId) {
    return failInvite()
  }
  // insert / consume invite, then clearPendingAuthCookies(); return true
}
```

## Warnings

### WR-01: Google and credentials lookups are case-sensitive; signup stores lowercase

**File:** `apps/web/src/lib/auth.ts:112-117` (also `:56-67`, `:264-268`)
**Issue:** `emailSchema` lowercases on signup/invite (`validation.ts:18-21`). Google `signIn` and the session callback use `eq('email', user.email)` / `session.user.email` with Google’s casing. Credentials `authorize` uses the raw form email; the sign-in page does not run `userSignInSchema`. Postgres `VARCHAR` unique is case-sensitive (`001_initial_schema.sql:7`).

A credentials owner (`jane@acme.com`) who later uses Google (`Jane@acme.com`) is treated as unknown: InviteRequired, or a second insert that hits `23505` and still InviteRequired. Session enrichment can also miss, leaving `companyId` / `isOwner` unset. Google create-company persists the mixed-case Google email, so later credentials login with lowercase can fail the same way.

**Fix:** Normalize before every `users.email` compare/insert:

```typescript
const email = (user.email || '').toLowerCase().trim()
// authorize:
.eq('email', credentials.email.toLowerCase().trim())
```

Use that same normalized value in `buildCreateCompanyWithOwnerArgs` and Google inserts (invite insert already uses `inviteRow.email` from the Zod-lowercased invite).

### WR-02: Signup UI allows 8-character passwords; API requires 12

**File:** `apps/web/src/app/auth/signup/page.tsx:93-97` (also `:119`, `:235`)
**Issue:** Client `validateForm` / `isFormReady` / the requirements list use min length 8. `userRegistrationSchema` → `passwordSchema` requires 12 plus complexity (`validation.ts:29-30`). Submit at 8–11 characters returns 400; the page toasts `data.error` (“Validation failed”) with no field-level hint. Accept-invite was corrected to 12 (`accept-invite/page.tsx:186-187`); signup was not.

**Fix:** Align client checks with `PASSWORD_REQUIREMENTS.minLength` (12) and the same complexity rules as `passwordSchema`, and map `details` from the 400 body onto field errors.

### WR-03: Invite POST only 409s same-company email; `users.email` is globally unique

**File:** `apps/web/src/app/api/auth/invites/route.ts:140-165`
**Issue:** Existing-user check is `.eq('email', email).eq('company_id', company.id)`. A globally existing email in another tenant is not 409. POST returns 201; accept then 409 (`accept/route.ts:56-68`) and Google bind returns InviteRequired if `member.company_id !== invite.company_id` (`auth.ts:170-173`). Owners get a copy-link that cannot be redeemed.

**Fix:** Look up by email only (no company filter). If any `users` row exists, return 409 with `That email is already in this company.` (or distinct copy that the address already has an account).

### WR-04: Accept is not atomic — user can be inserted with invite left pending

**File:** `apps/web/src/app/api/auth/invites/accept/route.ts:72-104` (same pattern `auth.ts:189-220`)
**Issue:** Credentials accept inserts `users` then updates `company_invites`. If the update throws, the handler returns 500 with a live employee row and a still-pending invite. Retry is 409 (`email already exists`). Google has the same split. There is no DB transaction or compensating delete.

**Fix:** Perform insert + accept in one RPC (same style as `create_company_with_owner`), or catch accept failure and delete/roll back the user. At minimum, if the user insert succeeded, treat a later accept update failure as success after a retry of the status update only.

### WR-05: Unauthenticated pending-context POST can plant Google provision cookies

**File:** `apps/web/src/app/api/auth/pending-context/route.ts:6-25` (consumed in `auth.ts:119-122`, `:231-251`)
**Issue:** POST has no session, CSRF token, or Origin check. A cross-site form POST can set `timeoff_pending_kind=company` (or `invite` + a raw token). TENANT-05 deny-by-default for Google on `/auth/signin` then becomes create-company or invite-bind on the next Google click. SameSite=lax on the **new** cookies does not stop the Set-Cookie from that POST.

This is not Phase 2 RLS; it bypasses the application-layer Google gate this phase claimed to close.

**Fix:** Reject POST unless `Origin`/`Referer` match `NEXTAUTH_URL` (and/or require a same-site CSRF cookie). Optionally require `kind=company` only from a signed-in-less signup flow with a custom header that CORS would block from other origins.

### WR-06: Pending auth cookies store the raw invite token without `secure`

**File:** `apps/web/src/lib/pending-auth-cookie.ts:12-17`
**Issue:** `timeoff_pending_value` holds the raw invite token (or company name) for 10 minutes. Options are httpOnly + path `/` + SameSite lax only. In production HTTPS, omitting `secure: true` still sends the cookie on HTTP if the site is reachable that way, exposing a bearer invite token on the wire.

**Fix:**

```typescript
const PENDING_COOKIE_OPTIONS = {
  httpOnly: true,
  maxAge: PENDING_COOKIE_MAX_AGE,
  path: '/',
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
}
```

Call `cookies().delete` with the same `path` (and `secure` if required by the runtime) so clears actually drop the cookies.

## Info

### IN-01: Accept-invite password checklist still says 8 characters

**File:** `apps/web/src/app/auth/accept-invite/page.tsx:320-328`
**Issue:** Join is disabled until length ≥ 12, but the checklist marks “At least 8 characters” complete at 8. Users can think the password is valid while the button stays disabled.
**Fix:** Use `PASSWORD_REQUIREMENTS.minLength` in the checklist label and `met` predicate.

### IN-02: Session/JWT mapping uses `as any`

**File:** `apps/web/src/lib/auth.ts:285` (also `:296-305`)
**Issue:** `session.user = { ... } as any` and `(user as any).*` in `jwt` hide missing `companyId`/`isOwner` after a failed DB lookup (see WR-01). Types already exist in `next-auth.d.ts`.
**Fix:** Assign through the augmented `Session['user']` / `JWT` types without `any`.

### IN-03: Commented-out password-strength UI on sign-in

**File:** `apps/web/src/app/auth/signin/page.tsx:262-281`
**Issue:** Dead commented block plus unused `passwordStrength` helpers (`:39-51`, `:130-140`) left in a file this phase edited.
**Fix:** Delete the comment and unused strength helpers.

---

_Reviewed: 2026-08-29T09:34:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
