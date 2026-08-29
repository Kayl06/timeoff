# Roadmap: Timeoff

## Overview

This brownfield milestone makes the existing leave app truthful for **client companies on one shared deployment**. Shipped screens stay; work is tenant isolation plus broken/stubbed flows. Isolation lands first (company + server authz) so later live balances, approvals, mail, and calendars are not globally readable. Then remaining days become real on request, then single and bulk approve/reject actually deduct, audit, and notify, then password reset and sign-in are honest, then personal and team calendars match the dashboards for that company only.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Company Signup and Invites** - First user creates an org; later people join only that company by invite; Google cannot dump into a global pool (completed 2026-08-29)
- [ ] **Phase 2: Tenant Isolation and Server Authz** - Company A cannot see Company B; mutations run on the server with a session; the public anon key cannot operate alone
- [ ] **Phase 3: Live Remaining Days** - Dashboard remaining days come from `leave_balances`; first and invited users get default rows
- [ ] **Phase 4: Approve Reject Cancel Side Effects** - Single approve/reject/cancel deducts or restores days, writes durable audit, and notifies in-app and by email
- [ ] **Phase 5: Bulk Approve Parity** - Bulk approve/reject applies the same balance and audit side effects as single actions
- [ ] **Phase 6: Honest Password Reset and Sign-in** - Reset mail is real, the new hash persists, deactivated users cannot sign in, success copy is honest
- [ ] **Phase 7: Calendar and Dashboard Agreement** - Personal and team calendars show the same tenant-scoped requests as the matching dashboards

## Phase Details

### Phase 1: Company Signup and Invites

**Goal**: A client company can create itself at signup; later people join only that company by invite; Google cannot drop a user into a global pool.
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: TENANT-01, TENANT-02, TENANT-03, TENANT-05
**Success Criteria** (what must be TRUE):

  1. First user at signup creates a company and owns that org
  2. That owner can invite people by email into only their company
  3. An invitee joins that company and cannot see any other company
  4. Google sign-in does not place a user in the wrong company or a global employee pool

**Plans**: 9/9 plans executed (4 gap-closure pending)
Plans:
**Wave 1**

- [x] 01-01-PLAN.md — Wave 0 token/gate/owner unit tests

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 01-02-PLAN.md — Credentials create-company tracer + schema push

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 01-03-PLAN.md — Google InviteRequired + pending company cookie

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 01-04-PLAN.md — Owner copy-link invites

**Wave 5** *(blocked on Wave 4 completion)*

- [x] 01-05-PLAN.md — Accept invite (credentials + Google)

**Wave 6** *(gap closure; 01-06 and 01-07 parallel)*

- [x] 01-06-PLAN.md — Signup password validation feedback (G-01-1)
- [x] 01-07-PLAN.md — Invite 409 on globally existing email (G-01-4)

**Wave 7** *(blocked on 01-07)*

- [x] 01-08-PLAN.md — Preview existing-account before join form (G-01-4)

**Wave 8** *(blocked on 01-08)*

- [x] 01-09-PLAN.md — Atomic accept + Google existing-account copy (G-01-4)

**UI hint**: yes

### Phase 2: Tenant Isolation and Server Authz

**Goal**: Company A cannot read or mutate Company B; leave and user writes run on the server with a signed-in session; the public anon key cannot operate without a tenant session.
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: TENANT-04, AUTHZ-01, AUTHZ-02, AUTHZ-03
**Success Criteria** (what must be TRUE):

  1. A signed-in user at Company A cannot read or change Company B’s people, requests, balances, calendars, notifications, or audit
  2. Requesting, approving, or updating leave as a signed-in user still works; those writes are bound to the signed-in session, not the browser anon key
  3. Someone holding only the public API key, without a valid tenant session, cannot read or write leave, user, or notification data

**Plans**: TBD

### Phase 3: Live Remaining Days

