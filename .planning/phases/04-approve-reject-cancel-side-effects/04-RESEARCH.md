# Phase 4: Approve Reject Cancel Side Effects - Research

**Researched:** 2026-08-30
**Domain:** Leave lifecycle side effects (balance arithmetic, durable audit, in-app notifications, Resend mail) on the existing tenant BFF
**Confidence:** HIGH (in-repo services/schema); MEDIUM (Resend SDK — official docs cited, package-legitimacy SUS)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** On approve, add `request.total_days` to `used_days` and subtract the same amount from `remaining_days` on the matching `(user_id, leave_type, year)` row. Do not recompute `remaining_days` as `total_allowance - used_days` (that drops `carried_over`). Server `total_days` from Phase 2 is the only amount — do not trust a client days field. — **Reversibility:** costly — wrong formula leaves every approved row’s remaining days permanently off.
- **D-02:** Match `year` to the calendar year of `start_date` (ISO date prefix), not always `new Date().getFullYear()`. Phase 3 GET self-heal still uses the current calendar year for missing seeds.
- **D-03:** If no matching balance row exists, fail the approve with 409 and do not change request status. No silent no-op (PROJECT.md). Do not insert-on-approve; GET self-heal / RPC seed remain the insert path.
- **D-04:** Allow `remaining_days` to go negative if used exceeds remaining. Remaining-day gates on create are v2. Do not clamp remaining to 0 while still incrementing used.
- **D-05:** Reject never changes balances.
- **D-06:** Cancel or soft-delete of an **approved** request restores `total_days` (`used_days` down, `remaining_days` up). Pending or rejected cancel/delete does not touch balances. Restore-from-soft-delete is out of scope unless the UI already exposes it — if it does, restoring an approved-then-deleted request must re-deduct.
- **D-07:** Approve is idempotent: if status is already `approved`, return 409 and do not deduct again.
- **D-08:** Approve, reject, cancel, and delete audit `user_id` is `session.user.id`. Never `'system'` (FK to `users.id` UUID). — **Reversibility:** costly — `'system'` inserts already fail silently today.
- **D-09:** Stop returning mock `id: 'audit-log-failed'` rows. `createAuditLog` must throw on insert failure so LEAVE-01–03 are testable. PATCH/cancel/delete must not report success if the audit insert did not persist.
- **D-10:** Persist types that pass the schema CHECK: `request_approved` and `request_rejected`. Stop writing `success` / `error` / `warning` / `info`. — **Reversibility:** costly — invalid types are why rows never persist (CONCERNS.md).
- **D-11:** Stop returning mock `id: 'notification-failed'`. Approve/reject must not report success if the employee notification did not persist. Keep existing copy shape (“Leave Request approved/rejected”) unless the CHECK forces a type-only change.
- **D-12:** The employee “sees” the notice on the existing Overview Notifications stats card (`unreadNotifications`). Do not add a new tray, page, or restyle that card. Invalidating `['notifications', userId]` is required so the count updates.
- **D-13:** Outbound mail uses **Resend** (`RESEND_API_KEY`, `EMAIL_FROM`) behind a small server-only adapter in `apps/web/src/lib/` so Phase 6 password reset can reuse it. Add env names to `env.ts` and `env.example` only — never commit secrets.
- **D-14:** Email the **employee** (`users.email` for `leave_requests.user_id`) on approve and reject only. Cancel/delete do not send mail this phase.
- **D-15:** Approve/reject must not fail solely because mail transport is down or `RESEND_API_KEY` is unset in local dev. After durable status + balance + audit + in-app row succeed, send mail; on transport failure log and still return 200. Hosted UAT of NOTIF-03/04 requires a real key. Tests mock the adapter.
- **D-16:** Deduct (or restore) **before** status change. If the status write fails after a balance write, reverse the balance write in the same request. No new Postgres RPC/transaction this phase unless research proves PostgREST cannot do the reverse safely.
- **D-17:** All of this stays on the tenant BFF (`PATCH /api/leave-requests/{id}`, existing cancel/delete) with `createTenantDatabaseService` — not identity/service_role. Do not put balance writes back on the browser client.
- **D-18:** Bulk POST is unchanged this phase (Phase 5). Do not sneak BAL-05 / LEAVE-04 into single-action helpers unless the helper is invoked only from the single PATCH path (bulk must not call it yet).
- **D-19:** Do not restyle approve/reject/cancel/delete dialogs or the Leave Balance card. Keep existing sonner success/error toasts.
- **D-20:** After approve, reject, cancel, and delete, invalidate `['leaveBalance', userId]` as well as the request-list keys already invalidated. Today create invalidates leaveBalance; approve does not.

### Claude's Discretion
User authorized autonomous decisions for this milestone. All D-01–D-20 are recommended defaults applied under `--auto`: deduct remaining_days in place, start_date year, 409 on missing row, negative remaining allowed, reject no-op on balances, restore only approved cancel/delete, idempotent approve, real actor UUID, throw on audit/notification insert failure, CHECK-valid notification types, Resend adapter, mail best-effort after durable writes, deduct-before-status with reverse, tenant BFF only, bulk deferred, no restyle, invalidate leaveBalance.

