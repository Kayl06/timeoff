# Phase 3: Live Remaining Days - Pattern Map

**Mapped:** 2026-08-30
**Files analyzed:** 14
**Analogs found:** 14 / 14

Brownfield: bind live `leave_balances` to the shipped card and seed missing vacation/sick/personal rows. Do not restyle. Do not follow pre-Phase-2 client `useDatabaseService` for remaining-day reads.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `apps/web/src/app/api/leave-balances/route.ts` | route | request-response | itself (extend GET) + `apps/web/src/app/api/leave-policies/route.ts` | exact |
| `packages/database/src/modules/leave-balances/service.ts` | service | CRUD | itself + `LeavePolicyService.getPolicyForLeaveType` | exact |
| `packages/database/src/modules/leave-balances/repository.ts` | service | CRUD | `LeavePolicyRepository.create` / `LeaveRequestRepository.create` (**insert**, not own `upsert`) | role-match |
| `packages/database/src/index.ts` | service | request-response | existing `getLeaveBalance` / `getLeavePolicies` facade | exact |
| `packages/database/migrations/{ts}_seed_default_leave_balances.sql` | migration | CRUD | `20250818193733` + `20250818193734` CREATE OR REPLACE + `20250818193735` SECURITY DEFINER | exact |
| `apps/web/src/components/dashboard/leave-balance-card.tsx` | component | transform | itself (delete mock) + `recent-requests-card.tsx` empty branch | exact |
| `apps/web/src/hooks/use-dashboard-data.ts` | hook | request-response | itself + `use-leave-request-operations.ts` `onError` toast | exact |
| `apps/web/src/lib/leave-balance-display.ts` (implied helper) | utility | transform | card `getLeaveTypeDisplayName` maps + `type-adapters.ts` | role-match |
| `apps/web/src/lib/leave-balance-display.test.ts` (implied) | test | transform | `apps/web/src/lib/create-company-rpc.test.ts` | role-match |
| `apps/web/src/lib/tenant-supabase.ts` | utility | request-response | itself — **reuse, do not modify** | exact |
| `apps/web/src/lib/service-role-supabase.ts` | utility | request-response | itself — **reuse, do not modify** | exact |
| `apps/web/src/components/dashboard/dashboard-overview.tsx` | component | request-response | itself — **reuse, do not modify** | exact |
| `packages/database/migrations/001_initial_schema.sql` | migration | CRUD | itself — **read catalog only, do not edit** | exact |
| `supabase/seed.sql` | config | CRUD | itself `ON CONFLICT DO NOTHING` — **do not reset demo rows** | exact |

RPC bodies live in a **new** migration that `CREATE OR REPLACE`s `create_company_with_owner` and `accept_invite_with_employee`. Do not edit `20250818193733_add_companies_and_invites.sql` or `20250818193734_accept_invite_with_employee.sql` in place. Do not change `create-company-rpc.ts` / `accept-invite-rpc.ts` signatures.

## Pattern Assignments

### `apps/web/src/app/api/leave-balances/route.ts` (route, request-response)

**Analog:** same file (session-gated GET) + `apps/web/src/app/api/leave-policies/route.ts` (identical BFF skeleton) + `apps/web/src/app/api/notifications/route.ts` GET-then-write for the self-heal insert.

**Imports + session gate** (leave-balances `route.ts` lines 1-20) — keep as-is:

```typescript
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { devLog } from '@/lib/env'
import { tenantSessionRejectStatus } from '@/lib/require-tenant-session'
import { createTenantDatabaseService } from '@/lib/tenant-supabase'

const UNAUTHORIZED = { error: 'Unauthorized' } as const

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
```

**Auth + tenant client** (lines 22-36) — keep `createTenantDatabaseService`; do **not** import `identitySupabase`:

