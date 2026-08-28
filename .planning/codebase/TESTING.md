# Testing Patterns

**Analysis Date:** 2026-08-29

## Test Framework

**Runner:**
- Not detected. No `*.test.*`, `*.spec.*`, or `__tests__/` files exist in the repo. No Vitest, Jest, Playwright, Cypress, or Testing Library config files exist.
- Turbo declares a `test` pipeline in `turbo.json` (`dependsOn: ["^build"]`, `outputs: ["coverage/**"]`), but no workspace `package.json` defines a `test` script except the root aggregator.
- Config: Not applicable — no `vitest.config.*`, `jest.config.*`, or `playwright.config.*`.

**Assertion Library:**
- Not detected. When adding tests, use Vitest (`expect`) for unit/integration and Playwright for e2e so they align with the existing Vite-less Next 14 + TypeScript stack. Do not add Jest alongside Vitest.

**Run Commands:**
```bash
npm run test              # turbo run test — currently no workspace implements this
npm run lint              # ESLint via Turbo (apps/web: next lint)
npm run type-check        # tsc --noEmit via Turbo; closest existing correctness gate
```

Root `README.md` documents `npm run test:coverage` and `npm run test:e2e`; those scripts are **not defined** in `package.json`. Do not invoke them until they are added. `apps/web/package.json` has `dev`, `build`, `start`, `lint`, `type-check`, `clean` — no `test`.

**Environment helper:**
- `isTest()` in `apps/web/src/lib/env.ts` returns true when `NODE_ENV === 'test'`. Set `NODE_ENV=test` in the test runner config so `devLog.info` / `devLog.warn` stay quiet like production.

## Test File Organization

**Location:**
- Co-locate unit tests next to source using `*.test.ts` / `*.test.tsx`. There is no existing test tree to extend.

**Naming:**
- `{source}.test.ts` for non-UI: `date-utils.test.ts` beside `apps/web/src/lib/date-utils.ts`.
- `{source}.test.tsx` for React: `leave-request-form.test.tsx`.
- `{module}.test.ts` for database: `packages/database/src/modules/leave-requests/service.test.ts`.
- `e2e/{flow}.spec.ts` if Playwright is added at repo root or `apps/web`.

**Structure:**
```
apps/web/src/lib/date-utils.ts
apps/web/src/lib/date-utils.test.ts
apps/web/src/lib/validation.ts
apps/web/src/lib/validation.test.ts
apps/web/src/hooks/use-leave-request-operations.ts
apps/web/src/hooks/use-leave-request-operations.test.tsx
packages/database/src/modules/leave-requests/repository.ts
packages/database/src/modules/leave-requests/repository.test.ts
packages/database/src/modules/shared/utils.ts
packages/database/src/modules/shared/utils.test.ts
apps/web/src/app/api/auth/signup/route.ts
apps/web/src/app/api/auth/signup/route.test.ts
```

Add `"test": "vitest run"` (and `"test:watch": "vitest"`) to the package under test (`apps/web/package.json` and/or `packages/database/package.json`, `packages/utils/package.json`) so root `npm run test` / Turbo can discover it. Point coverage output at `coverage/` (already in `turbo.json` outputs and `.gitignore`).

## Test Structure

**Suite Organization:**
No test suites exist. Mirror production module names and the repository/service split. Use this shape for new tests:

```typescript
import { describe, it, expect } from 'vitest'
import { calculateTotalDays } from './date-utils'

describe('calculateTotalDays', () => {
  it('includes both start and end dates', () => {
    const start = new Date('2026-08-01T12:00:00')
    const end = new Date('2026-08-03T12:00:00')
    expect(calculateTotalDays(start, end)).toBe(3)
  })
})
```

```typescript
import { describe, it, expect } from 'vitest'
import { validateInput, userSignInSchema } from './validation'

describe('validateInput', () => {
  it('returns success for a valid sign-in payload', () => {
    const result = validateInput(userSignInSchema, {
      email: 'ada@example.com',
      password: 'secret',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.email).toBe('ada@example.com')
    }
  })
})
```

**Patterns:**
- Setup: construct repositories with a fake `DatabaseClient` (`packages/database/src/modules/shared/types.ts` — `{ from, channel }`). Inject services via constructors (`LeaveRequestService` in `packages/database/src/modules/leave-requests/service.ts`).
- Teardown: Not detected. For React Query tests, create a fresh `QueryClient` per test (same pattern as `useState(() => new QueryClient({...}))` in `apps/web/src/providers/session-provider.tsx`) and `queryClient.clear()` after each test.
- Assertion pattern: assert return values and `ServiceError.code` from `DatabaseUtils.handleDatabaseError`. For API routes, assert `NextResponse` status and JSON body (`400` / `409` / `500` as in `apps/web/src/app/api/auth/signup/route.ts`).

## Mocking

