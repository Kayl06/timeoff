---
gsd_state_version: 1.0
current_phase: 01
current_phase_name: Company Signup and Invites
status: executing
stopped_at: Completed 01-06-PLAN.md
last_updated: "2026-08-29T11:22:54.139Z"
last_activity: 2026-08-29
last_activity_desc: Phase 01 execution started
state_head: fee424fd84203b85e2be58b3c4ee9e661b908fc3
progress:
  total_phases: 7
  completed_phases: 0
  total_plans: 9
  completed_plans: 6
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-08-29)

**Core value:** A client company can run request → approve → remaining days → calendar on their own data, with no SQL from us, and no other company on the same deployment can see it.
**Current focus:** Phase 01 — Company Signup and Invites

## Current Position

Phase: 01 (Company Signup and Invites) — EXECUTING
Plan: 7 of 9
Status: Completed 01-06; ready for 01-07
Last activity: 2026-08-29 — Completed 01-06-PLAN.md

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
| Phase 01-company-signup-and-invites P06 | 2 min | 2 tasks | 4 files |

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
- [Phase 01]: Client helpers re-check PASSWORD_REQUIREMENTS in schema order; passwordSchema stays unexported
- [Phase 01]: 400 details win on field errors; toast.error is fallback only when details is missing or empty
- [Phase 01]: Google OAuth env is not required for credentials signup

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

Last session: 2026-08-29T11:22:53.912Z
Stopped at: Completed 01-06-PLAN.md
Resume file: None
