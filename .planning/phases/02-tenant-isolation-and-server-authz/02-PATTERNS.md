# Phase 2: Tenant Isolation and Server Authz - Pattern Map

**Mapped:** 2026-08-29
**Files analyzed:** 39
**Analogs found:** 39 / 39

No CONTEXT.md (discuss-phase skipped). File list taken from `02-RESEARCH.md` recommended structure, brownfield inventory, and implied identity-client swaps.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `apps/web/src/lib/require-tenant-session.ts` | utility | request-response | `apps/web/src/lib/invite-auth.ts` + `apps/web/src/app/api/auth/invites/route.ts` `requireInviteOwner` | exact |
| `apps/web/src/lib/tenant-supabase.ts` | utility | request-response | `apps/web/src/lib/supabase.ts` | role-match |
| `apps/web/src/lib/service-role-supabase.ts` | utility | request-response | `apps/web/src/lib/supabase.ts` | role-match |
| `apps/web/src/lib/supabase-jwt.ts` | utility | transform | `apps/web/src/lib/invite-token.ts` | role-match |
| `apps/web/src/lib/bind-leave-actor.ts` | utility | transform | `apps/web/src/lib/create-company-rpc.ts` + `inviteEmailSchema` | role-match |
| `apps/web/src/app/api/leave-requests/route.ts` | route | CRUD | `apps/web/src/app/api/auth/invites/route.ts` | exact |
| `apps/web/src/app/api/leave-requests/[id]/route.ts` | route | CRUD | `apps/web/src/app/api/auth/invites/route.ts` | role-match |
| `apps/web/src/app/api/leave-requests/bulk/route.ts` | route | batch | `apps/web/src/app/api/auth/invites/route.ts` POST | role-match |
| `apps/web/src/app/api/leave-balances/route.ts` | route | CRUD | `apps/web/src/app/api/auth/invites/route.ts` GET | role-match |
| `apps/web/src/app/api/notifications/route.ts` | route | CRUD | `apps/web/src/app/api/auth/invites/route.ts` | role-match |
| `apps/web/src/app/api/calendar/leave-requests/route.ts` | route | CRUD | `apps/web/src/app/api/auth/invites/route.ts` GET | role-match |
| `apps/web/src/app/api/leave-policies/route.ts` | route | request-response | `apps/web/src/app/api/auth/invites/route.ts` GET | role-match |
| `apps/web/src/app/api/manager-team-stats/route.ts` | route | request-response | `apps/web/src/app/api/auth/invites/route.ts` GET | role-match |
| `apps/web/src/app/api/test-connection/route.ts` | route | request-response | same file (session-gate in place) | exact |
| `apps/web/src/lib/require-tenant-session.test.ts` | test | request-response | `apps/web/src/lib/invite-auth.test.ts` | exact |
| `apps/web/src/lib/supabase-jwt.test.ts` | test | transform | `apps/web/src/lib/invite-token.test.ts` | exact |
| `apps/web/src/lib/bind-leave-actor.test.ts` | test | transform | `apps/web/src/lib/create-company-rpc.test.ts` | exact |
| `packages/database/migrations/{ts}_tenant_rls_and_anon_revoke.sql` | migration | CRUD | `009_fix_rls_for_nextauth.sql` + `20250818193733_add_companies_and_invites.sql` | role-match |
| `supabase/tests/tenant_rls.test.sql` | test | request-response | — | none |
| `apps/web/src/lib/supabase.ts` | utility | request-response | same file | exact |
| `apps/web/src/lib/auth.ts` | config | request-response | same file (swap identity client) | exact |
| `apps/web/src/lib/env.ts` | config | transform | same file | exact |
| `apps/web/env.example` | config | — | same file | exact |
| `apps/web/package.json` | config | — | same file (`test` script) | exact |
| `apps/web/src/lib/validation.ts` | utility | transform | same file (`leaveRequestSchema`, `validateInput`) | exact |
| `packages/database/src/modules/database-service.ts` | service | CRUD | same file (`getInstance` → add `create`) | exact |
| `packages/database/src/index.ts` | service | CRUD | same file (`createDatabaseService`) | exact |
| `packages/database/src/modules/users/repository.ts` | model | CRUD | same file (`select('*')`) | exact |
| `apps/web/src/hooks/use-dashboard-data.ts` | hook | CRUD | same file (swap `queryFn`/`mutationFn`) | exact |
| `apps/web/src/hooks/use-leave-request-operations.ts` | hook | CRUD | same file | exact |
| `apps/web/src/components/dashboard/unified-calendar-view.tsx` | component | CRUD | same file + hook transport | exact |
| `apps/web/src/components/dashboard/leave-calendar-view.tsx` | component | CRUD | same file | exact |
| `apps/web/src/components/leave-request-form.tsx` | component | request-response | same file | exact |
| `apps/web/src/components/dashboard/team-calendar-view.tsx` | component | CRUD | same file (unused import only) | exact |
| `apps/web/src/providers/database-provider.tsx` | provider | CRUD | same file | exact |
| `apps/web/src/app/api/auth/signup/route.ts` | route | CRUD | same file (identity client import) | exact |
| `apps/web/src/app/api/auth/invites/route.ts` | route | CRUD | same file | exact |
| `apps/web/src/app/api/auth/invites/accept/route.ts` | route | CRUD | same file | exact |
| `apps/web/src/app/api/auth/invites/preview/route.ts` | route | request-response | same file | exact |
| `apps/web/src/types/next-auth.d.ts` | config | — | same file (do not add fields this phase) | exact |