**Goal**: Dashboard remaining days come from live `leave_balances` rows; first and invited users have default rows so remaining days are not empty.
**Mode:** mvp
**Depends on**: Phase 2
**Requirements**: BAL-01, BAL-02
**Success Criteria** (what must be TRUE):

  1. Dashboard remaining days show the signed-in user’s `leave_balances` rows (not mock 5/10 cards)
  2. The first user of a new company and invited users have default `leave_balances` so remaining days are not empty

**Plans**: TBD
**UI hint**: yes

### Phase 4: Approve Reject Cancel Side Effects

**Goal**: A single approve, reject, or cancel actually deducts or restores remaining days, writes durable audit with a real user id, and notifies the employee in-app and by email.
**Mode:** mvp
**Depends on**: Phase 3
**Requirements**: BAL-03, BAL-04, LEAVE-01, LEAVE-02, LEAVE-03, NOTIF-01, NOTIF-02, NOTIF-03, NOTIF-04
**Success Criteria** (what must be TRUE):

  1. Approving a request deducts `total_days` from the matching balance row (user, type, year); remaining days on the dashboard update
  2. Reject does not deduct remaining days; cancel of an approved request restores the deducted days
  3. Approve, reject, cancel, and delete each write a durable audit row with the real actor’s user id (no `user_id: 'system'` FK failures)
  4. The employee sees an in-app notification and receives an email when their request is approved or rejected

**Plans**: TBD
**UI hint**: yes

### Phase 5: Bulk Approve Parity

**Goal**: Bulk approve and bulk reject apply the same balance and audit side effects as the matching single actions (no status-only no-op).
**Mode:** mvp
**Depends on**: Phase 4
**Requirements**: BAL-05, LEAVE-04
**Success Criteria** (what must be TRUE):

  1. Bulk approve deducts remaining days the same way as single approve; bulk reject does not deduct
  2. Bulk approve and bulk reject each write the same kind of durable audit row as the matching single action
  3. After bulk approve, each affected employee’s remaining days match what single approve would have produced

**Plans**: TBD

### Phase 6: Honest Password Reset and Sign-in

**Goal**: Forgot-password sends real mail; a valid reset persists a new hash; deactivated users cannot sign in; success copy appears only when mail was accepted.
**Mode:** mvp
**Depends on**: Phase 2
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04
**Success Criteria** (what must be TRUE):

  1. Forgot password sends an email with a reset link
  2. Completing a valid reset persists a new password hash; the user can sign in with the new password
  3. A deactivated user cannot sign in
  4. Success copy on forgot-password appears only if the reset mail was actually accepted for sending

**Plans**: TBD
**UI hint**: yes

### Phase 7: Calendar and Dashboard Agreement

**Goal**: Personal and team calendars show the same tenant-scoped leave requests as the matching dashboards.
**Mode:** mvp
**Depends on**: Phase 4
**Requirements**: CAL-01, CAL-02
**Success Criteria** (what must be TRUE):

  1. Personal calendar shows the same leave requests as the employee’s dashboard list
  2. Team calendar shows the same team requests as the manager dashboard, for that company only

**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7

Phase 6 depends only on Phase 2 (authz + tenant exist; remaining-days and leave side effects are not required). Phase 7 depends on Phase 4 so calendars agree with truthful request and approval data. Execute 6 after 2 when convenient; default numeric order still applies unless a later workflow reorders.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Company Signup and Invites | 9/9 | Complete    | 2026-08-29 |
| 2. Tenant Isolation and Server Authz | 0/TBD | Not started | - |
| 3. Live Remaining Days | 0/TBD | Not started | - |
| 4. Approve Reject Cancel Side Effects | 0/TBD | Not started | - |
| 5. Bulk Approve Parity | 0/TBD | Not started | - |
| 6. Honest Password Reset and Sign-in | 0/TBD | Not started | - |
| 7. Calendar and Dashboard Agreement | 0/TBD | Not started | - |
