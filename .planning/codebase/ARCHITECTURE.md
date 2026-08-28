<!-- refreshed: 2026-08-29 -->
# System Architecture

**Analysis Date:** 2026-08-29

## Pattern

**Overall:** Turborepo npm-workspaces monorepo with a Next.js App Router client, a modular Repository–Service data layer, and Supabase as the backend of record.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Next.js App Router  `apps/web`                        │
├────────────────────┬────────────────────┬───────────────────────────────┤
│  Routes / Pages    │  Providers         │  Feature UI + Hooks           │
│  `src/app/`        │  `src/providers/`  │  `src/components/`            │
│  `src/middleware.ts`│ `session-provider` │  `src/hooks/`                 │
└─────────┬──────────┴─────────┬──────────┴──────────────┬────────────────┘
          │                    │                         │
          │ JWT session        │ IDatabaseService        │ TanStack Query
          ▼                    ▼                         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Auth (NextAuth)              Database facade + domain services          │
│  `src/lib/auth.ts`            `@timeoff/database`                        │
│  `src/lib/supabase.ts`        `packages/database/src/`                   │
│                               Repository → Service → Factory             │
└─────────┬──────────────────────────────┬────────────────────────────────┘
          │                              │
          ▼                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Supabase (Postgres + RLS + Realtime)                                    │
│  schema: `packages/database/migrations/`                                 │
│  CLI: `supabase/config.toml`                                             │
│  shared types: `packages/types/src/index.ts`                             │
└─────────────────────────────────────────────────────────────────────────┘
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

**Overall:** Layered modular monolith. The only runtime application is `apps/web`. Domain logic lives in `@timeoff/database` as Repository + Service classes. The browser calls those services through React context; there is no general-purpose REST/BFF layer for leave, balances, or notifications.

**Key Characteristics:**
- npm workspaces (`apps/*`, `packages/*`) orchestrated by Turborepo (`turbo.json`).
- Next.js App Router with almost every page marked `'use client'`; root layout sets `dynamic = 'force-dynamic'` and `revalidate = 0` in `apps/web/src/app/layout.tsx`.
- Data access is client-side: components/hooks call `useDatabaseService()` which talks to Supabase with the anon key. Postgres RLS is the authorization boundary.
- Auth is NextAuth JWT (`session.strategy: 'jwt'` in `apps/web/src/lib/auth.ts`), not Supabase Auth sessions.
- Domain modules follow a fixed four-file shape: `types.ts`, `repository.ts`, `service.ts`, `index.ts`.
- A legacy facade (`DatabaseService` / `IDatabaseService` in `packages/database/src/index.ts`) is what the web app actually injects.

## Layers

**Presentation (routes + UI):**
- Purpose: Render pages, collect input, enforce client-side role UX.
- Location: `apps/web/src/app/`, `apps/web/src/components/`
- Contains: App Router pages, shadcn/ui primitives (`apps/web/src/components/ui/`), feature components (`dashboard/`, `leave-request/`, `shared/`), navigation (`apps/web/src/components/navigation.tsx`).
- Depends on: hooks, providers, `@timeoff/types`, shadcn aliases from `apps/web/components.json`.
- Used by: End users via Next.js routes.

**Application / client state:**
- Purpose: Session, React Query cache, form state, toast notifications.
- Location: `apps/web/src/providers/`, `apps/web/src/hooks/`, `apps/web/src/lib/`
- Contains: `ClientSessionProvider`, `DatabaseServiceProvider`, `useDashboardData`, `useLeaveRequestOperations`, Zod schemas in `apps/web/src/lib/validation.ts`, env proxy in `apps/web/src/lib/env.ts`.
- Depends on: `next-auth/react`, `@tanstack/react-query`, `@timeoff/database`, `@timeoff/types`.
- Used by: Pages and feature components.

**Domain services:**
- Purpose: Business operations (create/approve/reject leave, balances, notifications, audit).
- Location: `packages/database/src/modules/*/service.ts`
- Contains: `LeaveRequestService`, `UserService`, `LeaveBalanceService`, `NotificationService`, `AuditLogService`, `DepartmentService`, `TeamService`, `CalendarEventService`, `LeavePolicyService`.
- Depends on: matching repositories plus peer services (audit, notifications, balances, users).
- Used by: `DatabaseService` facade (`packages/database/src/index.ts`) via `DatabaseServiceFactory`.