## Pattern Assignments

### `apps/web/src/lib/require-tenant-session.ts` (utility, request-response)

**Analog:** `apps/web/src/lib/invite-auth.ts` (pure status mapper) + `apps/web/src/app/api/auth/invites/route.ts` lines 19–62 (`requireInviteOwner` Result union)

**Imports / Result-union gate** (`invites/route.ts` lines 1–27):
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

async function requireInviteOwner(): Promise<
  | { ok: true; company: CompanyRow }
  | { ok: false; response: NextResponse }
> {
  const session = await getServerSession(authOptions)
  const sessionUserId = session?.user?.id

  if (!sessionUserId) {
    const status = inviteOwnerRejectStatus(sessionUserId, '') ?? 401
    return { ok: false, response: ownerRejectResponse(status) }
  }
```

**Fail-closed 401/403 mapper** (`invite-auth.ts` lines 24–35):
```typescript
export function inviteOwnerRejectStatus(
  sessionUserId: string | undefined | null,
  ownerId: string
): 401 | 403 | null {
  if (!sessionUserId || sessionUserId.length === 0) {
    return 401
  }
  if (!isCompanyOwner(sessionUserId, ownerId)) {
    return 403
  }
  return null
}
```

**Copy this:** Extract a **pure** helper (testable without Next) that returns `401` when `id` or `companyId` is missing/empty. The route wrapper calls `getServerSession(authOptions)` with **no** `req`/`res` (App Router). Return `{ ok: true, userId, companyId, role }` or `{ ok: false, response }`. Do **not** copy the owner-only 403 — Phase 2 is company isolation, not owner-only. File-level JSDoc like `invite-auth.ts` lines 1–5.

**Do not copy:** `inviteOwnerRejectStatus` owner check; middleware (`apps/web/src/middleware.ts` lines 24–34 **excludes** `/api`).

---

### `apps/web/src/lib/supabase-jwt.ts` (utility, transform)

**Analog:** `apps/web/src/lib/invite-token.ts` (server-only crypto helper in `lib/`, kebab-case, JSDoc, named exports). **JWT payload/signing: no in-repo analog — use RESEARCH `SignJWT` excerpt.**

**File shape** (`invite-token.ts` lines 1–31):
```typescript
/**
 * Invite token primitives for company_invites.token_hash.
 * Raw tokens stay in the URL; only SHA-256 digests are stored. Never log the raw token.
 */
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

export function generateInviteToken(): string {
  return randomBytes(32).toString('hex')
}

export function hashInviteTokenHex(token: string): string {
  return hashInviteToken(token).toString('hex')
}
```

**Mint algorithm (from RESEARCH, not this repo):**
```typescript
import { SignJWT } from 'jose'

export async function mintTenantAccessToken(input: {
  userId: string
  companyId: string
  jwtSecret: string
}): Promise<string> {
  const secret = new TextEncoder().encode(input.jwtSecret)
  return new SignJWT({
    role: 'authenticated',
    company_id: input.companyId,
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(input.userId)
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(secret)
}
```

**Copy this:** kebab-case file, named export, JSDoc `@param`/`@returns`, never log secrets. Pin `jose@4.15.9`. Secret from `env.SUPABASE_JWT_SECRET` (not `NEXTAUTH_SECRET`). Do **not** use `node:crypto` HMAC.

---

### `apps/web/src/lib/tenant-supabase.ts` (utility, request-response)

**Analog:** `apps/web/src/lib/supabase.ts` lines 1–10 (`createClient` + `env`) **minus** `persistSession: true`.

```typescript
import { createClient } from '@supabase/supabase-js'
import { env, devLog } from './env'

export const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!, env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! , {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})
```

**Copy this:** `createClient` + URL + **anon** key from `env`. **Change:** per-request factory (not a module singleton); `auth: { persistSession: false, autoRefreshToken: false }`; pass `accessToken: async () => mintedJwt` (RESEARCH Pattern 2 — do **not** set `global.headers.Authorization`). Then `createDatabaseService(thatClient)` — **not** `DatabaseServiceFactory.getInstance`.

**Do not copy:** `persistSession: true`, module-level `export const supabase`.

---

### `apps/web/src/lib/service-role-supabase.ts` (utility, request-response)

**Analog:** same `supabase.ts` createClient block.

**Copy this:** `createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })`. **Change:** key is `env.SUPABASE_SERVICE_ROLE_KEY` (make required in `env.ts`). File must never be imported from a `'use client'` module. Identity-only: `auth.ts` `authorize`/`session`, signup, invite hash lookup.

---

### `apps/web/src/lib/bind-leave-actor.ts` (utility, transform)

**Analog:** `apps/web/src/lib/create-company-rpc.ts` (pure mapper that the route uses so the client cannot set server-owned fields) + `inviteEmailSchema` comment.

**Schema “never from client”** (`validation.ts` lines 78–81):
```typescript
/** Owner invite: email only; company_id is never taken from the client. */
export const inviteEmailSchema = z.object({
  email: emailSchema,
})
```

**Pure mapper** (`create-company-rpc.ts` lines 27–37):
```typescript
export function buildCreateCompanyWithOwnerArgs(
  input: CreateCompanyWithOwnerInput
): CreateCompanyWithOwnerArgs {
  return {
    p_email: input.email,
    p_password: input.passwordHash,
    p_first_name: input.firstName,
    p_last_name: input.lastName,
    p_company_name: input.companyName,
  }
}
```

**Copy this:** small named function + TypeScript input/output types. Overwrite `user_id` / `approver_id` from session; ignore body copies (or 400 if they disagree). RESEARCH bind snippet: `user_id: session.user.id`.

---

### BFF Route Handlers (route, CRUD / batch / request-response)

**Files:**
- `apps/web/src/app/api/leave-requests/route.ts` (GET list, POST create)
- `apps/web/src/app/api/leave-requests/[id]/route.ts` (PATCH approve/reject/cancel/delete)
- `apps/web/src/app/api/leave-requests/bulk/route.ts` (POST)
- `apps/web/src/app/api/leave-balances/route.ts` (GET)
- `apps/web/src/app/api/notifications/route.ts` (GET, optional PATCH read)
- `apps/web/src/app/api/calendar/leave-requests/route.ts` (GET)
- `apps/web/src/app/api/leave-policies/route.ts` (GET)
- `apps/web/src/app/api/manager-team-stats/route.ts` (GET; 403 if session.user.role is employee)

**Analog:** `apps/web/src/app/api/auth/invites/route.ts` — the only session-gated BFF in the repo. There is **no** existing `app/api/**/[id]/route.ts`; copy the same handler skeleton and add Next 14 `params` as `{ params }: { params: { id: string } }` (sync, not Promise).

**Imports + GET gate + try/catch 500** (lines 1–3, 69–113):
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
// ...
export async function GET() {
  try {
    const gate = await requireInviteOwner()
    if (!gate.ok) {
      return gate.response
    }
    // ... domain work ...
    return NextResponse.json({ invites, teammateCount, companyName: company.name })
  } catch (error) {
    devLog.error('List invites error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

**POST: parse JSON → Zod → 400 → bind server fields → 201** (lines 116–199):
```typescript
export async function POST(request: NextRequest) {
  try {
    const gate = await requireInviteOwner()
    if (!gate.ok) {
      return gate.response
    }
    const body = await request.json()
    const validationResult = validateInput(inviteEmailSchema, body)

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: formatValidationErrors(validationResult.errors),
        },
        { status: 400 }
      )
    }
    // ... insert using company.id from gate, never from body ...
    return NextResponse.json({ email, acceptUrl, expiresAt }, { status: 201 })
  } catch (error) {
    devLog.error('Create invite error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

**409 conflict analog** (lines 161–168) — reuse for duplicate leave only if needed; otherwise 400/401/403/500.

**Domain calls after gate:** inject tenant client, then existing `IDatabaseService` methods (`createLeaveRequest`, `approveLeaveRequest`, `getLeaveBalance`, …). Do **not** call `useDatabaseService` (client hook). Bind actor via `bind-leave-actor.ts`. GET list: choose `getLeaveRequestsByUser` / `getTeamLeaveRequests` / `getAllLeaveRequests` from `session.user.role` the same way `use-dashboard-data.ts` does today (lines 50–87) — RLS still enforces company.

**Handler names:** `GET` / `POST` / `PATCH` only (CONVENTIONS). kebab-case folders: `leave-requests`, `leave-balances`.

---

### `apps/web/src/app/api/test-connection/route.ts` (route, request-response)

**Analog:** same file lines 1–43 — keep env SET/NOT SET probe; **remove or session-gate** the `users` listing.

**Leak to close** (lines 16–20):
```typescript
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name')
      .limit(5)
```

**Copy this:** `environment: { url: … ? 'SET' : 'NOT SET' }` pattern (lines 39–42). Either require `requireTenantSession` or drop the row payload entirely (RESEARCH Open Question 3).

---

### Wave 0 unit tests (`*.test.ts`)

**Analog:** `apps/web/src/lib/invite-auth.test.ts` (401/403 mapper) and `apps/web/src/lib/invite-token.test.ts` (crypto primitives).

**Imports + describe/it** (`invite-auth.test.ts` lines 1–21):
```typescript
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  inviteOwnerRejectStatus,
} from './invite-auth.ts'

describe('inviteOwnerRejectStatus', () => {
  it('returns 401 when sessionUserId is undefined', () => {
    assert.equal(inviteOwnerRejectStatus(undefined, ownerId), 401)
  })
```

**Crypto/unit without live network** (`invite-token.test.ts` lines 1–16):
```typescript
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { generateInviteToken, hashInviteTokenHex } from './invite-token.ts'

describe('generateInviteToken', () => {
  it('returns a 64-character hex string', () => {
    const token = generateInviteToken()
    assert.equal(token.length, 64)
    assert.match(token, /^[0-9a-f]{64}$/)
  })
})
```

**Copy this:** `node:test` + `node:assert/strict`; import `./file.ts` (extension required by `--experimental-strip-types`); no Vitest. Extend `apps/web/package.json` `"test"` script the same way Phase 1 appended files (line 12).

**jwt test:** decode payload claims `role`, `sub`, `company_id` without verifying against PostgREST (live verify is pgTAP / curl).

**bind-leave-actor test:** body `user_id` ignored — mirror `create-company-rpc.test.ts` object in / object out.

---

### `packages/database/migrations/{ts}_tenant_rls_and_anon_revoke.sql` (migration, CRUD)

**Analogs:**
1. `packages/database/migrations/009_fix_rls_for_nextauth.sql` — `DROP POLICY IF EXISTS` then `CREATE POLICY` (replace these open policies; do not extend `USING (true)`).
2. `packages/database/migrations/20250818193733_add_companies_and_invites.sql` — `ENABLE ROW LEVEL SECURITY`, named policies, `GRANT EXECUTE ON FUNCTION … TO anon, authenticated, service_role`.
3. `packages/database/migrations/004_fix_infinite_recursion.sql` — **anti-pattern:** never `EXISTS (SELECT 1 FROM users …)` on the `users` table itself; use JWT `company_id` equality.
4. `packages/database/migrations/20250807140944_create_view_active_records.sql` — recreate view with `WITH (security_invoker = true)`.
5. Function bodies: `create_company_with_owner` (lines 72–118) and `accept_invite_with_employee` (lines 9–59) — `ALTER FUNCTION … SECURITY DEFINER SET search_path = public`; keep existing `GRANT EXECUTE`.

**DROP + CREATE policy names** (`009` lines 6–21):
```sql
DROP POLICY IF EXISTS "Users can create own requests" ON leave_requests;
DROP POLICY IF EXISTS "Users can view own requests" ON leave_requests;

CREATE POLICY "Users can create own requests" ON leave_requests
FOR INSERT WITH CHECK (true);
```

**RPC GRANT to keep** (`20250818193733` line 120):
```sql
GRANT EXECUTE ON FUNCTION create_company_with_owner(TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
```

**Users-table anti-recursion** (`004` lines 25–37) — replace `"Admins can read all users"` (`role IN ('admin','hr')` with **no** company filter) and `"Public can read users"`:
```sql
CREATE POLICY "Admins can read all users" ON users FOR SELECT USING (
    role IN ('admin', 'hr')
);
CREATE POLICY "Public can read users" ON users FOR SELECT USING (true);
```

**View today** (`20250807140944` lines 1–3):
```sql
CREATE VIEW active_leave_requests AS
SELECT * FROM leave_requests
WHERE deleted_at IS NULL;
```

**Copy this:** timestamped snake_case filename in `packages/database/migrations/` (symlink `supabase/migrations/`). `DROP POLICY IF EXISTS` by **exact existing names** from 009/010/012/013/companies. New policies `TO authenticated` with `(SELECT public.current_company_id())`. Child tables: `EXISTS (SELECT 1 FROM users u WHERE u.id = <table>.user_id AND u.company_id = (SELECT public.current_company_id()))`. `users` / `companies` / `company_invites`: direct `company_id` / `id` equality — **no users self-subquery**. `calendar_events`: `user_id IS NULL OR EXISTS (...)`. `REVOKE ALL ON TABLE … FROM anon;` then `GRANT SELECT, INSERT, UPDATE, DELETE ON … TO authenticated`. Catalog tables (`departments`, `teams`, `leave_policies`): REVOKE anon writes; authenticated SELECT-all OK this phase.

**Do not copy:** `USING (true)` / `WITH CHECK (true)` from 009, 010, 012, 013, companies policies. Do not use `auth.uid()` as the tenant predicate (012 audit SELECT still does — replace with JWT company + `sub`).

---

### `packages/database/src/modules/database-service.ts` + `packages/database/src/index.ts` (service, CRUD)

**Analog:** same files. Add request-scoped construction; keep wiring.

**Singleton to stop using on the server** (`database-service.ts` lines 12–25):
```typescript
export class DatabaseServiceFactory {
  private static instance: DatabaseServiceFactory;
  private constructor(private db: DatabaseClient) {
    this.initializeServices();
  }
  static getInstance(db: DatabaseClient): DatabaseServiceFactory {
    if (!DatabaseServiceFactory.instance) {
      DatabaseServiceFactory.instance = new DatabaseServiceFactory(db);
    }
    return DatabaseServiceFactory.instance;
  }
```

**Facade constructor** (`index.ts` lines 295–300):
```typescript
export class DatabaseService implements IDatabaseService {
  private serviceFactory: DatabaseServiceFactory;
  constructor(private supabaseClient: typeof supabase) {
    this.serviceFactory = DatabaseServiceFactory.getInstance(supabaseClient);
  }
```

**Factory export** (`index.ts` lines 491–493):
```typescript
export const createDatabaseService = (supabaseClient: typeof supabase): IDatabaseService => {
  return new DatabaseService(supabaseClient)
}
```

**Copy this:** keep `initializeServices()` repository→service wiring (including the UserService/`null as any` cycle at lines 44–55 — do not add a second cycle). Add `static create(db)` (or equivalent) that **always** `new DatabaseServiceFactory(db)` — never first-wins. Point `DatabaseService` constructor at `create`, not `getInstance`, for server BFF. Browser provider may keep `getInstance` only if it still constructs once with the anon client; RESEARCH prefers not mixing that singleton with tenant JWTs.

**Lazy package client** (`index.ts` lines 194–221) — do **not** use `getSupabaseClient()` for tenant BFF (`persistSession: true` + anon).

---

### `packages/database/src/modules/users/repository.ts` (model, CRUD)

**Analog:** same file. Exclude `password` from selects used by tenant BFF.

**Leak** (lines 10–13, 38–40):
```typescript
      const { data, error } = await this.db
        .from('users')
        .select('*')
        .eq('id', id)
        .single();
      let query = this.db.from('users').select('*');
```

**Copy this:** `try/catch` + `DatabaseUtils.handleDatabaseError(error, 'findUserById')`. Change `select('*')` on list/team/BFF paths to an explicit column list (no `password`). Identity `auth.ts` `authorize` still needs `password` via the **service_role** client — keep a dedicated select there, not on `findAll`.

---

### Hook + calendar transport swap (hook/component, CRUD)

**Analogs:** the files themselves. Keep query keys, invalidation, sonner. Replace `databaseService.*` with `fetch('/api/...', { credentials: 'include' })`.

**Query + mutation today** (`use-dashboard-data.ts` lines 55–108):
```typescript
  const { data: leaveBalance, isLoading: balanceLoading } = useQuery({
    queryKey: ['leaveBalance', user.id],
    queryFn: () => databaseService.getLeaveBalance(user.id, new Date().getFullYear()),
    enabled: !!user?.id
  })

  const { mutateAsync: createLeaveRequest, isPending: isCreatingLeaveRequest } = useMutation({
    mutationFn: async (data: Omit<DatabaseLeaveRequest, 'id' | 'created_at' | 'updated_at'>) => {
      const newRequest = await databaseService.createLeaveRequest(data)
      if (isManager && data.status === 'pending') {
        await databaseService.approveLeaveRequest(newRequest.id, user.id, 'Auto-approved (Manager self-leave)')
      }
      return newRequest
    },
```

**Mutation + toast + invalidate** (`use-leave-request-operations.ts` lines 34–48, 64–78):
```typescript
  const { mutateAsync: deleteLeaveRequest, isPending: isDeletingLeaveRequest } = useMutation({
    mutationFn: (id: string) => databaseService.deleteLeaveRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recentRequests', userId] })
      queryClient.invalidateQueries({ queryKey: ['leaveBalance', userId] })
      // ...
      onSuccess?.()
    },
    onError: (error) => {
      toast.error('Failed to delete leave request')
    }
  })

  mutationFn: ({ id, comments }: { id: string, comments?: string }) =>
    databaseService.approveLeaveRequest(id, userId, comments),
```

**Calendar query keys** (`unified-calendar-view.tsx` lines 108–128):
```typescript
    queryKey: ['personalLeaveRequests', user.id],
    queryFn: () => databaseService.getLeaveRequestsByUser(user.id),
    queryKey: ['teamLeaveRequests', user.id],
    queryFn: () => {
      if (user.role === 'admin' || user.role === 'hr') {
        return databaseService.getAllLeaveRequests()
      } else if (isManager) {
        return databaseService.getTeamLeaveRequests(user.id, user.department)
      }
      return []
    },
```

**Policies catalog** (`leave-request-form.tsx` lines 55–58) — keep key `['leave-policies']` (existing kebab exception; CONVENTIONS say prefer camelCase for **new** keys, do not rename this one):
```typescript
    queryKey: ['leave-policies'],
    queryFn: () => databaseService.getLeavePolicies(),
    enabled: isOpen,
```

**Copy this:** `'use client'`; `useQuery`/`useMutation`; same keys; `toast` from `sonner` in ops hook; `adaptLeaveRequests` after fetch. **Change:** `queryFn`/`mutationFn` to `fetch` + `credentials: 'include'`; check `res.ok` then `res.json()`; do not pass `approverId` in JSON (server binds session). Auto-approve manager self-leave: either a BFF flag or a second PATCH to `/api/leave-requests/[id]` — still session-bound.

**`team-calendar-view.tsx`:** only unused `useDatabaseService` import (line 13) — remove import; no query swap unless a call site is added.

**`database-provider.tsx` lines 20–26:** after hooks stop using the context, either leave the provider (unused) or stop constructing a browser `createDatabaseService(supabase)`. Do not import `service-role-supabase` here (`'use client'`).

---

### Identity client swap (`auth.ts`, signup, invites routes)

**Analog:** current `import { supabase } from '@/lib/supabase'` (or `./supabase`).

**auth.ts** (lines 5, 63–68, 250–258):
```typescript
import { supabase, mapUserFromDatabase } from './supabase'
          const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', credentials.email)
            .single()
          const { data: user } = await supabase
            .from('users')
            .select('*')
            .eq('email', session.user.email)
```

**Copy this:** session/jwt callback field mapping (`companyId`, `isOwner`, `id`) — `next-auth.d.ts` lines 6–21 already has them. **Change:** import the service-role server client. Keep `mapUserFromDatabase` from `supabase.ts` (or split mappers out so the browser module is map-only). Do not mint tenant JWT in `authorize` (no company session yet).

---

### `apps/web/src/lib/env.ts` + `apps/web/env.example` (config)

**Analog:** `env.ts` lines 7–73, 109–123.

```typescript
interface EnvironmentConfig {
  NEXT_PUBLIC_SUPABASE_URL: string
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string
  SUPABASE_SERVICE_ROLE_KEY?: string
  NEXTAUTH_URL: string
  NEXTAUTH_SECRET: string
  // ...
}
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'NEXTAUTH_URL',
    'NEXTAUTH_SECRET'
  ] as const
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    config.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  }
```

**Copy this:** `Proxy` lazy `getEnv()`, `devLog`, never log values. **Change:** add `SUPABASE_JWT_SECRET: string`; move `SUPABASE_SERVICE_ROLE_KEY` into always-required (alongside JWT secret) for the BFF. `env.example` lines 4–8: add placeholder `SUPABASE_JWT_SECRET=` (no real secret). Never `NEXT_PUBLIC_` prefix those two.

---

### `apps/web/src/lib/validation.ts` (utility, transform)

**Analog:** same file — `leaveRequestSchema` (lines 114–147), `uuidSchema` (line 184), `validateInput` / `formatValidationErrors` (lines 213–239).

```typescript
export function validateInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: z.ZodError } {
  try {
    const validatedData = schema.parse(data)
    return { success: true, data: validatedData }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error }
    }
    throw error
  }
}
```

**Copy this:** discriminated `{ success, data | errors }`; 400 + `formatValidationErrors`. **Change:** BFF JSON uses ISO date strings, not `z.date()` (that schema is for react-hook-form). Add a route-layer schema (coerce strings) or `z.coerce.date()`; do **not** put `user_id` / `company_id` / `approver_id` on the client schema (same as `inviteEmailSchema`).

---

### `apps/web/package.json` (config)

**Analog:** `"test"` script line 12 — append new test files with spaces, same `node --test --experimental-strip-types`. Add `"jose": "4.15.9"` under `dependencies` (pin exact; do not `npm install jose` unpinned).

---

## Shared Patterns

### Authentication (session gate)

**Source:** `apps/web/src/app/api/auth/invites/route.ts` lines 23–28 + `getServerSession` from `next-auth/next`

**Apply to:** every new `/api/leave-*`, `/api/notifications`, `/api/calendar/*`, `/api/manager-team-stats` handler, and `test-connection` if it still returns rows.

```typescript
const session = await getServerSession(authOptions)
if (!session?.user?.id || !session.user.companyId) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

Middleware does **not** protect `/api` (`middleware.ts` matcher lines 24–34). Pass **only** `authOptions` (no `req`/`res`).

### Error handling

**Source:** `apps/web/src/app/api/auth/invites/route.ts` catch blocks; `signup/route.ts` 400/409/500

**Apply to:** all BFF routes

```typescript
} catch (error) {
  devLog.error('Create invite error:', error)
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
}
```

Statuses: 400 validation (`details: formatValidationErrors`), 401 no session, 403 (only if a later check needs it — not owner-only this phase), 409 conflict, 500 unexpected. `error instanceof Error ? error.message : 'Unknown error'` from `test-connection` line 50 for details when needed.

### Validation

**Source:** `apps/web/src/lib/validation.ts` `validateInput` + invites POST

**Apply to:** POST/PATCH BFF bodies

Do not trust `user_id` / `approver_id` / `company_id` in JSON.

### Logging

**Source:** `apps/web/src/lib/env.ts` `devLog` (lines 143–157)

**Apply to:** route catch blocks. Never log JWT secret, service role, or minted tokens.

### Database factory

**Source:** `packages/database/src/index.ts` `createDatabaseService`

**Apply to:** tenant BFF after minting JWT

**Anti-pattern:** `DatabaseServiceFactory.getInstance` (`database-service.ts` lines 20–24) on a per-request JWT client.

### Identity vs tenant clients

| Client | Module | Key | persistSession |
|--------|--------|-----|----------------|
| Browser (maps only after Phase 2) | `lib/supabase.ts` | anon | true (legacy; stop domain calls) |
| Tenant BFF | `lib/tenant-supabase.ts` | anon + user JWT `accessToken` | false |
| Identity | `lib/service-role-supabase.ts` | service_role | false |

Do not invent a fourth client.

### RLS / grants

**Source:** drop names from 009/010/012/013/companies; GRANT EXECUTE from `20250818193733` line 120 and `20250818193734` line 59.

**Apply to:** one new migration. Helper `(select public.current_company_id())`. SECURITY DEFINER RPCs **must** `SET search_path = public`.

### Hook transport

**Source:** TanStack Query in `use-dashboard-data.ts` / `use-leave-request-operations.ts`

**Apply to:** all listed hooks/components

`fetch(url, { credentials: 'include', method, headers: { 'Content-Type': 'application/json' }, body })`. Keep sonner. No UI chrome rewrite.

### Session user fields

**Source:** `apps/web/src/types/next-auth.d.ts` lines 6–21

**Apply to:** mint JWT (`sub` = `id`, `company_id` = `companyId`) and BFF role branching (`role`)

Do not add `owner` to `users.role` CHECK.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `supabase/tests/tenant_rls.test.sql` | test | request-response | No `supabase/tests/*.sql` and no pgTAP fixtures in-repo. Follow official `supabase test db` RLS allow/deny (RESEARCH Validation Architecture). JWT minting uses RESEARCH `jose` snippet; closest file shape is `invite-token.ts`, not a JWT analog. |

Planner should use RESEARCH Pattern 3 SQL + Wave 0 pgTAP in 02-06: anon deny; company A JWT cannot SELECT, INSERT, UPDATE, or DELETE company B leave/users/notifications/audit/balances/calendar/invites/companies.

## Metadata

**Analog search scope:** `apps/web/src/app/api/`, `apps/web/src/lib/`, `apps/web/src/hooks/`, `apps/web/src/components/`, `apps/web/src/providers/`, `packages/database/src/`, `packages/database/migrations/`, `supabase/`
**Files scanned:** ~45 (7 route handlers, 9 unit tests, 19 SQL migrations, hooks, factory, env, validation, calendars)
**Pattern extraction date:** 2026-08-29
