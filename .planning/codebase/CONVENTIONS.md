# Coding Conventions

**Analysis Date:** 2026-08-29

## Naming Patterns

**Files:**
- Use kebab-case for React components, hooks, and app lib files: `dashboard-stats.tsx`, `leave-request-form.tsx`, `use-leave-request-operations.ts`, `date-utils.ts`, `type-adapters.ts`.
- Use Next.js App Router filenames exactly: `page.tsx`, `layout.tsx`, `route.ts`, `middleware.ts`. Route groups use parentheses: `apps/web/src/app/(admin)/users/page.tsx`.
- Use kebab-case for database module folders: `packages/database/src/modules/leave-requests/`, `packages/database/src/modules/calendar-events/`.
- Inside each database module, use these exact filenames: `types.ts`, `repository.ts`, `service.ts`, `index.ts`.
- Name SQL migrations with a numeric or timestamp prefix plus snake_case description in `packages/database/migrations/`: `001_initial_schema.sql`, `013_add_notifications_insert_policy.sql`, `20250807140800_add_deleted_at_column.sql`.
- Name shadcn primitives as single-word kebab files under `apps/web/src/components/ui/`: `button.tsx`, `dropdown-menu.tsx`.
- Do not use PascalCase filenames for application code (no `DashboardStats.tsx`).

**Functions:**
- Use camelCase for functions and methods: `calculateTotalDays`, `validateInput`, `mapUserFromDatabase`.
- Name React components PascalCase and export them as named functions: `export function DashboardStats`, `export function LeaveRequestForm`.
- Name hooks with a `use` prefix: `useDashboardData`, `useLeaveRequestOperations`, `useDatabaseService`.
- Name event handlers `handle` + verb: `handleSubmit` in `apps/web/src/components/leave-request-form.tsx`, `handleApprove` in `apps/web/src/components/leave-request/enhanced-approve-dialog.tsx`.
- In repositories, use data-access verbs: `findById`, `findByEmail`, `findAll`, `create`, `update`, `softDelete`, `restore`, `bulkUpdate` (`packages/database/src/modules/users/repository.ts`, `packages/database/src/modules/leave-requests/repository.ts`).
- In services, use domain verbs + entity: `getUserById`, `createLeaveRequest`, `approveLeaveRequest` (`packages/database/src/modules/leave-requests/service.ts`).
- Name App Router pages as default exports: `export default function DashboardPage()`, `export default function UsersPage()`.
- Name API route handlers `GET` / `POST` (`apps/web/src/app/api/auth/signup/route.ts`).

**Variables:**
- Use camelCase for local TypeScript variables and function params: `hashedPassword`, `queryClient`, `leaveRequest`.
- Use snake_case for database columns and shared domain fields: `user_id`, `leave_type`, `created_at`, `is_active` (`packages/types/src/index.ts`, `packages/database/src/modules/leave-requests/types.ts`).
- Use camelCase for web-layer mapped user fields in `apps/web/src/lib/supabase.ts`: `firstName`, `managerId`, `isActive`. Convert at the boundary with `mapUserFromDatabase` / `mapUserToDatabase`.
- Use SCREAMING_SNAKE_CASE for constants: `PASSWORD_REQUIREMENTS` in `apps/web/src/lib/validation.ts`, `TOAST_LIMIT` in `apps/web/src/hooks/use-toast.ts`.
- Use camelCase TanStack Query keys as arrays: `['leaveBalance', user.id]`, `['recentRequests', user.id]`, `['teamLeaveRequests']` (`apps/web/src/hooks/use-dashboard-data.ts`). Prefer this over kebab-case; do not add new kebab-case keys like `['leave-policies']`.
- Prefix unused destructured values with `_`: `const { password: _, ...userWithoutPassword }` in `apps/web/src/app/api/auth/signup/route.ts`.
- Prefix private module-level caches with `_`: `_env` in `apps/web/src/lib/env.ts`, `_supabase` in `packages/database/src/index.ts`.

**Types:**
- Use PascalCase for interfaces and type aliases: `LeaveRequest`, `User`, `ServiceError`.
- Suffix component props with `Props`: `LeaveRequestFormProps`, `DatabaseServiceProviderProps`, `ErrorBoundaryProps`.
- Suffix DTOs as `Create{Entity}Data` / `Update{Entity}Data`: `CreateLeaveRequestData`, `UpdateUserData`.
- Suffix filter and stats types: `LeaveRequestFilters`, `UserStats`, `LeaveRequestWithUser`.
- Suffix Zod-inferred types with `Input`: `UserRegistrationInput`, `LeaveRequestInput` via `z.infer<typeof schema>` in `apps/web/src/lib/validation.ts`.
- Use PascalCase enums with SCREAMING_SNAKE members and lowercase string values: `UserRole.EMPLOYEE = 'employee'`, `RequestStatus.PENDING = 'pending'` (`packages/types/src/index.ts`).
- Use generics for shared wrappers: `ApiResponse<T>`, `PaginatedResponse<T>`, `PaginationResult<T>`.
- Name database-shape adapters `Database{Entity}`: `DatabaseLeaveRequest` in `apps/web/src/lib/type-adapters.ts`.
- Extend `BaseEntity` or `SoftDeleteEntity` for persistence models (`packages/database/src/modules/shared/types.ts`).