### Deferred Ideas (OUT OF SCOPE)
- Bulk approve/reject balance + audit parity — Phase 5
- Password-reset mail and honest forgot-password copy — Phase 6 (reuse Resend adapter)
- Personal/team calendar agreement — Phase 7
- Remaining-day gates on create, overlap checks, policy engine, working-day math — v2
- New notification tray / list UI — not this phase (stats count is the shipped surface)
- Postgres transactional RPC for approve — only if research proves the deduct-then-status reverse is unsafe
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BAL-03 | Approving a request deducts `total_days` from the matching balance row (user, type, year) | Replace `updateBalanceAfterApproval` formula (D-01) and year lookup (D-02); 409 if row missing (D-03); invert order to deduct-then-status (D-16) |
| BAL-04 | Reject does not deduct; cancel of an approved request restores deducted days | Reject skips balance; add restore helper; call it only when current status is `approved` on cancel/delete (D-05, D-06) |
| LEAVE-01 | Single approve writes a durable audit row (real user id, insert succeeds) | `createAuditLog` throws; `user_id` is `approverId` / `session.user.id`; no mock `audit-log-failed` (D-08, D-09) |
| LEAVE-02 | Single reject writes a durable audit row | Same throw path; reject already passes `approverId` |
| LEAVE-03 | Cancel/delete paths write audit without `user_id: 'system'` FK failures | Pass actor UUID into `cancelLeaveRequest` / `softDeleteLeaveRequest`; never `'system'` (D-08) |
| NOTIF-01 | Approve creates an in-app notification the employee can see | Persist `type: 'request_approved'`; throw on insert fail; Overview card reads GET `/api/notifications` unread count (D-10–D-12) |
| NOTIF-02 | Reject creates an in-app notification the employee can see | Persist `type: 'request_rejected'` (D-10, D-11) |
| NOTIF-03 | Approve sends the employee an email | Resend adapter after durable writes; `users.email` of `leave_requests.user_id` (D-13–D-15) |
| NOTIF-04 | Reject sends the employee an email | Same adapter, reject path only (D-14) |
</phase_requirements>

## Summary

Today a single approve **does** call `LeaveBalanceService.updateBalanceAfterApproval`, write audit, and call `createLeaveRequestNotification` — but those side effects are best-effort, use the wrong year and remaining formula, write CHECK-invalid notification types, and swallow FK failures with fake ids. Cancel never restores balances. Soft-delete audits `user_id: 'system'`, which cannot insert into `audit_logs.user_id UUID REFERENCES users(id)`. There is no mailer.

Implement this phase **inside the existing domain services**, called from the existing session-gated `PATCH /api/leave-requests/[id]` (and manager auto-approve on `POST /api/leave-requests`). Extract pure deduct/restore/year helpers and test them with `node:test`. Put Resend behind `apps/web/src/lib/mail.ts`. Do **not** add a Postgres RPC: supabase-js cannot wrap two HTTP updates in one transaction, but a **delta reverse in the same request** plus a pending-status compare-and-swap is safe enough for D-16.

**Primary recommendation:** Fix `LeaveRequestService` approve/reject/cancel/soft-delete to deduct-or-restore by delta, throw on audit/notification insert failure, then send Resend mail from the BFF only after those writes succeed.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Deduct / restore `leave_balances` | API / Backend (`@timeoff/database` services on tenant BFF) | Database / Storage | D-17: never from the browser. PostgREST UPDATE under tenant RLS |
| Request status approve/reject/cancel/delete | API / Backend | Database / Storage | Existing `LeaveRequestRepository`; add pending CAS on approve |
| Durable audit row | API / Backend | Database / Storage | `audit_logs.user_id` FK requires a real `users.id`; session actor |
| In-app notification persist | API / Backend | Database / Storage | CHECK-valid `type`; employee `user_id` |
| Employee unread count | Browser / Client | Frontend Server (SSR) | Existing Overview card + React Query `['notifications', userId]` |
| Remaining days on dashboard | Browser / Client | API / Backend | Existing Leave Balance card + invalidate `['leaveBalance', userId]` |
| Outbound approve/reject email | API / Backend (Next.js route) | CDN / Static — | Resend HTTP API; server-only adapter; not in `packages/database` |
| Tenant authz | Frontend Server (SSR) + API | Database RLS | Existing `createTenantDatabaseService`; not `service_role` |

## Project Constraints (from .cursor/rules/ and CLAUDE.md)

No `.cursor/rules/` directory exists. Directives from `.claude/CLAUDE.md` that bind this phase:

- Stay on Next.js App Router (`apps/web`), NextAuth, `@timeoff/database`, Supabase Postgres. Do not add a second ORM.
- Put the mail client in `apps/web/src/lib/`; add env **names** to `env.ts` and `env.example`; never commit secrets.
- Database modules keep `types.ts` / `repository.ts` / `service.ts` / `index.ts`. Services must not contain SQL; repositories wrap errors with `DatabaseUtils.handleDatabaseError`.
- Tenant leave writes use `createTenantDatabaseService` (`DatabaseServiceFactory.create`), not `service_role`.
- kebab-case lib files; TanStack keys stay camelCase arrays (`['leaveBalance', userId]`, `['notifications', userId]`).
- Prefer `sonner` for mutation toasts (already used). Do not restyle shipped chrome (D-19).
- Tests: existing runner is `node --test --experimental-strip-types` with files listed in workspace `package.json` `test` scripts. Do not introduce Vitest unless adding a new runner (not needed).
- **Override for this phase:** CLAUDE.md currently says *“In services, do not fail the primary mutation if audit logs, notifications, or balance side-effects fail.”* Locked D-09 / D-11 / D-16 **supersede** that for approve, reject, cancel, and delete. Create-request may keep its swallow try/catch. Bulk stays status-only (D-18).

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@timeoff/database` LeaveRequest / LeaveBalance / Notification / AuditLog services | in-repo | Side-effect orchestration | Locked: fix in place, do not duplicate in the route |
| `@supabase/supabase-js` | `^2.53.0` app / lockfile `2.112.4` | PostgREST updates | Only data client; no second ORM |
| Next.js App Router route handlers | `^14.2.18` (lockfile `14.2.35`) | Session-gated PATCH/POST | D-17 BFF |
| `resend` | npm view `6.25.0` (2026-08-28) | Transactional email | Locked D-13; official docs prescribe this package name |
| `zod` | `^3.25.76` | PATCH body already validated | Reuse `leaveRequestPatchBodySchema` |
| `@tanstack/react-query` | `^5.8.4` | Cache invalidation | D-12 / D-20 |
| `sonner` | `^2.0.7` | Existing mutation toasts | D-19 |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `node:test` + `--experimental-strip-types` | Node 26.6.0 local | Unit tests for pure helpers | Match Phase 1–3 test style |
| `next-auth` `getServerSession` | `^4.24.5` | Actor UUID | D-08 |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Resend SDK | Nodemailer / SendGrid / Supabase Auth SMTP | Locked D-13: Resend. Do not add a second mailer |
| Compensating reverse | Postgres RPC wrapping deduct+status | Official supabase-js: no multi-query transaction. D-16: RPC only if reverse is unsafe — it is not, if reverse is delta-based and approve status UPDATE filters `pending` |
| `react-email` templates | HTML strings | Official Next.js guide uses React Email optionally. Do not add that package this phase; html/text is enough for approve/reject copy |

**Installation:**

```bash
npm install resend -w @timeoff/web
```

**Version verification:** `npm view resend version` → `6.25.0`; homepage `https://github.com/resend/resend-node`; no `scripts.postinstall`. Official install command: `npm install resend` ([CITED: resend.com/docs/send-with-nodejs]). Package-legitimacy verdict is **SUS** (`too-new` on the 2026-08-28 publish stamp) despite ~10M weekly downloads and `github.com/resend/resend-node` — planner **must** insert `checkpoint:human-verify` before install. Do **not** tag this package `[VERIFIED: npm registry]` (legitimacy was not `OK`).

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `resend` | npm | latest version timestamp 2026-08-28 | ~10.4M/wk | github.com/resend/resend-node | [SUS] too-new | Flagged — planner must add `checkpoint:human-verify` before install. Official docs name this package. |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** `resend`

*Do not install `@resend/node`, `nodemailer`, or `react-email` this phase.*

## Architecture Patterns

### System Architecture Diagram

```
Browser (manager/employee)
  |  PATCH /api/leave-requests/{id}  { action, comments?, reason? }
  |  credentials: include  (no Supabase JWT in the browser)
  v
Next.js BFF  GET session  →  session.user.id + companyId
  |  Zod leaveRequestPatchBodySchema
  |  role/ownership gate (unchanged)
  |  createTenantDatabaseService (minted JWT, Factory.create)
  v
LeaveRequestService (single-action only; bulk must not call)
  |
  |  1. findById
  |     already approved? → CONFLICT 409, no writes
  |  2. BALANCE (approve/approved-cancel/approved-delete only)
  |     year = start_date ISO prefix
  |     missing row? → CONFLICT 409 (approve only)
  |     UPDATE used_days / remaining_days by ± total_days
  |  3. STATUS  (approve: UPDATE … eq status pending)
  |     if status write fails → reverse balance delta → throw
  |  4. AUDIT insert  user_id = actor UUID  (throw on fail)
  |  5. IN-APP notification  type request_approved|request_rejected
  |     (approve/reject only; throw on fail)
  v
BFF after service returns
  |  6. MAIL best-effort  sendMail({ to: employee.email, … })
  |     missing key / Resend error → log, still 200
  v
PostgREST + RLS current_company_id()
  leave_balances / leave_requests / audit_logs / notifications

Browser onSuccess
  invalidate ['leaveBalance', userId], ['notifications', userId], request lists
  Overview card unreadNotifications; Leave Balance card remaining_days
```

### Recommended Project Structure

```
packages/database/src/modules/leave-balances/
  balance-arithmetic.ts      # applyApprovalDeduct / applyApprovalRestore (pure)
  year-from-start-date.ts    # ISO prefix year (pure)
  service.ts                 # updateBalanceAfterApproval + restoreBalanceAfterReversal
packages/database/src/modules/notifications/
  service.ts                 # CHECK types; throw; no mock id
packages/database/src/modules/audit-logs/
  service.ts                 # throw; no mock id
packages/database/src/modules/leave-requests/
  service.ts                 # order: balance → status → audit → notify
  repository.ts              # approve UPDATE also .eq('status', 'pending')
apps/web/src/lib/
  mail.ts                    # Resend adapter (server-only)
  env.ts                     # optional RESEND_API_KEY, EMAIL_FROM
apps/web/src/app/api/leave-requests/
  [id]/route.ts              # map CONFLICT → 409; mail after success
  route.ts                   # auto-approve also sends mail
apps/web/src/hooks/
  use-leave-request-operations.ts  # D-20 invalidation
```

### Pattern 1: Delta deduct / restore (do not recompute remaining)

**What:** `remaining_days -= total_days` and `used_days += total_days` (inverse on restore).
**When to use:** Approve; cancel/delete only if **current** status is `approved`.
**Example:**

