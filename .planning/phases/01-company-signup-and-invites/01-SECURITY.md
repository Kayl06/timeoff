---
phase: 01
slug: company-signup-and-invites
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
block_on: high
created: 2026-08-29
---

# Phase 01 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

UAT: complete (5/5 pass). ASVS L1 (presence). `block_on: high`. Open RLS `USING (true)` on `companies` / `company_invites` is Phase 2 (T-01-06), not a Phase 1 miss.

Plans 01-06 through 01-09 reused threat IDs already assigned in 01-03–01-05. Those later rows are listed as `T-01-{plan}-{local}` so every declared vector has a unique register ID. Plan-local IDs are in the Mitigation column.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Helper → route handlers | Token hashing and owner checks sit in front of Postgres writes | Invite tokens, `companies.owner_id` |
| Browser → POST `/api/auth/signup` | Untrusted JSON | `companyName`, email, password |
| Signup / Google → `create_company_with_owner` | Anon key executes privileged create | Email, bcrypt hash or null, names, company name |
| Browser → Google → NextAuth `signIn` | OAuth profile email vs pending cookies | Google email, pending kind/value |
| POST `/api/auth/pending-context` → Set-Cookie | Untrusted company name or invite token into httpOnly cookie | `companyName` / raw token |
| Browser → POST `/api/auth/invites` | Session cookie required; body email untrusted | Session JWT, teammate email |
| Invite token in `acceptUrl` | Capability secret in URL; hashed at rest | Raw token vs `token_hash` |
| Browser → preview / accept | Token query or body; hashed lookup | Raw token, profile fields |
| Google profile email vs `invite.email` | Attacker Google account must not join someone else's invite | OAuth email, invite row |
| Route / `auth.ts` → `accept_invite_with_employee` | Anon key executes privileged insert+update | Invite id, email, company id, password hash or null |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-01-01 | Spoofing | invite-token.ts | high | mitigate | 32-byte CSPRNG (`randomBytes(32)`); SHA-256 at rest (`hashInviteToken` / `hashInviteTokenHex`); `timingSafeEqual` in `inviteTokenMatches` | closed |
| T-01-02 | Elevation of Privilege | google-signin-gate.ts | high | mitigate | `decideGoogleSignIn` default deny unless existing user or pending company/invite; `auth.ts` calls it before any Google insert | closed |
| T-01-03 | Elevation of Privilege | company-owner.ts | medium | mitigate | `isCompanyOwner` is `userId === owner_id`; wired in `invite-auth.ts` / invites route and session `resolveIsOwner` | closed |
| T-01-04 | Tampering | POST `/api/auth/signup` | high | mitigate | `userRegistrationSchema` companyName 1–80; `bcrypt.hash(..., 12)`; unique email 409 before RPC | closed |
| T-01-05 | Elevation of Privilege | create_company_with_owner | high | mitigate | One transaction: insert company, insert owner (`role` admin), set `owner_id` | closed |
| T-01-06 | Information Disclosure | companies / company_invites RLS | medium | accept | Open policies matching 009; TENANT-04 is Phase 2 — do not claim isolation is done | closed |
| T-01-07 | Repudiation | duplicate signup | low | mitigate | Signup route 409; client maps to UI-SPEC `DUPLICATE_EMAIL_COPY` | closed |
| T-01-08 | Elevation of Privilege | auth.ts Google signIn | high | mitigate | `decideGoogleSignIn` default deny; no missing-user insert; `InviteRequired` string redirect | closed |
| T-01-09 | Spoofing | pending-auth cookies | medium | mitigate | `httpOnly: true`, `maxAge: 600` (10 min), `sameSite: 'lax'`; not OAuth state | closed |
| T-01-10 | Information Disclosure | error page | low | mitigate | InviteRequired copy does not reveal whether an email exists in another company | closed |
| T-01-11 | Elevation of Privilege | Google create-company | high | mitigate | `create_company_with_owner` only when `pendingCompany && pendingValue` | closed |
| T-01-12 | Elevation of Privilege | POST `/api/auth/invites` | high | mitigate | `getServerSession` + `inviteOwnerRejectStatus` / `isCompanyOwner` vs `companies.owner_id`; `inviteEmailSchema` has no `company_id` | closed |
| T-01-13 | Spoofing | invite tokens | high | mitigate | `generateInviteToken()` (`randomBytes(32)`); store `hashInviteTokenHex` only | closed |
| T-01-14 | Information Disclosure | GET invites | medium | mitigate | Pending rows filtered `.eq('company_id', company.id)`; preview is hash lookup | closed |
| T-01-15 | Tampering | CSRF invite POST | medium | mitigate | Same-origin `fetch('/api/auth/invites', { credentials: 'include' })`; NextAuth session cookie SameSite=lax (library default); no extra CSRF library | closed |
| T-01-16 | Spoofing | accept POST | high | mitigate | Lookup by SHA-256 hash; `inviteIsUsable` (pending + expiry); `inviteAcceptSchema` has no `company_id` | closed |
| T-01-17 | Elevation of Privilege | Google invite bind | high | mitigate | Google email must equal `invite.email` (lowercased); else mismatch URL; no global employee insert | closed |
| T-01-18 | Information Disclosure | preview GET | medium | mitigate | 200 body is `{ companyName, email }` only | closed |
| T-01-19 | Tampering | company picker | high | mitigate | No picker on accept-invite; `companyIdFromInvite` only | closed |
| T-01-06-10 | Tampering | signup/page.tsx client checks | medium | mitigate | 01-06 T-01-10: client gating UX only (`passwordMeetsApiRules`); `userRegistrationSchema` / `passwordSchema` on the route still 400 | closed |
| T-01-06-11 | Information Disclosure | 400 details mapped to fields | low | mitigate | 01-06 T-01-11: `mergeSignupFieldErrors` copies only the submitter's `details` keys onto `errors.*` | closed |
| T-01-07-12 | Information Disclosure | distinct 409 copy | medium | mitigate | 01-07 T-01-12: `inviteCreateConflict` other-company copy is `EMAIL_EXISTS_ERROR`; never returns the other company name or id | closed |
| T-01-07-13 | Tampering | POST insert after 409 | high | mitigate | 01-07 T-01-13: 409 returned before `generateInviteToken` / insert when `inviteCreateConflict` is non-null | closed |
| T-01-08-14 | Information Disclosure | preview 409 | medium | mitigate | 01-08 T-01-14: `EMAIL_EXISTS_ERROR` only; invalid tokens stay 404 `invalid_or_expired` | closed |
| T-01-09-15 | Elevation of Privilege | accept_invite_with_employee | high | mitigate | 01-09 T-01-15: SQL hardcodes `role` employee, Unassigned department/team; credentials and Google callers pass email/`company_id` from the invite row | closed |
| T-01-09-16 | Tampering | invite accept race | high | mitigate | 01-09 T-01-16: `UPDATE … WHERE status = 'pending'`; `IF NOT FOUND RAISE` so the insert rolls back | closed |
| T-01-09-17 | Information Disclosure | AccountExists vs InviteRequired | medium | mitigate | 01-09 T-01-17: other-company / unique-violation Google uses `ACCOUNT_EXISTS_PATH`; unknown Google stays `InviteRequired` | closed |
| T-01-SC | Tampering | npm installs | high | accept | No new packages in Phase 1 plans; Wave 0 uses node:test | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on (`high`) count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

