---
phase: 04-approve-reject-cancel-side-effects
plan: 02
subsystem: api
tags: [resend, sendMail, NOTIF-03, NOTIF-04, D-13, D-14, D-15, node:test]

requires:
  - phase: 04-approve-reject-cancel-side-effects
    provides: 04-01 Wave 0 deduct/restore/year and CHECK-valid notification types
provides:
  - pinned official resend@6.25.0 on @timeoff/web after package-legitimacy check
  - sendMail / sendLeaveDecisionMail server-only adapter (never throws)
  - optional RESEND_API_KEY and EMAIL_FROM on EnvironmentConfig and env.example
  - COVERAGE.md emails.send INTEGRATE; new SDK resources OPT-OUT
affects:
  - 04-03 PATCH/POST approve/reject will call sendLeaveDecisionMail after durable writes
  - Phase 6 password-reset mail reuses sendMail

actuals:
  tokens: 4338
  tasks: 2
  commits: 4

tech-stack:
  added:
    - resend@6.25.0
  patterns:
    - Server-only Resend adapter with injected deps.send for unit tests
    - Optional mail env names never on requiredVars or productionRequiredVars
    - SDK { data, error } checked; try/catch only for network throws

key-files:
  created:
    - apps/web/src/lib/mail.ts
    - apps/web/src/lib/mail.test.ts
  modified:
    - apps/web/package.json
    - apps/web/src/lib/env.ts
    - apps/web/env.example
    - .planning/phases/04-approve-reject-cancel-side-effects/COVERAGE.md

key-decisions:
  - "Pin official npm package resend@6.25.0 (npm view latest + official Node docs); do not install @resend/node"
  - "Package-legitimacy verdict is SUS too-new (published 2026-08-28, ~10.4M weekly downloads, github.com/resend/resend-node, no postinstall). Documented; not a pipeline stop; not tagged registry-verified"
  - "RESEND_API_KEY and EMAIL_FROM are optional even in production (D-15)"
  - "sendMail never throws; unset key/from or SDK error returns { sent: false }"
  - "sendLeaveDecisionMail is approved/rejected only with idempotencyKey leave-request/{id}/{decision}"
  - "idempotencyKey is passed as emails.send second-arg options (SDK CreateEmailRequestOptions)"
  - "No /api/send route; no NEXT_PUBLIC_RESEND_*; resend not added to packages/database"

patterns-established:
  - "Mail transport lives in apps/web/src/lib/mail.ts; tests inject deps.send and deps.env and never construct Resend"
  - "Mail env names are always-optional; logger skip/error never logs the API key value"
  - "COVERAGE.md INTEGRATEs emails.send only; new SDK top-level resources are OPT-OUT"

requirements-completed: [NOTIF-03, NOTIF-04]

coverage:
  - id: D1
    description: Official resend is pinned on @timeoff/web after a recorded legitimacy check; COVERAGE.md keeps emails.send INTEGRATE
    requirement: NOTIF-03
    verification:
      - kind: other
        ref: node -e "const p=require('./apps/web/package.json'); if(!p.dependencies.resend) process.exit(1)"
        status: pass
    human_judgment: false
  - id: D2
    description: sendMail returns { sent: false } without throwing when the key or from is unset or the injected send returns an SDK error
    requirement: NOTIF-03
    verification:
      - kind: unit
        ref: apps/web/src/lib/mail.test.ts#sendMail
        status: pass
      - kind: other
        ref: npm test --workspace=@timeoff/web
        status: pass
    human_judgment: false
  - id: D3
    description: sendLeaveDecisionMail emails approved with subject Leave Request approved and idempotencyKey leave-request/{id}/approved
    requirement: NOTIF-04
    verification:
      - kind: unit
        ref: apps/web/src/lib/mail.test.ts#sendLeaveDecisionMail
        status: pass
    human_judgment: false
  - id: D4
    description: Hosted inbox UAT of employee approve/reject mail with a real RESEND_API_KEY
    requirement: NOTIF-03
    verification: []
    human_judgment: true
    rationale: D-15 — local automated tests mock the adapter; hosted delivery needs a verified domain and a real key that must not be committed

duration: 4min
completed: 2026-08-29
status: complete
---

# Phase 4 Plan 02: Wave 0 Resend sendMail Adapter Summary

**Server-only Resend adapter (`resend@6.25.0`) that skips or logs without throwing when the key is unset, so approve/reject can stay 200**

## Performance

- **Duration:** 4 min
- **Started:** 2026-08-29T17:49:45Z
- **Completed:** 2026-08-29T17:53:39Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Ran `gsd-tools query package-legitimacy check --ecosystem npm resend` and pinned the official Node SDK (`resend@6.25.0`) on `@timeoff/web` only
- Shipped `sendMail` / `sendLeaveDecisionMail` with injected `deps.send` so unit tests never hit the network
- Listed `RESEND_API_KEY` and `EMAIL_FROM` as optional names in `env.ts` and `env.example` (never production-required, never `NEXT_PUBLIC_`)
- Extended COVERAGE.md OPT-OUTs for new SDK resources (`automations`, `contactProperties`, `events`, `logs`, `oauthGrants`, `suppressions`)

