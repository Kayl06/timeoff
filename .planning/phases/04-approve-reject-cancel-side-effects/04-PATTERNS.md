# Phase 4: Approve Reject Cancel Side Effects - Pattern Map

**Mapped:** 2026-08-30
**Files analyzed:** 20
**Analogs found:** 19 / 20

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `packages/database/src/modules/leave-balances/balance-arithmetic.ts` | utility | transform | `packages/database/src/modules/leave-balances/plan-default-inserts.ts` | exact |
| `packages/database/src/modules/leave-balances/year-from-start-date.ts` | utility | transform | `packages/database/src/modules/leave-balances/plan-default-inserts.ts` | exact |
| `packages/database/src/modules/leave-balances/service.ts` | service | CRUD | `packages/database/src/modules/leave-balances/service.ts` (`updateBalanceAfterApproval`, `ensureDefaultBalances`) | exact |
| `packages/database/src/modules/notifications/leave-request-notification-type.ts` | utility | transform | `packages/database/src/modules/leave-balances/plan-default-inserts.ts` | role-match |
| `packages/database/src/modules/notifications/service.ts` | service | CRUD | `packages/database/src/modules/notifications/service.ts` (`createLeaveRequestNotification`, `updateNotification`) | exact |
| `packages/database/src/modules/audit-logs/service.ts` | service | CRUD | `packages/database/src/modules/notifications/service.ts` (`updateNotification` throw-through) | role-match |
| `packages/database/src/modules/leave-requests/service.ts` | service | request-response | `packages/database/src/modules/leave-requests/service.ts` (approve/reject/cancel/softDelete) | exact |
| `packages/database/src/modules/leave-requests/repository.ts` | model | CRUD | `packages/database/src/modules/leave-requests/repository.ts` (`approve`, `findPendingRequests`) | exact |
| `packages/database/src/index.ts` | config | request-response | `packages/database/src/index.ts` (`IDatabaseService` + `DatabaseService` wrappers) | exact |
| `apps/web/src/lib/mail.ts` | service | request-response | `apps/web/src/lib/env.ts` (optional env) + RESEARCH Resend snippet | none (SDK) / role-match (env) |
| `apps/web/src/lib/env.ts` | config | request-response | `apps/web/src/lib/env.ts` (`GOOGLE_CLIENT_ID` optional) | exact |
| `apps/web/env.example` | config | — | `apps/web/env.example` | exact |
| `apps/web/src/app/api/leave-requests/[id]/route.ts` | route | request-response | `apps/web/src/app/api/leave-requests/[id]/route.ts` | exact |
| `apps/web/src/app/api/leave-requests/route.ts` | route | request-response | `apps/web/src/app/api/leave-requests/route.ts` (POST auto-approve) | exact |
| `apps/web/src/hooks/use-leave-request-operations.ts` | hook | request-response | `apps/web/src/hooks/use-leave-request-operations.ts` (delete `onSuccess`) + `use-dashboard-data.ts` | exact |
| `packages/database/src/modules/leave-balances/balance-arithmetic.test.ts` | test | transform | `packages/database/src/modules/leave-balances/plan-default-inserts.test.ts` | exact |
| `packages/database/src/modules/leave-balances/year-from-start-date.test.ts` | test | transform | `packages/database/src/modules/leave-balances/plan-default-inserts.test.ts` | exact |
| `packages/database/src/modules/notifications/leave-request-notification-type.test.ts` | test | transform | `packages/database/src/modules/leave-balances/plan-default-inserts.test.ts` | exact |
| `apps/web/src/lib/mail.test.ts` | test | request-response | `apps/web/src/lib/create-company-rpc.test.ts` | role-match |
| `packages/database/package.json` / `apps/web/package.json` | config | — | same files (`test` script file lists) | exact |

Do **not** create or restyle: approve/reject/cancel/delete dialogs, `dashboard-stats.tsx`, `leave-balance-card.tsx`, `POST /api/leave-requests/bulk`. Do **not** put `resend` in `packages/database`.

---

## Pattern Assignments

### `packages/database/src/modules/leave-balances/balance-arithmetic.ts` (utility, transform)

**Analog:** `packages/database/src/modules/leave-balances/plan-default-inserts.ts`