```typescript
export async function GET() {
  try {
    const gate = await requireTenantSession()
    if (!gate.ok) {
      return gate.response
    }

    const { session } = gate
    const databaseService = await createTenantDatabaseService({
      userId: session.user.id,
      companyId: session.user.companyId,
    })
    const year = new Date().getFullYear()
    const balances = await databaseService.getLeaveBalance(session.user.id, year)
    return NextResponse.json(balances)
```

**Self-heal insertion point:** after `createTenantDatabaseService`, **before** the final `getLeaveBalance` return:

1. `getLeaveBalance(session.user.id, year)`
2. `getLeavePolicies()` (facade → `getActivePolicies()`) to read `default_allowance`
3. For each of `vacation`, `sick`, `personal` missing from the user's rows **and** present as an active policy: insert only (see repository). Skip types with no active policy (D-15).
4. Re-fetch `getLeaveBalance` and return JSON array (same shape as today).
5. `user_id` on inserts **must** be `session.user.id` (RLS `leave_balances_tenant_all` WITH CHECK is same-company; D-06 is self only).

**Error handling** (lines 37-40) — keep:

```typescript
  } catch (error) {
    devLog.error('List leave balances error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
```

**Anti-pattern:** do not call `databaseService.updateLeaveBalance` for self-heal. Facade `updateLeaveBalance` (`packages/database/src/index.ts` lines 395-397) delegates to `createLeaveBalance` → **upsert**, which would overwrite `used_days` / `remaining_days` and violate D-07.

**GET-then-mutate analog** (`notifications/route.ts` PATCH lines 84-95): load owned rows, then write, then return. Self-heal is the same shape on GET.

---

### `packages/database/src/modules/leave-balances/repository.ts` (service, CRUD)

**Analog for insert-only:** `packages/database/src/modules/leave-policies/repository.ts` `create` (lines 55-74) and `packages/database/src/modules/leave-requests/repository.ts` `create` (lines 105-124). **Do not copy this file's own `upsert`** (lines 39-58) for default seeding.

**Imports pattern** (repository.ts lines 1-3):

```typescript
import { DatabaseClient } from '../shared/types';
import { DatabaseUtils } from '../shared/utils';
import { LeaveBalance, CreateLeaveBalanceData, UpdateLeaveBalanceData, LeaveBalanceFilters } from './types';
```

**Existing find** (lines 8-21) — reuse for GET and for “which types already exist”:

```typescript
async findByUserId(userId: string, year: number): Promise<LeaveBalance[]> {
  try {
    const { data, error } = await this.db
      .from('leave_balances')
      .select('*')
      .eq('user_id', userId)
      .eq('year', year);

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw DatabaseUtils.handleDatabaseError(error, 'findLeaveBalanceByUserId');
  }
}
```

**Insert-only pattern to add** (copy from leave-policies `create`, lines 55-74):

```typescript
async create(policyData: CreateLeavePolicyData): Promise<LeavePolicy> {
  try {
    DatabaseUtils.validateRequiredFields(policyData, [
      'name', 'leave_type', 'default_allowance', 'max_carry_over', 'accrual_rate', 'accrual_frequency'
    ]);

    const sanitizedData = DatabaseUtils.sanitizeData(policyData);

    const { data, error } = await this.db
      .from('leave_policies')
      .insert(sanitizedData)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    throw DatabaseUtils.handleDatabaseError(error, 'createLeavePolicy');
  }
}
```

Adapt: table `leave_balances`, required fields `['user_id', 'leave_type', 'total_allowance', 'year']` (already listed on `upsert` lines 41-43). Method name `create` / `insert` — **not** `upsert`. Unique key is `UNIQUE(user_id, leave_type, year)` (`001_initial_schema.sql` line 72).

**Duplicate race:** `DatabaseUtils.handleDatabaseError` maps Postgres `23505` → `DUPLICATE_ENTRY` (`shared/utils.ts` lines 61-63). Self-heal must catch that and continue (concurrent GET vs RPC), then re-select. Do not UPDATE.

