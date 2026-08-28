# Requirements: Timeoff

**Defined:** 2026-08-29
**Core Value:** A client company can run request → approve → remaining days → calendar on their own data, with no SQL from us, and no other company on the same deployment can see it.

## v1 Requirements

Requirements for this milestone. Shipped UI (dashboard shell, request form, approve dialogs, calendar pages, sign-in) is baseline and is not re-listed here. Each item maps to roadmap phases.

### Tenancy

- [ ] **TENANT-01**: First user can create a company at signup and owns that org
- [ ] **TENANT-02**: That user can invite people by email into only their company
- [ ] **TENANT-03**: Invitee joins that company and cannot see any other company
- [ ] **TENANT-04**: Company A cannot read or change Company B’s people, requests, balances, calendars, notifications, or audit
- [ ] **TENANT-05**: Google sign-in does not place a user in the wrong company or a global pool

### Authorization

- [ ] **AUTHZ-01**: Leave and user mutations run on the server using the signed-in session, not the browser anon key
- [ ] **AUTHZ-02**: Database policies deny rows outside the session user’s company
- [ ] **AUTHZ-03**: The public API key cannot read or write leave, user, or notification data without a valid tenant session

### Balances

- [ ] **BAL-01**: Dashboard remaining days come from the user’s `leave_balances` rows (no mock card)
- [ ] **BAL-02**: First user and invited users get default `leave_balances` so remaining days are not empty
- [ ] **BAL-03**: Approving a request deducts `total_days` from the matching balance row (user, type, year)
- [ ] **BAL-04**: Reject does not deduct; cancel of an approved request restores deducted days
- [ ] **BAL-05**: Bulk approve/reject applies the same balance updates as single approve/reject

### Leave lifecycle

- [ ] **LEAVE-01**: Single approve writes a durable audit row (real user id, insert succeeds)
- [ ] **LEAVE-02**: Single reject writes a durable audit row
- [ ] **LEAVE-03**: Cancel/delete paths write audit without `user_id: 'system'` FK failures
- [ ] **LEAVE-04**: Bulk approve/reject writes the same audit as single actions

### Notifications

- [ ] **NOTIF-01**: Approve creates an in-app notification the employee can see
- [ ] **NOTIF-02**: Reject creates an in-app notification the employee can see
- [ ] **NOTIF-03**: Approve sends the employee an email
- [ ] **NOTIF-04**: Reject sends the employee an email

### Auth recovery

- [ ] **AUTH-01**: Forgot password sends an email with a reset link
- [ ] **AUTH-02**: A valid reset persists a new password hash; the user can sign in with it
- [ ] **AUTH-03**: Deactivated users cannot sign in
- [ ] **AUTH-04**: Success copy is shown only if the reset mail was actually accepted for sending

### Calendars

- [ ] **CAL-01**: Personal calendar shows the same requests as the employee’s dashboard list
- [ ] **CAL-02**: Team calendar shows the same team requests as the manager dashboard, for that company only

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Leave accounting

- **ACCT-01**: Request day counts exclude weekends
- **ACCT-02**: Request day counts exclude holidays
- **ACCT-03**: Create/approve paths consult `leave_policies` (allowance, overlap, remaining-day gates)
- **ACCT-04**: Accrual and year-end carry-over run without manual SQL

### Admin

- **ADMIN-01**: Company HR can manage users, departments, and teams in the product (not the current stub `/(admin)/users` page as a global operator console)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Rebuild dashboard / request form / approve UI / calendar chrome | Already shipped; modify only for tenant scoping or truthful data |
| Working-day / holiday calendars | This milestone wires existing `leave_balances` rows, not HR day-count policy |
| Enforce `leave_policies` on create/approve | Schema exists; not consulted on purpose this milestone |
| Finish stub `/(admin)/users` as global admin | Companies self-serve via first-user signup + invites |
| Accrual jobs, payroll export | Not required for request → approve → calendar handoff |
| Mobile app, chat, attachment storage, realtime inbox | New product capabilities, not existing-flow repair |
| Second ORM or parallel app | Stay on Next.js + `@timeoff/database` + Supabase |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| TENANT-01 | Phase 1 | Pending |
| TENANT-02 | Phase 1 | Pending |
| TENANT-03 | Phase 1 | Pending |
| TENANT-04 | Phase 2 | Pending |
| TENANT-05 | Phase 1 | Pending |
| AUTHZ-01 | Phase 2 | Pending |
| AUTHZ-02 | Phase 2 | Pending |
| AUTHZ-03 | Phase 2 | Pending |
| BAL-01 | Phase 3 | Pending |
| BAL-02 | Phase 3 | Pending |
| BAL-03 | Phase 4 | Pending |
| BAL-04 | Phase 4 | Pending |
| BAL-05 | Phase 5 | Pending |
| LEAVE-01 | Phase 4 | Pending |
| LEAVE-02 | Phase 4 | Pending |
| LEAVE-03 | Phase 4 | Pending |
| LEAVE-04 | Phase 5 | Pending |
| NOTIF-01 | Phase 4 | Pending |
| NOTIF-02 | Phase 4 | Pending |
| NOTIF-03 | Phase 4 | Pending |
| NOTIF-04 | Phase 4 | Pending |
| AUTH-01 | Phase 6 | Pending |
| AUTH-02 | Phase 6 | Pending |
| AUTH-03 | Phase 6 | Pending |
| AUTH-04 | Phase 6 | Pending |
| CAL-01 | Phase 7 | Pending |
| CAL-02 | Phase 7 | Pending |

**Coverage:**
- v1 requirements: 27 total
- Mapped to phases: 27
- Unmapped: 0

---
*Requirements defined: 2026-08-29*
*Last updated: 2026-08-29 after roadmap creation*