```typescript
// Source: D-01 / D-06; columns from packages/database/migrations/001_initial_schema.sql:66-72
export function applyApprovalDeduct(
  balance: { used_days: number; remaining_days: number },
  totalDays: number
): { used_days: number; remaining_days: number } {
  return {
    used_days: balance.used_days + totalDays,
    remaining_days: balance.remaining_days - totalDays,
  }
}

export function applyApprovalRestore(
  balance: { used_days: number; remaining_days: number },
  totalDays: number
): { used_days: number; remaining_days: number } {
  return {
    used_days: balance.used_days - totalDays,
    remaining_days: balance.remaining_days + totalDays,
  }
}
```

Never `remaining_days = total_allowance - used_days` — that drops `carried_over`.

### Pattern 2: Year from ISO date prefix

**What:** `start_date` on create is `format(parsed.start_date, 'yyyy-MM-dd')` ([VERIFIED: apps/web/src/app/api/leave-requests/route.ts:94-95]).
**When to use:** Balance lookup on approve/restore.

```typescript
// Source: D-02 — do not use new Date(startDate).getFullYear() (UTC offset can shift the year)
export function yearFromStartDate(startDate: string): number {
  const year = Number(startDate.slice(0, 4))
  if (!Number.isInteger(year)) {
    throw new Error('Invalid start_date')
  }
  return year
}
```

### Pattern 3: Compensating reverse without RPC

**What:** Two PostgREST calls are two transactions. Official supabase-js:

DATA_k8m2p4q9_START
This affects only the single request it is chained to. The JS caller has no handle on the transaction: supabase-js does not group multiple queries into one transaction. For multi-statement transactional logic, use a database function (`supabase.rpc(...)`).
DATA_k8m2p4q9_END

[CITED: supabase.com/docs/reference/javascript/using-modifiers-rollback]

**When to use:** D-16 deduct then status. Reverse is **safe** if it applies the **same delta** to the **current** row (re-read or invert the numbers just written), not a stale snapshot. **Unsafe** if you write cached `remaining_days` that clobbers a concurrent deduct.

**Concurrent double-approve:** both reads see `pending`, both deduct. Mitigate without RPC: `approve()` UPDATE must `.eq('id', id).eq('status', 'pending')`. Zero rows + `.single()` → in-repo `PGRST116` → `NOT_FOUND` ([VERIFIED: packages/database/src/modules/shared/utils.ts:57-58]). Catch, reverse the extra deduct, throw `CONFLICT`.

Do **not** add a new RPC this phase (D-16 + deferred).

### Pattern 4: Resend adapter (server-only, best-effort)

**What:** Official SDK returns `{ data, error }` and does **not** throw on API errors. Check `error`. `try/catch` only for network failures. [CITED: resend.com/docs/send-with-nodejs]

```typescript
// Source: https://resend.com/docs/send-with-nodejs
import { Resend } from 'resend'

const { data, error } = await resend.emails.send({
  from: 'Acme <onboarding@resend.dev>',
  to: ['delivered@resend.dev'],
  subject: 'Hello World',
  html: '<strong>It works!</strong>',
})
```

Map `from` to `EMAIL_FROM`. If `RESEND_API_KEY` or `EMAIL_FROM` is unset, log and return `{ sent: false }` — do not throw (D-15). Call **after** the service method returns. Do not import `resend` from `'use client'` modules.

Optional idempotency key: `leave-request/${id}/approved` and `leave-request/${id}/rejected` (official `idempotencyKey`, 256 char max). [CITED: resend.com/docs/send-with-nodejs]

Production `from` must be a verified domain; `onboarding@resend.dev` is test-only. [CITED: resend.com/docs/send-with-nodejs]

### Anti-Patterns to Avoid

- **`remaining_days = total_allowance - used_days`:** Drops `carried_over`. Current bug in `updateBalanceAfterApproval` ([VERIFIED: packages/database/src/modules/leave-balances/service.ts:65-70]).
- **`new Date().getFullYear()` for the balance year:** Cross-year requests miss the row or deduct the wrong year ([VERIFIED: packages/database/src/modules/leave-balances/service.ts:56-58]).
- **Silent skip when no balance row:** D-03 / PROJECT.md. Throw `CONFLICT`.
- **`user_id: 'system'`:** FK to UUID; insert fails ([VERIFIED: packages/database/src/modules/leave-requests/service.ts:217] and schema `user_id UUID NOT NULL REFERENCES users(id)`).
- **Notification types `success` / `error` / `warning` / `info`:** Fail CHECK ([VERIFIED: packages/database/src/modules/notifications/service.ts:106] vs schema CHECK below).
- **Mock ids `audit-log-failed` / `notification-failed`:** Callers treat as success (D-09, D-11).
- **Mail inside `@timeoff/database`:** D-13 / INTEGRATIONS.md: adapter lives in `apps/web/src/lib/`.
- **`service_role` for leave writes:** D-17 / Phase 2 security contract.
- **Calling deduct helpers from `POST /api/leave-requests/bulk`:** D-18 / Phase 5.
- **New notification tray or restyle:** D-12, D-19.
- **Trusting client `total_days`:** Use the persisted request row (Phase 2).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SMTP / MIME / retries | Custom nodemailer stack | `resend` SDK `emails.send` | Official API, `{ data, error }`, rate limit 10 rps |
| Multi-table atomicity | Ad-hoc 2PC or retry queues | Same-request delta reverse + pending CAS | supabase-js will not transaction two `.from()` calls |
| HTTP 409 mapping | New error framework | `DatabaseUtils.createError(..., 'CONFLICT')` + PATCH catch | Existing `ServiceError.code` pattern |
| Unread count UI | Notification tray | Existing `stats.unreadNotifications` | D-12 |
| Input validation | New PATCH schema | `leaveRequestPatchBodySchema` | Already `z.enum(['approve', 'reject', 'cancel', 'delete'])` |

