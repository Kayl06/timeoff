---
gsd_state_version: 1.0
current_phase: 2
current_phase_name: Tenant Isolation and Server Authz
status: planning
stopped_at: Phase 2 plans created (6 plans, 4 waves), ready to execute
last_updated: "2026-08-29T12:50:00.000Z"
last_activity: 2026-08-29
last_activity_desc: Phase 2 planned — 6 plans across 4 waves
state_head: 902cabb7afb6abae4dad023d785b9820a73918b7
progress:
  total_phases: 7
  completed_phases: 1
  total_plans: 15
  completed_plans: 9
  percent: 14
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-08-29)

**Core value:** A client company can run request → approve → remaining days → calendar on their own data, with no SQL from us, and no other company on the same deployment can see it.
**Current focus:** Phase 2 — Tenant Isolation and Server Authz

## Current Position

Phase: 2 — Tenant Isolation and Server Authz
Plan: 6 plans created (not executed)
Status: Ready to execute
Last activity: 2026-08-29 — Phase 2 planned (02-01 through 02-06)

Progress: [██░░░░░░░░] 14%

## Performance Metrics

**Velocity:**

- Total plans completed: 9
- Average duration: —
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01 | 9 | - | - |

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
| Phase 01-company-signup-and-invites P07 | 2 min | 2 tasks | 4 files |
| Phase 01-company-signup-and-invites P08 | 2 min | 2 tasks | 4 files |
| Phase 01-company-signup-and-invites P09 | 3 min | 3 tasks | 9 files |

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
- [Phase 01]: POST users lookup is email-only; pending invites stay company-scoped
- [Phase 01]: EMAIL_EXISTS_ERROR matches signup duplicate copy; never leak other company id
- [Phase 01]: Did not drop users.email UNIQUE; closed the 201-unredeemable path instead
- [Phase 01]: Preview users lookup is email-only after usability; select id so company_id never enters JSON
- [Phase 01]: Reused EMAIL_EXISTS_ERROR from invite-auth; 409 never leaks other company identity
- [Phase 01]: Credentials accept 409 (not mismatch) sets exists; sonner toast without a second Toaster
- [Phase 01]: Credentials and Google join share accept_invite_with_employee; Google passes passwordHash null
- [Phase 01]: Other-company Google and unique-violation 23505 redirect to ACCOUNT_EXISTS_PATH with Sign in, not InviteRequired
- [Phase 01]: Same-company existing Google member still marks the invite accepted and returns true (no second users row)

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

Last session: 2026-08-29T12:20:00Z
Stopped at: Phase 1 complete, ready to plan Phase 2
Resume file: None
