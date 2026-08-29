---
phase: 2
slug: tenant-isolation-and-server-authz
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: validated
nyquist_compliant: true
wave_0_complete: true
created: 2026-08-29
validated: 2026-08-29
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js `node:test` + `node:assert/strict`; `supabase test db` (pgTAP) for RLS |
| **Config file** | none for node:test — `apps/web` `"test"` script; `supabase/tests/*.sql` for db tests |
| **Quick run command** | `npm test --workspace=@timeoff/web` |
| **Full suite command** | `npm test --workspace=@timeoff/web` && `npx supabase test db` |
| **Estimated runtime** | ~1s unit; ~10s pgTAP |

---

## Sampling Rate

- **After every task commit:** Run `npm test --workspace=@timeoff/web`
- **After every plan wave:** Run `npm test --workspace=@timeoff/web` and, after the RLS migration task, `npx supabase test db`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds (unit)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 0 | AUTHZ-01 | T-02-03 | tenantSessionRejectStatus returns 401 when userId or companyId missing/empty; else null | unit | `npm test --workspace=@timeoff/web` | ✅ | ✅ green |
| 02-01-02 | 01 | 0 | AUTHZ-01 | T-02-01 | bindLeaveCreateActor/bindLeaveApprover overwrite actor ids from session; body copies ignored | unit | `npm test --workspace=@timeoff/web` | ✅ | ✅ green |
| 02-01-03 | 01 | 0 | AUTHZ-02 | T-02-02 | mintTenantAccessToken payload has role authenticated, sub, company_id | unit | `npm test --workspace=@timeoff/web` | ✅ | ✅ green |
| 02-03-02 | 03 | 2 | AUTHZ-01 | T-02-08 | canApproveOrRejectLeave / canCancelOrDeleteLeave gate writes by role and ownership | unit | `npm test --workspace=@timeoff/web` | ✅ | ✅ green |
| 02-04-01 | 04 | 3 | AUTHZ-01 | T-02-11 | resolveLeaveListScope does not upgrade employee to team/all | unit | `npm test --workspace=@timeoff/web` | ✅ | ✅ green |
| 02-06-01 | 06 | 4 | AUTHZ-02 | T-01-06 | JWT company A cannot SELECT company B rows | db | `npx supabase test db` | ✅ | ✅ green |
| 02-06-02 | 06 | 4 | AUTHZ-03 | T-01-06 | role anon SELECT/INSERT on tenant tables denied | db | `npx supabase test db` | ✅ | ✅ green |
| 02-06-03 | 06 | 4 | TENANT-04 | T-01-06 | JWT company A cannot INSERT/UPDATE/DELETE company B rows | db | `npx supabase test db` | ✅ | ✅ green |
| 02-06-04 | 06 | 4 | TENANT-04 | T-01-06 | invites/companies not readable or writable cross-tenant with user JWT | db | `npx supabase test db` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

Remaining plan tasks (02-02 BFF routes, 02-05 identity client, 02-07 dashboard fetch) verify via the same web suite as regression plus Manual-Only browser checks. Phase requirements AUTHZ-01, AUTHZ-02, AUTHZ-03, and TENANT-04 each have a dedicated behavioral test that ran green on 2026-08-29.

---

## Wave 0 Requirements

- [x] `apps/web/src/lib/require-tenant-session.ts` + `.test.ts` — fail closed (no session → 401) — plan 02-01
- [x] `apps/web/src/lib/supabase-jwt.ts` + `.test.ts` — assert payload keys `role`, `sub`, `company_id` — plan 02-01
- [x] `apps/web/src/lib/bind-leave-actor.ts` + `.test.ts` — body `user_id` ignored — plan 02-01
- [x] Extend `apps/web` `"test"` script with the new files — plan 02-01
- [x] `supabase/tests/tenant_rls.test.sql` — anon deny; two companies; SELECT plus INSERT/UPDATE/DELETE deny; `authenticated` JWT fixtures — plan 02-06
- [x] Framework install: `jose@4.15.9` only (not Vitest)

*Existing Phase 1 tests stay green; do not remove them.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Signed-in create/approve/cancel still works | AUTHZ-01 | Browser session cookie + live BFF | Log in, submit leave, approve as manager on the same company; Network tab shows `/api/leave-requests*` not PostgREST `/rest/v1/leave_requests` |
| Two companies cannot see each other in UI | TENANT-04 | Two accounts | Company A dashboard lists only A; cannot open B’s request id if known |
| Anon key dump | AUTHZ-03 | Needs the public key | curl anon key against local `54321` after migration |

UAT 2026-08-29: 5/5 pass (`02-UAT.md`). These remain documented as human checks, not untested requirements.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-08-29

---

## Validation Audit 2026-08-29

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

Re-ran this audit: `npm test --workspace=@timeoff/web` — 76 passed, 0 failed. `npx supabase test db` — `tenant_rls.test.sql` 22/22 PASS.