**Imports / file shape** (lines 1–34): kebab-case sibling next to `service.ts`; JSDoc on the exported function; no repository/SQL; typed input objects, not ORM models.

```typescript
/**
 * Pure insert-only planner for default vacation/sick/personal leave_balances (BAL-02).
 * Copies default_allowance from an active policy at plan time; never returns updates.
 */
import type { CreateLeaveBalanceData } from './types'

export function planDefaultBalanceInserts(
  existing: ExistingBalanceRow[],
  policies: PolicyAllowanceRow[],
  userId: string,
  year: number
): CreateLeaveBalanceData[] {
```

**Core pattern:** Export two pure functions (`applyApprovalDeduct` / `applyApprovalRestore`) that return `{ used_days, remaining_days }` by **delta**, never `total_allowance - used_days`. Copy RESEARCH Pattern 1. Keep `carried_over` out of the return — the service writes only the two mutated columns via `LeaveBalanceRepository.update`.

**Error handling:** None in the helper. Invalid `totalDays` is the caller’s problem; do not clamp remaining to 0 (D-04).

**Do not copy:** The current `updateBalanceAfterApproval` formula at `service.ts` lines 65–66 (`newRemainingDays = balance.total_allowance - newUsedDays`).

---

### `packages/database/src/modules/leave-balances/year-from-start-date.ts` (utility, transform)

**Analog:** `packages/database/src/modules/leave-balances/plan-default-inserts.ts` (same-module pure helper)

**Secondary analog:** `apps/web/src/app/api/leave-requests/route.ts` lines 94–95 — create persists `format(parsed.start_date, 'yyyy-MM-dd')`, so `start_date` is always an ISO date prefix.

**Core pattern:** `Number(startDate.slice(0, 4))` + `Number.isInteger` check. Do **not** use `new Date(startDate).getFullYear()` (UTC midnight year-shift in UTC+8).

```typescript
export function yearFromStartDate(startDate: string): number {
  const year = Number(startDate.slice(0, 4))
  if (!Number.isInteger(year)) {
    throw new Error('Invalid start_date')
  }
  return year
}
```

**Do not copy:** `apps/web/src/lib/date-utils.ts` — that file uses `date-fns` `Date` objects for inclusive day counts, not year-from-string.

---

### `packages/database/src/modules/leave-balances/service.ts` (service, CRUD)

**Analog:** same file — `ensureDefaultBalances` (throw vs swallow) and `updateBalanceAfterApproval` (lookup + `repository.update`).

**Imports pattern** (lines 1–6):

```typescript
import { LeaveBalanceRepository } from './repository';
import { LeaveBalance, CreateLeaveBalanceData, UpdateLeaveBalanceData, LeaveBalanceFilters, LeaveBalanceSummary } from './types';
import { LeaveRequest } from '../leave-requests/types';
import { LeavePolicy } from '../leave-policies/types';
import { ServiceError } from '../shared/types';
import { planDefaultBalanceInserts } from './plan-default-inserts';
```

Add `applyApprovalDeduct` / `applyApprovalRestore` from `./balance-arithmetic` and `yearFromStartDate` from `./year-from-start-date`.

**Throw / skip pattern** (lines 35–48) — copy the `ServiceError.code` check style, but for missing row use `CONFLICT` instead of silent skip:

```typescript
  async ensureDefaultBalances(userId: string, year: number, policies: LeavePolicy[]): Promise<void> {
    const existing = await this.leaveBalanceRepository.findByUserId(userId, year);
    const planned = planDefaultBalanceInserts(existing, userId, year);

    for (const row of planned) {
      try {
        await this.leaveBalanceRepository.create(row);
      } catch (error) {
        if ((error as ServiceError).code === 'DUPLICATE_ENTRY') {
          continue;
        }
        throw error;
      }
    }
  }
```

**CONFLICT constructor** — `packages/database/src/modules/shared/utils.ts` lines 8–13:

```typescript
  static createError(message: string, code: string, details?: Record<string, any>): ServiceError {
    const error = new Error(message) as ServiceError;
    error.code = code;
    error.details = details;
    return error;
  }
```