**Key insight:** The bugs are swallowed side effects and wrong CHECK/FK values, not a missing framework. Hand-rolling a mailer or an RPC would expand scope Phase 6 and the deferred transaction already forbade unless reverse was unsafe.

## Common Pitfalls

### Pitfall 1: Allowance recompute drops carry-over
**What goes wrong:** Remaining after approve is too low by `carried_over`.
**Why it happens:** Current code sets `newRemainingDays = balance.total_allowance - newUsedDays` ([VERIFIED: packages/database/src/modules/leave-balances/service.ts:65-66]).
**How to avoid:** D-01 delta on `remaining_days` in place.
**Warning signs:** Unit test with `carried_over: 5` fails if remaining is computed from allowance.

### Pitfall 2: Timezone year from `Date`
**What goes wrong:** `start_date` `2025-12-31` becomes year 2026 in UTC+8 if parsed as a Date.
**Why it happens:** `new Date('YYYY-MM-DD')` is UTC midnight.
**How to avoid:** `startDate.slice(0, 4)` (D-02).
**Warning signs:** Approve of a December request in local TZ +8 deducts the next year’s row or 409s.

### Pitfall 3: Double deduct on retry / race
**What goes wrong:** Two successful deducts for one request.
**Why it happens:** `repository.approve` updates by id only, no status predicate ([VERIFIED: packages/database/src/modules/leave-requests/repository.ts:144-158]); D-07 is not implemented.
**How to avoid:** If `status === 'approved'` before any write → 409. Status UPDATE `.eq('status', 'pending')`. Reverse deduct if that UPDATE matches 0 rows.
**Warning signs:** Integration: PATCH approve twice → used_days += 2× total_days.

### Pitfall 4: Snapshot reverse clobbers concurrent deduct
**What goes wrong:** Reverse writes old remaining and undoes another request’s deduct.
**Why it happens:** Caching the pre-update remaining and writing it back.
**How to avoid:** Reverse with `applyApprovalRestore` on a **fresh read** (or invert the delta just applied).
**Warning signs:** Two overlapping approves; one fails status; the other user’s remaining jumps up.

### Pitfall 5: CHECK / FK failures still look like success
**What goes wrong:** LEAVE-01–03 and NOTIF-01–02 stay red in UAT.
**Why it happens:** Services return mock rows ([VERIFIED: packages/database/src/modules/audit-logs/service.ts:21-22] `id: 'audit-log-failed'`; [VERIFIED: packages/database/src/modules/notifications/service.ts:26] `id: 'notification-failed'`).
**How to avoid:** Rethrow. Remove mock returns. Approve/reject/cancel/delete must not catch-and-continue.
**Warning signs:** Tests asserting `id !== 'notification-failed'` still needed? If the mock exists, D-11 failed.

### Pitfall 6: Mail in the database package or failing the HTTP status
**What goes wrong:** `@timeoff/database` grows a Resend dependency; local dev 500s without a key.
**Why it happens:** Putting `emails.send` inside `approveLeaveRequest`.
**How to avoid:** Route calls `sendMail` after the service returns; adapter never throws (D-13, D-15). Handle SDK `error` field, not only exceptions.
**Warning signs:** `packages/database/package.json` lists `resend`; PATCH 500 when `RESEND_API_KEY` unset.

### Pitfall 7: Manager auto-approve skips mail / skips new deduct
**What goes wrong:** Supervisor self-leave stays pending-without-deduct or approved-without-email.
**Why it happens:** `POST /api/leave-requests` already calls `approveLeaveRequest` ([VERIFIED: apps/web/src/app/api/leave-requests/route.ts:126-134]). Fixing the service covers deduct; mail must also be invoked from **POST** after auto-approve.
**How to avoid:** Shared `sendLeaveDecisionMail(requestId, 'approved' | 'rejected')` from PATCH and POST.
**Warning signs:** Manager create 201 with status approved, no Resend call in tests.

### Pitfall 8: Invalidating the actor’s cache, not the employee’s
**What goes wrong:** Manager dashboard remaining days unchanged (their own card); employee sees the update on next GET.
**Why it happens:** Hook `userId` is the signed-in user (D-20). Employee QueryClient is another browser.
**How to avoid:** Accept this: D-20 invalidates the actor’s keys. Employee Overview/Leave Balance refresh on their next `/api/notifications` and `/api/leave-balances` fetch. Do not add realtime this phase.
**Warning signs:** Treating manager Leave Balance card as the employee’s remaining days.

### Pitfall 9: Restore twice on cancel then delete
**What goes wrong:** `used_days` goes negative extra; remaining inflated.
**Why it happens:** Restore whenever the action is cancel/delete without checking **current** status.
**How to avoid:** Restore only if `leaveRequest.status === 'approved'` (`'approved'` from schema CHECK). After cancel, status is `'cancelled'` so delete must not restore again (D-06).
**Warning signs:** Cancel approved then delete → remaining += 2× total_days.

## Code Examples

Verified patterns from official sources and in-repo definitions (quotes are verbatim).

### Notification CHECK (persist only these on approve/reject)

[VERIFIED: packages/database/migrations/001_initial_schema.sql:100]

```
type VARCHAR(50) NOT NULL CHECK (type IN ('request_approved', 'request_rejected', 'request_pending', 'leave_balance_update', 'policy_change', 'system_announcement')),
```

