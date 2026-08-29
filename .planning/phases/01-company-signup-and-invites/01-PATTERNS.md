# Phase 1: Company Signup and Invites - Pattern Map

**Mapped:** 2026-08-29
**Files analyzed:** 36
**Analogs found:** 31 / 36

Identity onboarding stays on Next.js Route Handlers + `apps/web/src/lib/supabase.ts` (same split as signup/auth). Do **not** add invite/company writes to the browser `IDatabaseService` facade. New database modules follow the four-file shape for server/future use only.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `packages/database/migrations/{ts}_add_companies_and_invites.sql` | migration | CRUD | `packages/database/migrations/001_initial_schema.sql` | role-match |
| `packages/database/src/modules/companies/types.ts` | model | CRUD | `packages/database/src/modules/departments/types.ts` | exact |
| `packages/database/src/modules/companies/repository.ts` | service | CRUD | `packages/database/src/modules/departments/repository.ts` | exact |
| `packages/database/src/modules/companies/service.ts` | service | CRUD | `packages/database/src/modules/departments/service.ts` | exact |
| `packages/database/src/modules/companies/index.ts` | config | transform | `packages/database/src/modules/departments/index.ts` | exact |
| `packages/database/src/modules/company-invites/types.ts` | model | CRUD | `packages/database/src/modules/notifications/types.ts` | role-match |
| `packages/database/src/modules/company-invites/repository.ts` | service | CRUD | `packages/database/src/modules/users/repository.ts` | role-match |
| `packages/database/src/modules/company-invites/service.ts` | service | CRUD | `packages/database/src/modules/departments/service.ts` | role-match |
| `packages/database/src/modules/company-invites/index.ts` | config | transform | `packages/database/src/modules/departments/index.ts` | exact |
| `packages/database/src/modules/index.ts` | config | transform | self (re-export barrel) | exact |
| `packages/database/src/modules/users/types.ts` | model | CRUD | self (`company_id` field add) | exact |
| `packages/database/src/modules/database-service.ts` | service | CRUD | self (factory wiring) | exact |
| `packages/database/seed.sql` | config | CRUD | self (INSERT + owner backfill) | exact |
| `packages/types/src/index.ts` | model | transform | self (`User` + `UserRole`) | exact |
| `apps/web/src/lib/invite-token.ts` | utility | transform | `apps/web/src/lib/date-utils.ts` | partial |
| `apps/web/src/lib/pending-auth-cookie.ts` | utility | request-response | none (no `cookies()` usage in repo) | none |
| `apps/web/src/lib/google-signin-gate.ts` | utility | transform | `apps/web/src/lib/date-utils.ts` | partial |
| `apps/web/src/lib/company-owner.ts` | utility | transform | `apps/web/src/lib/date-utils.ts` | partial |
| `apps/web/src/app/api/auth/signup/route.ts` | route | request-response | self | exact |
| `apps/web/src/app/api/auth/invites/route.ts` | route | request-response | `apps/web/src/app/api/auth/signup/route.ts` | exact |
| `apps/web/src/app/api/auth/invites/accept/route.ts` | route | request-response | `apps/web/src/app/api/auth/signup/route.ts` | exact |
| `apps/web/src/app/api/auth/invites/preview/route.ts` | route | request-response | `apps/web/src/app/api/test-connection/route.ts` | role-match |
| `apps/web/src/app/api/auth/pending-context/route.ts` | route | request-response | `apps/web/src/app/api/auth/signup/route.ts` | role-match |
| `apps/web/src/app/auth/accept-invite/page.tsx` | component | request-response | `apps/web/src/app/auth/signup/page.tsx` | exact |
| `apps/web/src/components/invite-teammates-dialog.tsx` | component | request-response | `apps/web/src/components/leave-request/enhanced-approve-dialog.tsx` | role-match |
| `apps/web/src/lib/auth.ts` | config | request-response | self (`signIn` / `session` / `jwt`) | exact |
| `apps/web/src/types/next-auth.d.ts` | config | transform | self | exact |
| `apps/web/src/lib/validation.ts` | utility | transform | self (`userRegistrationSchema`) | exact |
| `apps/web/src/lib/supabase.ts` | utility | transform | self (`mapUserFromDatabase`) | exact |
| `apps/web/src/app/auth/signup/page.tsx` | component | request-response | self | exact |
| `apps/web/src/app/auth/signin/page.tsx` | component | request-response | self | exact |
| `apps/web/src/app/auth/error/page.tsx` | component | request-response | self (`getErrorDetails`) | exact |
| `apps/web/src/components/navigation.tsx` | component | request-response | self (avatar `DropdownMenu`) | exact |
| `apps/web/src/lib/invite-token.test.ts` | test | transform | none (no `*.test.*` in repo) | none |
| `apps/web/src/lib/google-signin-gate.test.ts` | test | transform | none | none |
| `apps/web/src/lib/company-owner.test.ts` | test | transform | none | none |
| `apps/web/package.json` | config | transform | self (`scripts`) | exact |

