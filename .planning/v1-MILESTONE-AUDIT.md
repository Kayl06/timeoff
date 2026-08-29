---
milestone: 1
audited: 2026-08-29T15:15:00Z
status: gaps_found
scores:
  requirements: 8/27
  phases: 2/7
  integration: 15/27
  flows: 8/18
nyquist:
  compliant_phases: [2]
  partial_phases: []
  not_validated_phases: [1]
  missing_phases: [3, 4, 5, 6, 7]
  overall: incomplete
gaps:
  requirements:
    - id: BAL-01
      status: unsatisfied
      phase: "3"
      claimed_by_plans: []
      completed_by_plans: []
      verification_status: missing
      evidence: "Phase 3 not started. GET /api/leave-balances is session-gated; LeaveBalanceCard still renders mock 5/10."
    - id: BAL-02
      status: unsatisfied
      phase: "3"
      claimed_by_plans: []
      completed_by_plans: []
      verification_status: missing
      evidence: "create_company_with_owner and accept_invite_with_employee do not INSERT leave_balances."
    - id: BAL-03
      status: unsatisfied
      phase: "4"
      claimed_by_plans: []
      completed_by_plans: []
      verification_status: missing
      evidence: "Domain approveLeaveRequest can deduct if a row exists; no seed rows, mock card, approve does not invalidate leaveBalance."
    - id: BAL-04
      status: unsatisfied
      phase: "4"
      claimed_by_plans: []
      completed_by_plans: []
      verification_status: missing
      evidence: "Reject skips deduct. cancelLeaveRequest does not restore days."
    - id: BAL-05
      status: unsatisfied
      phase: "5"
      claimed_by_plans: []
      completed_by_plans: []
      verification_status: missing
      evidence: "bulkUpdateLeaveRequests is status/approver/timestamps only."
    - id: LEAVE-01
      status: unsatisfied
      phase: "4"
      claimed_by_plans: []
      completed_by_plans: []
      verification_status: missing
      evidence: "Domain createAuditLog on single approve exists; Phase 4 not executed; insert unproven."
    - id: LEAVE-02
      status: unsatisfied
      phase: "4"
      claimed_by_plans: []
      completed_by_plans: []
      verification_status: missing
      evidence: "Same as LEAVE-01 for reject."
    - id: LEAVE-03
      status: unsatisfied
      phase: "4"
      claimed_by_plans: []
      completed_by_plans: []
      verification_status: missing
      evidence: "softDeleteLeaveRequest still uses user_id: 'system'."
    - id: LEAVE-04
      status: unsatisfied
      phase: "5"
      claimed_by_plans: []
      completed_by_plans: []
      verification_status: missing
      evidence: "Bulk bypasses approve/reject domain service (no audit parity)."
    - id: NOTIF-01
      status: unsatisfied
      phase: "4"
      claimed_by_plans: []
      completed_by_plans: []
      verification_status: missing
      evidence: "Domain in-app create exists on single approve; UI is unread count only."
    - id: NOTIF-02
      status: unsatisfied
      phase: "4"
      claimed_by_plans: []
      completed_by_plans: []
      verification_status: missing
      evidence: "Same as NOTIF-01 for reject."
    - id: NOTIF-03
      status: unsatisfied
      phase: "4"
      claimed_by_plans: []
      completed_by_plans: []
      verification_status: missing
      evidence: "No mailer."
    - id: NOTIF-04
      status: unsatisfied
      phase: "4"
      claimed_by_plans: []
      completed_by_plans: []
      verification_status: missing
      evidence: "No mailer."
    - id: AUTH-01
      status: unsatisfied
      phase: "6"
      claimed_by_plans: []
      completed_by_plans: []
      verification_status: missing
      evidence: "forgot-password page setTimeout only; no send API."
    - id: AUTH-02
      status: unsatisfied
      phase: "6"
      claimed_by_plans: []
      completed_by_plans: []
      verification_status: missing
      evidence: "reset-password does not persist a new hash."
    - id: AUTH-03
      status: unsatisfied
      phase: "6"
      claimed_by_plans: []
      completed_by_plans: []
      verification_status: missing
      evidence: "authorize() does not deny is_active === false. dashboard-view uses isActive || true."
    - id: AUTH-04
      status: unsatisfied
      phase: "6"
      claimed_by_plans: []
      completed_by_plans: []
      verification_status: missing
      evidence: "Forgot-password always shows success after a fake delay."
    - id: CAL-01
      status: unsatisfied
      phase: "7"
      claimed_by_plans: []
      completed_by_plans: []
      verification_status: missing
      evidence: "Personal/unified already fetch /api/calendar/leave-requests with the same scope helper; Phase 7 agreement not verified."
    - id: CAL-02
      status: unsatisfied
      phase: "7"
      claimed_by_plans: []
      completed_by_plans: []
      verification_status: missing
      evidence: "team-calendar-view.tsx still uses hardcoded mock users/requests."
  integration: []
  flows:
    - name: Live remaining days
      req: BAL-01, BAL-02
      breaks_at: "display + seed"
    - name: Approve deducts remaining
      req: BAL-03
      breaks_at: "no balance row + mock card + no query invalidation"
    - name: Cancel restore
      req: BAL-04
      breaks_at: "cancelLeaveRequest writes status only"
    - name: Bulk parity
      req: BAL-05, LEAVE-04
      breaks_at: "bulkUpdateLeaveRequests status-only"
    - name: Delete audit actor
      req: LEAVE-03
      breaks_at: "user_id: 'system'"
    - name: Approve/reject email
      req: NOTIF-03, NOTIF-04
      breaks_at: "no mailer"
    - name: Password reset
      req: AUTH-01, AUTH-02, AUTH-04
      breaks_at: "setTimeout simulate"
    - name: Deactivated sign-in
      req: AUTH-03
      breaks_at: "authorize does not gate is_active"
    - name: Team calendar
      req: CAL-02
      breaks_at: "team-calendar-view mock queryFn"