Map:

```typescript
type: action === 'approved' ? 'request_approved' : 'request_rejected'
```

Keep title/message shape ([VERIFIED: packages/database/src/modules/notifications/service.ts:99-100]):

```
const title = `Leave Request ${action}`;
const message = `Your leave request has been ${action.toLowerCase()}.`;
```

with `action` `'approved'` | `'rejected'`.

### Audit FK (never `'system'`)

[VERIFIED: packages/database/migrations/001_initial_schema.sql:122-124]

```
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
```

Current delete bug ([VERIFIED: packages/database/src/modules/leave-requests/service.ts:217]): `user_id: 'system'`.

Audit actions already used (keep): `APPROVE_LEAVE_REQUEST`, `REJECT_LEAVE_REQUEST`, `CANCEL_LEAVE_REQUEST`, `SOFT_DELETE_LEAVE_REQUEST`.

### Request status CHECK

[VERIFIED: packages/database/migrations/001_initial_schema.sql:84]

```
status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'rejected', 'cancelled')),
```

D-07 compares to `'approved'`. Recommend also refusing approve unless current status is `'pending'` (discretion; prevents deducting a `'rejected'` row).

### Balance unique key and remaining column (negatives allowed)

[VERIFIED: packages/database/migrations/001_initial_schema.sql:62-72]

```
CREATE TABLE leave_balances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    leave_type VARCHAR(20) NOT NULL CHECK (leave_type IN ('vacation', 'sick', 'personal', 'maternity', 'paternity', 'bereavement', 'unpaid', 'other')),
    total_allowance INTEGER NOT NULL DEFAULT 0,
    used_days INTEGER NOT NULL DEFAULT 0,
    remaining_days INTEGER NOT NULL DEFAULT 0,
    carried_over INTEGER NOT NULL DEFAULT 0,
    year INTEGER NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, leave_type, year)
);
```

No `CHECK (remaining_days >= 0)` — D-04 is schema-legal.

### ServiceError codes (add CONFLICT)

[VERIFIED: packages/database/src/modules/shared/utils.ts:57-73] maps `PGRST116` → `'NOT_FOUND'`, `23505` → `'DUPLICATE_ENTRY'`, `23503` → `'FOREIGN_KEY_VIOLATION'`, else `'DATABASE_ERROR'`.

Add `DatabaseUtils.createError('...', 'CONFLICT', { operation })` for missing balance and already-approved. PATCH:

```typescript
if ((error as ServiceError).code === 'CONFLICT') {
  return NextResponse.json({ error: error.message }, { status: 409 })
}
```

Existing PATCH catch is 500-only ([VERIFIED: apps/web/src/app/api/leave-requests/[id]/route.ts:136-138]).

### IDatabaseService actor gap

[VERIFIED: packages/database/src/index.ts:256-260]

```
  deleteLeaveRequest(id: string): Promise<LeaveRequest>
  softDeleteLeaveRequest(id: string): Promise<LeaveRequest>
  restoreLeaveRequest(id: string): Promise<LeaveRequest>
  getActiveLeaveRequests(userId: string): Promise<LeaveRequest[]>
  cancelLeaveRequest(id: string): Promise<LeaveRequest>
```

Add `actorUserId: string` to `cancelLeaveRequest` and `deleteLeaveRequest` / `softDeleteLeaveRequest`. Route already has `session.user.id` ([VERIFIED: apps/web/src/app/api/leave-requests/[id]/route.ts:102-129]). `restoreLeaveRequest` has **no** BFF or UI call sites — D-06 restore-from-soft-delete is **out of scope**.

### Employee email

[VERIFIED: packages/database/src/modules/users/repository.ts:4-5]

```
export const USER_DOMAIN_COLUMNS =
  'id, email, first_name, last_name, avatar, department, team, role, manager_id, company_id, hire_date, is_active, created_at, updated_at';
```

`getUserById(leaveRequest.user_id)` after durable writes. Approve repository `select()` does not embed `users` ([VERIFIED: packages/database/src/modules/leave-requests/repository.ts:153-157]).

### Query keys to invalidate (D-20)

Create already invalidates `['leaveBalance', user.id]` ([VERIFIED: apps/web/src/hooks/use-dashboard-data.ts:145]). Approve/reject/cancel do **not**. Delete already invalidates leaveBalance + notifications ([VERIFIED: apps/web/src/hooks/use-leave-request-operations.ts:63-65]).

On approve, reject, cancel, and delete, invalidate at least:

- `['leaveBalance', userId]`
- `['notifications', userId]`
- existing request-list keys (`recentRequests`, `teamLeaveRequests`, `allLeaveRequests`, `personalLeaveRequests`)

Keep sonner strings ([VERIFIED: apps/web/src/hooks/use-leave-request-operations.ts:99]): `'Leave request approved successfully'`.

### Overview unread surface (do not restyle)

[VERIFIED: apps/web/src/components/dashboard/dashboard-stats.tsx:85]: `{stats.unreadNotifications}`

[VERIFIED: apps/web/src/hooks/use-dashboard-data.ts:119-160]: `queryKey: ['notifications', user.id]` → `unreadNotifications: notifications?.filter(n => !n.is_read).length || 0`

GET `/api/notifications` is session-scoped, limit 5 ([VERIFIED: apps/web/src/app/api/notifications/route.ts:10, 53-57]). New rows are `order created_at desc` so they appear in that window.

### Tenant RLS (notifications / audit / balances)