## Pattern Assignments

### Database module quartet (`companies/` and `company-invites/`)

**Analog:** `packages/database/src/modules/departments/{types,repository,service,index}.ts` (shape); `users/repository.ts` for email lookup; `notifications/types.ts` for FK + status-like fields.

**Imports + types** (`departments/types.ts` lines 1-15):

```typescript
import { BaseEntity } from '../shared/types';

export interface Department extends BaseEntity {
  name: string;
  description?: string;
  manager_id?: string;
  is_active: boolean;
}

export interface CreateDepartmentData {
  name: string;
  description?: string;
  manager_id?: string;
  is_active?: boolean;
}
```

Copy: extend `BaseEntity`; suffix DTOs `Create{Entity}Data` / `Update{Entity}Data` / `{Entity}Filters`. Snake_case columns. For companies add `owner_id?: string`. For invites add `company_id`, `email`, `token_hash`, `expires_at`, `status`, `accepted_at?` (CHECK `'pending' | 'accepted' | 'expired'`).

**Repository CRUD** (`departments/repository.ts` lines 5-57):

```typescript
export class DepartmentRepository {
  constructor(private db: DatabaseClient) {}

  async findById(id: string): Promise<Department> {
    try {
      const { data, error } = await this.db
        .from('departments')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      throw DatabaseUtils.handleDatabaseError(error, 'findDepartmentById');
    }
  }

  async create(departmentData: CreateDepartmentData): Promise<Department> {
    try {
      DatabaseUtils.validateRequiredFields(departmentData, ['name']);
      const sanitizedData = DatabaseUtils.sanitizeData(departmentData);
      const { data, error } = await this.db
        .from('departments')
        .insert(sanitizedData)
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      throw DatabaseUtils.handleDatabaseError(error, 'createDepartment');
    }
  }
}
```

Copy: constructor injects `DatabaseClient`; every method `try/catch` → `DatabaseUtils.handleDatabaseError(error, 'verbEntity')`; lists return `data || []`.

**Email lookup analog** (`users/repository.ts` lines 23-36):

```typescript
  async findByEmail(email: string): Promise<User> {
    try {
      const { data, error } = await this.db
        .from('users')
        .select('*')
        .eq('email', email)
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      throw DatabaseUtils.handleDatabaseError(error, 'findUserByEmail');
    }
  }
```

Invite repository: `findByTokenHash(tokenHash: string)` with `.eq('token_hash', tokenHash).single()`; `findPendingByCompanyId(companyId)` with `.eq('company_id', companyId).eq('status', 'pending')`.

**Service domain verbs** (`departments/service.ts` lines 5-21):

```typescript
export class DepartmentService {
  constructor(
    private departmentRepository: DepartmentRepository,
    private auditLogService: AuditLogService
  ) {}

  async getAllDepartments(filters?: DepartmentFilters): Promise<Department[]> {
    return this.departmentRepository.findAll(filters);
  }

  async createDepartment(departmentData: CreateDepartmentData, createdBy?: string): Promise<Department> {
    const department = await this.departmentRepository.create(departmentData);
    // audit log if createdBy — optional for Phase 1 invites
    return department;
  }
}
```