**Framework:**
- Not detected. Use Vitest `vi.fn` / `vi.mock` when tests are added. Do not mock with Jest if the runner is Vitest.

**Patterns:**
Production already exposes injection points. Prefer fakes over module mocks:

```typescript
import { DatabaseServiceProvider } from '@/providers/database-provider'
import type { IDatabaseService } from '@timeoff/database'

const fakeService = {
  getLeaveBalance: async () => [],
  getLeaveRequestsByUser: async () => [],
  createLeaveRequest: async (data) => ({ id: 'lr-1', ...data }),
} as unknown as IDatabaseService

// Wrap the component under test
<DatabaseServiceProvider service={fakeService}>
  {children}
</DatabaseServiceProvider>
```

Fake the Supabase builder used by repositories:

```typescript
function createFakeDb(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {}
  const self = () => chain
  for (const method of [
    'from', 'select', 'eq', 'is', 'in', 'gte', 'lte',
    'order', 'insert', 'update', 'limit', 'single',
  ]) {
    chain[method] = self
  }
  Object.assign(chain, result)
  return { from: () => chain }
}
```

Then `new LeaveRequestRepository(createFakeDb({ data: row, error: null }) as any)`.

**What to Mock:**
- `IDatabaseService` / `DatabaseClient` at the UI and repository boundary (`apps/web/src/providers/database-provider.tsx`, `packages/database/src/modules/shared/types.ts`).
- `AuditLogService` and `NotificationService` when unit-testing `LeaveRequestService` so side-effect failures can be simulated (`console.error` paths in `packages/database/src/modules/leave-requests/service.ts`).
- NextAuth `useSession` when rendering pages such as `apps/web/src/app/dashboard/page.tsx`.
- `sonner` `toast` when asserting mutation `onError` / `onSuccess` in `apps/web/src/hooks/use-leave-request-operations.ts`.
- `bcryptjs` and the Supabase client in `apps/web/src/app/api/auth/signup/route.ts` and `apps/web/src/lib/auth.ts`.

**What NOT to Mock:**
- Pure functions: `calculateTotalDays` (`apps/web/src/lib/date-utils.ts`), `cn` / `getLeaveTypeColor` (`apps/web/src/lib/utils.ts`), Zod schemas and `validateInput` / `formatValidationErrors` (`apps/web/src/lib/validation.ts`), `DatabaseUtils.sanitizeData` / `validateRequiredFields` (`packages/database/src/modules/shared/utils.ts`).
- `packages/types` enums and interfaces — they are compile-time contracts.
- shadcn primitives in `apps/web/src/components/ui/` unless a test is specifically covering a primitive.

## Fixtures and Factories

**Test Data:**
No fixture directory exists. The closest in-repo sample users are hardcoded in `apps/web/src/components/dashboard/team-calendar-view.tsx` (John/Jane/Bob). Do not import those UI mocks. Build factories that match snake_case domain types:

```typescript
import { LeaveType, RequestStatus, UserRole, type User, type LeaveRequest } from '@timeoff/types'

export function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'ada@example.com',
    first_name: 'Ada',
    last_name: 'Lovelace',
    department: 'Engineering',
    team: 'Platform',
    role: UserRole.EMPLOYEE,
    hire_date: new Date('2024-01-15'),
    is_active: true,
    created_at: new Date('2024-01-15'),
    updated_at: new Date('2024-01-15'),
    ...overrides,
  }
}

export function makeLeaveRequest(overrides: Partial<LeaveRequest> = {}): LeaveRequest {
  return {
    id: 'lr-1',
    user_id: 'user-1',
    leave_type: LeaveType.VACATION,
    start_date: '2026-09-01',
    end_date: '2026-09-05',
    total_days: 5,
    status: RequestStatus.PENDING,
    created_at: new Date('2026-08-01'),
    updated_at: new Date('2026-08-01'),
    ...overrides,
  }
}
```

Use `CreateLeaveRequestData` from `packages/database/src/modules/leave-requests/types.ts` for repository create tests. Use `LeaveRequestInput` from `apps/web/src/lib/validation.ts` for form tests.

For signup API tests, payloads must satisfy `userRegistrationSchema` (password min 12, upper, lower, number, special; `acceptTerms: true`) in `apps/web/src/lib/validation.ts`.

**Location:**
- Put shared factories in `packages/types/src/test-factories.ts` or `apps/web/src/test/factories.ts` once tests exist. Until then, keep factories in the test file that needs them.
- Do not store secrets in fixtures. `.env*` files are present for local config — never read them in tests; stub `env` via `process.env` and `isTest()`.

## Coverage

**Requirements:**
- None enforced. No coverage thresholds, no CI workflow under `.github/`, no Codecov/Nyc config.
- `.gitignore` ignores `coverage/` and `.nyc_output/`. `turbo.json` `test.outputs` is `coverage/**`.
- `apps/web/next.config.js` sets `typescript.ignoreBuildErrors: true` and `eslint.ignoreDuringBuilds: true`, so production build is not a substitute for tests.