**Persistence (repositories):**
- Purpose: Supabase table queries, joins, soft-delete filters, error mapping.
- Location: `packages/database/src/modules/*/repository.ts`
- Contains: `from('table')` queries; `LeaveRequestRepository` joins `users!leave_requests_user_id_fkey`.
- Depends on: `DatabaseClient` (`packages/database/src/modules/shared/types.ts`) and `DatabaseUtils` (`packages/database/src/modules/shared/utils.ts`).
- Used by: Domain services only.

**Auth / identity:**
- Purpose: Sign-in, sign-up, JWT session, route gating.
- Location: `apps/web/src/lib/auth.ts`, `apps/web/src/lib/supabase.ts`, `apps/web/src/app/api/auth/`
- Contains: Google OAuth (optional), credentials + bcrypt, session callback that re-reads `users`.
- Depends on: `users` table columns (`email`, `password`, profile fields). Does **not** use `UserService`.
- Used by: Middleware and `useSession()` in pages.

**Shared contracts:**
- Purpose: Cross-package TypeScript models and enums.
- Location: `packages/types/src/index.ts`
- Contains: `User`, `LeaveRequest`, `UserRole`, `LeaveType`, `RequestStatus`, dashboard/API helper types.
- Depends on: Nothing.
- Used by: Web UI. Database package currently redefines parallel local interfaces in `packages/database/src/index.ts` and per-module `types.ts`.

**Infrastructure:**
- Purpose: Schema, local Supabase, Docker, Vercel.
- Location: `packages/database/migrations/`, `supabase/`, `Dockerfile`, `Dockerfile.dev`, `scripts/`, `vercel.json`
- Contains: SQL migrations (single source of truth), `supabase/config.toml`, docker/dev scripts.
- Depends on: Supabase CLI, Docker.
- Used by: Local/prod environments.

## Data Flow

### Primary Request Path

Authenticated page load and dashboard data:

1. Request hits `apps/web/src/middleware.ts` (`withAuth`); paths under `/auth`, `/api`, `_next`, and `favicon.ico` are excluded via `config.matcher`.
2. Root layout wraps the tree in `ClientSessionProvider` (`apps/web/src/app/layout.tsx:34`) → NextAuth session + QueryClient + `DatabaseServiceProvider` (`apps/web/src/providers/session-provider.tsx:33`).
3. `/` (`apps/web/src/app/page.tsx:15`) client-redirects to `/dashboard` or `/auth/signin` based on `useSession()`.
4. `/dashboard` (`apps/web/src/app/dashboard/page.tsx`) maps the NextAuth user and renders `DashboardView` (`apps/web/src/components/dashboard/dashboard-view.tsx`).
5. `useDashboardData` (`apps/web/src/hooks/use-dashboard-data.ts:47`) calls `useDatabaseService()` and runs React Query against `IDatabaseService` (`getLeaveBalance`, `getLeaveRequestsByUser`, role-gated team/all queries).
6. Facade methods in `packages/database/src/index.ts` (e.g. `getLeaveRequestsByUser` at line 332) delegate to `DatabaseServiceFactory.getLeaveRequestService()`.
7. `LeaveRequestService.getLeaveRequestsByUser` (`packages/database/src/modules/leave-requests/service.ts:29`) calls `LeaveRequestRepository.findByUserId` (`packages/database/src/modules/leave-requests/repository.ts:33`).
8. Repository queries Supabase `leave_requests` with `.is('deleted_at', null)` and returns rows; hooks adapt strings to enums via `apps/web/src/lib/type-adapters.ts`.

### Leave Request Submit Flow

1. `DashboardHeader` (`apps/web/src/components/dashboard/dashboard-header.tsx:33`) opens `LeaveRequestForm`.
2. Form validates with `leaveRequestSchema` (`apps/web/src/lib/validation.ts:75`) via `zodResolver`.
3. Header maps dates/half-day into a DB payload and calls `createLeaveRequest` from `useDashboardData` (`apps/web/src/hooks/use-dashboard-data.ts:97`).
4. `databaseService.createLeaveRequest` → `LeaveRequestService.createLeaveRequest` (`packages/database/src/modules/leave-requests/service.ts:45`): insert, then best-effort audit log and approver notification.
5. If the actor is a manager, the hook auto-approves (`use-dashboard-data.ts:102`).
6. On success, React Query keys are invalidated (`leaveBalance`, `recentRequests`, `notifications`, `teamLeaveRequests`, `allLeaveRequests`, `personalLeaveRequests`) and Sonner toasts.