Copy: class `{Entity}Service`; methods `get`/`create`/`update` + entity name. Audit logs are existing convention — **optional** for Phase 1 invite create (identity APIs talk to supabase directly; modules are server/future).

**Barrel** (`departments/index.ts` lines 1-4):

```typescript
// Departments module exports
export * from './types';
export * from './repository';
export * from './service';
```

**Factory wiring** (`database-service.ts` lines 32-70) — only if modules are instantiated; do **not** expose on `IDatabaseService`:

```typescript
    const departmentRepository = new DepartmentRepository(this.db);
    const departmentService = new DepartmentService(departmentRepository, auditLogService);
    this.services.set('department', departmentService);
```

**Modules barrel** (`modules/index.ts` lines 1-11): add `export * from './companies';` and `export * from './company-invites';` after existing entity exports.

---

### `packages/database/migrations/{ts}_add_companies_and_invites.sql` (migration, CRUD)

**Analog:** `001_initial_schema.sql` (CREATE TABLE + CHECK + trigger + RLS enable); `009_fix_rls_for_nextauth.sql` (`USING (true)`); `013_add_notifications_insert_policy.sql` (INSERT policy); `scripts/create-migration.js` for filename.

**Do not** name this `014_*.sql`. Run `node scripts/create-migration.js add_companies_and_invites` — script takes `Math.max` of `^(\d+)_` including timestamps, then `+ 1` (`create-migration.js` lines 21-36). Current max filename is `20250818193732_…`, so next is `20250818193733_add_companies_and_invites.sql` (or a `20260829…` stamp after all existing files).

**CREATE TABLE** (`001_initial_schema.sql` lines 5-19):

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'employee' CHECK (role IN ('employee', 'supervisor', 'admin', 'hr')),
    manager_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

Copy: `uuid_generate_v4()`, `TIMESTAMP WITH TIME ZONE DEFAULT NOW()`, CHECK constraints for enums. New tables: `companies (id, name, owner_id UUID REFERENCES users(id), created_at, updated_at)` and `company_invites (id, company_id REFERENCES companies(id), email, token_hash UNIQUE, expires_at, status CHECK (...), accepted_at, created_at, updated_at)`. Then `ALTER TABLE users ADD COLUMN company_id UUID REFERENCES companies(id) NOT NULL` after backfill.

**RPC analog** (`001_initial_schema.sql` lines 163-172) — only plpgsql function in repo; copy language/trigger style, **not** the updated_at body:

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

Add triggers on `companies` and `company_invites`. New function `create_company_with_owner(...)` must INSERT company (`owner_id` null) → INSERT user (`company_id`, `role='admin'`) → UPDATE `companies.owner_id`. Call from signup via `supabase.rpc` (no in-app RPC analog; scripts use `supabase.rpc('exec_sql', …)` only).

**Phase 1 RLS** (`009_fix_rls_for_nextauth.sql` lines 15-21):

```sql
CREATE POLICY "Users can create own requests" ON leave_requests
FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view own requests" ON leave_requests
FOR SELECT USING (true);
```

Copy `USING (true)` / `WITH CHECK (true)` for SELECT/INSERT/UPDATE on `companies` and `company_invites`. Enable RLS like `001` lines 198-206. Do **not** restore `auth.uid()` policies (Phase 2).

---

### `packages/database/seed.sql` (config, CRUD)

**Analog:** self, lines 20-26.

```sql
INSERT INTO users (id, email, first_name, last_name, department, team, role, hire_date, is_active) VALUES
  ('770e8400-e29b-41d4-a716-446655440005', 'admin@company.com', 'Admin', 'User', 'Engineering', 'Unassigned', 'admin', '2023-01-01', true);
```

Insert a seed company **before** users (or insert users then UPDATE `company_id`). Set `companies.owner_id` to `770e8400-e29b-41d4-a716-446655440005` (`admin@company.com`). All five seed users share that `company_id` so `NOT NULL` holds.

---

### `apps/web/src/app/api/auth/signup/route.ts` and invite/accept Route Handlers (route, request-response)