Use `DatabaseUtils.createError('No leave balance for this user, type, and year', 'CONFLICT', { operation: 'updateBalanceAfterApproval' })` when `balances.find(...)` is undefined. Do **not** insert-on-approve (D-03). GET self-heal stays the insert path.

**Core CRUD write** — keep `LeaveBalanceRepository.update` (`repository.ts` lines 81–96): `.from('leave_balances').update(sanitizedUpdates).eq('id', id).select().single()`. Write only `used_days` and `remaining_days` from the arithmetic helper.

Replace `updateBalanceAfterApproval` (lines 55–73):

- Year = `yearFromStartDate(request.start_date)`, not `new Date().getFullYear()` (line 57).
- Amount = `request.total_days` from the persisted row, not a client field.
- Missing row → throw CONFLICT (today lines 63–72 skip silently — delete that branch).
- Deduct via `applyApprovalDeduct`; add `restoreBalanceAfterReversal` via `applyApprovalRestore` on a **fresh** `findByUserId` (Pitfall 4 — do not write a cached snapshot).

**Repository lookup** (`repository.ts` lines 8–15): `findByUserId(userId, year)` already filters `.eq('user_id', userId).eq('year', year)`. Then `.find(b => b.leave_type === request.leave_type)`.

---

### `packages/database/src/modules/notifications/leave-request-notification-type.ts` (utility, transform)

**Analog:** `packages/database/src/modules/leave-balances/plan-default-inserts.ts` (pure mapper, no I/O).

**Core pattern:** Map `'approved' | 'rejected'` → CHECK-valid types only. Copy from RESEARCH + current title/message at `notifications/service.ts` lines 98–107, changing only `type`:

```typescript
type: action === 'approved' ? 'request_approved' : 'request_rejected'
```

Keep title/message:

```typescript
const title = `Leave Request ${action}`;
const message = `Your leave request has been ${action.toLowerCase()}.`;
```

**Do not copy:** lines 106 (`'success'` / `'error'` / `'info'`) or `createApprovalNotification` type `'warning'` (line 118) — those fail the schema CHECK. Do not “fix” create-path `createApprovalNotification` this phase (create may keep swallow try/catch).

---

### `packages/database/src/modules/notifications/service.ts` (service, CRUD)

**Analog:** same file — `updateNotification` throw-through (lines 38–45), not `createNotification` swallow (lines 15–35).

**Throw-through pattern** (lines 38–45) — this is the D-11 target for create:

```typescript
  async updateNotification(id: string, updates: UpdateNotificationData): Promise<Notification> {
    try {
      return await this.notificationRepository.update(id, updates);
    } catch (error) {
      console.error('Failed to update notification:', error);
      console.error('Notification ID:', id, 'Updates:', updates);
      throw error; // Re-throw for update operations as they're more critical
    }
  }
```

**Anti-pattern to delete** (lines 15–35): mock `id: 'notification-failed'`. `createNotification` used by approve/reject must rethrow. Remove the mock return.

**Core leave-request notify** (lines 98–108) — keep the method signature and copy; change only `type` via the mapper:

```typescript
  async createLeaveRequestNotification(userId: string, leaveRequestId: string, action: string): Promise<Notification> {
    const title = `Leave Request ${action}`;
    const message = `Your leave request has been ${action.toLowerCase()}.`;
    
    return this.createNotification({
      user_id: userId,
      title,
      message,
      type: action === 'approved' ? 'success' : action === 'rejected' ? 'error' : 'info'
    });
  }
```

`related_id` is optional on `CreateNotificationData` (`types.ts` line 17) — leave unset unless already used.

---

### `packages/database/src/modules/audit-logs/service.ts` (service, CRUD)

**Analog:** `packages/database/src/modules/notifications/service.ts` `updateNotification` throw-through (above). Same file’s `createAuditLog` is the bug being removed.

**Anti-pattern to delete** (lines 11–33): mock `id: 'audit-log-failed'`. After change, `createAuditLog` is:

```typescript
  async createAuditLog(auditLogData: CreateAuditLogData): Promise<AuditLog> {
    return this.auditLogRepository.create(auditLogData);
  }
```

Callers already pass `approverId` on approve/reject (`leave-requests/service.ts` lines 122–124, 158–160). Cancel/delete must pass `session.user.id` — never `'system'` (line 217).