**Do not use** (repository.ts lines 47-51):

```typescript
const { data, error } = await this.db
  .from('leave_balances')
  .upsert(sanitizedData)
  .select()
  .single();
```

---

### `packages/database/src/modules/leave-balances/service.ts` (service, CRUD)

**Analog:** same service for defaults math + `LeavePolicyService.getPolicyForLeaveType` (`leave-policies/service.ts` lines 126-129) for allowance lookup.

**Existing unused-start defaults** (`createLeaveBalance` lines 16-26) — copy the field math, not the `upsert` call:

```typescript
async createLeaveBalance(balanceData: CreateLeaveBalanceData): Promise<LeaveBalance> {
  const dataWithCalculations = {
    ...balanceData,
    used_days: balanceData.used_days || 0,
    remaining_days: balanceData.remaining_days || (balanceData.total_allowance - (balanceData.used_days || 0)),
    carried_over: balanceData.carried_over || 0
  };

  return this.leaveBalanceRepository.upsert(dataWithCalculations);
}
```

For D-02 seed: explicit `used_days: 0`, `remaining_days: total_allowance`, `carried_over: 0` (do not rely on `||` if a caller passed `0`).

**Policy lookup analog** (`leave-policies/service.ts` lines 19-21, 122-129):

```typescript
async getLeavePoliciesByType(leaveType: string): Promise<LeavePolicy[]> {
  return this.leavePolicyRepository.findByLeaveType(leaveType);
}

async getActivePolicies(): Promise<LeavePolicy[]> {
  return this.leavePolicyRepository.findAll({ is_active: true });
}

async getPolicyForLeaveType(leaveType: string): Promise<LeavePolicy | null> {
  const policies = await this.getLeavePoliciesByType(leaveType);
  return policies.length > 0 ? policies[0] : null;
}
```

`findByLeaveType` already filters `is_active = true` (`leave-policies/repository.ts` lines 39-46). Facade already exposes `getLeavePolicies()` → `getActivePolicies()` (`packages/database/src/index.ts` lines 400-402). Prefer that on the BFF rather than injecting `LeavePolicyService` into `LeaveBalanceService` (avoids a new factory cycle).

**New service method shape:** `ensureDefaultBalances(userId: string, year: number, policies: LeavePolicy[]): Promise<void>` — compute missing types from existing `findByUserId`, insert missing only. Keep `updateBalanceAfterApproval` untouched (Phase 4).

---

### `packages/database/src/index.ts` (service, request-response)

**Analog:** existing leave-balance facade (lines 263-265, 390-397).

```typescript
  // Leave balance management
  getLeaveBalance(userId: string, year: number): Promise<LeaveBalance[]>
  updateLeaveBalance(balance: Omit<LeaveBalance, 'id' | 'updated_at'>): Promise<LeaveBalance>

  // Leave policy management
  getLeavePolicies(): Promise<LeavePolicy[]>
```

```typescript
  async getLeaveBalance(userId: string, year: number) {
    return this.serviceFactory.getLeaveBalanceService().getLeaveBalance(userId, year);
  }

  async updateLeaveBalance(balance: Omit<LeaveBalance, 'id' | 'updated_at'>) {
    return this.serviceFactory.getLeaveBalanceService().createLeaveBalance(balance);
  }

  async getLeavePolicies() {
    return this.serviceFactory.getLeavePolicyService().getActivePolicies();
  }
```

If the route calls a new `ensureDefaultLeaveBalances`, add it next to `getLeaveBalance` on `IDatabaseService` and `DatabaseService`. If the route uses `getLeavePolicies` + a new insert method, add `createLeaveBalanceRow` (insert-only) — still do **not** reuse `updateLeaveBalance`.

Factory already wires `LeaveBalanceService` (`database-service.ts` lines 36, 47, 70, 87). No factory change unless the service constructor gains a policy dependency (prefer not).

---