tech_debt:
  - phase: 01-company-signup-and-invites
    items:
      - "01-VALIDATION.md still status: draft (Nyquist NOT-VALIDATED). Run /gsd-validate-phase 1."
      - "Live TENANT-05 Google OAuth blocked without GOOGLE_CLIENT_ID/SECRET in apps/web/.env.local."
      - "invitePreviewPageState is unit-tested only; preview route/page use HTTP 409 (drift risk)."
  - phase: 02-tenant-isolation-and-server-authz
    items:
      - "lib/supabase.ts leftover anon client is constructed when identity imports mapUserFromDatabase."
      - "Approve/reject/bulk hooks do not invalidate ['leaveBalance'] (only delete does)."
      - "LeaveRequestService swallows balance/audit/notification errors so approval can succeed with no side effects."
      - "GET /api/test-connection and PATCH /api/notifications have no UI caller."
      - "Hosted schema push was not part of Phase 2 local db push."
---

# Milestone v1 — Audit Report

**Audited:** 2026-08-29T15:15:00Z
**Status:** gaps_found
**Definition of done:** A client company can run request → approve → remaining days → calendar on their own data, with no SQL from us, and no other company on the same deployment can see it.

This is an **in-progress** v1 milestone (7 phases). Phases 1–2 are executed. Phases 3–7 are not started. Unsatisfied requirements are **planned remaining work**, not Phase 1/2 regressions. Do not insert duplicate closure phases for BAL/LEAVE/NOTIF/AUTH/CAL — those IDs already map to Phases 3–7.

## Scores

| Area | Score | Notes |
|------|-------|-------|
| Requirements | 8/27 | TENANT-01..05, AUTHZ-01..03 satisfied. 19 pending on Phases 3–7. |
| Phases | 2/7 | Phase 1 complete. Phase 2 executed (UAT + security + Nyquist); ROADMAP still In Progress. |
| Integration | 15/27 | All Phase 1↔2 hops WIRED. Later hops missing by design. |
| Flows | 8/18 | Signup/invite/session-BFF/isolation complete. Remaining-days/side-effects/reset/calendars broken. |

## Requirements Coverage (3-source)

| REQ-ID | Phase | VERIFICATION | SUMMARY | REQUIREMENTS.md | Final |
|--------|-------|--------------|---------|-----------------|-------|
| TENANT-01 | 1 | phase passed; UAT complete | listed | `[x]` | **satisfied** |
| TENANT-02 | 1 | phase passed; UAT complete | listed | `[x]` | **satisfied** |
| TENANT-03 | 1 | phase passed; UAT complete | listed | `[x]` | **satisfied** |
| TENANT-04 | 2 | SATISFIED | listed | `[x]` | **satisfied** |
| TENANT-05 | 1 | phase passed; UAT complete | listed | `[x]` | **satisfied** |
| AUTHZ-01 | 2 | SATISFIED | listed | `[x]` | **satisfied** |
| AUTHZ-02 | 2 | SATISFIED | listed | `[x]` | **satisfied** |
| AUTHZ-03 | 2 | SATISFIED | listed | `[x]` | **satisfied** |
| BAL-01 | 3 | missing phase | — | `[ ]` | **unsatisfied** |
| BAL-02 | 3 | missing phase | — | `[ ]` | **unsatisfied** |
| BAL-03 | 4 | missing phase | — | `[ ]` | **unsatisfied** |
| BAL-04 | 4 | missing phase | — | `[ ]` | **unsatisfied** |
| BAL-05 | 5 | missing phase | — | `[ ]` | **unsatisfied** |
| LEAVE-01 | 4 | missing phase | — | `[ ]` | **unsatisfied** |
| LEAVE-02 | 4 | missing phase | — | `[ ]` | **unsatisfied** |
| LEAVE-03 | 4 | missing phase | — | `[ ]` | **unsatisfied** |
| LEAVE-04 | 5 | missing phase | — | `[ ]` | **unsatisfied** |
| NOTIF-01 | 4 | missing phase | — | `[ ]` | **unsatisfied** |
| NOTIF-02 | 4 | missing phase | — | `[ ]` | **unsatisfied** |
| NOTIF-03 | 4 | missing phase | — | `[ ]` | **unsatisfied** |
| NOTIF-04 | 4 | missing phase | — | `[ ]` | **unsatisfied** |
| AUTH-01 | 6 | missing phase | — | `[ ]` | **unsatisfied** |
| AUTH-02 | 6 | missing phase | — | `[ ]` | **unsatisfied** |
| AUTH-03 | 6 | missing phase | — | `[ ]` | **unsatisfied** |
| AUTH-04 | 6 | missing phase | — | `[ ]` | **unsatisfied** |
| CAL-01 | 7 | missing phase | — | `[ ]` | **unsatisfied** |
| CAL-02 | 7 | missing phase | — | `[ ]` | **unsatisfied** |