**Analog:** `apps/web/src/app/api/auth/signup/route.ts` (entire file, 96 lines). Preview GET also copy `test-connection/route.ts` GET + JSON.

**Imports** (lines 1-5):

```typescript
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabase, mapUserToDatabase, mapUserFromDatabase, testSupabaseConnection } from '@/lib/supabase'
import { devLog } from '@/lib/env'
import { userRegistrationSchema, validateInput, formatValidationErrors } from '@/lib/validation'
```

Invite routes add `getServerSession` from `next-auth/next` and `{ authOptions } from '@/lib/auth'`. There is **no** existing `getServerSession` call in the repo — copy RESEARCH Pattern 2, not a local analog.

**Validation + 400/409/201/500** (lines 7-40, 81-95):

```typescript
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validationResult = validateInput(userRegistrationSchema, body)
    if (!validationResult.success) {
      const errors = formatValidationErrors(validationResult.errors)
      return NextResponse.json(
        { error: 'Validation failed', details: errors, message: 'Please check your input and try again' },
        { status: 400 }
      )
    }
    // ...
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      )
    }
    return NextResponse.json({ message: 'User created successfully', user: userWithoutPassword }, { status: 201 })
  } catch (error) {
    devLog.error('Signup error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

Copy: named `POST`/`GET`; wrap whole handler in try/catch; Zod via `validateInput`; 409 for duplicate email (keep exact message `'User with this email already exists'` — map UI-SPEC copy on the **client**); strip password with `const { password: _, ...userWithoutPassword }`; bcrypt 12 rounds (lines 44-45).

**Signup change:** after hash, call `supabase.rpc('create_company_with_owner', { … })` instead of unscoped `users.insert` with `role: 'employee'` / `'Unassigned'` (lines 47-65). First-user role `'admin'`. Owner user still mapped through `mapUserToDatabase`.

**Invite POST owner check (no local analog):** `getServerSession(authOptions)` → 401 if missing → load `companies` by `session.user.id` vs `owner_id` → 403 with UI-SPEC copy `'Only the company owner can invite teammates.'`. Do not gate on `role === 'admin'` alone.

**Password hash reuse on accept** (signup lines 44-45):

```typescript
    const saltRounds = 12
    const hashedPassword = await bcrypt.hash(password, saltRounds)
```

**GET list analog** (`test-connection/route.ts` lines 4-20): `export async function GET()` + `try/catch` + `NextResponse.json`. Invites GET: session + owner company_id filter only.

---

### `apps/web/src/lib/auth.ts` (config, request-response)

**Analog:** self. Rewrite Google `signIn` (lines 72-112); extend `session`/`jwt` with `companyId` / `isOwner`.

**Google auto-provision to delete** (lines 82-106) — invert this branch:

```typescript
          if (!existingUser) {
            const userData = mapUserToDatabase({
              email: user.email || 'unknown@example.com',
              firstName: user.name?.split(' ')[0] || '',
              lastName: user.name?.split(' ').slice(1).join(' ') || '',
              department: 'Unassigned',
              team: 'Unassigned',
              role: 'employee',
              hireDate: new Date(),
              isActive: true,
            })
            const { data: newUser, error } = await supabase.from('users').insert(userData).select().single()
            if (error) {
              devLog.error('Error creating user:', error)
              return false
            }
          }
```

Replace with: existing user → `return true`; pending company cookie → RPC create owner; pending invite cookie → bind `company_id` from invite if Google email matches; else `return '/auth/error?error=InviteRequired'`. Do **not** `return false` (becomes AccessDenied).

**Session enrichment** (lines 114-143) — add `companyId` and `isOwner` next to existing mapped fields:

```typescript
            session.user = {
              ...session.user,
              id: mappedUser.id,
              first_name: mappedUser.firstName,
              last_name: mappedUser.lastName,
              department: mappedUser.department,
              team: mappedUser.team,
              role: mappedUser.role,
              managerId: mappedUser.managerId,
              hireDate: mappedUser.hireDate,
              isActive: mappedUser.isActive,
            } as any