### `packages/database/migrations/{ts}_seed_default_leave_balances.sql` (migration, CRUD)

**Analog A — function body:** `packages/database/migrations/20250818193733_add_companies_and_invites.sql` lines 72-118 and `20250818193734_accept_invite_with_employee.sql` lines 9-57. Copy the **entire** existing function, then add the balance INSERT before `RETURN v_user`.

**Analog B — security:** `packages/database/migrations/20250818193735_tenant_rls_and_anon_revoke.sql` lines 252-265. After `CREATE OR REPLACE`, re-apply:

```sql
ALTER FUNCTION public.create_company_with_owner(TEXT, TEXT, TEXT, TEXT, TEXT)
  SECURITY DEFINER
  SET search_path = public;

ALTER FUNCTION public.accept_invite_with_employee(uuid, TEXT, TEXT, TEXT, TEXT, uuid)
  SECURITY DEFINER
  SET search_path = public;

GRANT EXECUTE ON FUNCTION public.create_company_with_owner(TEXT, TEXT, TEXT, TEXT, TEXT)
  TO anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.accept_invite_with_employee(uuid, TEXT, TEXT, TEXT, TEXT, uuid)
  TO anon, authenticated, service_role;
```

D-13: do not drop GRANT/REVOKE from Phase 2. Prefer putting `SECURITY DEFINER` and `SET search_path = public` on the `CREATE OR REPLACE FUNCTION` itself **and** repeating the ALTER/GRANT block so a replace cannot silently become invoker.

**INSERT analog** (`supabase/seed.sql` lines 50-56) — skip existing rows, never UPDATE:

```sql
INSERT INTO leave_balances (id, user_id, leave_type, total_allowance, used_days, remaining_days, carried_over, year) VALUES
  ('990e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440001', 'vacation', 20, 5, 15, 2, 2025),
  -- ...
ON CONFLICT (user_id, leave_type, year) DO NOTHING;
```

**Policy-driven INSERT (D-01, D-14, D-15)** — do not hardcode 20/10/5 in SQL. Catalog source (`001_initial_schema.sql` lines 179-182):

```sql
INSERT INTO leave_policies (name, leave_type, default_allowance, max_carry_over, accrual_rate, accrual_frequency, approval_required, requires_documentation) VALUES
('Standard Vacation', 'vacation', 20, 5, 1.67, 'monthly', true, false),
('Sick Leave', 'sick', 10, 0, 0.83, 'monthly', false, true),
('Personal Leave', 'personal', 5, 0, 0.42, 'monthly', true, false),
```

RPC insert shape (copy this pattern, not the seed literals):

```sql
INSERT INTO public.leave_balances (
  user_id, leave_type, total_allowance, used_days, remaining_days, carried_over, year
)
SELECT
  v_user.id,
  lp.leave_type,
  lp.default_allowance,
  0,
  lp.default_allowance,
  0,
  EXTRACT(YEAR FROM CURRENT_DATE)::integer
FROM public.leave_policies lp
WHERE lp.leave_type IN ('vacation', 'sick', 'personal')
  AND lp.is_active = true
ON CONFLICT (user_id, leave_type, year) DO NOTHING;
```

If multiple active policies share a type, `DISTINCT ON (leave_type)` (order by `name`) matches `getPolicyForLeaveType` taking `policies[0]` after `order('name')`. Catalog today is one row per type.

**Owner RPC skeleton** to copy (`20250818193733` lines 72-116): insert company → insert admin user → set `owner_id` → **then** balance INSERT → `RETURN v_user`.

**Invite RPC skeleton** to copy (`20250818193734` lines 9-55): insert employee → mark invite accepted / `RAISE EXCEPTION 'invite_not_pending'` → **then** balance INSERT (still in the same transaction) → `RETURN v_user`. Keep `p_password` nullable; do not add STRICT.

