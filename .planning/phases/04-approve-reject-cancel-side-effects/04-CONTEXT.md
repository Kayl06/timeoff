# Phase 4: Approve Reject Cancel Side Effects - Context

**Gathered:** 2026-08-30
**Status:** Ready for planning

<domain>
## Phase Boundary

A single approve, reject, or cancel (and delete of an approved request) deducts or restores live `leave_balances` for the matching user/type/year, writes a durable audit row with the real actor’s UUID, and on approve/reject persists an in-app notification the employee can see plus an outbound email. Bulk approve/reject stays status-only until Phase 5. Do not restyle shipped dialogs, dashboards, or the Notifications stats card. Do not add remaining-day gates on create, working-day math, policy enforcement, or password-reset mail (Phase 6 reuses the mail adapter).

</domain>

<decisions>
## Implementation Decisions

### Balance deduct and restore
- **D-01:** On approve, add `request.total_days` to `used_days` and subtract the same amount from `remaining_days` on the matching `(user_id, leave_type, year)` row. Do not recompute `remaining_days` as `total_allowance - used_days` (that drops `carried_over`). Server `total_days` from Phase 2 is the only amount — do not trust a client days field. — **Reversibility:** costly — wrong formula leaves every approved row’s remaining days permanently off.
- **D-02:** Match `year` to the calendar year of `start_date` (ISO date prefix), not always `new Date().getFullYear()`. Phase 3 GET self-heal still uses the current calendar year for missing seeds.
- **D-03:** If no matching balance row exists, fail the approve with 409 and do not change request status. No silent no-op (PROJECT.md). Do not insert-on-approve; GET self-heal / RPC seed remain the insert path.
- **D-04:** Allow `remaining_days` to go negative if used exceeds remaining. Remaining-day gates on create are v2. Do not clamp remaining to 0 while still incrementing used.
- **D-05:** Reject never changes balances.
- **D-06:** Cancel or soft-delete of an **approved** request restores `total_days` (`used_days` down, `remaining_days` up). Pending or rejected cancel/delete does not touch balances. Restore-from-soft-delete is out of scope unless the UI already exposes it — if it does, restoring an approved-then-deleted request must re-deduct.
- **D-07:** Approve is idempotent: if status is already `approved`, return 409 and do not deduct again.

### Audit
- **D-08:** Approve, reject, cancel, and delete audit `user_id` is `session.user.id`. Never `'system'` (FK to `users.id` UUID). — **Reversibility:** costly — `'system'` inserts already fail silently today.
- **D-09:** Stop returning mock `id: 'audit-log-failed'` rows. `createAuditLog` must throw on insert failure so LEAVE-01–03 are testable. PATCH/cancel/delete must not report success if the audit insert did not persist.

### In-app notifications
- **D-10:** Persist types that pass the schema CHECK: `request_approved` and `request_rejected`. Stop writing `success` / `error` / `warning` / `info`. — **Reversibility:** costly — invalid types are why rows never persist (CONCERNS.md).
- **D-11:** Stop returning mock `id: 'notification-failed'`. Approve/reject must not report success if the employee notification did not persist. Keep existing copy shape (“Leave Request approved/rejected”) unless the CHECK forces a type-only change.
- **D-12:** The employee “sees” the notice on the existing Overview Notifications stats card (`unreadNotifications`). Do not add a new tray, page, or restyle that card. Invalidating `['notifications', userId]` is required so the count updates.

### Email
- **D-13:** Outbound mail uses **Resend** (`RESEND_API_KEY`, `EMAIL_FROM`) behind a small server-only adapter in `apps/web/src/lib/` so Phase 6 password reset can reuse it. Add env names to `env.ts` and `env.example` only — never commit secrets.
- **D-14:** Email the **employee** (`users.email` for `leave_requests.user_id`) on approve and reject only. Cancel/delete do not send mail this phase.
- **D-15:** Approve/reject must not fail solely because mail transport is down or `RESEND_API_KEY` is unset in local dev. After durable status + balance + audit + in-app row succeed, send mail; on transport failure log and still return 200. Hosted UAT of NOTIF-03/04 requires a real key. Tests mock the adapter.

### Failure order and tenants
- **D-16:** Deduct (or restore) **before** status change. If the status write fails after a balance write, reverse the balance write in the same request. No new Postgres RPC/transaction this phase unless research proves PostgREST cannot do the reverse safely.
- **D-17:** All of this stays on the tenant BFF (`PATCH /api/leave-requests/{id}`, existing cancel/delete) with `createTenantDatabaseService` — not identity/service_role. Do not put balance writes back on the browser client.
- **D-18:** Bulk POST is unchanged this phase (Phase 5). Do not sneak BAL-05 / LEAVE-04 into single-action helpers unless the helper is invoked only from the single PATCH path (bulk must not call it yet).

### UI
- **D-19:** Do not restyle approve/reject/cancel/delete dialogs or the Leave Balance card. Keep existing sonner success/error toasts.
- **D-20:** After approve, reject, cancel, and delete, invalidate `['leaveBalance', userId]` as well as the request-list keys already invalidated. Today create invalidates leaveBalance; approve does not.

