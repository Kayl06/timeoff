# Timeoff

## What This Is

Timeoff is an existing leave-management web app (employee request → manager approve → balances and calendars). This project is not a rebuild and not a feature-expansion milestone.

It makes the already-shipped journeys truthful for **client companies on one shared deployment**: a company can sign itself up, people can request and approve leave against real remaining days, calendars match that data, and Company A never sees Company B. Surfaces that already work stay baseline; work is only net-new tenant isolation or existing behavior that is broken, stubbed, or unsafe.

## Core Value

A client company can run **request → approve → remaining days → calendar** on their own data, with no SQL from us, and no other company on the same deployment can see it.

## Business Context

- **Customer**: External client companies (employees and managers) running Timeoff as their leave system
- **Revenue model**: Product handed to clients on a shared multi-tenant deployment (billing model not specified this milestone)
- **Success metric**: A client can complete request → approve → balance → calendar without anyone patching rows in SQL
- **Strategy notes**: Treat the mapped codebase as the product; do not re-litigate shipped UI unless it must change for truth, isolation, or authz

## Requirements

### Validated

Shipped product surfaces. Do **not** re-plan these unless a later phase must modify them.

- ✓ Employee / manager / HR dashboard shell, navigation, and role-aware tabs — existing
- ✓ Leave request form (dates, type, half-day, validation) and request list / data table — existing
- ✓ Approve / reject / cancel / delete / bulk-action **UI** — existing (side effects are Active)
- ✓ Personal calendar and team calendar **pages** — existing (data consistency is Active)
- ✓ Credentials sign-in and optional Google OAuth sign-in UI — existing (tenant-safe join is Active)
- ✓ Self-serve signup UI and API that creates a `users` row — existing (org + balances + invites are Active)
- ✓ Forgot / reset password **pages** — existing (send mail + persist hash is Active)
- ✓ Domain modules and schema for users, leave requests, leave balances, departments, teams, leave policies, notifications, audit logs, calendar events — existing
- ✓ NextAuth JWT session + middleware gate on non-auth document routes — existing
- ✓ Supabase Postgres as system of record; Next.js App Router client (`apps/web`) — existing

### Active

Hypotheses until shipped. Each either **modifies** a broken/stubbed path or **adds** the tenant boundary the current single-company app does not have.

- [ ] Company self-signup: first user creates the org; later people join by invite, not a global open directory
- [ ] Tenant isolation: Company A never reads or mutates Company B’s people, requests, balances, calendars, notifications, or audit
- [ ] Close the open data path: stop browser writes with the public anon key; restore real authorization (server session + restrictive RLS)
- [ ] Dashboard remaining days show live `leave_balances` rows (stop hardcoded mock cards)
- [ ] Approve / reject / cancel / bulk actually deduct or restore those balance rows; no silent no-op when a row is missing for a user who should have one
- [ ] Sign-up (and the first user of a new company) creates default `leave_balances` so the dashboard is not empty
- [ ] In-app notifications persist with schema-valid types and appear for the recipient
- [ ] Email is sent when a request is approved or rejected
- [ ] Forgot-password sends real mail; reset-password persists a new hash
- [ ] Sign-in matches the UI: deactivated users cannot use the app; errors do not pretend a reset happened if nothing was sent
- [ ] Personal and team calendars show the same leave requests as the dashboard for that tenant
- [ ] Audit rows for leave lifecycle actually insert (no `user_id: 'system'` FK failures, no swallowed mocks)
- [ ] Google sign-in cannot auto-provision a user into the wrong company (or a global employee pool)

### Out of Scope

- Working-day / holiday calendars (weekends excluded from `total_days`) — this milestone wires existing `leave_balances` rows, not HR day-count policy
- Enforcing `leave_policies` (overlap detection, remaining-day gates, accrual, carry-over jobs) — schema exists; not consulted on purpose this milestone
- Finishing the stub `/(admin)/users` page as a global operator console — companies self-serve via first-user signup + invites; no SQL, but also no new HR admin IA
- Accrual schedulers, year-end carry-over workers, and payroll export
- New product capabilities not in the current app (chat, mobile app, attachments storage, realtime inbox)
- Rebuilding dashboards, tables, or calendar UIs that already exist — restyle/rewrite only if required for tenant scoping or truthful data
- Policy-engine “correct HR math” beyond showing and deducting stored balances