```

Lookup `companies.owner_id === mappedUser.id` for `isOwner`. Same fields on `jwt` when `user` is present (lines 145-157).

**Credentials authorize** (lines 24-67): keep bcrypt compare; after mapping, include `companyId` on the returned user object.

**Cookies in callbacks:** Next 14 — `cookies()` is **synchronous**. No `await cookies()`. No in-repo analog; see RESEARCH Pattern 1 + pitfall 6.

**NextAuth handler unchanged** (`[...nextauth]/route.ts` lines 1-7):

```typescript
import { authOptions } from '@/lib/auth'
import NextAuth from 'next-auth'
const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
```

---

### `apps/web/src/types/next-auth.d.ts` (config, transform)

**Analog:** self, lines 4-46. Add `companyId: string` and `isOwner: boolean` on `Session.user`, `User`, and `JWT`. Keep mixed `first_name` + `managerId` naming.

```typescript
      first_name: string
      last_name: string
      department: string
      team: string
      role: UserRole
      managerId?: string
      hireDate: Date
      isActive: boolean
```

---

### `apps/web/src/lib/validation.ts` (utility, transform)

**Analog:** self. Extend `userRegistrationSchema`; add invite email schema; reuse `emailSchema` / `validateInput`.

**Shared email** (lines 18-21):

```typescript
const emailSchema = z.string()
  .email('Please enter a valid email address')
  .max(255, 'Email address is too long')
  .transform(email => email.toLowerCase().trim())
```

**Registration object** (lines 50-66) — add `companyName: z.string().min(1, 'Company name is required').max(80)`:

```typescript
export const userRegistrationSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
  acceptTerms: z.boolean().refine(val => val === true, {
    message: 'You must accept the terms and conditions'
  }),
  acceptMarketing: z.boolean().optional().default(false)
})
```

Invite: `z.object({ email: emailSchema })`. Accept: reuse `nameSchema` + `passwordSchema` + `confirmPassword` + `token: z.string().min(1)`. Export `z.infer` types with `Input` suffix (lines 160-166). Keep Zod 3; do not upgrade.

**validateInput** (lines 171-184) — all POST handlers use this discriminated union, not ad-hoc checks.

---

### `apps/web/src/lib/supabase.ts` (utility, transform)

**Analog:** self, `User` + mappers (lines 35-100). Add `companyId?: string` on `User`; map `company_id` ↔ `companyId` in `mapUserFromDatabase` / `mapUserToDatabase` the same way as `manager_id` / `managerId` (lines 75, 99).

Identity writes stay on this client. Do not route invite inserts through `useDatabaseService()`.

---

### `apps/web/src/lib/invite-token.ts`, `google-signin-gate.ts`, `company-owner.ts` (utility, transform)

**Analog:** `apps/web/src/lib/date-utils.ts` lines 1-16 (small named exports + JSDoc). Crypto body has **no** in-repo analog — copy RESEARCH Pattern 3.

```typescript
import { differenceInDays, startOfDay } from 'date-fns'

/**
 * Calculate the total number of days between two dates (inclusive)
 */
