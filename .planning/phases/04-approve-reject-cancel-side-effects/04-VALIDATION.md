---
phase: 4
slug: approve-reject-cancel-side-effects
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-30
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js `node:test` + `node:assert/strict` + `--experimental-strip-types` |
| **Config file** | none — file lists in workspace `package.json` `test` scripts |
| **Quick run command** | `npm test --workspace=@timeoff/database` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test --workspace=@timeoff/database` and/or `npm test --workspace=@timeoff/web` for the touched package
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 0 | BAL-03 | T-04-01 | Deduct uses server total_days; no silent skip | unit | `npm test --workspace=@timeoff/database` | ❌ W0 | ⬜ pending |
| 04-01-02 | 01 | 0 | BAL-04 | — | Restore is inverse of deduct | unit | `npm test --workspace=@timeoff/database` | ❌ W0 | ⬜ pending |
| 04-01-03 | 01 | 0 | BAL-03 | — | Year from start_date ISO prefix | unit | `npm test --workspace=@timeoff/database` | ❌ W0 | ⬜ pending |
| 04-01-04 | 01 | 0 | NOTIF-01 | T-04-02 | Types request_approved / request_rejected only | unit | `npm test --workspace=@timeoff/database` | ❌ W0 | ⬜ pending |
| 04-01-05 | 01 | 0 | NOTIF-03 | T-04-03 | Unset Resend key → sent false, no throw | unit | `npm test --workspace=@timeoff/web` | ❌ W0 | ⬜ pending |
| 04-02-01 | 02 | 1 | BAL-03 | T-04-01 | Approve deducts matching row | unit | `npm test --workspace=@timeoff/database` | ❌ W0 | ⬜ pending |
| 04-03-01 | 03 | 2 | LEAVE-01 | T-04-02 | Audit insert throws, real actor UUID | unit | `npm test --workspace=@timeoff/database` | ❌ W0 | ⬜ pending |
| 04-03-02 | 03 | 2 | NOTIF-01 | T-04-02 | Notification insert throws, CHECK types | unit | `npm test --workspace=@timeoff/database` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `packages/database/src/modules/leave-balances/balance-arithmetic.ts` + `balance-arithmetic.test.ts` — BAL-03, BAL-04, D-01, D-04
- [ ] `packages/database/src/modules/leave-balances/year-from-start-date.ts` + `year-from-start-date.test.ts` — D-02
- [ ] `packages/database/src/modules/notifications/leave-request-notification-type.test.ts` — NOTIF-01/02, D-10
- [ ] `apps/web/src/lib/mail.ts` + `mail.test.ts` — NOTIF-03/04, D-13–D-15
- [ ] Append those files to the corresponding `package.json` `test` scripts
- [ ] Framework install: none — `node:test` ships with Node

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Employee receives a real Resend email on approve/reject | NOTIF-03, NOTIF-04 | Needs hosted `RESEND_API_KEY` and verified `EMAIL_FROM` (D-15) | Approve as manager with key set; inbox shows the mail. Local without key: adapter returns `{ sent: false }` and in-app row still exists. |
| Overview unread count and Leave Balance remaining_days update after approve | BAL-03, NOTIF-01 | Visual chrome locked; query invalidation is runtime | Sign in as employee after manager approve; Notifications count ≥ 1; remaining_days decreased by total_days. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