**View Coverage:**
```bash
# After adding Vitest to a workspace:
npx vitest run --coverage
```

Until a runner exists, treat `npm run type-check` as the only automated correctness check.

## Test Types

**Unit Tests:**
- Not present. Highest-value first targets:
  - `calculateTotalDays` in `apps/web/src/lib/date-utils.ts` (inclusive range, `startOfDay` so time-of-day does not change the count).
  - `calculateWorkingDays` / `validateLeaveRequest` in `packages/utils/src/index.ts` (note: that package uses camelCase form fields `startDate`, unlike web Zod `start_date`).
  - `validateInput`, `formatValidationErrors`, `leaveRequestSchema`, `userRegistrationSchema` in `apps/web/src/lib/validation.ts`.
  - `DatabaseUtils.handleDatabaseError`, `validateRequiredFields`, `sanitizeData`, `createPaginationResult` in `packages/database/src/modules/shared/utils.ts`.
  - `adaptLeaveRequest` / `adaptLeaveBalance` in `apps/web/src/lib/type-adapters.ts`.
  - `canApproveRequest` / `canViewRequest` in `packages/utils/src/index.ts` (currently supervisor branches return `true` as placeholders — lock current behavior with tests before changing).

**Integration Tests:**
- Not present. When added, drive `LeaveRequestService` with a fake repository plus real audit/notification orchestration, asserting that audit failure does not reject `createLeaveRequest` (`packages/database/src/modules/leave-requests/service.ts`).
- Exercise `POST` in `apps/web/src/app/api/auth/signup/route.ts`: invalid body → 400; duplicate email → 409; insert error → 500; success strips `password` from the JSON body.
- Do not hit live Supabase in default unit/integration runs. `apps/web/src/app/api/test-connection/route.ts` is a manual connectivity probe, not an automated test.

**E2E Tests:**
- Not used. README lists `npm run test:e2e` but the script is missing. If added, cover: sign-in (`apps/web/src/app/auth/signin/page.tsx`), submit leave request (`LeaveRequestForm`), approve/reject dialogs (`enhanced-approve-dialog.tsx`, `enhanced-reject-dialog.tsx`). Authenticate via a test user seeded in local Supabase, not Google OAuth.

## Common Patterns

**Async Testing:**
Production async is Promises (no generators). Tests should `await` service/repository methods and React Query `mutateAsync`:

```typescript
it('creates a leave request and continues if audit logging fails', async () => {
  const auditLogService = {
    createAuditLog: async () => {
      throw new Error('audit down')
    },
  }
  // LeaveRequestService still returns the created row
  const result = await service.createLeaveRequest(createData)
  expect(result.id).toBeDefined()
})
```

Match React Query keys when asserting invalidation: `['recentRequests', userId]`, `['leaveBalance', userId]`, `['personalLeaveRequests', userId]`, `['teamLeaveRequests']`, `['allLeaveRequests']` (`apps/web/src/hooks/use-leave-request-operations.ts`).

**Error Testing:**
```typescript
import { DatabaseUtils } from './utils'

it('maps PGRST116 to NOT_FOUND', () => {
  expect(() =>
    DatabaseUtils.handleDatabaseError({ code: 'PGRST116', message: 'no rows' }, 'findUserById')
  ).toThrow('Record not found')
})

it('rejects missing required fields', () => {
  expect(() =>
    DatabaseUtils.validateRequiredFields({ user_id: '' }, ['user_id', 'leave_type'])
  ).toThrow(/Missing required fields/)
})
```

```typescript
it('returns 400 when registration validation fails', async () => {
  const request = new Request('http://localhost/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email: 'not-an-email' }),
  })
  const response = await POST(request as never)
  expect(response.status).toBe(400)
  const body = await response.json()
  expect(body.error).toBe('Validation failed')
})
```

For `useDatabaseService`, expect a throw when rendered outside `DatabaseServiceProvider`:

```typescript
expect(() => renderHook(() => useDatabaseService())).toThrow(
  /useDatabaseService must be used within a DatabaseServiceProvider/
)
```

Query client defaults to copy in tests that need network-like behavior: `retry: 1`, `staleTime: 60_000`, `refetchOnWindowFocus: false` (`apps/web/src/providers/session-provider.tsx`). For unit tests, set `retry: false` to fail fast.

## CI / Local Gates

- No `.github/workflows` CI. Tests will not run in CI until a workflow is added that calls `npm run test` after workspace scripts exist.
- Existing quality commands: `npm run lint`, `npm run type-check`, `npm run format`.
- `coverage/` is gitignored; do not commit coverage output.

---

*Testing analysis: 2026-08-29*
