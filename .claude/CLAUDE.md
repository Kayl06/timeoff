<!-- GSD:project-start source:PROJECT.md -->

## Project

**Timeoff**

Timeoff is an existing leave-management web app (employee request → manager approve → balances and calendars). This project is not a rebuild and not a feature-expansion milestone.

It makes the already-shipped journeys truthful for **client companies on one shared deployment**: a company can sign itself up, people can request and approve leave against real remaining days, calendars match that data, and Company A never sees Company B. Surfaces that already work stay baseline; work is only net-new tenant isolation or existing behavior that is broken, stubbed, or unsafe.

**Core Value:** A client company can run **request → approve → remaining days → calendar** on their own data, with no SQL from us, and no other company on the same deployment can see it.

### Constraints

- **Baseline**: Mapped codebase and current implemented behavior are the baseline. Do not schedule already-complete functionality as new work unless it requires modification.
- **Stack**: Stay on Next.js App Router (`apps/web`), NextAuth, `@timeoff/database` modules, Supabase Postgres. Do not add a second ORM or a parallel app.
- **Authz**: Data access must be server-bound to the session and tenant. Public anon + `USING (true)` is incompatible with a client on a shared deployment.
- **Balances**: Truth means existing `leave_balances` rows displayed and deducted — not a new policy engine.
- **Email**: Password reset and approve/reject notices require real outbound mail. No email provider is wired today (`INTEGRATIONS.md`: no mailer).
- **Admin IA**: Do not build out the placeholder admin users page this milestone; onboarding is company signup + invite.
- **Compatibility**: Prefer modifying leave lifecycle and auth in place (hooks, services, RLS migrations) over a greenfield rewrite.

<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->

## Technology Stack

## Languages

- TypeScript 5.x (root `package.json` `typescript` `^5.3.0`; lockfile resolves `5.9.3`) — all application and package source. Target `ES2020` in `tsconfig.json`. Strict mode is on (`"strict": true`).
- TSX / React JSX — Next.js App Router UI in `apps/web/src/`. Path alias `@/*` maps to `apps/web/src/*` (`apps/web/tsconfig.json`).
- SQL (PostgreSQL dialect) — schema and RLS in `packages/database/migrations/*.sql` and `packages/database/seed.sql`. Local Supabase uses Postgres major version 17 (`supabase/config.toml`).
- JavaScript (CommonJS) — Next/PostCSS/Tailwind configs (`apps/web/next.config.js`, `apps/web/postcss.config.js`, `apps/web/tailwind.config.js`) and migration scripts (`scripts/run-migration.js`, `scripts/create-migration.js`, `scripts/fix-rls.js`, `scripts/apply-rls-fix.js`).
- Bash — `scripts/dev-setup.sh` for Docker-based local services.
- CSS — Tailwind layers and CSS variables in `apps/web/src/app/globals.css`.

## Runtime

- Node.js `>=18.0.0` (`package.json` `engines`). Docker images use `node:18-alpine` (`Dockerfile`, `Dockerfile.dev`).
- npm `>=9.0.0` required; `packageManager` is pinned to `npm@10.2.4`.
- npm workspaces (`"workspaces": ["apps/*", "packages/*"]` in `package.json`)
- Lockfile: `package-lock.json` present locally (lockfileVersion 3) but listed in `.gitignore` — do not assume it is committed. Prefer `npm install` at the repo root so workspace packages (`@timeoff/web`, `@timeoff/database`, `@timeoff/types`, `@timeoff/utils`) resolve together.

## Frameworks

- Next.js App Router — `apps/web` depends on `next` `^14.2.18` (lockfile: `14.2.35`). This is the app to extend. Root `package.json` also lists `next` `15.4.6`; do not use Next 15 APIs (`async` request APIs, etc.) in `apps/web`. Entry: `apps/web/src/app/`. `output: 'standalone'` in `apps/web/next.config.js` for Docker.
- React 18.3.1 / React DOM 18.3.1 — client and server components. Root layout is `apps/web/src/app/layout.tsx` (`dynamic = 'force-dynamic'`).
- NextAuth.js 4 (`next-auth` `^4.24.5`, lockfile `4.24.15`) — session/JWT auth in `apps/web/src/lib/auth.ts` and `apps/web/src/app/api/auth/[...nextauth]/route.ts`. Use the Pages Router–style `NextAuthOptions` API, not Auth.js v5.
- Tailwind CSS 3.4.x (`apps/web/tailwind.config.js`) + PostCSS + Autoprefixer (`apps/web/postcss.config.js`).
- shadcn/ui (New York style, RSC, Lucide icons) — `apps/web/components.json`. UI primitives live in `apps/web/src/components/ui/`. Add new primitives with the shadcn CLI against that config; do not invent a parallel component kit.
- Turborepo 1.x (`turbo` `^1.11.0`, lockfile `1.13.4`) — `turbo.json` pipelines: `build`, `lint`, `dev`, `clean`, `type-check`, `test`.
- Not detected. No `*.test.*` / `*.spec.*` files, no Jest/Vitest/Playwright config. `turbo.json` defines a `test` pipeline (`outputs: ["coverage/**"]`) but no workspace `package.json` implements a `test` script. Do not assume a runner exists; add Vitest (packages) or Playwright (web) explicitly if tests are required.
- `tsc` — packages emit `dist/` (`packages/*/tsconfig.json` `outDir: "./dist"`).
- `next build` / `next dev` / `next start` — `apps/web/package.json`.
- `next lint` with `eslint-config-next` `^14.2.18` — `apps/web`. Root ESLint `^8.55.0` (lockfile `8.57.1`). No committed `.eslintrc*` or `eslint.config.*`; Next.js default config applies.
- Prettier `^3.1.0` (lockfile `3.9.6`) via root script `format`. No `.prettierrc` detected — use Prettier defaults unless a config is added.
- lint-staged `^15.2.0` is a root devDependency with no config and no Husky hooks detected — do not rely on pre-commit linting.
- Supabase CLI scripts on the root: `supabase start|stop|status`, `supabase db push|reset`, `supabase gen types`.