## Code Style

**Formatting:**
- Tool: Prettier `^3.1.0` (root `package.json`). No `.prettierrc`, `prettier.config.*`, or `.prettierignore` exists — Prettier defaults apply.
- Format with `npm run format` (`prettier --write "**/*.{ts,tsx,md,json}"`).
- Use 2-space indentation. Do not copy the 4-space indent in `apps/web/src/components/leave-request/enhanced-approve-dialog.tsx` or `apps/web/src/providers/session-provider.tsx`.
- Match punctuation to the layer you are editing:
  - `packages/database/**`: single quotes and semicolons.
  - `apps/web/src` application code (`lib/`, `hooks/`, `app/`, most components): single quotes, omit semicolons.
  - `apps/web/src/components/ui/**` (shadcn): double quotes, omit semicolons. Keep generated UI files in that style.
- TypeScript `strict: true` in `tsconfig.json`. Keep `forceConsistentCasingInFileNames: true`.
- Do not rely on `apps/web/next.config.js` `typescript.ignoreBuildErrors` or `eslint.ignoreDuringBuilds` when writing new code — those flags skip checks at build time; still type-check with `npm run type-check`.

**Linting:**
- Tool: ESLint `^8.55.0` at the repo root; `eslint-config-next` `^14.2.18` in `apps/web/package.json`.
- Run via `npm run lint` (Turbo `lint` pipeline) or `npm run lint` inside `apps/web` (`next lint`).
- No `.eslintrc*`, `eslint.config.*`, or Biome config is present. `next lint` uses Next.js defaults from `eslint-config-next`.
- `lint-staged` `^15.2.0` is installed in root `package.json` but has no config and no Husky/lefthook hooks. Do not assume pre-commit lint runs.
- No `TODO` / `FIXME` / `eslint-disable` comments exist in source. Avoid adding `eslint-disable` unless a generated file requires it.

## Import Organization

**Order:**
1. `'use client'` directive first when the module is a Client Component (`apps/web/src/components/leave-request-form.tsx`, `apps/web/src/providers/database-provider.tsx`).
2. External packages: `react`, `next/*`, `@tanstack/react-query`, `zod`, `date-fns`, `lucide-react`, `next-auth`, `@supabase/supabase-js`.
3. Workspace packages: `@timeoff/types`, `@timeoff/database`, `@timeoff/utils`.
4. Internal aliases: `@/components/*`, `@/lib/*`, `@/hooks/*`, `@/providers/*`.
5. Relative imports within the same feature: `./types`, `../shared/utils`, `../ui/button`.
6. Type-only imports when importing types: `import type { Metadata } from 'next'`, `import type { User } from '@timeoff/types'`.

Group with a blank line between external, workspace, and internal alias blocks, matching `apps/web/src/components/leave-request-form.tsx` and `apps/web/src/hooks/use-dashboard-data.ts`.

In `packages/database`, import sibling layers relatively: repository from `./repository`, types from `./types`, shared utils from `../shared/utils` (`packages/database/src/modules/leave-requests/service.ts`).

**Path Aliases:**
- `@/*` → `apps/web/src/*` (`apps/web/tsconfig.json`).
- Explicit aliases also exist: `@/components/*`, `@/lib/*`, `@/types/*`, `@/utils/*`, `@/hooks/*`, `@/providers/*`, `@/pages/*`. Prefer `@/` plus the folder: `@/lib/validation`, `@/hooks/use-toast`.
- shadcn aliases in `apps/web/components.json`: `components` → `@/components`, `ui` → `@/components/ui`, `utils` → `@/lib/utils`, `lib` → `@/lib`, `hooks` → `@/hooks`.
- Workspace packages: `@timeoff/types`, `@timeoff/database`, `@timeoff/utils`. Do not import database internals via deep paths from the web app; use the package public API in `packages/database/src/index.ts`.
- `packages/ui` is a stub (`packages/ui/src/index.ts` is empty). Put UI in `apps/web/src/components/`, not `packages/ui`.

## Error Handling