**Filename:** latest file is `20250818193735_tenant_rls_and_anon_revoke.sql`. Use a later timestamp prefix (e.g. `20250830120000_seed_default_leave_balances.sql`) so it applies after Phase 2. Do not run `scripts/create-migration.js` blindly — it parses leading digits and would increment `20250818193735`.

**Do not edit** `001_initial_schema.sql`.

---

### `apps/web/src/components/dashboard/leave-balance-card.tsx` (component, transform)

**Analog:** same file (keep chrome) + `apps/web/src/components/dashboard/recent-requests-card.tsx` empty branch (lines 38-54).

**Imports + props** (leave-balance-card.tsx lines 1-13) — keep:

```tsx
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Calendar, Clock, TrendingDown } from 'lucide-react'
import type { LeaveBalance, LeaveType } from '@timeoff/types'

interface LeaveBalanceCardProps {
  leaveBalance?: LeaveBalance[] | null
  isLoading: boolean
}

export function LeaveBalanceCard({ leaveBalance, isLoading }: LeaveBalanceCardProps) {
```

**Loading skeleton** (lines 14-35) — keep pulse `h-4` + `h-2` `bg-gray-200`. Do not swap for `Skeleton`.

**Delete** `mockLeaveBalance` (lines 37-71). Map `leaveBalance` from props.

**Uncomment empty** using the written copy (lines 73-89) **or** copy the live sibling (`recent-requests-card.tsx` lines 38-54):

```tsx
  if (!requests || requests.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Recent Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No recent requests found
          </p>
        </CardContent>
      </Card>
    )
  }
```

Empty body copy is **No leave balance information available** (already in the commented block). Title stays “Leave Balance” + `Calendar`.

**Display-name / color maps** (lines 91-117) — keep; extra types stay in the map but are **not rendered** (D-12). Filter to `vacation | sick | personal`, sort that order, then `.map`.

**Populated row chrome** (lines 119-168) — keep classes. Change only data:

- Delete `const remaining = balance.total_allowance - balance.used_days` (line 133).
- Render `{balance.remaining_days} days remaining` (D-11).
- Progress stays `total_allowance > 0 ? (used_days / total_allowance) * 100 : 0` (lines 130-132).
- `0 days remaining` is populated, not empty.
- `carried_over > 0` branch unchanged.

Host: `dashboard-overview.tsx` lines 49-52 already passes `leaveBalance` / `balanceLoading`. Do not add a second card.

---

### `apps/web/src/hooks/use-dashboard-data.ts` (hook, request-response)

**Analog:** same hook for fetch/query key + `use-leave-request-operations.ts` for `toast.error` on failure.

**Fetch helper** (lines 14-21) — keep `credentials: 'include'`:

```typescript
async function fetchSessionJson<T>(url: string, fallbackError: string): Promise<T> {
  const response = await fetch(url, { credentials: 'include' })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload.error || fallbackError)
  }
  return payload as T
}
```

**Query** (lines 62-69) — keep key and URL:

```typescript
  const { data: leaveBalance, isLoading: balanceLoading } = useQuery({
    queryKey: ['leaveBalance', user.id],
    queryFn: () => fetchSessionJson<DatabaseLeaveBalance[]>(
      '/api/leave-balances',
      'Failed to load leave balances'
    ),
    enabled: !!user?.id
  })
```

**Error toast analog** (`use-leave-request-operations.ts` lines 72-74):

```typescript
    onError: (error) => {
      toast.error('Failed to delete leave request')
    }
```

Add `onError` (or `isError` + `useEffect`) on the leaveBalance query: `toast.error('Failed to load leave balances')` — that string is already the `fallbackError`. `toast` is already imported from `sonner` (line 12). Do not mount a second toaster; `session-provider.tsx` line 50 already has `<Sonner richColors />`.

**Empty on error:** today `adaptLeaveBalances(leaveBalance || [])` (line 174) already yields `[]` when `data` is undefined, so the card empty branch runs. Do not substitute mock rows. Prefer `isError` so loading is false after failure (query `isLoading` is false when errored).