**Orphans:** none. Every v1 REQ-ID is assigned in the traceability table. Pending IDs are unsatisfied because their phases have no VERIFICATION.md.

**FAIL gate:** 19 unsatisfied requirements → `status: gaps_found`. Do not `/gsd-complete-milestone`.

## Phases

| Phase | VERIFICATION.md | Status | Notes |
|-------|-----------------|--------|-------|
| 1 Company Signup and Invites | exists | passed (UAT complete) | 9/9 plans. Isolation deferred to Phase 2 (closed). |
| 2 Tenant Isolation and Server Authz | exists | passed (UAT 5/5; SECURITY verified; Nyquist compliant) | 7/7 plans. ROADMAP checkbox still open. |
| 3 Live Remaining Days | **missing** | unverified — **blocker** | Not started |
| 4 Approve Reject Cancel Side Effects | **missing** | unverified — **blocker** | Not started |
| 5 Bulk Approve Parity | **missing** | unverified — **blocker** | Not started |
| 6 Honest Password Reset and Sign-in | **missing** | unverified — **blocker** | Not started (depends on Phase 2 only) |
| 7 Calendar and Dashboard Agreement | **missing** | unverified — **blocker** | Not started (depends on Phase 4) |

## Integration (Phase 1↔2)

Checked by [integration checker](e6eb451c-23c0-486b-9c50-f14c7ac89c4e).

**WIRED:** identity stays on `identitySupabase` after RLS REVOKE; signup/invite/accept still use SECURITY DEFINER RPCs; session `companyId` → minted JWT `company_id` → `current_company_id()` → RLS on Phase 1 `users.company_id`; dashboard create/list/approve/calendar/policies fetch session-gated `/api/*` with `credentials: 'include'`, not PostgREST.

**No Phase 1/2 BLOCKER regressions.**

## Broken Flows (Phases 3–7)

| Flow | Breaks at | REQ |
|------|-----------|-----|
| Live remaining days | mock card + no seed rows | BAL-01, BAL-02 |
| Approve deducts remaining | no row + mock + no invalidate | BAL-03 |
| Cancel restore | status-only cancel | BAL-04 |
| Bulk parity | status-only bulk | BAL-05, LEAVE-04 |
| Delete audit actor | `user_id: 'system'` | LEAVE-03 |
| Approve/reject email | no mailer | NOTIF-03, NOTIF-04 |
| Password reset | fake delay, no persist | AUTH-01, AUTH-02, AUTH-04 |
| Deactivated sign-in | authorize ignores `is_active` | AUTH-03 |
| Team calendar | mock John/Jane/Bob | CAL-02 |

## Nyquist Coverage

| Phase | VALIDATION.md | Compliant | Action |
|-------|---------------|-----------|--------|
| 1 | exists, `status: draft` | NOT-VALIDATED | `/gsd-validate-phase 1` |
| 2 | exists, `status: validated`, `nyquist_compliant: true` | COMPLIANT | none |
| 3–7 | missing | MISSING | after those phases execute |

## Tech Debt (executed phases)

**Phase 1**
- Nyquist file never reconciled (`status: draft`)
- Live Google TENANT-05 needs OAuth env
- `invitePreviewPageState` unused by UI

**Phase 2**
- Leftover `lib/supabase.ts` anon client on identity import
- Approve/reject/bulk do not invalidate `leaveBalance`
- Domain service swallows balance/audit/notification errors
- Hosted `db push` still a human step if `.env.local` points at hosted

These are non-blocking for Phases 1–2. Several will be addressed by Phases 3–5 (balances, bulk, side effects).