export function calculateTotalDays(startDate: Date, endDate: Date): number {
  const start = startOfDay(new Date(startDate))
  const end = startOfDay(new Date(endDate))
  return differenceInDays(end, start) + 1
}
```

Copy: kebab-case filename; named exports; camelCase functions; file-level JSDoc. `invite-token.ts`: `generateInviteToken`, `hashInviteToken`, `inviteTokenMatches` using `node:crypto` (`randomBytes`, `createHash('sha256')`, `timingSafeEqual`). `google-signin-gate.ts`: pure function returning `true` | `'/auth/error?error=InviteRequired'` given `{ existingUser, pendingCompany, pendingInvite }`. `company-owner.ts`: pure `isCompanyOwner(userId, ownerId)`.

---

### `apps/web/src/app/auth/signup/page.tsx` and `accept-invite/page.tsx` (component, request-response)

**Analog:** signup page (clone chrome for accept-invite). Fix body keys when adding `companyName`.

**Imports + client form state** (lines 1-52): `'use client'`; `signIn` from `next-auth/react`; shadcn from `@/components/ui/*`; `toast` from `react-hot-toast` on signup/accept-invite (UI-SPEC: keep hot-toast on auth pages). Manual `useState` — do **not** switch this page to react-hook-form.

**POST body mismatch to fix** (lines 124-136) — schema expects camelCase + `confirmPassword`:

```typescript
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: formData.first_name,  // BUG: schema wants firstName
          last_name: formData.last_name,
          email: formData.email,
          password: formData.password,
          // missing confirmPassword
          acceptTerms: formData.acceptTerms,
          acceptMarketing: formData.acceptMarketing,
        }),
      })
```

Align to `firstName` / `lastName` / `confirmPassword` / `companyName`. On `response.status === 409`, show UI-SPEC copy `'An account with this email already exists. Sign in, or ask your admin for an invite.'` instead of raw API error.

**Success path** (lines 145-146): keep `router.push('/auth/signin')`; toast → `'Company created. Sign in with your new credentials.'`

**Google** (lines 155-163): before `signIn('google', { callbackUrl: '/dashboard' })`, POST `/api/auth/pending-context` with company name. Disable Google until company name non-empty.

**Layout chrome** (lines 189-248): `min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50`, `max-w-md`, `Card className="backdrop-blur-lg bg-white/80 border-white/20 shadow-2xl"`, 48×48 TO mark, `CardTitle text-2xl font-bold text-center`, Google outline `h-12`, Separator “Or continue with”. Signup CTA must match sign-in’s `from-primary` (UI-SPEC) — signup currently uses `from-blue-500 to-sky-500` (line 196); Phase 1 signup/accept use primary.

**Field errors** (lines 265-272):

```tsx
                      className={`pl-10 h-12 ${errors.first_name ? 'border-red-500 focus:border-red-500' : ''}`}
                      disabled={isLoading}
                    />
                    {errors.first_name && (
                      <div className="flex items-center mt-1 text-sm text-red-600">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        {errors.first_name}
                      </div>
                    )}
```

Company name: `Building2` icon, `h-12`, **above** Google (UI-SPEC). Accept-invite: clone this card; no company-name field; heading `Join {company name}`; first field First name; password toggle `aria-label` “Show password” / “Hide password”.

**Loading:** `Loader2` + `'Creating company...'` / `'Joining...'`; `disabled={isLoading}` on inputs and Google. Do not blank the Card.

---

### `apps/web/src/app/auth/signin/page.tsx` (component, request-response)

**Analog:** self.

**Credentials** (lines 94-108): `signIn('credentials', { email, password, redirect: false })`; sonner toast on error/success; `router.push('/dashboard')`. Keep UI-SPEC credentials error copy (already matches).

**Google** (lines 119-127): `signIn('google', { callbackUrl: '/dashboard' })` — do **not** set pending company cookie. Unknown Google is handled in `auth.ts` `signIn` callback.

**Footer** (lines 323-334) — uncomment and change copy:

```tsx
            {/* <div className="text-center">
              <p className="text-sm text-gray-600">
                Don't have an account?{' '}
                <Button variant="link" ... onClick={() => router.push('/auth/signup')}>
                  Sign up
                </Button>
              </p>
            </div> */}
```

UI-SPEC: `'Don’t have a company yet? Create a company'`. Primary CTA stays `h-12` `from-primary` (lines 307-319).

---

### `apps/web/src/app/auth/error/page.tsx` (component, request-response)

**Analog:** self. Add `InviteRequired` branch; keep Suspense spinner.

**getErrorDetails switch** (lines 15-96) — add case before `default`:

```typescript
      case 'AccessDenied':
        return {
          title: 'Access Denied',
          description: 'You do not have permission to sign in.',
          action: 'Contact support'
        }
