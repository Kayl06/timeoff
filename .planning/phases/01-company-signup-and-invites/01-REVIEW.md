---
phase: 01-company-signup-and-invites
reviewed: 2026-08-29T11:40:00Z
depth: standard
files_reviewed: 14
files_reviewed_list:
  - apps/web/src/lib/password-client.ts
  - apps/web/src/app/auth/signup/page.tsx
  - apps/web/src/lib/invite-auth.ts
  - apps/web/src/app/api/auth/invites/route.ts
  - apps/web/src/components/invite-teammates-dialog.tsx
  - apps/web/src/lib/invite-accept.ts
  - apps/web/src/app/api/auth/invites/preview/route.ts
  - apps/web/src/app/auth/accept-invite/page.tsx
  - apps/web/src/lib/accept-invite-rpc.ts
  - apps/web/src/app/api/auth/invites/accept/route.ts
  - apps/web/src/lib/auth.ts
  - apps/web/src/lib/google-signin-gate.ts
  - apps/web/src/app/auth/error/page.tsx
  - packages/database/migrations/20250818193734_accept_invite_with_employee.sql
findings:
  critical: 1
  warning: 3
  info: 3
  total: 7
status: issues_found
---

# Phase 1: Code Review Report

**Reviewed:** 2026-08-29T11:40:00Z
**Depth:** standard
**Files Reviewed:** 14
**Status:** issues_found

## Narrative Findings (AI reviewer)

## Summary

Advisory review of Phase 1 gap-closure plans **01-06 through 01-09** (signup password UX, global invite 409, preview existing-account card, atomic accept RPC, Google AccountExists). Original 01-01–01-05 files were read only when needed to trace call sites.

Closed from the prior review: **WR-02** (signup client min-length 8 vs API 12 — `password-client` + `passwordMeetsApiRules` + 400 `details` merge + sonner), **WR-03** (invite POST now looks up `users` by email with no `company_id` filter and `inviteCreateConflict` returns distinct copy), **WR-04** credentials path (insert + accept is one `accept_invite_with_employee` transaction). Google other-company / `23505` now redirect to `ACCOUNT_EXISTS_PATH` with Sign in. TENANT-05 unknown-Google deny (`INVITE_REQUIRED_PATH`) is unchanged in `decideGoogleSignIn`.

The remaining ship-blocker is the same Google **pending-invite cookie lockout**: 01-09 clears cookies on other-company and unique-violation only. Empty token, unusable/expired invite, email mismatch, non-23505 RPC errors, and the `signIn` catch still return a deny URL **without** `clearPendingAuthCookies()`, so a known Google user can be locked out of Google sign-in for the 600s cookie TTL.

Open `USING (true)` on `companies` / `company_invites` remains deferred to Phase 2 (not re-flagged).

## Critical Issues

### CR-01: Pending invite cookie still overrides existing Google users and is not cleared on failure

**File:** `apps/web/src/lib/auth.ts:135-159` (also `:203-209`, `:245-247`)
**Issue:** After `decideGoogleSignIn` returns `true`, the callback still enters `if (pendingInvite)` **before** `if (existingUser)`. 01-09 added `clearPendingAuthCookies()` + `ACCOUNT_EXISTS_PATH` for other-company members (`:171-174`) and RPC `23505` (`:204-206`). These paths still return a deny URL **without** clearing cookies:

- empty `pendingValue` → `INVITE_REQUIRED_PATH` (`:136-137`)
- missing or unusable invite → `INVITE_REQUIRED_PATH` (`:152-153`)
- Google email ≠ invite email → `ACCEPT_INVITE_MISMATCH_PATH` (`:158-159`)
- RPC error other than `23505` (including `invite_not_pending`) → `INVITE_REQUIRED_PATH` (`:208-209`)
- `catch` → `INVITE_REQUIRED_PATH` (`:245-247`)

Realistic path: existing Google user opens `/auth/accept-invite?token=…`, continues with Google on the wrong account (or an expired token), lands on mismatch / Invite required, clicks Back to sign in, then Google again. Kind is still `invite`, so they never reach the existing-user allow at `:216-218`. TENANT-05 requires known users to sign in; this path denies them until the cookies expire. Credentials still work; Google does not.

**Fix:** Clear pending cookies on every non-success invite outcome. If a `users` row already exists and invite bind cannot proceed, fall through to the existing-user allow instead of denying:

```typescript
if (pendingInvite) {
  const failInvite = (denyPath: string) => {
    clearPendingAuthCookies()
    return existingUser ? true : denyPath
  }

  if (!pendingValue) {
    return failInvite(INVITE_REQUIRED_PATH)
  }
  // ... lookup invite ...
  if (!inviteRow || !inviteIsUsable(inviteRow)) {
    return failInvite(INVITE_REQUIRED_PATH)
  }
  if (googleEmail !== inviteEmail) {
    return failInvite(ACCEPT_INVITE_MISMATCH_PATH)
  }
  if (member && existingCompanyId !== companyId) {
    clearPendingAuthCookies()
    return ACCOUNT_EXISTS_PATH
  }
  // RPC / same-company accept, then clearPendingAuthCookies(); return true
  // on RPC failure: return failInvite(...)
}
```

## Warnings

### WR-01: Google and credentials lookups are still case-sensitive; signup stores lowercase