## Key Dependencies

- `@supabase/supabase-js` `^2.53.0` in `apps/web`, `^2.38.0` in `packages/database`, `^2.55.0` at root (lockfile `2.112.4`). Only data-access client. Create clients in `apps/web/src/lib/supabase.ts` (app) and `packages/database/src/index.ts` (package). Do not add a second ORM (Prisma/Drizzle).
- `@timeoff/database`, `@timeoff/types`, `@timeoff/utils` — workspace packages. `apps/web/next.config.js` `transpilePackages` must stay in sync if a new workspace package is imported by the app.
- `@tanstack/react-query` `^5.8.4` (lockfile `5.102.8`) — server-state in `apps/web/src/providers/session-provider.tsx`. Put data fetching/mutations in hooks (`apps/web/src/hooks/`).
- `@tanstack/react-table` `^8.21.3` — tables such as `apps/web/src/components/leave-request/data-table.tsx`.
- `react-hook-form` `^7.62.0` + `@hookform/resolvers` + `zod` `^3.25.76` — forms and validation. Shared Zod schemas also live in `packages/utils/src/index.ts` and `apps/web/src/lib/validation.ts`.
- `bcryptjs` `^3.0.2` — password hashing in `apps/web/src/app/api/auth/signup/route.ts` (12 salt rounds) and verify in `apps/web/src/lib/auth.ts`.
- `date-fns` — `^2.30.0` in `apps/web` and `packages/utils` (lockfile web `2.30.0`); root lists `^4.1.0` (lockfile `4.4.0`). Prefer `date-fns` v2 APIs in app/utils code to avoid v4 breakage.
- `zod` — runtime validation. Use existing schemas before adding new ones.
- Radix UI primitives (`@radix-ui/react-*`) — underlying shadcn components. Import from `@/components/ui/*`, not raw Radix, unless building a new primitive.
- `class-variance-authority`, `clsx`, `tailwind-merge` — `cn()` in `apps/web/src/lib/utils.ts`. Use `cn()` for class composition.
- `lucide-react` — icons (shadcn `iconLibrary`).
- `sonner` `^2.0.7` — toasts via `@/components/ui/sonner` in `apps/web/src/providers/session-provider.tsx`. Prefer `sonner` for new UI toasts. `react-hot-toast` remains on auth pages (`apps/web/src/app/auth/forgot-password/page.tsx`, `signup/page.tsx`, `reset-password/page.tsx`).
- `next-themes` `^0.4.6` — used by `apps/web/src/components/ui/sonner.tsx`. No root `ThemeProvider` in `apps/web/src/app/layout.tsx`.
- `react-day-picker` `^9.8.1` — `apps/web/src/components/ui/calendar.tsx`.
- `tailwindcss-animate` — `apps/web/tailwind.config.js` plugin.
- `@types/node` `^20.10.0`, `@types/react` `^18.3.23`, `@types/react-dom` `^18.3.7`.
- `dotenv` `^16.6.1` — Node scripts (`scripts/run-migration.js`).
- Declared but unused in source (do not adopt without a real call site): `recharts` `^2.8.0`, `framer-motion` `^10.16.5`, `react-intersection-observer` `^9.5.3`, `@tanstack/react-query-devtools`.
- `packages/ui` is a stub (`packages/ui/src/index.ts` only, no `package.json`) — do not import `@timeoff/ui`. Put shared UI in `apps/web/src/components/`.

## Configuration