### Evidence (ASVS L1)

| Threat ID | Evidence |
|-----------|----------|
| T-01-01 | `apps/web/src/lib/invite-token.ts:11-12` `randomBytes(32)`; `:20-21` SHA-256; `:39-44` `timingSafeEqual` |
| T-01-02 | `apps/web/src/lib/google-signin-gate.ts:22-25`; `apps/web/src/lib/auth.ts:125-133` |
| T-01-03 | `apps/web/src/lib/company-owner.ts:12-14`; `apps/web/src/lib/invite-auth.ts:31-33`; `apps/web/src/app/api/auth/invites/route.ts:23-54` |
| T-01-04 | `apps/web/src/lib/validation.ts:50-54`; `apps/web/src/app/api/auth/signup/route.ts:13-46` |
| T-01-05 | `packages/database/migrations/20250818193733_add_companies_and_invites.sql:86-114` |
| T-01-06 | Accepted — see Accepted Risks Log. Policies at `20250818193733_add_companies_and_invites.sql:125-137` |
| T-01-07 | `apps/web/src/app/api/auth/signup/route.ts:37-41`; `apps/web/src/app/auth/signup/page.tsx:44-45,171-172` |
| T-01-08 | `apps/web/src/lib/auth.ts:107-133,244` |
| T-01-09 | `apps/web/src/lib/pending-auth-cookie.ts:10-16,43-45` |
| T-01-10 | `apps/web/src/app/auth/error/page.tsx:89-94` |
| T-01-11 | `apps/web/src/lib/auth.ts:221-241` |
| T-01-12 | `apps/web/src/app/api/auth/invites/route.ts:23-61,116-124`; `apps/web/src/lib/validation.ts:78-81` |
| T-01-13 | `apps/web/src/app/api/auth/invites/route.ts:170-179` |
| T-01-14 | `apps/web/src/app/api/auth/invites/route.ts:78-82` |
| T-01-15 | `apps/web/src/components/invite-teammates-dialog.tsx:105-110` |
| T-01-16 | `apps/web/src/app/api/auth/invites/accept/route.ts:37-55`; `apps/web/src/lib/validation.ts:83-89` |
| T-01-17 | `apps/web/src/lib/auth.ts:156-159,189-201` |
| T-01-18 | `apps/web/src/app/api/auth/invites/preview/route.ts:69-72` |
| T-01-19 | `apps/web/src/lib/invite-accept.ts:21-22`; accept-invite page has no company picker |
| T-01-06-10 | `apps/web/src/app/auth/signup/page.tsx:125`; `apps/web/src/app/api/auth/signup/route.ts:13`; `apps/web/src/lib/validation.ts:29-47` |
| T-01-06-11 | `apps/web/src/lib/password-client.ts:64-76`; `apps/web/src/app/auth/signup/page.tsx:177` |
| T-01-07-12 | `apps/web/src/lib/invite-auth.ts:42-52`; `apps/web/src/app/api/auth/invites/route.ts:161-168` |
| T-01-07-13 | `apps/web/src/app/api/auth/invites/route.ts:139-170` (conflict return before token/insert) |
| T-01-08-14 | `apps/web/src/app/api/auth/invites/preview/route.ts:45-66` |
| T-01-09-15 | `packages/database/migrations/20250818193734_accept_invite_with_employee.sql:33-42`; `apps/web/src/app/api/auth/invites/accept/route.ts:54-82`; `apps/web/src/lib/auth.ts:193-200` |
| T-01-09-16 | `packages/database/migrations/20250818193734_accept_invite_with_employee.sql:45-53` |
| T-01-09-17 | `apps/web/src/lib/auth.ts:171-174,203-206`; `apps/web/src/app/auth/error/page.tsx:89-99` |
| T-01-SC | Accepted — see Accepted Risks Log |

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-01-01 | T-01-06 | Open RLS `USING (true)` / `WITH CHECK (true)` on `companies` and `company_invites` matches the existing 009 NextAuth pattern. Cross-tenant PostgREST reads are TENANT-04 and are in scope for Phase 2. Phase 1 join binding does not claim isolation. | phase-01-plan (01-02, 01-05) | 2026-08-29 |
| AR-01-02 | T-01-SC | Phase 1 plans add no new npm packages; Wave 0 tests use node:test. Supply-chain risk of already-present dependencies is tolerated for this phase. | phase-01-plan (01-01–01-09) | 2026-08-29 |

*Accepted risks do not resurface in future audit runs.*

---

## Unregistered Flags

None. SUMMARY.md files have no `## Threat Flags` section.

01-REVIEW.md CR-01 (pending-invite cookie not cleared on Google invite failure, so a known Google user can be locked out for the 600s cookie TTL) is a code-review finding outside the PLAN threat register. It is not a declared mitigation gap for T-01-08 / T-01-02 (those threats are unknown-Google insert / default-deny, which are present). Tracked here as informational only; does not count toward `threats_open`.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-08-29 | 27 | 27 | 0 | gsd-security-auditor |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-08-29

**Verdict:** SECURED