### Approval Flow

1. `LeaveRequestDataTable` (`apps/web/src/components/leave-request/data-table.tsx`) uses `useLeaveRequestOperations` (`apps/web/src/hooks/use-leave-request-operations.ts:12`).
2. `approveLeaveRequest` mutation calls `databaseService.approveLeaveRequest` (`use-leave-request-operations.ts:66`).
3. Facade maps comments into `ApprovalData` (`packages/database/src/index.ts:352`).
4. `LeaveRequestService.approveLeaveRequest` (`packages/database/src/modules/leave-requests/service.ts:109`) updates the row, then best-effort: `LeaveBalanceService.updateBalanceAfterApproval`, audit log, user notification.
5. Query cache invalidation + toast.

### Authentication Flow

1. Sign-in UI (`apps/web/src/app/auth/signin/page.tsx`) calls `signIn('credentials' | 'google')`.
2. NextAuth handler (`apps/web/src/app/api/auth/[...nextauth]/route.ts:5`) uses `authOptions` (`apps/web/src/lib/auth.ts:9`).
3. Credentials `authorize` (`apps/web/src/lib/auth.ts:24`) queries `users` via `apps/web/src/lib/supabase.ts` and `bcrypt.compare`.
4. Google `signIn` callback (`apps/web/src/lib/auth.ts:72`) inserts a default employee if missing (`mapUserToDatabase`).
5. `session` callback (`apps/web/src/lib/auth.ts:114`) re-fetches `users` by email and copies role/department onto `session.user` (augmented in `apps/web/src/types/next-auth.d.ts`).
6. JWT lives 30 days (`apps/web/src/lib/auth.ts:164`). Middleware requires a token for all matched non-auth routes.

### Sign-up Flow

1. `POST` `apps/web/src/app/api/auth/signup/route.ts:7` validates with `userRegistrationSchema`.
2. Duplicate email check against `users`, bcrypt hash (12 rounds), insert via `mapUserToDatabase` — **not** `UserService.createUser`.
3. Returns 201 without password.

**State Management:**
- Server session: NextAuth JWT cookie (no NextAuth database adapter).
- Server/client user profile: `users` table, copied onto the session on each `session` callback.
- Remote domain state: Supabase tables; React Query cache in the browser (`staleTime: 60_000`, `refetchOnWindowFocus: false` in `apps/web/src/providers/session-provider.tsx:20`).
- Local UI state: React `useState` (tabs, row selection, dialogs). No Redux/Zustand.
- Realtime: `IDatabaseService` defines `subscribeToLeaveRequests` / `subscribeToNotifications` / `subscribeToApprovals` (`packages/database/src/index.ts:440`) but dashboard hooks do not subscribe; they poll via React Query.

## Key Abstractions

**`IDatabaseService` / `DatabaseService`:**
- Purpose: Single injectable facade the web app depends on.
- Examples: `packages/database/src/index.ts`, consumed in `apps/web/src/providers/database-provider.tsx`
- Pattern: Facade over `DatabaseServiceFactory`. Prefer this for UI code. When adding a method, implement it on the domain service first, then expose it on the facade if hooks need it.

**`DatabaseServiceFactory`:**
- Purpose: Singleton composition root for repositories and services.
- Examples: `packages/database/src/modules/database-service.ts`
- Pattern: Private constructor, `getInstance(db)`, `Map<string, service>`. First client wins — pass the web `supabase` from `apps/web/src/lib/supabase.ts`.

**Domain module (entity folder):**
- Purpose: One bounded context per table/aggregate.
- Examples: `packages/database/src/modules/leave-requests/`, `packages/database/src/modules/users/`, `packages/database/src/modules/leave-balances/`
- Pattern: `types.ts` + `repository.ts` + `service.ts` + barrel `index.ts`. Re-export from `packages/database/src/modules/index.ts`.

**`DatabaseClient` / `DatabaseUtils`:**
- Purpose: Minimal Supabase surface and shared error/filter helpers.
- Examples: `packages/database/src/modules/shared/types.ts`, `packages/database/src/modules/shared/utils.ts`
- Pattern: Repositories take `DatabaseClient`; throw `ServiceError` via `DatabaseUtils.handleDatabaseError` (maps `PGRST116`, `23505`, `23503`).

**Type adapters:**
- Purpose: Cast database string columns to `@timeoff/types` enums.
- Examples: `apps/web/src/lib/type-adapters.ts`
- Pattern: `adaptLeaveRequest` / `adaptLeaveBalance` / `adaptNotifications`. Use after facade calls before rendering.