- Copy `apps/web/env.example` to `apps/web/.env.local` (file present locally; gitignored). Root and `apps/web/.env.local.backup` also exist as env files — never commit or quote their values.
- Validate via `apps/web/src/lib/env.ts`. Always required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`. Production also requires `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`. Optional: `SUPABASE_SERVICE_ROLE_KEY` (read in `env.ts` but not used by clients).
- `turbo.json` `globalDependencies` includes `**/.env.*local` so env changes bust Turbo cache.
- `NODE_ENV` defaults to `development` in `apps/web/src/lib/env.ts`.
- `DATABASE_URL` appears in `README.md` only — not read by application code. Do not introduce Postgres drivers; go through Supabase JS.
- `SUPABASE_PROJECT_ID` is used by `packages/database` `generate-types` script. Root `supabase:gen:types` hardcodes `--project-id lvscrngetawbztaiadpr` into `packages/database/src/types.ts` (that generated file is currently absent).
- `apps/web/next.config.js` currently sets `typescript.ignoreBuildErrors` and `eslint.ignoreDuringBuilds` to `true` — do not treat a green `next build` as type-safe.
- Root `tsconfig.json` — shared compiler options (`moduleResolution: "bundler"`, `jsx: "react-jsx"`, declarations on).
- `apps/web/tsconfig.json` — Next plugin, `jsx: "preserve"`, `noEmit: true`, path aliases.
- Package tsconfigs: `packages/database/tsconfig.json`, `packages/types/tsconfig.json`, `packages/utils/tsconfig.json`.
- `turbo.json` — `build` depends on `^build`; outputs `.next/**` and `dist/**`.
- `vercel.json` — `buildCommand`: `npm install && npx turbo run build --filter=@timeoff/web...`; API functions under `apps/web/src/app/api/**/*.ts` `maxDuration` 30s.
- `apps/web/next.config.js` — `transpilePackages` for workspace pkgs; `images.domains` for Google/GitHub avatars; `serverComponentsExternalPackages: ['@tanstack/react-query']`.
- `Dockerfile` (production, Node 18 Alpine, standalone Next) and `Dockerfile.dev`. Compose files (`docker-compose*.yml`) are gitignored and not present in the tree; `scripts/dev-setup.sh` still expects `docker-compose.dev.yml`.

## Platform Requirements

- Node 18+ and npm 9+ (`README.md`, `package.json` `engines`).
- Docker (for `Dockerfile.dev` / `scripts/dev-setup.sh`; compose file expected as `docker-compose.dev.yml`).
- Supabase CLI for local stack (`supabase/config.toml`: API `54321`, DB `54322`, Studio `54323`, Inbucket `54324`, Postgres 17).
- Google Cloud OAuth client for Google sign-in (optional in development — Google provider is omitted when env vars are empty in `apps/web/src/lib/auth.ts`).
- Start with `npm run dev` (Turbo) or `npm run supabase:start` then `npm run dev`.
- Vercel (`vercel.json`). Next standalone output also supports Docker (`Dockerfile`, `npm run docker:prod` in `package.json`).
- Hosted Supabase (Postgres + PostgREST + Realtime). Auth for the product is NextAuth, not Supabase Auth.
- Set production env vars from `apps/web/env.example`; Google OAuth redirect: `{origin}/api/auth/callback/google`.
- Image allowlist already includes `lh3.googleusercontent.com` and `avatars.githubusercontent.com` (`apps/web/next.config.js`).

<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->

## Conventions

## Naming Patterns

- Use kebab-case for React components, hooks, and app lib files: `dashboard-stats.tsx`, `leave-request-form.tsx`, `use-leave-request-operations.ts`, `date-utils.ts`, `type-adapters.ts`.
- Use Next.js App Router filenames exactly: `page.tsx`, `layout.tsx`, `route.ts`, `middleware.ts`. Route groups use parentheses: `apps/web/src/app/(admin)/users/page.tsx`.
- Use kebab-case for database module folders: `packages/database/src/modules/leave-requests/`, `packages/database/src/modules/calendar-events/`.
- Inside each database module, use these exact filenames: `types.ts`, `repository.ts`, `service.ts`, `index.ts`.
- Name SQL migrations with a numeric or timestamp prefix plus snake_case description in `packages/database/migrations/`: `001_initial_schema.sql`, `013_add_notifications_insert_policy.sql`, `20250807140800_add_deleted_at_column.sql`.
- Name shadcn primitives as single-word kebab files under `apps/web/src/components/ui/`: `button.tsx`, `dropdown-menu.tsx`.
- Do not use PascalCase filenames for application code (no `DashboardStats.tsx`).
- Use camelCase for functions and methods: `calculateTotalDays`, `validateInput`, `mapUserFromDatabase`.
- Name React components PascalCase and export them as named functions: `export function DashboardStats`, `export function LeaveRequestForm`.
- Name hooks with a `use` prefix: `useDashboardData`, `useLeaveRequestOperations`, `useDatabaseService`.
- Name event handlers `handle` + verb: `handleSubmit` in `apps/web/src/components/leave-request-form.tsx`, `handleApprove` in `apps/web/src/components/leave-request/enhanced-approve-dialog.tsx`.
- In repositories, use data-access verbs: `findById`, `findByEmail`, `findAll`, `create`, `update`, `softDelete`, `restore`, `bulkUpdate` (`packages/database/src/modules/users/repository.ts`, `packages/database/src/modules/leave-requests/repository.ts`).
- In services, use domain verbs + entity: `getUserById`, `createLeaveRequest`, `approveLeaveRequest` (`packages/database/src/modules/leave-requests/service.ts`).
- Name App Router pages as default exports: `export default function DashboardPage()`, `export default function UsersPage()`.
- Name API route handlers `GET` / `POST` (`apps/web/src/app/api/auth/signup/route.ts`).
- Use camelCase for local TypeScript variables and function params: `hashedPassword`, `queryClient`, `leaveRequest`.
- Use snake_case for database columns and shared domain fields: `user_id`, `leave_type`, `created_at`, `is_active` (`packages/types/src/index.ts`, `packages/database/src/modules/leave-requests/types.ts`).
- Use camelCase for web-layer mapped user fields in `apps/web/src/lib/supabase.ts`: `firstName`, `managerId`, `isActive`. Convert at the boundary with `mapUserFromDatabase` / `mapUserToDatabase`.
- Use SCREAMING_SNAKE_CASE for constants: `PASSWORD_REQUIREMENTS` in `apps/web/src/lib/validation.ts`, `TOAST_LIMIT` in `apps/web/src/hooks/use-toast.ts`.
- Use camelCase TanStack Query keys as arrays: `['leaveBalance', user.id]`, `['recentRequests', user.id]`, `['teamLeaveRequests']` (`apps/web/src/hooks/use-dashboard-data.ts`). Prefer this over kebab-case; do not add new kebab-case keys like `['leave-policies']`.
- Prefix unused destructured values with `_`: `const { password: _, ...userWithoutPassword }` in `apps/web/src/app/api/auth/signup/route.ts`.
- Prefix private module-level caches with `_`: `_env` in `apps/web/src/lib/env.ts`, `_supabase` in `packages/database/src/index.ts`.
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

- Tool: Prettier `^3.1.0` (root `package.json`). No `.prettierrc`, `prettier.config.*`, or `.prettierignore` exists — Prettier defaults apply.
- Format with `npm run format` (`prettier --write "**/*.{ts,tsx,md,json}"`).
- Use 2-space indentation. Do not copy the 4-space indent in `apps/web/src/components/leave-request/enhanced-approve-dialog.tsx` or `apps/web/src/providers/session-provider.tsx`.
- Match punctuation to the layer you are editing:
- TypeScript `strict: true` in `tsconfig.json`. Keep `forceConsistentCasingInFileNames: true`.
- Do not rely on `apps/web/next.config.js` `typescript.ignoreBuildErrors` or `eslint.ignoreDuringBuilds` when writing new code — those flags skip checks at build time; still type-check with `npm run type-check`.
- Tool: ESLint `^8.55.0` at the repo root; `eslint-config-next` `^14.2.18` in `apps/web/package.json`.
- Run via `npm run lint` (Turbo `lint` pipeline) or `npm run lint` inside `apps/web` (`next lint`).
- No `.eslintrc*`, `eslint.config.*`, or Biome config is present. `next lint` uses Next.js defaults from `eslint-config-next`.
- `lint-staged` `^15.2.0` is installed in root `package.json` but has no config and no Husky/lefthook hooks. Do not assume pre-commit lint runs.
- No `TODO` / `FIXME` / `eslint-disable` comments exist in source. Avoid adding `eslint-disable` unless a generated file requires it.

## Import Organization

- `@/*` → `apps/web/src/*` (`apps/web/tsconfig.json`).
- Explicit aliases also exist: `@/components/*`, `@/lib/*`, `@/types/*`, `@/utils/*`, `@/hooks/*`, `@/providers/*`, `@/pages/*`. Prefer `@/` plus the folder: `@/lib/validation`, `@/hooks/use-toast`.
- shadcn aliases in `apps/web/components.json`: `components` → `@/components`, `ui` → `@/components/ui`, `utils` → `@/lib/utils`, `lib` → `@/lib`, `hooks` → `@/hooks`.
- Workspace packages: `@timeoff/types`, `@timeoff/database`, `@timeoff/utils`. Do not import database internals via deep paths from the web app; use the package public API in `packages/database/src/index.ts`.
- `packages/ui` is a stub (`packages/ui/src/index.ts` is empty). Put UI in `apps/web/src/components/`, not `packages/ui`.

## Error Handling

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

- Use `devLog.info` / `devLog.warn` / `devLog.error` in `apps/web` so info/warn stay development-only and errors always print (`[DEV]` vs `[PROD ERROR]`).
- Use `console.error('Failed to ...:', error)` in `packages/database` service side-effect catches. Include the operation name.
- Use `DatabaseUtils.handleDatabaseError` which already `console.error(\`Database error in ${operation}:\`, error)` before mapping codes.
- Do not log secrets, passwords, or full env values. Connection diagnostics may report whether vars are `SET` / `NOT SET` (`apps/web/src/app/api/test-connection/route.ts`).
- CLI scripts in `scripts/` may use emoji-prefixed `console.log` / `console.error` (`scripts/create-migration.js`, `scripts/run-migration.js`). Do not use emoji logging in application TypeScript.
- Leave the production error-reporting stub in `ErrorBoundary.componentDidCatch` unused until a real service is wired; do not invent a new logger.

## Comments

- Add a file-level block describing purpose for lib modules: `apps/web/src/lib/validation.ts`, `apps/web/src/lib/env.ts`.
- Comment non-obvious business rules in services (`// Don't fail the creation if audit logging fails`).
- Comment why a Proxy/lazy init exists (`packages/database/src/index.ts` supabase proxy, `apps/web/src/lib/env.ts` env proxy).
- Comment TanStack Query / provider defaults when the number is a product choice (`staleTime: 60 * 1000` in `apps/web/src/providers/session-provider.tsx`).
- Do not add narration comments that restate the next line. Remove commented-out blocks when replacing them (several leftover commented imports remain; do not add more).
- Use JSDoc on exported utilities and React public APIs: `@param` / `@returns` as in `apps/web/src/lib/date-utils.ts`.
- Document static helpers on `DatabaseUtils` with a one-line JSDoc (`packages/database/src/modules/shared/utils.ts`).
- Document providers and hooks that throw if misused (`apps/web/src/providers/database-provider.tsx`).
- Do not require JSDoc on every React component; name and `Props` type are sufficient for UI.

## Function Design

- Keep utils small and single-purpose (`calculateTotalDays` in `apps/web/src/lib/date-utils.ts`).
- Keep repository methods to one query plus error wrap. Extract filter application to a private `apply{Entity}Filters` method (`LeaveRequestRepository.applyLeaveRequestFilters`).
- Keep service methods as: repository call, then optional audit/notification side effects. Do not put SQL in services.
- Split large UI: feature components under `components/dashboard/`, `components/leave-request/`, `components/shared/`. Avoid new 400+ line god components; `unified-calendar-view.tsx` is already oversized — do not add more responsibilities there.
- Prefer explicit typed params over untyped `any`. `query: any` in `DatabaseUtils.applyQueryOptions` is an existing escape hatch for the Supabase builder — do not spread `any` into new web code.
- Use object params when there are more than ~3 related values: `useLeaveRequestOperations({ userId, onSuccess })`, `ApprovalData`.
- Give optional React props defaults: `isLoading = false`, `showEmployeeColumn = true`.
- Inject collaborators via constructor in database classes: `constructor(private db: DatabaseClient)`, `constructor(private leaveRequestRepository: LeaveRequestRepository, ...)`.
- Accept an optional `service?: IDatabaseService` on `DatabaseServiceProvider` so tests can inject a fake.
- Annotate service/repository returns as `Promise<T>` or `Promise<T | null>`: `Promise<LeaveRequest>`, `Promise<LeaveRequestWithUser[]>`.
- Return empty arrays instead of `null` for list queries: `return data || []`.
- Use discriminated unions for validation: `{ success: true; data: T } | { success: false; errors: z.ZodError }` from `validateInput`.
- Return `NextResponse` from route handlers; do not return raw objects.
- Infer form types from Zod: `useForm<LeaveRequestInput>`.

## Module Design

- Prefer named exports. Default-export only established exceptions: `ErrorBoundary` also has `export default ErrorBoundary`; `databaseService` is `export default databaseService` in `packages/database/src/index.ts`; Next.js `page.tsx` / `layout.tsx` default page components.
- Export shadcn components as named consts plus `displayName`: `Button.displayName = "Button"` then `export { Button, buttonVariants }`.
- Export Zod schemas and their inferred types from the same file (`apps/web/src/lib/validation.ts`).
- Export enums and interfaces from `packages/types/src/index.ts` as the shared contract. Do not redefine `User` / `LeaveRequest` in new web files; adapt with `apps/web/src/lib/type-adapters.ts` when the database layer returns untyped strings.
- Keep NextAuth module augmentation in `apps/web/src/types/next-auth.d.ts`. When extending the session, match the mixed `first_name` + `managerId` fields already declared there.
- Every database module must re-export via `index.ts`: `export * from './types'; export * from './repository'; export * from './service';` (`packages/database/src/modules/leave-requests/index.ts`).
- Re-export all modules from `packages/database/src/modules/index.ts`, then `export * from './modules'` in `packages/database/src/index.ts`.
- Feature barrels use named re-exports, not star exports: `apps/web/src/components/dashboard/index.ts`, `apps/web/src/components/shared/index.ts`.
- Do not add a barrel for `apps/web/src/components/ui/`; import the primitive file directly: `@/components/ui/button`.
- `packages/utils/src/index.ts` is the entire utils public API (schemas + date/permission helpers). Add new shared utils there or split and re-export from that file.
- `packages/ui/src/index.ts` is unused — do not start putting components there without standing up the package.

## Layer-Specific Rules

- Follow repository → service → factory. Wire services in `packages/database/src/modules/database-service.ts` (`DatabaseServiceFactory` singleton).
- Keep a legacy `DatabaseService` / `IDatabaseService` facade in `packages/database/src/index.ts` for the web app. Add new operations to the module service first, then expose them on the facade if the UI needs them.
- Use `DatabaseClient` (`from`, `channel`) rather than importing the Supabase client type into every repository.
- Put Client Components behind `'use client'`. Keep `route.ts` and `middleware.ts` as server modules.
- Access data through `useDatabaseService()` and TanStack Query; do not instantiate `DatabaseService` inside random components.
- Use `react-hook-form` + `zodResolver(leaveRequestSchema)` for forms (`apps/web/src/components/leave-request-form.tsx`).
- Use `sonner` `toast.success` / `toast.error` for mutation feedback. The older `useToast` hook in `apps/web/src/hooks/use-toast.ts` is shadcn-generated; prefer `sonner` for new mutations to match `use-leave-request-operations.ts`.
- Add new shadcn primitives with `npx shadcn@latest add [name]` from `apps/web` (`apps/web/SHADCN_UI.md`, `apps/web/components.json` style `new-york`).
- Mark pages that need request-time data with `export const dynamic = 'force-dynamic'` (`apps/web/src/app/layout.tsx`, `apps/web/src/app/(admin)/users/page.tsx`).
- Domain fields stay snake_case to match Postgres. String unions for statuses and leave types should stay aligned with DB check constraints and Zod enums in `apps/web/src/lib/validation.ts`.
- Use Node CommonJS (`.js`) with `console` UX for migrations. Application logic does not belong in scripts.

<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->

## Architecture

## Pattern

```

```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Web app | UI, routing, NextAuth, client-side data fetching | `apps/web/` |
| Root layout | Fonts, metadata, `force-dynamic`, session/query/DB providers | `apps/web/src/app/layout.tsx` |
| Middleware | JWT-gated access for non-auth, non-API routes | `apps/web/src/middleware.ts` |
| NextAuth config | Google + credentials, session enrichment from `users` | `apps/web/src/lib/auth.ts` |
| NextAuth route | GET/POST handler for NextAuth | `apps/web/src/app/api/auth/[...nextauth]/route.ts` |
| Signup API | Validates + hashes + inserts users (bypasses domain services) | `apps/web/src/app/api/auth/signup/route.ts` |
| Session provider | NextAuth + QueryClient + DatabaseService + Navigation + Sonner | `apps/web/src/providers/session-provider.tsx` |
| Database provider | React context DI for `IDatabaseService` | `apps/web/src/providers/database-provider.tsx` |
| Dashboard data hook | Role-aware queries/mutations + cache invalidation | `apps/web/src/hooks/use-dashboard-data.ts` |
| Leave ops hook | Approve/reject/delete/cancel/bulk mutations | `apps/web/src/hooks/use-leave-request-operations.ts` |
| Database facade | Legacy `IDatabaseService` wrapping the factory | `packages/database/src/index.ts` |
| Service factory | Singleton wiring of repositories → services | `packages/database/src/modules/database-service.ts` |
| Domain modules | Per-entity types, repository, service | `packages/database/src/modules/{entity}/` |
| Shared types | Enums and DTOs consumed by the web app | `packages/types/src/index.ts` |
| Shared utils | Zod schemas + date/permission helpers (not imported by web) | `packages/utils/src/index.ts` |
| UI package stub | Empty barrel; not a workspace package | `packages/ui/src/index.ts` |
| Migrations | Postgres schema, RLS, views | `packages/database/migrations/` |
| Supabase CLI | Local API/DB ports and project id `timeoff` | `supabase/config.toml` |

## Pattern Overview

- npm workspaces (`apps/*`, `packages/*`) orchestrated by Turborepo (`turbo.json`).
- Next.js App Router with almost every page marked `'use client'`; root layout sets `dynamic = 'force-dynamic'` and `revalidate = 0` in `apps/web/src/app/layout.tsx`.
- Data access is client-side: components/hooks call `useDatabaseService()` which talks to Supabase with the anon key. Postgres RLS is the authorization boundary.
- Auth is NextAuth JWT (`session.strategy: 'jwt'` in `apps/web/src/lib/auth.ts`), not Supabase Auth sessions.
- Domain modules follow a fixed four-file shape: `types.ts`, `repository.ts`, `service.ts`, `index.ts`.
- A legacy facade (`DatabaseService` / `IDatabaseService` in `packages/database/src/index.ts`) is what the web app actually injects.

## Layers

- Purpose: Render pages, collect input, enforce client-side role UX.
- Location: `apps/web/src/app/`, `apps/web/src/components/`
- Contains: App Router pages, shadcn/ui primitives (`apps/web/src/components/ui/`), feature components (`dashboard/`, `leave-request/`, `shared/`), navigation (`apps/web/src/components/navigation.tsx`).
- Depends on: hooks, providers, `@timeoff/types`, shadcn aliases from `apps/web/components.json`.
- Used by: End users via Next.js routes.
- Purpose: Session, React Query cache, form state, toast notifications.
- Location: `apps/web/src/providers/`, `apps/web/src/hooks/`, `apps/web/src/lib/`
- Contains: `ClientSessionProvider`, `DatabaseServiceProvider`, `useDashboardData`, `useLeaveRequestOperations`, Zod schemas in `apps/web/src/lib/validation.ts`, env proxy in `apps/web/src/lib/env.ts`.
- Depends on: `next-auth/react`, `@tanstack/react-query`, `@timeoff/database`, `@timeoff/types`.
- Used by: Pages and feature components.
- Purpose: Business operations (create/approve/reject leave, balances, notifications, audit).
- Location: `packages/database/src/modules/*/service.ts`
- Contains: `LeaveRequestService`, `UserService`, `LeaveBalanceService`, `NotificationService`, `AuditLogService`, `DepartmentService`, `TeamService`, `CalendarEventService`, `LeavePolicyService`.
- Depends on: matching repositories plus peer services (audit, notifications, balances, users).
- Used by: `DatabaseService` facade (`packages/database/src/index.ts`) via `DatabaseServiceFactory`.
- Purpose: Supabase table queries, joins, soft-delete filters, error mapping.
- Location: `packages/database/src/modules/*/repository.ts`
- Contains: `from('table')` queries; `LeaveRequestRepository` joins `users!leave_requests_user_id_fkey`.
- Depends on: `DatabaseClient` (`packages/database/src/modules/shared/types.ts`) and `DatabaseUtils` (`packages/database/src/modules/shared/utils.ts`).
- Used by: Domain services only.
- Purpose: Sign-in, sign-up, JWT session, route gating.
- Location: `apps/web/src/lib/auth.ts`, `apps/web/src/lib/supabase.ts`, `apps/web/src/app/api/auth/`
- Contains: Google OAuth (optional), credentials + bcrypt, session callback that re-reads `users`.
- Depends on: `users` table columns (`email`, `password`, profile fields). Does **not** use `UserService`.
- Used by: Middleware and `useSession()` in pages.
- Purpose: Cross-package TypeScript models and enums.
- Location: `packages/types/src/index.ts`
- Contains: `User`, `LeaveRequest`, `UserRole`, `LeaveType`, `RequestStatus`, dashboard/API helper types.
- Depends on: Nothing.
- Used by: Web UI. Database package currently redefines parallel local interfaces in `packages/database/src/index.ts` and per-module `types.ts`.
- Purpose: Schema, local Supabase, Docker, Vercel.
- Location: `packages/database/migrations/`, `supabase/`, `Dockerfile`, `Dockerfile.dev`, `scripts/`, `vercel.json`
- Contains: SQL migrations (single source of truth), `supabase/config.toml`, docker/dev scripts.
- Depends on: Supabase CLI, Docker.
- Used by: Local/prod environments.

## Data Flow

### Primary Request Path

### Leave Request Submit Flow

### Approval Flow

### Authentication Flow

### Sign-up Flow

- Server session: NextAuth JWT cookie (no NextAuth database adapter).
- Server/client user profile: `users` table, copied onto the session on each `session` callback.
- Remote domain state: Supabase tables; React Query cache in the browser (`staleTime: 60_000`, `refetchOnWindowFocus: false` in `apps/web/src/providers/session-provider.tsx:20`).
- Local UI state: React `useState` (tabs, row selection, dialogs). No Redux/Zustand.
- Realtime: `IDatabaseService` defines `subscribeToLeaveRequests` / `subscribeToNotifications` / `subscribeToApprovals` (`packages/database/src/index.ts:440`) but dashboard hooks do not subscribe; they poll via React Query.

## Key Abstractions

- Purpose: Single injectable facade the web app depends on.
- Examples: `packages/database/src/index.ts`, consumed in `apps/web/src/providers/database-provider.tsx`
- Pattern: Facade over `DatabaseServiceFactory`. Prefer this for UI code. When adding a method, implement it on the domain service first, then expose it on the facade if hooks need it.
- Purpose: Singleton composition root for repositories and services.
- Examples: `packages/database/src/modules/database-service.ts`
- Pattern: Private constructor, `getInstance(db)`, `Map<string, service>`. First client wins — pass the web `supabase` from `apps/web/src/lib/supabase.ts`.
- Purpose: One bounded context per table/aggregate.
- Examples: `packages/database/src/modules/leave-requests/`, `packages/database/src/modules/users/`, `packages/database/src/modules/leave-balances/`
- Pattern: `types.ts` + `repository.ts` + `service.ts` + barrel `index.ts`. Re-export from `packages/database/src/modules/index.ts`.
- Purpose: Minimal Supabase surface and shared error/filter helpers.
- Examples: `packages/database/src/modules/shared/types.ts`, `packages/database/src/modules/shared/utils.ts`
- Pattern: Repositories take `DatabaseClient`; throw `ServiceError` via `DatabaseUtils.handleDatabaseError` (maps `PGRST116`, `23505`, `23503`).
- Purpose: Cast database string columns to `@timeoff/types` enums.
- Examples: `apps/web/src/lib/type-adapters.ts`
- Pattern: `adaptLeaveRequest` / `adaptLeaveBalance` / `adaptNotifications`. Use after facade calls before rendering.
- Purpose: Lazy-validated `process.env` access with `devLog`.
- Examples: `apps/web/src/lib/env.ts`
- Pattern: `Proxy` around `getEnv()`. Required-var throw is currently commented out — treat missing vars as runtime failures later, not compile-time.
- Purpose: Design-system atoms for forms, dialogs, tables.
- Examples: `apps/web/src/components/ui/button.tsx`, `apps/web/src/components/ui/form.tsx`
- Pattern: New-York style, CSS variables, `cn()` from `apps/web/src/lib/utils.ts`. Add via shadcn CLI using `apps/web/components.json`.

## Entry Points

- Location: `apps/web/src/app/layout.tsx`, `apps/web/src/app/page.tsx`
- Triggers: `next dev` / `next start` via `apps/web/package.json`; Turbo `dev`/`build` from root `package.json`.
- Responsibilities: HTML shell, providers, homepage redirect.
- Location: `apps/web/src/middleware.ts`
- Triggers: Every matched document request (not `/api`, `/auth`, static).
- Responsibilities: Require NextAuth JWT; pass-through for `/auth`.
- Location: `apps/web/src/app/api/auth/[...nextauth]/route.ts`
- Triggers: Sign-in, sign-out, session, OAuth callback.
- Responsibilities: Provider handlers using `authOptions`.
- Location: `apps/web/src/app/api/auth/signup/route.ts`
- Triggers: `POST` from `apps/web/src/app/auth/signup/page.tsx`
- Responsibilities: Zod validation, bcrypt, insert `users`.
- Location: `apps/web/src/app/api/test-connection/route.ts`
- Triggers: Manual `GET` for diagnostics.
- Responsibilities: Probe `users` table; report whether URL/anon key env names are set (not values).
- Location: `apps/web/src/app/dashboard/page.tsx`, `apps/web/src/app/dashboard/[slug]/page.tsx`, `apps/web/src/app/calendar/page.tsx`, `apps/web/src/app/team-calendar/page.tsx`, `apps/web/src/app/(admin)/users/page.tsx`, `apps/web/src/app/examples/page.tsx`
- Triggers: Authenticated navigation (`apps/web/src/components/navigation.tsx`).
- Responsibilities: Dashboard tabs (`overview`/`requests`/`calendar`), personal/team calendars, placeholder admin users page, shadcn gallery.
- Location: `packages/database/src/index.ts` (`databaseService`, `createDatabaseService`)
- Triggers: `createDatabaseService(supabase)` in `apps/web/src/providers/database-provider.tsx:25`
- Responsibilities: Construct facade bound to the web Supabase client.
- Location: `package.json` scripts, `scripts/dev-setup.sh`, `scripts/run-migration.js`, `scripts/create-migration.js`
- Triggers: Developers / CI.
- Responsibilities: Supabase start/push/reset, typegen into `packages/database/src/types.ts` (script target; generated file may be absent until run).

## Architectural Constraints

- **Threading:** Single-threaded Node/browser event loops. Next.js App Router; no worker threads. Supabase JS client is async. Realtime channels exist on the facade but are unused by UI hooks.
- **Global state:** `DatabaseServiceFactory` singleton (`packages/database/src/modules/database-service.ts:13`). Lazy `_supabase` + Proxy in `packages/database/src/index.ts:192`. Lazy `_env` + Proxy in `apps/web/src/lib/env.ts:109`. Separate eager `supabase` client in `apps/web/src/lib/supabase.ts:4`. QueryClient is per-provider instance, not a module singleton.
- **Circular imports:** `UserService` constructor requires `LeaveRequestService` (`packages/database/src/modules/users/service.ts:10`); `LeaveRequestService` requires `UserService` (`packages/database/src/modules/leave-requests/service.ts:22`). Factory creates `UserService` with `null as any`, then assigns `leaveRequestService` afterward (`packages/database/src/modules/database-service.ts:44-55`). Do not add a second cycle; extract a shared helper or event instead.
- **Security boundary:** Browser uses the anon key. Do not assume service-role on the client. RLS policies in `packages/database/migrations/` (especially `003`, `004`, `009`, `010`, `012`, `013`) are the real ACL. NextAuth JWT is independent of Supabase Auth — RLS must allow the anon role for the queries the UI makes.
- **No domain HTTP API:** Leave/approval/balance operations are not exposed as `app/api` routes. New features should go through `@timeoff/database` services, not ad-hoc `fetch` to new REST handlers, unless building a true BFF.
- **Auth vs domain split:** Identity writes (`apps/web/src/lib/auth.ts`, `apps/web/src/app/api/auth/signup/route.ts`) use `apps/web/src/lib/supabase.ts` directly. Domain reads/writes use the facade. Keep that split explicit or migrate auth onto `UserService` — do not invent a third client.
- **Package graph:** `@timeoff/web` depends on `@timeoff/database`, `@timeoff/types`, `@timeoff/utils` (`apps/web/package.json`). `next.config.js` transpiles those packages. `@timeoff/utils` is unused in TS imports. `@timeoff/ui` is not a workspace package.
- **Build:** `apps/web/next.config.js` sets `typescript.ignoreBuildErrors` and `eslint.ignoreDuringBuilds` — type errors will not fail `next build`.
- **Env files:** `apps/web/.env.local` present (gitignored). Root `.env` / `.env*.local` gitignored. Never commit secrets. `turbo.json` lists `**/.env.*local` as `globalDependencies`.

## Anti-Patterns

### Dual data-access paths

### Parallel type systems

### Unused / stub packages

### Factory circular dependency patch

### Best-effort side effects that hide failures

### Client-only ErrorBoundary

## Error Handling

- Repositories wrap Supabase errors with `DatabaseUtils.handleDatabaseError` (`packages/database/src/modules/shared/utils.ts:54`) → codes `NOT_FOUND`, `DUPLICATE_ENTRY`, `FOREIGN_KEY_VIOLATION`, `DATABASE_ERROR`.
- Domain services try/catch side effects and continue (see leave-request create/approve).
- Signup API returns 400 (validation), 409 (duplicate email), 500 (`apps/web/src/app/api/auth/signup/route.ts`).
- Hooks toast with `sonner` (`toast.error` / `toast.success` in `apps/web/src/hooks/use-leave-request-operations.ts`).
- Logging: `devLog` in `apps/web/src/lib/env.ts` (info/warn in development only; errors always). Database package uses `console.error`.
- No Sentry/OpenTelemetry. `ErrorBoundary` claims “team has been notified” but does not send telemetry.

## Cross-Cutting Concerns

<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->

## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:

- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->

## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