```

InviteRequired: title `'Invite required'`; description UI-SPEC Google-pool copy; primary action `'Create a company'` → `router.push('/auth/signup')`; keep outline `'Back to sign in'`. Reuse red `AlertCircle` 48×48 well (lines 121-124). Do not invent new chrome.

**Suspense fallback** (lines 175-186): centered `h-8 w-8` spinner — accept-invite token-resolve loading copies this.

---

### `apps/web/src/components/invite-teammates-dialog.tsx` (component, request-response)

**Analog:** `enhanced-approve-dialog.tsx` for Dialog chrome; `use-leave-request-operations.ts` for sonner; signup `fetch` POST for API calls (do not use `useDatabaseService`).

**Dialog shell** (`enhanced-approve-dialog.tsx` lines 1-63):

```tsx
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {trigger || defaultTrigger}
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Approve Leave Request</DialogTitle>
                    <DialogDescription>...</DialogDescription>
                </DialogHeader>
```

Copy: `'use client'`; controlled `open`/`onOpenChange`; shadcn from `@/components/ui/dialog` (prefer `@/` alias, not relative `../ui`). Invite dialog: email `Input` `h-12`, primary `'Send invite'` with `Loader2`, pending list below, empty `'No teammates yet'`. After 201: sonner `'Invite created for {email}.'` + read-only URL `Input` + outline `'Copy invite link'`. Stay open for next email. 409 → `'That email is already in this company.'`

**Sonner on signed-in mutations** (`use-leave-request-operations.ts` lines 5, 46-48, 73):

```typescript
import { toast } from 'sonner'
      toast.error('Failed to delete leave request')
      toast.success('Leave request approved successfully')
```

Do **not** use `react-hot-toast` in this dialog.

**Fetch pattern:** copy signup `fetch('/api/auth/invites', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) })`. GET list on open.

---

### `apps/web/src/components/navigation.tsx` (component, request-response)

**Analog:** self, lines 95-107.

```tsx
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut({ callbackUrl: '/auth/signin' })}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
```

Insert `Invite teammates` between Settings and the separator. Hide when `!session.user.isOwner`. `onClick` opens dialog (do not implement Settings). Icon: `Mail` from lucide. Session already via `useSession()` (lines 5, 20).

---

### `packages/types/src/index.ts` and `users/types.ts` (model, transform)

**Analog:** `packages/types/src/index.ts` lines 2-23; `packages/database/src/modules/users/types.ts` lines 3-14.

```typescript
export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  department: string;
  team: string;
  role: UserRole;
  manager_id?: string;
  hire_date: Date;
  is_active: boolean;
}