Keep existing action strings: `APPROVE_LEAVE_REQUEST`, `REJECT_LEAVE_REQUEST`, `CANCEL_LEAVE_REQUEST`, `SOFT_DELETE_LEAVE_REQUEST`.

---

### `packages/database/src/modules/leave-requests/service.ts` (service, request-response)

**Analog:** same file — keep BFF calling these four methods; rewrite side-effect order inside them.

**Imports pattern** (lines 1–14):

```typescript
import { LeaveRequestRepository } from './repository';
import { AuditLogService } from '../audit-logs/service';
import { NotificationService } from '../notifications/service';
import { LeaveBalanceService } from '../leave-balances/service';
import { UserService } from '../users/service';
```

**Constructor DI** (lines 16–23) — do not add a mailer here (D-13).

**Order to implement (D-16):** `findById` → already-approved / not-pending → CONFLICT → balance deduct/restore → status write → if status fails, reverse delta on fresh read → audit (throw) → in-app notify (approve/reject only, throw). Mail stays in the Next.js route after this method returns.

**Approve today (wrong order)** (lines 109–150) — status first, then best-effort balance/audit/notify. Invert: deduct first; remove the three `try/catch` swallows around balance/audit/notify.

**Reject today** (lines 153–186) — keep **no** balance call (D-05). Remove swallow around audit/notify so they throw.

**Cancel / soft-delete today** (lines 189–230):

- `cancelLeaveRequest(id)` has no actor — add `actorUserId: string` and use it as `user_id` (today line 195 uses `leaveRequest.user_id`, which is OK only if the route passes the session user; D-08 wants `session.user.id`).
- `softDeleteLeaveRequest` line 217 uses `user_id: 'system'` — replace with `actorUserId`.
- Restore balance **only if current status is `'approved'`** before the status/delete write. After cancel, status is `'cancelled'` so a later delete must not restore again (Pitfall 9).
- `restoreLeaveRequest` (lines 233–253) has no BFF/UI — leave it; D-06 restore-from-soft-delete is out of scope.

**Create path swallow** (lines 49–80) — **keep**. D-09/D-11 override only approve/reject/cancel/delete.

**Bulk** (line 255–257) — **do not** call `approveLeaveRequest` from `bulkUpdateLeaveRequests`.

**Idempotent approve (D-07):** if `findById` status is `'approved'`, throw `DatabaseUtils.createError(..., 'CONFLICT')` before any write. Discretion: also 409 unless current status is `'pending'`.

---

### `packages/database/src/modules/leave-requests/repository.ts` (model, CRUD)

**Analog:** same file `approve` (lines 144–164) + `findPendingRequests` status predicate (lines 69–74).

**Pending CAS pattern** — copy `.eq('status', 'pending')` from `findPendingRequests` onto `approve()`:

```typescript
      const { data, error } = await this.db
        .from('leave_requests')
        .update(updates)
        .eq('id', id)
        .eq('status', 'pending')
        .select()
        .single();
```

Zero rows + `.single()` → PostgREST `PGRST116` → `DatabaseUtils.handleDatabaseError` maps to `NOT_FOUND` (`shared/utils.ts` lines 57–58). Service catches that after a deduct, calls `restoreBalanceAfterReversal`, throws `CONFLICT`.

**Keep** try/catch + `DatabaseUtils.handleDatabaseError(error, 'approveLeaveRequest')` (lines 161–163). Do **not** change `bulkUpdate` (lines 238–252).

---

### `packages/database/src/index.ts` (config, request-response)

**Analog:** same file `IDatabaseService` (lines 254–260) and `DatabaseService` wrappers (lines 353–385).

**Interface today:**

```typescript
  approveLeaveRequest(id: string, approverId: string, comments?: string): Promise<LeaveRequest>
  rejectLeaveRequest(id: string, approverId: string, reason: string): Promise<LeaveRequest>
  deleteLeaveRequest(id: string): Promise<LeaveRequest>
  softDeleteLeaveRequest(id: string): Promise<LeaveRequest>
  cancelLeaveRequest(id: string): Promise<LeaveRequest>
```

Add `actorUserId: string` to `cancelLeaveRequest`, `deleteLeaveRequest`, and `softDeleteLeaveRequest`. Thread it through the wrappers:

```typescript
  async deleteLeaveRequest(id: string) {
    return this.serviceFactory.getLeaveRequestService().softDeleteLeaveRequest(id);
  }

  async cancelLeaveRequest(id: string) {
    return this.serviceFactory.getLeaveRequestService().cancelLeaveRequest(id);
  }
```

`approveLeaveRequest` already binds `approverId` (lines 353–357) — keep that; it is the audit actor.

`restoreLeaveRequest` — do not add a BFF call site.

---

### `apps/web/src/lib/mail.ts` (service, request-response)

**No in-repo mailer.** Closest role-matches: kebab-case `apps/web/src/lib/*.ts` exports + optional env in `env.ts`.

**Optional env pattern** (`env.ts` lines 18–20, 42–71) — `RESEND_API_KEY` and `EMAIL_FROM` are **never** required (D-15), even in production. Copy the “read if present, do not push to `missingVars`” branch used for Google in development — but do **not** add them to `productionRequiredVars`. Mail adapter should read `process.env.RESEND_API_KEY` / `process.env.EMAIL_FROM` (or optional fields on `EnvironmentConfig`) and skip send when unset.

**Resend call** (official SDK; not in repo) — `{ data, error }` does not throw on API errors:

```typescript
import { Resend } from 'resend'

const { data, error } = await resend.emails.send({
  from: 'Acme <onboarding@resend.dev>',
  to: ['delivered@resend.dev'],
  subject: 'Hello World',
  html: '<strong>It works!</strong>',
})
```

Map `from` to `EMAIL_FROM`. If key or from is unset → log via `devLog` (`env.ts` lines 121–136), return `{ sent: false }`, do not throw. On `error` or network throw → same. Optional `idempotencyKey`: `leave-request/${id}/approved` | `leave-request/${id}/rejected`.

**Employee email:** after the service returns, `databaseService.getUserById(leaveRequest.user_id)` — `USER_DOMAIN_COLUMNS` includes `email` (`packages/database/src/modules/users/repository.ts`). Do not import `resend` from `'use client'` modules. Do not add `/api/send`.

**Shared helper:** `sendLeaveDecisionMail(requestId, 'approved' | 'rejected')` used from both PATCH and POST (Pitfall 7). Live in `mail.ts` or a sibling kebab file under `apps/web/src/lib/`.

**Do not** add `react-email`. HTML/text strings only. Escape comments if interpolated.

---

### `apps/web/src/lib/env.ts` + `apps/web/env.example` (config)

**Analog:** same files.

**env.ts** — add optional `RESEND_API_KEY?: string` and `EMAIL_FROM?: string` to `EnvironmentConfig`. Names only in git.

**env.example** (lines 1–24) — append placeholder comments, no secrets, no hardcoded `onboarding@resend.dev` as the production value:

```
# Resend (optional locally — approve/reject still 200 if unset)
RESEND_API_KEY=
EMAIL_FROM=
```

---

### `apps/web/src/app/api/leave-requests/[id]/route.ts` (route, request-response)

**Analog:** same file.

**Auth / tenant pattern** (lines 18–28, 66–69):

```typescript
async function requireTenantSession() {
  const session = await getServerSession(authOptions)
  const reject = tenantSessionRejectStatus(session?.user?.id, session?.user?.companyId)
  if (reject || !session?.user?.id || !session.user.companyId) {
    return {
      ok: false as const,
      response: NextResponse.json(UNAUTHORIZED, { status: 401 }),
    }
  }
  return { ok: true as const, session }
}

    const databaseService = await createTenantDatabaseService({
      userId: session.user.id,
      companyId: session.user.companyId,
    })
```

Keep `bindLeaveApprover` + `canApproveOrRejectLeave` / `canCancelOrDeleteLeave` (`bind-leave-actor.ts` lines 27–74). Actor UUID is always `session.user.id`.

**Validation** (lines 41–63): keep `uuidSchema` + `leaveRequestPatchBodySchema`. Do not add a days field.

**Action switch** (lines 71–131): after `approveLeaveRequest` / `rejectLeaveRequest` succeed, call `sendLeaveDecisionMail`. Cancel/delete: pass `session.user.id` into the new actor args; **no** mail (D-14).