[VERIFIED: packages/database/migrations/20250818193735_tenant_rls_and_anon_revoke.sql:121-155] `notifications_tenant_all`, `audit_logs_tenant_all`, `leave_balances_tenant_all` — `EXISTS` on `users.company_id = current_company_id()`. Manager inserting a notification for an employee in the same company is allowed. Cross-tenant insert fails; throwing (D-11) is correct.

### Bulk must stay status-only

[VERIFIED: apps/web/src/app/api/leave-requests/bulk/route.ts:54-71] `bulkUpdateLeaveRequests` with `status` / `approver_id` only. Do not call `approveLeaveRequest` from bulk.

### Auto-approve comment (unchanged)

[VERIFIED: apps/web/src/app/api/leave-requests/route.ts:21]: `const AUTO_APPROVE_COMMENT = 'Auto-approved (Manager self-leave)'`

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Best-effort side effects after status | Durable side effects required; mail best-effort last | This phase (D-09/D-11/D-15/D-16) | Approve cannot succeed without balance+audit+in-app |
| `USING (true)` browser writes | Tenant BFF + minted JWT | Phase 2 | Do not regress to service_role or client writes |
| supabase-js multi-call as if transactional | Documented non-transactional; RPC or compensating reverse | Ongoing (supabase-js docs) | D-16 reverse, not a new RPC |

**Deprecated/outdated:**

- Notification types `success`/`error`/`warning`/`info`: never valid against 001 CHECK.
- `user_id: 'system'` audit actor: never valid against UUID FK.
- CLAUDE.md “do not fail primary mutation if side effects fail” for **this** approve/reject/cancel/delete path.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Approving a non-`pending` row (e.g. `'rejected'`) should 409 like already-`'approved'` | Pitfall 3 / discretion | If product wants re-approve-from-rejected, 409 is too strict; D-07 only names `'approved'` |
| A2 | Resend `from` can be the raw `EMAIL_FROM` string (friendly `Name <addr>` or bare addr) | Pattern 4 | Wrong format → send `error`; still 200 locally; hosted UAT fails until env fixed |
| A3 | Package-legitimacy `too-new` on `resend@6.25.0` is a false positive (official SDK) | Package audit | Human verify still required; do not skip the checkpoint |
| A4 | Crash between deduct and status (process kill) leaving pending+deducted is an accepted residual of D-16 | Pattern 3 | Retry could 409-or-deduct-again depending on CAS; rare on Vercel |

**If this table is empty:** All claims in this research were verified or cited — no user confirmation needed.

A1–A4 are planner/discretion items, not blockers. Locked D-* need no re-ask.

## Open Questions

1. **Hosted UAT `EMAIL_FROM` domain**
   - What we know: Resend requires a verified domain in production; `onboarding@resend.dev` is test-only. [CITED: resend.com/docs/send-with-nodejs]
   - What's unclear: Which domain Timeoff will verify.
   - Recommendation: Document in `env.example` as a placeholder; human sets hosted secrets. Do not hardcode `onboarding@resend.dev` in production paths.

2. **POST create auto-approve 409**
   - What we know: Create inserts `pending` then calls `approveLeaveRequest`. Missing balance 409 would throw after the row exists.
   - What's unclear: Return 409 (request left pending) vs 201 pending without surfacing the approve failure.
   - Recommendation: Map `CONFLICT` to 409 on POST as well so the client does not toast “submitted successfully” when deduct failed. Request remains `pending` (D-03: do not change status).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | `node:test`, Next BFF | ✓ | v26.6.0 | — |
| npm | install `resend` | ✓ | 11.18.0 | — |
| `resend` package | NOTIF-03/04 | ✗ not in package.json | npm 6.25.0 | Mock adapter in tests; skip send if env unset |
| `RESEND_API_KEY` / `EMAIL_FROM` | Hosted UAT mail | not required locally (D-15) | — | Log + 200 |
| Supabase CLI | optional local DB | ✓ | 2.33.9 | — |
| Docker | not required this phase | ✓ | 27.4.0 | — |

**Missing dependencies with no fallback:** none (mail is best-effort; SDK install is the only add).

**Missing dependencies with fallback:** Resend env unset → skip send (D-15).

Step 2.6: Resend SDK is the only new external package; runtime env is optional locally.

## Validation Architecture

> `workflow.nyquist_validation` is true in `.planning/config.json`.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Node.js `node:test` + `node:assert/strict` + `--experimental-strip-types` |
| Config file | none — file lists in workspace `package.json` `test` scripts |
| Quick run command | `npm test --workspace=@timeoff/database` |
| Full suite command | `npm test` (root `turbo run test`) |

Existing scripts ([VERIFIED: packages/database/package.json:12], [VERIFIED: apps/web/package.json:12]):

- Database: `node --test --experimental-strip-types src/modules/leave-balances/plan-default-inserts.test.ts`
- Web: long explicit file list of `src/lib/*.test.ts`