**Patterns:**
- Wrap every repository method in `try/catch`. On Supabase `{ error }`, `throw error`, then rethrow via `DatabaseUtils.handleDatabaseError(error, 'operationName')` (`packages/database/src/modules/leave-requests/repository.ts`).
- Map Postgres/PostgREST codes in `packages/database/src/modules/shared/utils.ts`: `PGRST116` → `NOT_FOUND`, `23505` → `DUPLICATE_ENTRY`, `23503` → `FOREIGN_KEY_VIOLATION`, else `DATABASE_ERROR`. Attach `ServiceError.code` and optional `details`.
- Validate required fields before insert with `DatabaseUtils.validateRequiredFields(data, ['user_id', ...])`. Sanitize with `DatabaseUtils.sanitizeData` to drop `undefined` keys.
- In services, do not fail the primary mutation if audit logs, notifications, or balance side-effects fail. Catch, `console.error(...)`, and continue (`packages/database/src/modules/leave-requests/service.ts`, `packages/database/src/modules/users/service.ts`).
- In Next.js API routes, wrap the handler in `try/catch`. Return `NextResponse.json({ error, details? }, { status })` with `400` for validation, `409` for conflicts, `500` for unexpected errors (`apps/web/src/app/api/auth/signup/route.ts`).
- Validate request bodies with `validateInput(schema, body)` from `apps/web/src/lib/validation.ts`. On failure, format with `formatValidationErrors` and return `400`.
- Throw `new Error('...')` for auth and env failures: `Invalid credentials` in `apps/web/src/lib/auth.ts`; missing context in `useDatabaseService` (`apps/web/src/providers/database-provider.tsx`).
- In Client Components, catch mutation failures, `console.error` a human-readable prefix, and show `toast.error(...)` from `sonner` (`apps/web/src/hooks/use-leave-request-operations.ts`). Do not swallow without user feedback.
- Wrap trees that can crash with `ErrorBoundary` from `apps/web/src/components/error-boundary.tsx`. Log via `devLog.error`. Use `withErrorBoundary` HOC or `useErrorHandler` for local capture.
- Prefer `error instanceof Error ? error.message : 'Unknown error'` when serializing unknown catches (`apps/web/src/app/api/test-connection/route.ts`).

## Logging

**Framework:** `console` in packages and scripts; `devLog` wrapper in the web app (`apps/web/src/lib/env.ts`). No Sentry, pino, or winston.

**Patterns:**
- Use `devLog.info` / `devLog.warn` / `devLog.error` in `apps/web` so info/warn stay development-only and errors always print (`[DEV]` vs `[PROD ERROR]`).
- Use `console.error('Failed to ...:', error)` in `packages/database` service side-effect catches. Include the operation name.
- Use `DatabaseUtils.handleDatabaseError` which already `console.error(\`Database error in ${operation}:\`, error)` before mapping codes.
- Do not log secrets, passwords, or full env values. Connection diagnostics may report whether vars are `SET` / `NOT SET` (`apps/web/src/app/api/test-connection/route.ts`).
- CLI scripts in `scripts/` may use emoji-prefixed `console.log` / `console.error` (`scripts/create-migration.js`, `scripts/run-migration.js`). Do not use emoji logging in application TypeScript.
- Leave the production error-reporting stub in `ErrorBoundary.componentDidCatch` unused until a real service is wired; do not invent a new logger.

## Comments

**When to Comment:**
- Add a file-level block describing purpose for lib modules: `apps/web/src/lib/validation.ts`, `apps/web/src/lib/env.ts`.
- Comment non-obvious business rules in services (`// Don't fail the creation if audit logging fails`).
- Comment why a Proxy/lazy init exists (`packages/database/src/index.ts` supabase proxy, `apps/web/src/lib/env.ts` env proxy).
- Comment TanStack Query / provider defaults when the number is a product choice (`staleTime: 60 * 1000` in `apps/web/src/providers/session-provider.tsx`).
- Do not add narration comments that restate the next line. Remove commented-out blocks when replacing them (several leftover commented imports remain; do not add more).

**JSDoc/TSDoc:**
- Use JSDoc on exported utilities and React public APIs: `@param` / `@returns` as in `apps/web/src/lib/date-utils.ts`.
- Document static helpers on `DatabaseUtils` with a one-line JSDoc (`packages/database/src/modules/shared/utils.ts`).
- Document providers and hooks that throw if misused (`apps/web/src/providers/database-provider.tsx`).
- Do not require JSDoc on every React component; name and `Props` type are sufficient for UI.

## Function Design

**Size:**
- Keep utils small and single-purpose (`calculateTotalDays` in `apps/web/src/lib/date-utils.ts`).
- Keep repository methods to one query plus error wrap. Extract filter application to a private `apply{Entity}Filters` method (`LeaveRequestRepository.applyLeaveRequestFilters`).
- Keep service methods as: repository call, then optional audit/notification side effects. Do not put SQL in services.
- Split large UI: feature components under `components/dashboard/`, `components/leave-request/`, `components/shared/`. Avoid new 400+ line god components; `unified-calendar-view.tsx` is already oversized — do not add more responsibilities there.