export enum UserRole {
  EMPLOYEE = 'employee',
  SUPERVISOR = 'supervisor',
  ADMIN = 'admin',
  HR = 'hr'
}
```

Add `company_id: string` to both `User` interfaces and `CreateUserData`. Do **not** add `owner` to `UserRole` / users.role CHECK.

---

### `apps/web/package.json` (config, transform)

**Analog:** self `scripts` (lines 6-12). No `test` script today. Add:

```json
"test": "node --test --experimental-strip-types src/lib/invite-token.test.ts src/lib/google-signin-gate.test.ts src/lib/company-owner.test.ts"
```

Do not add vitest/tsx. Node 18 fallback: compile with `tsc` then `node --test` (RESEARCH Validation Architecture).

---

## Shared Patterns

### Authentication (NextAuth JWT, not Supabase Auth)

**Source:** `apps/web/src/lib/auth.ts` lines 9-169; `middleware.ts` lines 24-35
**Apply to:** invite Route Handlers, Google `signIn`, session fields

- Session strategy `'jwt'`, `maxAge: 30 * 24 * 60 * 60`.
- Middleware matcher **excludes** `api` — invite APIs **must** call `getServerSession(authOptions)` themselves.
- `/auth/*` is public (`authorized` returns true for `/auth`). New `/auth/accept-invite` needs no matcher change.
- Identity DB: `supabase` from `@/lib/supabase`, not `UserService`.

```typescript
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|auth).*)',
  ],
}
```

### Error handling (API)

**Source:** `apps/web/src/app/api/auth/signup/route.ts` lines 14-23, 36-40, 89-94; `packages/database/src/modules/shared/utils.ts` lines 54-73
**Apply to:** all new Route Handlers and repositories

- Routes: 400 validation (`formatValidationErrors`), 409 conflict, 401/403 owner copy, 500 `Internal server error` + `devLog.error`.
- Repositories: `DatabaseUtils.handleDatabaseError` maps `PGRST116` → `NOT_FOUND`, `23505` → `DUPLICATE_ENTRY`, `23503` → `FOREIGN_KEY_VIOLATION`.

### Validation (Zod 3)

**Source:** `apps/web/src/lib/validation.ts` lines 6-21, 171-197
**Apply to:** signup, invite create, invite accept POST bodies

- Central schemas in `validation.ts`; `validateInput` + `formatValidationErrors`.
- Email: lowercase + trim + max 255.
- Password: `PASSWORD_REQUIREMENTS.minLength` is **12** (API source of truth). Do not restyle signup requirement widget strings (still shows 8).

### Logging

**Source:** `apps/web/src/lib/env.ts` (`devLog`); signup route lines 67, 70, 90
**Apply to:** `apps/web` auth/API only

- `devLog.info` / `devLog.error` in web. Database package uses `console.error`. Never log raw invite tokens or passwords.

### UI chrome (auth)

**Source:** signup/signin/error pages
**Apply to:** signup edits, accept-invite, InviteRequired

- Gradient wash, glass Card, TO mark, `h-12` fields/CTAs, `Loader2` in-button, `AlertCircle` + `text-sm text-red-600` field errors.
- Auth pages: `react-hot-toast`. Signed-in invite dialog: `sonner`.
- Import primitives from `@/components/ui/*`. No new shadcn adds.

### Naming

- Files kebab-case: `invite-teammates-dialog.tsx`, `accept-invite/page.tsx`, `pending-auth-cookie.ts`.
- API handlers `GET`/`POST`. Pages `export default function …Page()`.
- Components `export function InviteTeammatesDialog`.
- Handlers `handleSubmit` / `handleGoogleSignIn`.
- DB columns snake_case; web mapped user camelCase at supabase boundary.

### Anti-patterns (do not copy)

- Google insert of unknown users as `'employee'` + `'Unassigned'` (`auth.ts` 82-106).
- Signup POST `first_name`/`last_name` without `confirmPassword` (page 129-136).
- `return false` from `signIn` for InviteRequired.
- Invite methods on `IDatabaseService` / browser anon client.
- `'owner'` on `users.role` CHECK.
- `await cookies()` (Next 15).
- Migration named `014_`.
- RLS `USING (company_id = …)` this phase.
- Building `/(admin)/users` or dashboard teammate table.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `apps/web/src/lib/pending-auth-cookie.ts` | utility | request-response | No `cookies()` / `Set-Cookie` usage in app source. Use Next 14 sync `cookies().set` on the pending-context route; httpOnly, ~10 min `maxAge`; names `timeoff_pending_kind` + `timeoff_pending_value` (RESEARCH A3). |
| `apps/web/src/lib/invite-token.test.ts` | test | transform | Zero `*.test.*` / Jest / Vitest in repo. Wave 0: `node:test` + `node:assert/strict`. |
| `apps/web/src/lib/google-signin-gate.test.ts` | test | transform | Same — no test runner analog. |
| `apps/web/src/lib/company-owner.test.ts` | test | transform | Same. |
| `create_company_with_owner` RPC | migration | CRUD | Only plpgsql analog is `update_updated_at_column()`. Copy `language plpgsql` + `CREATE OR REPLACE FUNCTION`; transactional body is new. |

`invite-token.ts` / `google-signin-gate.ts` have a **partial** analog (`date-utils.ts` for module shape). Crypto and gate logic come from RESEARCH.md Patterns 1 and 3.

## Metadata

**Analog search scope:** `apps/web/src/{app,lib,components,types,hooks}`, `packages/database/{src/modules,migrations,seed.sql}`, `packages/types/src`, `scripts/create-migration.js`
**Files scanned:** ~70 (API routes, auth pages, database modules, migrations, UI dialogs)
**Pattern extraction date:** 2026-08-29
**Strong analogs used:** signup `route.ts`, `auth.ts`, departments module quartet, signup/signin/error pages, `navigation.tsx`, `001`/`009` SQL, `validation.ts`, `date-utils.ts`