**File:** `apps/web/src/lib/auth.ts:113-118` (also `:163-168`, `:227`, `:254-257`)
**Issue:** `emailSchema` lowercases on signup/invite. Google `signIn` and the session callback still use `eq('email', user.email)` / `session.user.email` with Google’s casing. Credentials `authorize` uses the raw form email. Postgres `VARCHAR` unique is case-sensitive.

01-09 lowercases only the invite-vs-Google **string compare** (`:156-157`) and looks up the member by `inviteRow.email` (already lowercase). That creates a new hole: a credentials owner (`jane@acme.com`) who later uses Google (`Jane@acme.com`) can match `member` via the invite-email lookup, take the same-company branch (`:177-186`), return `true`, then the session callback looks up `Jane@acme.com` and misses. JWT has a Google `sub` with no `companyId` / `isOwner`. A mixed-case Google create-company (`:227`) still persists Google’s casing, so later credentials login with lowercase can fail the same way.

**Fix:** Normalize before every `users.email` compare/insert:

```typescript
const email = (user.email || '').toLowerCase().trim()
// authorize:
.eq('email', credentials.email.toLowerCase().trim())
```

Use that same normalized value in `buildCreateCompanyWithOwnerArgs`, Google inserts, and the session callback.

### WR-02: `accept_invite_with_employee` does not bind email, company, or expiry to the invite row

**File:** `packages/database/migrations/20250818193734_accept_invite_with_employee.sql:23-53`
**Issue:** The function INSERTs `users` from `p_email` / `p_company_id`, then `UPDATE company_invites … WHERE id = p_invite_id AND status = 'pending'`. It never SELECTs the invite to require `p_email = invite.email`, `p_company_id = invite.company_id`, or `expires_at > now()`. Credentials and Google TS callers pass matching values; the function is also `GRANT EXECUTE … TO anon` (`:59`). T-01-15 claimed the bind lives in the function args “from the invite row only” — that bind is only in TypeScript.

A PostgREST caller that already has a pending invite UUID (public `company_invites` SELECT is deferred RLS, not re-flagged here) can insert a different email into a different company and still consume the invite. When this function is later made `SECURITY DEFINER` for Phase 2 RLS, the missing bind becomes a tenant-join bypass.

**Fix:** Lock the invite row first and drive insert from it:

```sql
SELECT email, company_id, status, expires_at
  INTO v_invite
  FROM company_invites
  WHERE id = p_invite_id
  FOR UPDATE;

IF NOT FOUND
   OR v_invite.status <> 'pending'
   OR v_invite.expires_at <= now()
   OR v_invite.email <> p_email
   OR v_invite.company_id <> p_company_id THEN
  RAISE EXCEPTION 'invite_not_pending';
END IF;
-- then INSERT using v_invite.email / v_invite.company_id
```

### WR-03: Invite dialog keeps the previous copy-link after a 409

**File:** `apps/web/src/components/invite-teammates-dialog.tsx:93-124`
**Issue:** `handleSubmit` clears `emailError` and `copied` but not `lastAcceptUrl`. After a successful invite the accept URL stays on screen. A later 409 (this-company or other-company) sets `emailError` and returns while the **previous** teammate’s link remains under “Share this link if they don’t get email.” The owner can copy the wrong URL and send it as if it belonged to the failed email.

**Fix:** Clear the previous link at the start of submit (and on 409):

```typescript
setEmailError('')
setCopied(false)
setLastAcceptUrl('')
```

## Info

### IN-01: Accept-invite password checklist still says 8 characters

**File:** `apps/web/src/app/auth/accept-invite/page.tsx:181-186` (also `:340-348`, `:216-221`)
**Issue:** Join is disabled until length ≥ 12, and 400 `details` are merged onto fields, but the checklist still marks “At least 8 characters” complete at 8 and `calculatePasswordStrength` still scores length at 8. Signup was aligned to `PASSWORD_REQUIREMENTS.minLength` in 01-06; this page was edited in 01-08 and left the old checklist. Users can think the password is valid while the button stays disabled, and can submit 12 letters with no composition (API 400 then field error).
**Fix:** Use `passwordRequirementItems` / `passwordMeetsApiRules` from `password-client.ts` for checklist, strength, `validateForm`, and `isFormReady`.

### IN-02: Session/JWT mapping uses `as any`

**File:** `apps/web/src/lib/auth.ts:275` (also `:286-295`)
**Issue:** `session.user = { ... } as any` and `(user as any).*` in `jwt` hide missing `companyId`/`isOwner` after a failed DB lookup (see WR-01). Types already exist in `next-auth.d.ts`.
**Fix:** Assign through the augmented `Session['user']` / `JWT` types without `any`.

### IN-03: `invitePreviewPageState` is unused by preview and the accept page

**File:** `apps/web/src/lib/invite-accept.ts:50-60` (callers: `preview/route.ts:45-67`, `accept-invite/page.tsx:140-165`)
**Issue:** The helper is tested and exported, but the route inlines usable → 404 / existing user → 409 / else 200, and the page maps HTTP status to `PageState`. A later change to one path will not update the other.
**Fix:** Have the preview route (or the page, after it knows `usable` + `existingUser`) call `invitePreviewPageState` so invalid / exists / ready stay in one place.

---

_Reviewed: 2026-08-29T11:40:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
