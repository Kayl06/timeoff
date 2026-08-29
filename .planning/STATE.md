---
gsd_state_version: 1.0
current_phase: 1
current_phase_name: Company Signup and Invites
status: verifying
stopped_at: Phase 1 executed; human verification needed
last_updated: "2026-08-29T09:38:44.245Z"
last_activity: 2026-08-29
last_activity_desc: Phase 1 execution started
state_head: 6946ea8fa9ae438a494e04f04d54ec4d1bdd7e36
progress:
  total_phases: 7
  completed_phases: 0
  total_plans: 5
  completed_plans: 5
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-08-29)

**Core value:** A client company can run request → approve → remaining days → calendar on their own data, with no SQL from us, and no other company on the same deployment can see it.
**Current focus:** Phase 1 — Company Signup and Invites

## Current Position

Phase: 1 (Company Signup and Invites) — EXECUTING
Plan: 5 of 5
Status: Phase complete — ready for verification
Last activity: 2026-08-29 — Phase 1 execution started

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**

- Total plans completed: 0
- Average duration: —
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**

- Last 5 plans: —
- Trend: —

*Updated after each plan completion*
**Per-Plan Metrics:**

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 01-company-signup-and-invites P01 | 2 min | 3 tasks | 7 files |
| Phase 01 P02 | 17 min | 3 tasks | 11 files |
| Phase 01 P03 | 4 min | 3 tasks | 11 files |
| Phase 01-company-signup-and-invites P04 | 4 min | 3 tasks | 8 files |
| Phase 01-company-signup-and-invites P05 | 4 min | 3 tasks | 8 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Brownfield baseline: do not re-plan shipped dashboard/form/calendar chrome
- Isolation first (company + server authz) before live balances and notices
- Remaining days = live `leave_balances` only (no working-day math or `leave_policies` this milestone)
- Skip stub `/(admin)/users`; onboarding is first-user signup + invites
- [Phase 01]: Did not set apps/web package.json type:module so Next CJS configs stay valid; Node 26 re-parses TS tests as ESM
- [Phase 01]: hashInviteTokenHex is the only persistence/lookup form for company_invites.token_hash (64 lowercase hex)
- [Phase 01]: option-a: companies.owner_id + users.company_id NOT NULL + create_company_with_owner
- [Phase 01]: Applied companies schema to local Supabase; hosted project still needs database password to link and push
- [Phase 1]: Deny-until-01-05: unknown Google with pending invite cookie returns InviteRequired (no global employee insert)
- [Phase 1]: Pending Google context uses Next 14 sync cookies(); company name never in OAuth state or authorizationParams
- [Phase 1]: Invite writes stay on supabase in the route; IDatabaseService unchanged
- [Phase 1]: invite-auth.ts imports ./company-owner.ts so Node 26 tests resolve the leaf module
- [Phase 1]: Accept/preview writes and reads use supabase in the route; IDatabaseService unchanged
- [Phase 1]: Google invite bind runs in auth.ts signIn after decideGoogleSignIn allows pendingInvite
- [Phase 1]: Credentials and Google inserts set users.email from invite.email only

### Pending Todos

None yet.

### Blockers/Concerns

- No mailer is wired today (INTEGRATIONS.md); Phase 4 notices and Phase 6 reset both need outbound mail
- Open RLS + browser anon key must close in Phase 2 before truthful data is safe on a shared deployment

## Deferred Items

Items acknowledged and deferred at milestone close, most recent first:

| Category | Item | Status | Deferred At | Milestone |
|----------|------|--------|-------------|-----------|
| *(none)* | | | | |

## Session Continuity

Last session: 2026-08-29T09:38:44.030Z
Stopped at: Phase 1 executed; human verification needed
Resume file: .planning/phases/01-company-signup-and-invites/01-UAT.md
