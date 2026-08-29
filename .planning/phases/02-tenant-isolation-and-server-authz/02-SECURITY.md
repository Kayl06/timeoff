---
phase: 02
slug: tenant-isolation-and-server-authz
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
block_on: high
created: 2026-08-29
---

# Phase 02 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

UAT: complete (5/5 pass). ASVS L1 (presence). `block_on: high`. T-02-12 closed after CR-01: leave-request user embeds use `USER_DOMAIN_COLUMNS` (no `password`). `threats_open: 0`.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Browser → session-gated `/api/leave-requests*` | Session cookie; untrusted JSON body | NextAuth JWT, leave dates, action, ids |
| BFF → PostgREST | Minted HS256 `authenticated` JWT | `sub`, `company_id`, leave/user/notification rows |
| Identity routes → `identitySupabase` | Server-only `service_role` | Signup, authorize, invites, RPC args |
| PostgREST as `anon` | Publishable key | Must not read/write tenant tables after REVOKE |
| PostgREST as `authenticated` | User JWT claims | RLS `current_company_id()` |
| SECURITY DEFINER RPCs | Run as owner | Onboarding; `search_path` must stay `public` |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-02-01 | Elevation of Privilege | bind-leave-actor.ts | high | mitigate | `bindLeaveCreateActor` / `bindLeaveApprover` overwrite ids from session | closed |
| T-02-02 | Information Disclosure | supabase-jwt.ts | high | mitigate | HS256 `jose@4.15.9`; secret not `NEXT_PUBLIC_` | closed |
| T-02-03 | Spoofing | require-tenant-session.ts | high | mitigate | Missing userId or companyId → 401 | closed |
| T-02-04 | Elevation of Privilege | POST `/api/leave-requests` | high | mitigate | `getServerSession` + bind create actor; ignore body `user_id` | closed |
| T-02-05 | Spoofing | leave-requests/route.ts | high | mitigate | 401 when `tenantSessionRejectStatus` is 401 | closed |
| T-02-06 | Information Disclosure | tenant-supabase.ts | high | mitigate | `persistSession: false`; JWT in server memory only | closed |
| T-02-07 | Tampering | DatabaseServiceFactory | high | mitigate | `create()` per request | closed |
| T-02-08 | Elevation of Privilege | PATCH `/api/leave-requests/[id]` | high | mitigate | `bindLeaveApprover` from session; Zod action enum; role/ownership gate (WR-03) | closed |
| T-02-09 | Tampering | POST `/api/leave-requests/bulk` | high | mitigate | Session gate; session `approver_id`; role gate; RLS denies cross-tenant | closed |
| T-02-10 | Spoofing | use-leave-request-operations.ts | medium | mitigate | `credentials: 'include'`; no minted JWT in the browser | closed |
| T-02-11 | Elevation of Privilege | GET leave-requests scope | high | mitigate | `resolveLeaveListScope(session.user.role)` | closed |
| T-02-22 | Elevation of Privilege | GET `/api/manager-team-stats` | high | mitigate | Session gate; 403 employee; `managerId` from session | closed |
| T-02-14 | Elevation of Privilege | service-role-supabase.ts | high | mitigate | Server-only; `persistSession: false`; not used by leave BFF | closed |
| T-02-15 | Information Disclosure | GET `/api/test-connection` | high | mitigate | Env SET/NOT SET only; no users rows | closed |
| T-02-16 | Information Disclosure | auth.ts session callback | medium | mitigate | Identity service_role re-read of signed-in email | closed |
| T-02-12 | Information Disclosure | UserRepository / leave join | high | mitigate | `USER_DOMAIN_COLUMNS` (no password) on domain selects and `LEAVE_REQUEST_USER_EMBED`; no `users(*)` join | closed |
| T-02-13 | Information Disclosure | database-provider.tsx | high | mitigate | Default service is `null`; no browser `createDatabaseService(anon)` | closed |
| T-01-06 | Information Disclosure | tenant RLS | high | mitigate | `current_company_id()` policies; REVOKE anon; pgTAP 22/22 | closed |
| T-02-17 | Information Disclosure | active_leave_requests | high | mitigate | Recreated `WITH (security_invoker = true)` | closed |
| T-02-18 | Elevation of Privilege | onboarding RPCs | high | mitigate | `SECURITY DEFINER SET search_path = public` | closed |
| T-02-19 | Denial of Service | users RLS | high | mitigate | Direct `company_id` equality; no users self-subquery | closed |
| T-02-20 | Information Disclosure | leave_balances | high | mitigate | Authenticated tenant FOR ALL policies | closed |
| T-02-21 | Repudiation | audit_logs INSERT | medium | mitigate | Anon denied; authenticated EXISTS company match | closed |
| T-02-SC | Tampering | npm installs | high | accept | No new packages except pinned jose in 02-01 | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on (`high`) count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

### Evidence (ASVS L1)

| Threat ID | Evidence |
|-----------|----------|
| T-02-01 | `apps/web/src/lib/bind-leave-actor.ts` + passing `bind-leave-actor.test.ts` |
| T-02-02 | `apps/web/src/lib/supabase-jwt.ts`; `package.json` jose `4.15.9` |
| T-02-03 | `tenantSessionRejectStatus` tests 7/7 |
| T-02-04–T-02-11, T-02-22 | Session-gated BFF routes; UAT tests 1–3 pass |
| T-02-14–T-02-16 | `identitySupabase`; test-connection env only; UAT test 4 pass |
| T-02-13 | `DatabaseServiceProvider` `service ?? null` |
| T-01-06, T-02-17–T-02-21 | `20250818193735_tenant_rls_and_anon_revoke.sql`; `npx supabase test db` 22/22; UAT test 5 pass |
| T-02-12 | `USER_DOMAIN_COLUMNS` exported from `packages/database/src/modules/users/repository.ts` (no `password`). `LEAVE_REQUEST_USER_EMBED` in `leave-requests/repository.ts`. Grep `users!leave_requests_user_id_fkey(*)` in `*.{ts,tsx,js}`: zero hits. Domain `findByEmail`/`create`/`update` also select `USER_DOMAIN_COLUMNS`. Commit `16c31d1`. |
| T-02-SC | No new deps besides jose pin |

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| T-02-SC | T-02-SC | No new packages this phase except the planned jose pin; supply-chain residual accepted | Plan disposition | 2026-08-29 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-08-29 | 24 | 23 | 1 | gsd-secure-phase (L1, UAT complete) |
| 2026-08-29 | 24 | 24 | 0 | gsd-secure-phase (L1, T-02-12 closed after CR-01) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-08-29