### Claude's Discretion
User authorized autonomous decisions for this milestone. All D-01–D-20 are recommended defaults applied under `--auto`: deduct remaining_days in place, start_date year, 409 on missing row, negative remaining allowed, reject no-op on balances, restore only approved cancel/delete, idempotent approve, real actor UUID, throw on audit/notification insert failure, CHECK-valid notification types, Resend adapter, mail best-effort after durable writes, deduct-before-status with reverse, tenant BFF only, bulk deferred, no restyle, invalidate leaveBalance.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product / requirements
- `.planning/REQUIREMENTS.md` — BAL-03, BAL-04, LEAVE-01, LEAVE-02, LEAVE-03, NOTIF-01, NOTIF-02, NOTIF-03, NOTIF-04 (BAL-05 / LEAVE-04 are Phase 5)
- `.planning/PROJECT.md` — no silent no-op when a balance row is missing; email has no provider today
- `.planning/ROADMAP.md` — Phase 4 goal and success criteria; bulk is Phase 5; password reset mail is Phase 6

### Prior phase contracts
- `.planning/phases/03-live-remaining-days/03-CONTEXT.md` — D-11 remaining_days is the deducted column; invalidate leaveBalance was deferred here
- `.planning/phases/02-tenant-isolation-and-server-authz/02-SECURITY.md` — tenant JWT + RLS; identity/service_role not for leave writes
- `apps/web/src/app/api/leave-requests/[id]/route.ts` — session-gated PATCH approve/reject/cancel/delete
- `apps/web/src/lib/tenant-supabase.ts` — tenant queries use minted JWT

### Known bugs this phase must close
- `.planning/codebase/CONCERNS.md` — invalid notification `type` values swallowed; `user_id: 'system'` audit FK; best-effort balance so approved-without-deduct is possible
- `.planning/codebase/INTEGRATIONS.md` — no Resend/Nodemailer today; put the client in `apps/web/src/lib/`; env names only

### Schema and services
- `packages/database/migrations/001_initial_schema.sql` — `notifications.type` CHECK; `audit_logs.user_id` FK to `users`
- `packages/database/src/modules/leave-requests/service.ts` — approve/reject/cancel/delete side effects (best-effort today)
- `packages/database/src/modules/leave-balances/service.ts` — `updateBalanceAfterApproval` current-year + silent skip + recomputes remaining from allowance
- `packages/database/src/modules/notifications/service.ts` — writes `success`/`error`; returns fake rows
- `packages/database/src/modules/audit-logs/service.ts` — returns fake `audit-log-failed` rows
- `apps/web/src/hooks/use-leave-request-operations.ts` — PATCH mutations; approve does not invalidate `leaveBalance`
- `apps/web/src/components/dashboard/dashboard-stats.tsx` — unread notification count (do not restyle)
- `apps/web/src/components/dashboard/leave-balance-card.tsx` — live remaining_days (Phase 3)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `LeaveRequestService.approveLeaveRequest` / `rejectLeaveRequest` / `cancelLeaveRequest` / `softDeleteLeaveRequest` — keep the BFF calling these; fix side effects inside the services rather than duplicating in the route.
- `LeaveBalanceService.updateBalanceAfterApproval` — replace the silent skip, current-year lookup, and allowance-recompute with D-01–D-04; add a restore helper for D-06.
- `NotificationService.createLeaveRequestNotification` — change `type` to CHECK values; stop swallowing inserts.
- `AuditLogService.createAuditLog` — throw on failure; callers already pass `approverId` on approve/reject.
- Overview Notifications card and Leave Balance card — bind only; no new chrome.

### Established Patterns
- Session-gated BFF + `credentials: 'include'` (Phase 2). Tenant client, not service_role.
- Sonner toasts on mutation error (`payload.error`).
- React Query keys `['leaveBalance', userId]`, `['notifications', userId]`, request lists.

### Integration Points
- `PATCH /api/leave-requests/{id}` is the single-action tracer. Bulk route must not gain deduct this phase.
- Manager auto-approve on create (Phase 2) already calls `approveLeaveRequest` — that path must deduct too (same service method).
- Email adapter is new; no existing mailer imports.

</code_context>

<specifics>
## Specific Ideas

- Notification CHECK allows: `request_approved`, `request_rejected`, `request_pending`, `leave_balance_update`, `policy_change`, `system_announcement`.
- Soft-delete today audits `user_id: 'system'` — that is the LEAVE-03 bug.
- `updateBalanceAfterApproval` uses `new Date().getFullYear()` and skips when the row is missing — both must change.

</specifics>

<deferred>
## Deferred Ideas

- Bulk approve/reject balance + audit parity — Phase 5
- Password-reset mail and honest forgot-password copy — Phase 6 (reuse Resend adapter)
- Personal/team calendar agreement — Phase 7
- Remaining-day gates on create, overlap checks, policy engine, working-day math — v2
- New notification tray / list UI — not this phase (stats count is the shipped surface)
- Postgres transactional RPC for approve — only if research proves the deduct-then-status reverse is unsafe

</deferred>

---

*Phase: 4-Approve Reject Cancel Side Effects*
*Context gathered: 2026-08-30*