**CONFLICT mapping** — catch today is 500-only (lines 136–138). Add:

```typescript
    if ((error as { code?: string }).code === 'CONFLICT') {
      return NextResponse.json({ error: (error as Error).message }, { status: 409 })
    }
```

Keep `devLog.error` + 500 for everything else.

**Do not** use identity/`service_role` clients.

---

### `apps/web/src/app/api/leave-requests/route.ts` (route, request-response)

**Analog:** same file POST (lines 64–141).

**Auto-approve** (lines 21–22, 126–135) — already calls `approveLeaveRequest`. Fixing the service covers deduct. After that call succeeds, invoke the same `sendLeaveDecisionMail(created.id, 'approved')`. If approve throws `CONFLICT` (missing balance), map to 409 (Open Question 2) so the client does not toast success; the row stays `pending`.

```typescript
    if (
      MANAGER_SELF_LEAVE_ROLES.has(session.user.role) &&
      created.status === 'pending'
    ) {
      created = await databaseService.approveLeaveRequest(
        created.id,
        session.user.id,
        AUTO_APPROVE_COMMENT
      )
    }
```

Keep `format(..., 'yyyy-MM-dd')` for `start_date` (lines 94–95). Keep `bindLeaveCreateActor` + `calculateTotalDays` (server `total_days`).

---

### `apps/web/src/hooks/use-leave-request-operations.ts` (hook, request-response)

**Analog:** same file delete `onSuccess` (lines 60–75) + create invalidation in `use-dashboard-data.ts` lines 144–150.

**Delete already has the D-20 keys** (lines 62–68):

```typescript
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recentRequests', userId] })
      queryClient.invalidateQueries({ queryKey: ['leaveBalance', userId] })
      queryClient.invalidateQueries({ queryKey: ['notifications', userId] })
      queryClient.invalidateQueries({ queryKey: ['teamLeaveRequests'] })
      queryClient.invalidateQueries({ queryKey: ['allLeaveRequests'] })
      queryClient.invalidateQueries({ queryKey: ['personalLeaveRequests', userId] })
      onSuccess?.()
    },
```

Copy that set onto **approve, reject, and cancel** `onSuccess` (today approve/reject omit `leaveBalance` and `notifications`; cancel only invalidates `recentRequests` + `personalLeaveRequests`).

Keep sonner strings (line 99): `'Leave request approved successfully'`; reject `'Leave request rejected'`. Keep `credentials: 'include'` on `patchLeaveRequest` (lines 12–17).

**Do not** add `leaveBalance` invalidation to **bulk** `onSuccess` this phase (D-18 / bulk is status-only).

Keys stay camelCase arrays. `userId` is the signed-in actor (Pitfall 8 — employee cache refreshes on their next GET).

---

### Test files (`node:test`)

**Analog:** `packages/database/src/modules/leave-balances/plan-default-inserts.test.ts`

**Imports / runner** (lines 1–3):

```typescript
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { planDefaultBalanceInserts } from './plan-default-inserts.ts'
```

**Web analog:** `apps/web/src/lib/create-company-rpc.test.ts` lines 1–3 — same `node:assert/strict` + `.ts` specifier.

**Append to scripts** (do not add Vitest):

- `packages/database/package.json` line 12 — today only `plan-default-inserts.test.ts`. Append `balance-arithmetic.test.ts`, `year-from-start-date.test.ts`, `../notifications/leave-request-notification-type.test.ts` (or the path relative to `src/modules/leave-balances`).
- `apps/web/package.json` line 12 — append `src/lib/mail.test.ts` to the existing space-separated list.

**What to test (pure only):**

| File | Assert |
|------|--------|
| `balance-arithmetic.test.ts` | deduct: `used += n`, `remaining -= n`; restore is inverse; `carried_over` unused; remaining may go negative |
| `year-from-start-date.test.ts` | `'2025-12-31'` → `2025`; do not parse via `Date` |
| `leave-request-notification-type.test.ts` | `'approved'` → `'request_approved'`; `'rejected'` → `'request_rejected'`; never `success`/`error` |
| `mail.test.ts` | unset key → `{ sent: false }` no throw; SDK `error` → `{ sent: false }` |