## Context

**Codebase (mapped 2026-08-29):** Turborepo npm workspaces. Only runtime app is `apps/web` (Next.js 14 App Router, NextAuth v4 JWT, TanStack Query, shadcn). Domain logic lives in `@timeoff/database` (repository → service → `IDatabaseService` facade). Persistence is Supabase Postgres. The browser talks to PostgREST with the anon key; after NextAuth replaced Supabase Auth, migrations set RLS to `USING (true)` and documented “application-layer” checks that were never implemented.

**Known lies in current flows (must change):**
- `leave-balance-card.tsx` always renders mock 5/10, 5/20, 5/10 for 2025 and ignores fetched balances
- Bulk approve/reject updates `status` only — skips balance, audit, and notifications
- Notification `type` values do not match the CHECK constraint; failures return fake rows
- Audit inserts with `user_id: 'system'` fail the UUID FK
- Forgot-password waits 2s and shows success; reset does not write `users.password`
- Signup sets department/team `Unassigned` and creates no `leave_balances`
- `is_active` is not enforced on credentials login; dashboard can force inactive users to look active
- Day math is inclusive calendar days; unused `calculateWorkingDays` in `@timeoff/utils` — leave that unused this milestone

**Tenant gap:** There is no company/org foreign key. `users`, `leave_requests`, and related tables are a single shared directory. Google first-login inserts a global `employee`. Open signup is a cross-tenant leak unless scoped to invite + org.

**Handoff bar:** Success is operational, not visual. A client uses the existing screens with live numbers and mail; we do not insert balances or reset passwords in SQL for them.

## Constraints

- **Baseline**: Mapped codebase and current implemented behavior are the baseline. Do not schedule already-complete functionality as new work unless it requires modification.
- **Stack**: Stay on Next.js App Router (`apps/web`), NextAuth, `@timeoff/database` modules, Supabase Postgres. Do not add a second ORM or a parallel app.
- **Authz**: Data access must be server-bound to the session and tenant. Public anon + `USING (true)` is incompatible with a client on a shared deployment.
- **Balances**: Truth means existing `leave_balances` rows displayed and deducted — not a new policy engine.
- **Email**: Password reset and approve/reject notices require real outbound mail. No email provider is wired today (`INTEGRATIONS.md`: no mailer).
- **Admin IA**: Do not build out the placeholder admin users page this milestone; onboarding is company signup + invite.
- **Compatibility**: Prefer modifying leave lifecycle and auth in place (hooks, services, RLS migrations) over a greenfield rewrite.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Brownfield: existing app is baseline | Product shape is already there; roadmap is truth + isolation, not a new leave product | — Pending |
| Do not re-plan shipped UI/features unless they must change | Avoid duplicate roadmap work for dashboards, forms, and tables that already exist | — Pending |
| Milestone goal: make existing flows actually work | Request, approve lifecycle, auth/recovery, and calendars currently lie or stub | — Pending |
| Remaining days = live `leave_balances` only | Working days and `leave_policies` enforcement are explicit later work | — Pending |
| Password reset must send mail and persist hash | UI already promises recovery; theater is not handoff-ready | — Pending |
| Sign-up seeds default leave_balances | Otherwise “real remaining days” is empty for new accounts | — Pending |
| Notices = in-app persist + email on approve/reject | Status change without a durable notice is not a complete existing flow | — Pending |
| Customers are client companies on one deployment | Internal-only hardening would be a different milestone | — Pending |
| True multi-tenant isolation in this milestone | Shared DB without org boundary cannot be handed to two clients | — Pending |
| Company self-signup: first user creates org, then invites | No global admin users page and no SQL at handoff | — Pending |
| Close RLS / client-write hole | Required for real users on a shared deployment | — Pending |
| Skip finishing stub admin users page | Self-serve org + invites replaces a global operator console for this milestone | — Pending |
| Done = request → approve → balance → calendar without SQL | Observable client handoff, not a demo of mock numbers | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-08-29 after initialization*