## Package-legitimacy check (SUS too-new)

Command: `node $HOME/.claude/gsd-core/bin/gsd-tools.cjs query package-legitimacy check --ecosystem npm resend`

```json
[
  {
    "name": "resend",
    "verdict": "SUS",
    "signals": {
      "exists": true,
      "publishedAt": "2026-08-28T17:26:33.600Z",
      "weeklyDownloads": 10399754,
      "repoUrl": "git+https://github.com/resend/resend-node.git",
      "deprecated": false,
      "postinstall": null,
      "ecosystem": "npm"
    },
    "reasons": ["too-new"]
  }
]
```

`npm view resend version` → `6.25.0` (official docs: `npm install resend`, homepage `https://github.com/resend/resend-node`). RESEARCH already recorded `[SUS] too-new` on the 2026-08-28 publish despite official docs naming this package and ~10M weekly downloads. **Not tagged registry-verified.** Not a human-verify stop (plan + executor instructions). Did not install `@resend/node`, `nodemailer`, or `react-email`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Pin official resend after legitimacy check** - `3f3ecd6` (chore)
2. **Task 2 RED: Wave 0 sendMail tests** - `4b213a6` (test)
3. **Task 2 GREEN: Wave 0 sendMail adapter** - `1cebded` (feat)

**Plan metadata:** pending docs commit

## TDD Gate Compliance

- RED: `4b213a6` `test(04-02): add failing test for sendMail adapter` (import failed until `mail.ts` existed)
- GREEN: `1cebded` `feat(04-02): implement server-only sendMail adapter`
- REFACTOR: none

## Files Created/Modified

- `apps/web/package.json` - `resend@^6.25.0` dependency; `src/lib/mail.test.ts` on the test script
- `apps/web/src/lib/mail.ts` - `sendMail` / `sendLeaveDecisionMail`
- `apps/web/src/lib/mail.test.ts` - unset-key, unset-from, SDK-error, success, approve idempotency
- `apps/web/src/lib/env.ts` - optional `RESEND_API_KEY` / `EMAIL_FROM`
- `apps/web/env.example` - optional Resend names (no `onboarding@resend.dev`)
- `.planning/phases/04-approve-reject-cancel-side-effects/COVERAGE.md` - OPT-OUT new SDK resources

## Decisions Made

- Official `resend` package only; pin `6.25.0` from npm latest + Resend Node docs
- SUS too-new is documented in this SUMMARY, not a blocking human verify
- `idempotencyKey` goes on `emails.send` request options (SDK types), not the body
- Tests inject `deps.env`, `deps.send`, and a silent `deps.log` so `devLog` never loads production-required env during unit tests

## Deviations from Plan

### Auto-fixed Issues

**1. [Plan action - Coverage] OPT-OUT new Resend 6.25.0 top-level resources**
- **Found during:** Task 1 (Pin official resend)
- **Issue:** Pinned SDK exposes `automations`, `contactProperties`, `events`, `logs`, `oauthGrants`, `suppressions` (and nested methods) that were not in the pre-written matrix
- **Fix:** Added OPT-OUT rows + JSON coverage entries with reasons; left `emails.send` as the only INTEGRATE
- **Files modified:** `.planning/phases/04-approve-reject-cancel-side-effects/COVERAGE.md`
- **Verification:** `emails.send` + `INTEGRATE` still present; no `/api/send`
- **Committed in:** `3f3ecd6` (Task 1)

---

**Total deviations:** 1 auto-fixed (coverage matrix for new SDK resources)
**Impact on plan:** Required by the plan's "opt out new top-level resources" instruction. No scope creep.

## Issues Encountered

`gsd-tools query package-legitimacy check resend` (plan wording) failed with usage help; the working form is `query package-legitimacy check --ecosystem npm resend`. Same SUS too-new verdict as RESEARCH.

## User Setup Required

None for local approve/reject HTTP (D-15). Hosted UAT of NOTIF-03/04 needs a real `RESEND_API_KEY` and verified-domain `EMAIL_FROM` in gitignored `.env.local` — names are in `env.example`.

## Next Phase Readiness

- `sendLeaveDecisionMail` is ready for 04-03 to call after `approveLeaveRequest` / `rejectLeaveRequest` return
- Do not import `mail.ts` from `'use client'` files
- Do not add `/api/send`

---
*Phase: 04-approve-reject-cancel-side-effects*
*Completed: 2026-08-29*

## Self-Check: PASSED