There is **no** existing `mock.module` / `mock.fn` in repo tests. Inject a `send` function or wrap Resend behind a small interface so the test does not import the real SDK. Do not stand up PostgREST.

---

## Shared Patterns

### Tenant BFF + session actor
**Source:** `apps/web/src/app/api/leave-requests/[id]/route.ts` lines 18–28, 66–69; `apps/web/src/lib/bind-leave-actor.ts` lines 68–74
**Apply to:** PATCH `[id]`, POST create auto-approve, any new mail helper called from those routes

```typescript
const databaseService = await createTenantDatabaseService({
  userId: session.user.id,
  companyId: session.user.companyId,
})
const bound = bindLeaveApprover({ comments: parsed.comments }, session.user.id)
```

Never `'system'`. Never `service_role` for leave writes.

### ServiceError + CONFLICT → HTTP 409
**Source:** `packages/database/src/modules/shared/utils.ts` lines 8–13, 57–58
**Apply to:** missing balance, already-approved, pending CAS miss after deduct

```typescript
DatabaseUtils.createError('...', 'CONFLICT', { operation })
// route catch:
if ((error as ServiceError).code === 'CONFLICT') {
  return NextResponse.json({ error: error.message }, { status: 409 })
}
```

`PGRST116` stays `NOT_FOUND` — map that to CONFLICT only in the approve service after a deduct that must be reversed.

### Durable side effects (this phase override)
**Source:** `notifications/service.ts` lines 38–45 (throw-through); **not** lines 15–35 or `audit-logs/service.ts` lines 11–33
**Apply to:** approve, reject, cancel, delete only. Create-request keep swallow (`leave-requests/service.ts` lines 49–80). Mail is best-effort **after** the service returns.

### Compensating reverse (no RPC)
**Source:** RESEARCH Pattern 3 + `leave-requests/repository.ts` `approve` + `findPendingRequests`
**Apply to:** deduct then status. Reverse = `applyApprovalRestore` on a **fresh** balance read. Status UPDATE `.eq('status', 'pending')`.

### Query-key invalidation
**Source:** `apps/web/src/hooks/use-leave-request-operations.ts` lines 62–68; `use-dashboard-data.ts` lines 144–147
**Apply to:** approve, reject, cancel, delete `onSuccess`

```typescript
queryClient.invalidateQueries({ queryKey: ['leaveBalance', userId] })
queryClient.invalidateQueries({ queryKey: ['notifications', userId] })
queryClient.invalidateQueries({ queryKey: ['recentRequests', userId] })
queryClient.invalidateQueries({ queryKey: ['teamLeaveRequests'] })
queryClient.invalidateQueries({ queryKey: ['allLeaveRequests'] })
queryClient.invalidateQueries({ queryKey: ['personalLeaveRequests', userId] })
```

Unread count surface stays `stats.unreadNotifications` (`dashboard-stats.tsx`); do not restyle.

### node:test + package.json file lists
**Source:** `packages/database/package.json` line 12; `apps/web/package.json` line 12; `plan-default-inserts.test.ts` lines 1–3
**Apply to:** every new `*.test.ts`. Import with `.ts` suffix. Append paths to the existing `test` script.

### Logging
**Source:** `apps/web/src/lib/env.ts` `devLog` (lines 121–136)
**Apply to:** route catches and mail skip/failure. Do not log `RESEND_API_KEY`.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `apps/web/src/lib/mail.ts` (Resend `emails.send`) | service | request-response | No mailer, SMTP, or HTTP email client in the repo. Use RESEARCH Pattern 4 + official `{ data, error }` handling. Env-optional + kebab-case export still copy `env.ts` / `create-company-rpc.ts`. |

Planner must insert `checkpoint:human-verify` before `npm install resend -w @timeoff/web` (package-legitimacy SUS `too-new`). Do not tag `[VERIFIED: npm registry]`.

---

## Metadata

**Analog search scope:** `packages/database/src/modules/{leave-balances,leave-requests,notifications,audit-logs,shared,users}`, `packages/database/src/index.ts`, `apps/web/src/{lib,hooks,app/api/leave-requests,app/api/notifications}`
**Files scanned:** 28
**Pattern extraction date:** 2026-08-30