**Keep** `queryClient.invalidateQueries({ queryKey: ['leaveBalance', user.id] })` on create-request success (line 138). Do not add approve invalidation (Phase 4).

**Anti-pattern:** do not read remaining days via `useDatabaseService()` / browser anon client.

---

### `apps/web/src/lib/leave-balance-display.ts` (utility, transform) — implied

**Analog:** in-card maps (`leave-balance-card.tsx` lines 91-117) + `adaptLeaveBalances` (`type-adapters.ts` lines 55-75).

If the planner extracts sort/filter (testable, matches node:test style), keep display names/colors in the card (UI-SPEC: do not restyle). Helper should:

```typescript
const CARD_TYPES = ['vacation', 'sick', 'personal'] as const

export function balancesForLeaveCard(rows: LeaveBalance[]): LeaveBalance[] {
  return CARD_TYPES
    .map((type) => rows.find((row) => row.leave_type === type))
    .filter((row): row is LeaveBalance => row != null)
}
```

`LeaveType` enum (`packages/types/src/index.ts` lines 53-62): `VACATION = 'vacation'`, `SICK = 'sick'`, `PERSONAL = 'personal'`. Compare against string values, not enum keys.

**Test analog** (`create-company-rpc.test.ts` lines 1-3, 5-22):

```typescript
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildCreateCompanyWithOwnerArgs } from './create-company-rpc.ts'
```

Register the new file in `apps/web/package.json` `"test"` (explicit file list, same as existing lib tests).

---

### `apps/web/src/lib/tenant-supabase.ts` / `service-role-supabase.ts` (utility, request-response)

**Reuse only.** Tenant GET/insert uses minted JWT (`tenant-supabase.ts` lines 23-41). Identity RPCs already run through `identitySupabase.rpc('create_company_with_owner', ...)` (`signup/route.ts` lines 48-57) and `accept_invite_with_employee` (`invites/accept/route.ts`). SQL INSERT inside those RPCs needs **no** TS arg-mapper change.

---

### `supabase/seed.sql` (config, CRUD)

**Do not reset** existing vacation/sick demo rows (D-07). Analog is the existing `ON CONFLICT DO NOTHING` (lines 50-56). Demo year is **2025**; GET uses `new Date().getFullYear()` (2026 in this session) — self-heal on GET covers missing current-year rows including `personal`. Do not rewrite seed used/remaining numbers.

## Shared Patterns

### Tenant BFF session gate
**Source:** `apps/web/src/lib/require-tenant-session.ts` lines 13-24; copied into every tenant `route.ts`.
**Apply to:** `leave-balances/route.ts` only (already present).

```typescript
export function tenantSessionRejectStatus(
  userId: string | undefined | null,
  companyId: string | undefined | null
): 401 | null {
  if (!userId || userId.length === 0) {
    return 401
  }
  if (!companyId || companyId.length === 0) {
    return 401
  }
  return null
}
```

401 JSON `{ error: 'Unauthorized' }`. Never service_role for this GET.

### Tenant vs identity clients
**Source:** `tenant-supabase.ts` lines 1-8, 23-41; `service-role-supabase.ts` lines 1-19.
**Apply to:** remaining-day read/insert → `createTenantDatabaseService`. Signup/invite RPCs stay `identitySupabase`. Do not mix.

### Repository error wrap
**Source:** `packages/database/src/modules/shared/utils.ts` lines 54-74, 99-111, 116-127.
**Apply to:** new `leave_balances` insert.

```typescript
static handleDatabaseError(error: any, operation: string): never {
  console.error(`Database error in ${operation}:`, error);

  if (error.code === 'PGRST116') {
    throw this.createError('Record not found', 'NOT_FOUND', { operation });
  }

  if (error.code === '23505') {
    throw this.createError('Duplicate record', 'DUPLICATE_ENTRY', { operation });
  }
  // ...
}
```