**Parameters:**
- Prefer explicit typed params over untyped `any`. `query: any` in `DatabaseUtils.applyQueryOptions` is an existing escape hatch for the Supabase builder — do not spread `any` into new web code.
- Use object params when there are more than ~3 related values: `useLeaveRequestOperations({ userId, onSuccess })`, `ApprovalData`.
- Give optional React props defaults: `isLoading = false`, `showEmployeeColumn = true`.
- Inject collaborators via constructor in database classes: `constructor(private db: DatabaseClient)`, `constructor(private leaveRequestRepository: LeaveRequestRepository, ...)`.
- Accept an optional `service?: IDatabaseService` on `DatabaseServiceProvider` so tests can inject a fake.

**Return Values:**
- Annotate service/repository returns as `Promise<T>` or `Promise<T | null>`: `Promise<LeaveRequest>`, `Promise<LeaveRequestWithUser[]>`.
- Return empty arrays instead of `null` for list queries: `return data || []`.
- Use discriminated unions for validation: `{ success: true; data: T } | { success: false; errors: z.ZodError }` from `validateInput`.
- Return `NextResponse` from route handlers; do not return raw objects.
- Infer form types from Zod: `useForm<LeaveRequestInput>`.

## Module Design

**Exports:**
- Prefer named exports. Default-export only established exceptions: `ErrorBoundary` also has `export default ErrorBoundary`; `databaseService` is `export default databaseService` in `packages/database/src/index.ts`; Next.js `page.tsx` / `layout.tsx` default page components.
- Export shadcn components as named consts plus `displayName`: `Button.displayName = "Button"` then `export { Button, buttonVariants }`.
- Export Zod schemas and their inferred types from the same file (`apps/web/src/lib/validation.ts`).
- Export enums and interfaces from `packages/types/src/index.ts` as the shared contract. Do not redefine `User` / `LeaveRequest` in new web files; adapt with `apps/web/src/lib/type-adapters.ts` when the database layer returns untyped strings.
- Keep NextAuth module augmentation in `apps/web/src/types/next-auth.d.ts`. When extending the session, match the mixed `first_name` + `managerId` fields already declared there.

**Barrel Files:**
- Every database module must re-export via `index.ts`: `export * from './types'; export * from './repository'; export * from './service';` (`packages/database/src/modules/leave-requests/index.ts`).
- Re-export all modules from `packages/database/src/modules/index.ts`, then `export * from './modules'` in `packages/database/src/index.ts`.
- Feature barrels use named re-exports, not star exports: `apps/web/src/components/dashboard/index.ts`, `apps/web/src/components/shared/index.ts`.
- Do not add a barrel for `apps/web/src/components/ui/`; import the primitive file directly: `@/components/ui/button`.
- `packages/utils/src/index.ts` is the entire utils public API (schemas + date/permission helpers). Add new shared utils there or split and re-export from that file.
- `packages/ui/src/index.ts` is unused — do not start putting components there without standing up the package.

## Layer-Specific Rules

**Database package (`packages/database`):**
- Follow repository → service → factory. Wire services in `packages/database/src/modules/database-service.ts` (`DatabaseServiceFactory` singleton).
- Keep a legacy `DatabaseService` / `IDatabaseService` facade in `packages/database/src/index.ts` for the web app. Add new operations to the module service first, then expose them on the facade if the UI needs them.
- Use `DatabaseClient` (`from`, `channel`) rather than importing the Supabase client type into every repository.

**Web app (`apps/web`):**
- Put Client Components behind `'use client'`. Keep `route.ts` and `middleware.ts` as server modules.
- Access data through `useDatabaseService()` and TanStack Query; do not instantiate `DatabaseService` inside random components.
- Use `react-hook-form` + `zodResolver(leaveRequestSchema)` for forms (`apps/web/src/components/leave-request-form.tsx`).
- Use `sonner` `toast.success` / `toast.error` for mutation feedback. The older `useToast` hook in `apps/web/src/hooks/use-toast.ts` is shadcn-generated; prefer `sonner` for new mutations to match `use-leave-request-operations.ts`.
- Add new shadcn primitives with `npx shadcn@latest add [name]` from `apps/web` (`apps/web/SHADCN_UI.md`, `apps/web/components.json` style `new-york`).
- Mark pages that need request-time data with `export const dynamic = 'force-dynamic'` (`apps/web/src/app/layout.tsx`, `apps/web/src/app/(admin)/users/page.tsx`).

**Shared types (`packages/types`):**
- Domain fields stay snake_case to match Postgres. String unions for statuses and leave types should stay aligned with DB check constraints and Zod enums in `apps/web/src/lib/validation.ts`.

**Scripts (`scripts/`):**
- Use Node CommonJS (`.js`) with `console` UX for migrations. Application logic does not belong in scripts.

---

*Convention analysis: 2026-08-29*