**Env proxy:**
- Purpose: Lazy-validated `process.env` access with `devLog`.
- Examples: `apps/web/src/lib/env.ts`
- Pattern: `Proxy` around `getEnv()`. Required-var throw is currently commented out — treat missing vars as runtime failures later, not compile-time.

**shadcn/ui primitives:**
- Purpose: Design-system atoms for forms, dialogs, tables.
- Examples: `apps/web/src/components/ui/button.tsx`, `apps/web/src/components/ui/form.tsx`
- Pattern: New-York style, CSS variables, `cn()` from `apps/web/src/lib/utils.ts`. Add via shadcn CLI using `apps/web/components.json`.

## Entry Points

**Next.js web app:**
- Location: `apps/web/src/app/layout.tsx`, `apps/web/src/app/page.tsx`
- Triggers: `next dev` / `next start` via `apps/web/package.json`; Turbo `dev`/`build` from root `package.json`.
- Responsibilities: HTML shell, providers, homepage redirect.

**HTTP middleware:**
- Location: `apps/web/src/middleware.ts`
- Triggers: Every matched document request (not `/api`, `/auth`, static).
- Responsibilities: Require NextAuth JWT; pass-through for `/auth`.

**NextAuth API:**
- Location: `apps/web/src/app/api/auth/[...nextauth]/route.ts`
- Triggers: Sign-in, sign-out, session, OAuth callback.
- Responsibilities: Provider handlers using `authOptions`.

**Signup API:**
- Location: `apps/web/src/app/api/auth/signup/route.ts`
- Triggers: `POST` from `apps/web/src/app/auth/signup/page.tsx`
- Responsibilities: Zod validation, bcrypt, insert `users`.

**Connection test API:**
- Location: `apps/web/src/app/api/test-connection/route.ts`
- Triggers: Manual `GET` for diagnostics.
- Responsibilities: Probe `users` table; report whether URL/anon key env names are set (not values).

**Application routes:**
- Location: `apps/web/src/app/dashboard/page.tsx`, `apps/web/src/app/dashboard/[slug]/page.tsx`, `apps/web/src/app/calendar/page.tsx`, `apps/web/src/app/team-calendar/page.tsx`, `apps/web/src/app/(admin)/users/page.tsx`, `apps/web/src/app/examples/page.tsx`
- Triggers: Authenticated navigation (`apps/web/src/components/navigation.tsx`).
- Responsibilities: Dashboard tabs (`overview`/`requests`/`calendar`), personal/team calendars, placeholder admin users page, shadcn gallery.

**Database package default instance:**
- Location: `packages/database/src/index.ts` (`databaseService`, `createDatabaseService`)
- Triggers: `createDatabaseService(supabase)` in `apps/web/src/providers/database-provider.tsx:25`
- Responsibilities: Construct facade bound to the web Supabase client.

**CLI / ops:**
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

**What happens:** Auth and signup query/insert `users` through `apps/web/src/lib/supabase.ts`, while dashboard code uses `IDatabaseService` → `UserService`.
**Why it's wrong:** Duplicate mapping (`mapUserFromDatabase` vs repository types), missed audit logs, and RLS/column changes must be applied in two places.
**Do this instead:** Route identity operations through `UserService` (`packages/database/src/modules/users/service.ts`) or a dedicated auth repository used by both `auth.ts` and signup.

### Parallel type systems

**What happens:** `@timeoff/types` defines `User`/`LeaveRequest` with enums; `packages/database/src/index.ts` redefines untyped local interfaces; each module has its own `types.ts`; web casts via `apps/web/src/lib/type-adapters.ts`.
**Why it's wrong:** Drift (camelCase vs snake_case, string vs enum) and runtime-only casts.
**Do this instead:** Import from `@timeoff/types` in repositories/services, or generate one schema from Supabase into `packages/database/src/types.ts` and derive UI types from it. Keep adapters only at the UI edge until then.

### Unused / stub packages

**What happens:** `packages/utils/src/index.ts` duplicates validation/date helpers; web uses `apps/web/src/lib/validation.ts` and `apps/web/src/lib/date-utils.ts` instead. `packages/ui/src/index.ts` is empty.
**Why it's wrong:** README (`README.md`) implies a shared UI kit; implementers will put code in the wrong package.
**Do this instead:** Put web-only Zod schemas in `apps/web/src/lib/validation.ts`. Put truly shared helpers in `packages/utils/src/index.ts` **and import them**. Do not add components to `packages/ui/` until it is a real workspace package with `package.json`.