**Planner must append new test files to those scripts** (Phase 3 pattern). Do not add Vitest.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BAL-03 | Deduct `used_days += total_days`, `remaining_days -= total_days` (carry-over preserved) | unit | `node --test --experimental-strip-types packages/database/src/modules/leave-balances/balance-arithmetic.test.ts` | ❌ Wave 0 |
| BAL-03 | Year from `start_date` ISO prefix, not `Date#getFullYear` | unit | `…/year-from-start-date.test.ts` | ❌ Wave 0 |
| BAL-03 | Missing balance → `ServiceError.code === 'CONFLICT'` (no status write) | unit | `…/balance-arithmetic.test.ts` or approve-preflight helper test | ❌ Wave 0 |
| BAL-04 | Restore is inverse of deduct; reject path does not call deduct | unit | `balance-arithmetic.test.ts` | ❌ Wave 0 |
| BAL-04 | Restore only when status is `'approved'` | unit | preflight helper: pending/rejected → no restore | ❌ Wave 0 |
| LEAVE-01–03 | `createAuditLog` rethrows (no `id: 'audit-log-failed'`) | unit | mock repository throws → service throws | ❌ Wave 0 |
| NOTIF-01–02 | `createLeaveRequestNotification` uses `request_approved` / `request_rejected` only | unit | `packages/database/src/modules/notifications/leave-request-notification-type.test.ts` | ❌ Wave 0 |
| NOTIF-03–04 | Unset key → `{ sent: false }` no throw; SDK `error` → `{ sent: false }` | unit | `apps/web/src/lib/mail.test.ts` with mocked `emails.send` | ❌ Wave 0 |
| D-07 | Already `'approved'` → CONFLICT, no deduct | unit | preflight helper | ❌ Wave 0 |
| D-20 | Approve onSuccess invalidates `leaveBalance` (source assertion) | unit optional | hook helper if extracted | ❌ Wave 0 |
| BAL-05 / LEAVE-04 | Bulk parity | — | Out of scope | skip |

Manual-only (justified): hosted NOTIF-03/04 with a real `RESEND_API_KEY` (D-15). Local automated tests mock the adapter.

### Sampling Rate

- **Per task commit:** `npm test --workspace=@timeoff/database` and/or `npm test --workspace=@timeoff/web` for touched package
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `packages/database/src/modules/leave-balances/balance-arithmetic.ts` + `balance-arithmetic.test.ts` — BAL-03, BAL-04, D-01, D-04
- [ ] `packages/database/src/modules/leave-balances/year-from-start-date.ts` + `year-from-start-date.test.ts` — D-02
- [ ] `packages/database/src/modules/notifications/leave-request-notification-type.test.ts` — NOTIF-01/02, D-10
- [ ] `apps/web/src/lib/mail.ts` + `mail.test.ts` — NOTIF-03/04, D-13–D-15
- [ ] Append those files to the corresponding `package.json` `test` scripts
- [ ] Framework install: none — `node:test` ships with Node

Prefer testing **pure helpers** (arithmetic, year, type map, mail skip). Do not stand up PostgREST in unit tests.

## Security Domain

> `workflow.security_enforcement` is enabled (ASVS level 1).

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Session already required on PATCH/POST |
| V3 Session Management | no | Existing NextAuth JWT cookie |
| V4 Access Control | yes | Unchanged role gates; audit `user_id` from `session.user.id` not body; tenant JWT not `service_role` (D-08, D-17) |
| V5 Input Validation | yes | Existing Zod `leaveRequestPatchBodySchema`; ignore client days; `uuidSchema` on id |
| V6 Cryptography | no | No new crypto; Resend over HTTPS; do not log `RESEND_API_KEY` |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Client-supplied `total_days` / actor ids | Tampering | Persist server `total_days`; `bindLeaveApprover` already overwrites `approver_id` |
| Fake audit `user_id` | Repudiation | Session UUID only; throw on insert fail (T-02-21 closed in Phase 2; keep tenant RLS) |
| Cross-tenant notify/audit/balance | Elevation / Disclosure | Existing `current_company_id()` policies; tenant BFF |
| `service_role` on leave writes | Elevation | Forbidden D-17; identity client stays unused here |
| Secrets in git / client bundle | Information Disclosure | Optional env names only; adapter server-only; never `NEXT_PUBLIC_RESEND_*` |
| Approve succeeds without deduct | Tampering | D-03 409; D-16 reverse; no silent skip |
| Email injection via reason/comments | Tampering | Treat comments as text in HTML; escape or use `text` body if interpolating user strings |

Do not add a new `/api/send` route (unauthenticated surface). Call mail from the already session-gated leave routes.

## Sources

### Primary (HIGH confidence)

- `packages/database/migrations/001_initial_schema.sql` — CHECK enums, FKs, `UNIQUE(user_id, leave_type, year)`
- `packages/database/src/modules/leave-requests/service.ts`, `leave-balances/service.ts`, `notifications/service.ts`, `audit-logs/service.ts`
- `apps/web/src/app/api/leave-requests/[id]/route.ts`, `route.ts` (auto-approve), `bulk/route.ts`
- `apps/web/src/hooks/use-leave-request-operations.ts`, `use-dashboard-data.ts`
- `apps/web/src/lib/env.ts`, `apps/web/env.example`
- Official supabase-js rollback modifier docs — multi-query not one transaction
- Official Resend Node.js / Next.js send guides — `resend` package, `emails.send`, `RESEND_API_KEY`

### Secondary (MEDIUM confidence)

- `npm view resend` version `6.25.0`; legitimacy SUS `too-new`
- PostgREST singular 0-row → `PGRST116` (aligned with in-repo `handleDatabaseError`)

### Tertiary (LOW confidence)

- classify-confidence seam returned LOW for webfetch even with `--verified`; in-repo reads still treated as HIGH for discrete values

No `.planning/graphs/graph.json` — graphify skipped.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH (in-repo) / MEDIUM (`resend` official docs + SUS legitimacy)
- Architecture: HIGH (BFF + services + compensating reverse; RPC not required)
- Pitfalls: HIGH (current bugs read from source)

**Research date:** 2026-08-30
**Valid until:** 2026-09-29 (30 days; re-check `resend` version if install is delayed)
