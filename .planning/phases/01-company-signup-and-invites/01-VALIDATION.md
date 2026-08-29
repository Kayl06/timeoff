---
phase: 1
slug: company-signup-and-invites
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-29
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

Seeded from `01-RESEARCH.md` Validation Architecture. Task IDs in the map are placeholders until PLAN.md exists — executor fills Status as tasks land.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js `node:test` + `node:assert/strict` (built-in) |
| **Config file** | none — Wave 0 adds `apps/web` `"test"` script |
| **Quick run command** | `npm test --workspace=@timeoff/web` |
| **Full suite command** | `npm test` (turbo) |
| **Estimated runtime** | ~15 seconds |

Do not add Jest, Vitest, or tsx. Run `.ts` tests with `node --test --experimental-strip-types` (Node 22+). If executor Node is 18, compile those files with `tsc` then `node --test`.

---

## Sampling Rate

- **After every task commit:** Run `npm test --workspace=@timeoff/web`
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-00-W0 | 01 | 0 | TENANT-01–05 | — | Test script exists; invite-token + google-signin-gate unit tests fail closed | unit | `npm test --workspace=@timeoff/web` | ❌ W0 | ⬜ pending |
| 01-TBD | TBD | TBD | TENANT-01 | T-01 | Creating user gets `company_id` + company `owner_id` | unit | `node --test --experimental-strip-types src/lib/company-owner.test.ts` | ❌ W0 | ⬜ pending |
| 01-TBD | TBD | TBD | TENANT-02 | T-01 | Non-owner invite rejected; invite `company_id` = owner's company | unit | `npm test --workspace=@timeoff/web` | ❌ W0 | ⬜ pending |
| 01-TBD | TBD | TBD | TENANT-03 | T-01 | Accept binds `company_id` from invite only | unit | `npm test --workspace=@timeoff/web` | ❌ W0 | ⬜ pending |
| 01-TBD | TBD | TBD | TENANT-05 | T-01 | Unknown Google without pending cookie → InviteRequired URL; hash/compare tokens | unit | `src/lib/invite-token.test.ts` + `google-signin-gate.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/web/package.json` `"test"` script
- [ ] `apps/web/src/lib/invite-token.ts` + `invite-token.test.ts`
- [ ] `apps/web/src/lib/google-signin-gate.ts` + test
- [ ] `apps/web/src/lib/company-owner.test.ts` (or equivalent)
- [ ] Framework install: none (`node:test`)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Full Google OAuth happy/deny path in a browser | TENANT-05 | Needs Google client + live redirect | Sign in with Google as unknown email → land on `/auth/error?error=InviteRequired`. Sign in with Google after company-name cookie / invite cookie → join that company only. |
| Credentials signup → invite copy-link → accept | TENANT-01, TENANT-02, TENANT-03 | Browser session + email link | Create company, send invite, open accept URL in a second browser, land on dashboard of that company. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