### Factory circular dependency patch

**What happens:** `(userService as any).leaveRequestService = leaveRequestService` in `packages/database/src/modules/database-service.ts:55`.
**Why it's wrong:** Breaks constructor invariants; methods that run before assignment, or new factory instances, fail silently.
**Do this instead:** Extract team-stats queries that need both users and leave requests into a third service, or pass a getter/`() => LeaveRequestService`.

### Best-effort side effects that hide failures

**What happens:** `LeaveRequestService` catches audit/notification/balance errors and logs `console.error` without failing the primary mutation (`packages/database/src/modules/leave-requests/service.ts:62`, `:115`).
**Why it's wrong:** Approved leave can skip balance updates; UI shows success while data is inconsistent.
**Do this instead:** For balance updates, fail the approval or run it in a DB transaction/RPC. Keep audit/notify best-effort only if product accepts that, and surface a warning toast from the hook.

### Client-only ErrorBoundary

**What happens:** `apps/web/src/components/error-boundary.tsx` exists (`ErrorBoundary`, `withErrorBoundary`) but is not mounted in `apps/web/src/app/layout.tsx`. `MinimalSessionProvider` is imported in layout and unused.
**Why it's wrong:** Uncaught render errors take down the tree; dead imports confuse the composition root.
**Do this instead:** Wrap `{children}` with `ErrorBoundary`. Remove unused provider imports. Prefer `app/error.tsx` for App Router errors.

## Error Handling

**Strategy:** Layered — Zod at forms/API, `ServiceError` at repositories, toast + React Query `onError` at the UI, React class boundary unused.

**Patterns:**
- Repositories wrap Supabase errors with `DatabaseUtils.handleDatabaseError` (`packages/database/src/modules/shared/utils.ts:54`) → codes `NOT_FOUND`, `DUPLICATE_ENTRY`, `FOREIGN_KEY_VIOLATION`, `DATABASE_ERROR`.
- Domain services try/catch side effects and continue (see leave-request create/approve).
- Signup API returns 400 (validation), 409 (duplicate email), 500 (`apps/web/src/app/api/auth/signup/route.ts`).
- Hooks toast with `sonner` (`toast.error` / `toast.success` in `apps/web/src/hooks/use-leave-request-operations.ts`).
- Logging: `devLog` in `apps/web/src/lib/env.ts` (info/warn in development only; errors always). Database package uses `console.error`.
- No Sentry/OpenTelemetry. `ErrorBoundary` claims “team has been notified” but does not send telemetry.

## Cross-Cutting Concerns

**Logging:** `devLog` (`apps/web/src/lib/env.ts:143`) for web/auth. `console.error` in `@timeoff/database` services/utils. No structured logger, no request IDs.

**Validation:** Primary schemas live in `apps/web/src/lib/validation.ts` (registration, sign-in, leave request, password reset, profile). Forms use `react-hook-form` + `@hookform/resolvers/zod`. API uses `validateInput` / `formatValidationErrors`. `packages/utils/src/index.ts` has a parallel `leaveRequestSchema` (camelCase) — do not mix the two. Repositories may call `DatabaseUtils.validateRequiredFields`.

**Authentication:** NextAuth v4 JWT with Credentials + optional Google (`apps/web/src/lib/auth.ts`). Route protection in `apps/web/src/middleware.ts` (presence of token only — **not** role-based). Role UX is client-side (`isManager` / `isAdminOrHR` in `apps/web/src/hooks/use-dashboard-data.ts:51`). Team calendar page additionally redirects non-managers (`apps/web/src/app/team-calendar/page.tsx:21`). RBAC for data must be enforced in RLS and/or service methods, not only in React.

**Authorization / RLS:** SQL policies in `packages/database/migrations/`. NextAuth does not set `auth.uid()`; migration `009_fix_rls_for_nextauth.sql` exists specifically for this mismatch. New tables need policies that match anon-key access from the browser.

**Styling:** Tailwind + CSS variables (`apps/web/src/app/globals.css`, `apps/web/tailwind.config.js`). `cn()` in `apps/web/src/lib/utils.ts`. lucide-react icons.

**Theming:** `next-themes` is a dependency; dark classes appear in layouts. No dedicated theme provider in `apps/web/src/app/layout.tsx`.

---

*Architecture analysis: 2026-08-29*