Self-heal: treat `DUPLICATE_ENTRY` as success (row exists). Signup analog for 23505 → 409 is **not** for this GET.

### RLS insert constraint
**Source:** `20250818193735_tenant_rls_and_anon_revoke.sql` lines 155-170, 247.
`leave_balances_tenant_all` FOR ALL TO authenticated, USING/WITH CHECK same-company via `users.company_id = current_company_id()`. `GRANT SELECT, INSERT, UPDATE, DELETE ON leave_balances TO authenticated`. Self-heal INSERT is allowed for same-company `user_id`; still only insert `session.user.id`.

`leave_policies` is catalog SELECT for authenticated (`USING (true)`, lines 218-220, 241) — GET can read `default_allowance` on the tenant client.

### Sonner toasts
**Source:** `use-leave-request-operations.ts` `toast.error(...)`; toaster in `session-provider.tsx` line 50 `<Sonner richColors />`.
**Apply to:** leave-balance fetch failure only. Copy: `Failed to load leave balances`. No inline destructive on the card.

### Query keys
**Source:** `use-dashboard-data.ts` line 63 `['leaveBalance', user.id]`.
Keep camelCase array keys. Do not add `['leave-balances']`.

### Calendar year
**Source:** `leave-balances/route.ts` line 34 `const year = new Date().getFullYear()`; `LeaveBalanceService.updateBalanceAfterApproval` line 34 same.
RPCs must use `EXTRACT(YEAR FROM CURRENT_DATE)::integer`, not a literal 2025.

### Unique key / no overwrite
**Source:** `UNIQUE(user_id, leave_type, year)` (`001_initial_schema.sql` line 72); seed `ON CONFLICT (user_id, leave_type, year) DO NOTHING`.
**Apply to:** SQL RPC inserts and TS self-heal inserts. Never UPDATE existing balance rows this phase.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| GET handler that inserts then returns | route | request-response | No existing GET self-heal. Closest: notifications PATCH (load then write) + leave-balances GET skeleton. Compose those; do not invent a new HTTP method. |
| Vitest / Playwright for the card | test | — | App tests are `node --test --experimental-strip-types` on listed `src/lib/*.test.ts` files. Put display-order tests in `apps/web/src/lib/`, not a new runner. |

`scripts/create-migration.js` is a weak analog for naming (numeric prefix vs Phase 2 timestamps). Name the new SQL file with a timestamp after `20250818193735`.

## Anti-Patterns (do not copy)

- `LeaveBalanceRepository.upsert` / facade `updateLeaveBalance` for default rows (overwrites D-07).
- `ARCHITECTURE.md` client `useDatabaseService` for dashboard balances (pre-Phase-2; CONTEXT forbids).
- Hardcoded 20/10/5 in RPC SQL (D-14) or mock 10/20/10 in the card (D-10).
- Restyling Progress/dots/spacing; `npx shadcn add`; second toaster; hiding the card.
- Editing `001_initial_schema.sql` or dropping Phase 2 `SECURITY DEFINER` / `search_path` / GRANT.
- Resetting `supabase/seed.sql` demo used/remaining values.

## Metadata

**Analog search scope:** `apps/web/src/app/api/`, `apps/web/src/hooks/`, `apps/web/src/components/dashboard/`, `apps/web/src/lib/`, `packages/database/src/modules/leave-balances/`, `packages/database/src/modules/leave-policies/`, `packages/database/src/modules/leave-requests/`, `packages/database/src/modules/shared/`, `packages/database/migrations/`, `supabase/seed.sql`, `supabase/tests/`
**Files scanned:** ~40 (15 API routes, 4 leave-balance module files, 4 leave-policy module files, 3 identity RPC SQL files, dashboard cards/hooks, seed, RLS migration)
**Pattern extraction date:** 2026-08-30
