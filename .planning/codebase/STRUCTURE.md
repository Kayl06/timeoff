# Codebase Structure

**Analysis Date:** 2026-08-29

## Directory Layout

```
timeoff/
├── apps/
│   └── web/                          # Next.js App Router application (@timeoff/web)
│       ├── src/
│       │   ├── app/                  # Routes, layouts, API route handlers
│       │   │   ├── (admin)/          # Route group: admin pages
│       │   │   ├── api/              # Route handlers (auth, diagnostics)
│       │   │   ├── auth/             # Sign-in / sign-up / password pages
│       │   │   ├── dashboard/        # Dashboard + slug tabs
│       │   │   ├── calendar/         # Personal/unified leave calendar
│       │   │   ├── team-calendar/    # Manager team calendar
│       │   │   ├── examples/         # shadcn component gallery
│       │   │   ├── layout.tsx        # Root layout + providers
│       │   │   ├── page.tsx          # `/` session redirect
│       │   │   └── globals.css       # Tailwind + CSS variables
│       │   ├── components/
│       │   │   ├── ui/               # shadcn/ui primitives
│       │   │   ├── dashboard/        # Dashboard feature components
│       │   │   ├── leave-request/    # Table + approve/reject/delete dialogs
│       │   │   ├── shared/           # Modals, calendar grid, export
│       │   │   ├── navigation.tsx    # Top nav (hidden on /auth)
│       │   │   ├── leave-request-form.tsx
│       │   │   ├── auth-loading.tsx
│       │   │   └── error-boundary.tsx
│       │   ├── hooks/                # TanStack Query feature hooks
│       │   ├── lib/                  # Auth, supabase, env, validation, adapters
│       │   ├── providers/            # Session, Query, Database DI
│       │   ├── types/                # NextAuth module augmentation
│       │   └── middleware.ts         # JWT route gate
│       ├── components.json           # shadcn/ui config (new-york)
│       ├── next.config.js
│       ├── tailwind.config.js
│       └── package.json
├── packages/
│   ├── database/                     # @timeoff/database — services + SQL
│   │   ├── src/
│   │   │   ├── index.ts              # Facade, supabase proxy, IDatabaseService
│   │   │   └── modules/              # Per-entity repository/service
│   │   ├── migrations/               # Canonical SQL migrations
│   │   └── seed.sql
│   ├── types/                        # @timeoff/types — shared DTOs/enums
│   │   └── src/index.ts
│   ├── utils/                        # @timeoff/utils — unused by web imports
│   │   └── src/index.ts
│   └── ui/                           # Stub barrel only (no package.json)
│       └── src/index.ts
├── supabase/
│   ├── config.toml                   # Local Supabase project `timeoff`
│   ├── migrations/                   # Symlink to packages/database/migrations
│   └── seed.sql
├── scripts/                          # Dev, Docker, migration helpers
├── package.json                      # Workspaces + turbo + supabase scripts
├── turbo.json
├── tsconfig.json                     # Shared compiler options
├── Dockerfile / Dockerfile.dev
└── vercel.json
```

## Directory Purposes

**`apps/web`:**
- Purpose: The only deployable application. Next.js 14 App Router UI + NextAuth + client-side data access.
- Contains: Pages, API routes, React components, hooks, providers, Tailwind, shadcn config.
- Key files: `apps/web/src/app/layout.tsx`, `apps/web/src/middleware.ts`, `apps/web/src/lib/auth.ts`, `apps/web/next.config.js`

**`apps/web/src/app`:**
- Purpose: File-system routing. Each folder is a URL segment.
- Contains: `page.tsx`, `layout.tsx`, `route.ts` handlers, `globals.css`.
- Key files: `apps/web/src/app/page.tsx`, `apps/web/src/app/dashboard/page.tsx`, `apps/web/src/app/api/auth/[...nextauth]/route.ts`

**`apps/web/src/components`:**
- Purpose: All React UI. Split by layer: `ui/` (atoms), feature folders, `shared/`.
- Contains: `.tsx` components; barrels `dashboard/index.ts`, `shared/index.ts`.
- Key files: `apps/web/src/components/dashboard/dashboard-view.tsx`, `apps/web/src/components/leave-request/data-table.tsx`, `apps/web/src/components/navigation.tsx`

**`apps/web/src/hooks`:**
- Purpose: Client hooks that own React Query keys and mutations.
- Contains: `use-dashboard-data.ts`, `use-leave-request-operations.ts`, `use-toast.ts` (shadcn toast helper).
- Key files: `apps/web/src/hooks/use-dashboard-data.ts`

**`apps/web/src/lib`:**
- Purpose: Web-app infrastructure (not domain services).
- Contains: NextAuth options, Supabase client, env proxy, Zod schemas, type adapters, `cn()`/date helpers.
- Key files: `apps/web/src/lib/auth.ts`, `apps/web/src/lib/supabase.ts`, `apps/web/src/lib/validation.ts`, `apps/web/src/lib/env.ts`

**`apps/web/src/providers`:**
- Purpose: Composition root for session, query cache, database DI.
- Contains: `session-provider.tsx` (used), `database-provider.tsx` (used), `minimal-session-provider.tsx` (unused duplicate).
- Key files: `apps/web/src/providers/session-provider.tsx`, `apps/web/src/providers/database-provider.tsx`

**`packages/database`:**
- Purpose: Domain layer and schema. Import as `@timeoff/database`.
- Contains: Modular services, `IDatabaseService` facade, SQL migrations, seed SQL, docs (`README.md`, `USAGE_EXAMPLES.md`).
- Key files: `packages/database/src/index.ts`, `packages/database/src/modules/database-service.ts`, `packages/database/src/modules/index.ts`

**`packages/database/src/modules`:**
- Purpose: One folder per aggregate. Barrel-exported from `modules/index.ts`.
- Contains: `users`, `leave-requests`, `leave-balances`, `departments`, `teams`, `notifications`, `calendar-events`, `leave-policies`, `audit-logs`, `shared`.
- Key files: `packages/database/src/modules/leave-requests/service.ts`, `packages/database/src/modules/leave-requests/repository.ts`

**`packages/types`:**
- Purpose: Shared TypeScript models/enums for the UI (`UserRole`, `LeaveType`, `RequestStatus`, etc.).
- Contains: Single barrel `packages/types/src/index.ts`.
- Key files: `packages/types/src/index.ts`

**`packages/utils`:**
- Purpose: Intended shared Zod + date + permission helpers.
- Contains: `packages/utils/src/index.ts` only. **Not imported** by `apps/web` — web copies live in `apps/web/src/lib/`.
- Key files: `packages/utils/src/index.ts`

**`packages/ui`:**
- Purpose: Documented as shared UI; currently a stub (`export` commented out).
- Contains: `packages/ui/src/index.ts` only. No `package.json` — **not** a workspace package.
- Key files: `packages/ui/src/index.ts`

**`supabase`:**
- Purpose: Supabase CLI project (local API port 54321, DB 54322, `project_id = "timeoff"`).
- Contains: `config.toml`, `seed.sql`, `migrations/` (symlink to `packages/database/migrations/`).
- Key files: `supabase/config.toml`

**`scripts`:**
- Purpose: Operational helpers outside Turbo pipelines.
- Contains: `dev-setup.sh`, `docker-*.sh`, `run-migration.js`, `create-migration.js`, `fix-rls.js`, `apply-rls-fix.js`, `setup-nginx.sh`.
- Key files: `scripts/dev-setup.sh`, `scripts/run-migration.js`

**Root config / ops:**
- Purpose: Monorepo orchestration and deploy.
- Contains: `package.json` (npm workspaces), `turbo.json`, `tsconfig.json`, `Dockerfile`, `Dockerfile.dev`, `vercel.json`.
- Key files: `package.json`, `turbo.json`

**`.planning/codebase`:**
- Purpose: GSD codebase maps consumed by plan/execute commands.
- Contains: `ARCHITECTURE.md`, `STRUCTURE.md` (this file), plus other maps from sibling focus runs.
- Key files: `.planning/codebase/ARCHITECTURE.md`

## Key File Locations

**Entry Points:**
- `apps/web/src/app/layout.tsx`: Root layout; `force-dynamic`; mounts `ClientSessionProvider`.
- `apps/web/src/app/page.tsx`: `/` — client redirect to dashboard or sign-in.
- `apps/web/src/middleware.ts`: NextAuth `withAuth` JWT gate.
- `apps/web/src/app/api/auth/[...nextauth]/route.ts`: NextAuth GET/POST.
- `apps/web/src/app/api/auth/signup/route.ts`: Credential registration.
- `apps/web/src/app/api/test-connection/route.ts`: Supabase connectivity probe.
- `packages/database/src/index.ts`: Package public API, facade, default `databaseService`.
- `packages/database/src/modules/database-service.ts`: Service factory singleton.

**Configuration:**
- `package.json`: Workspaces, Turbo scripts, Supabase CLI scripts, engines `node >= 18`.
- `turbo.json`: `build` / `dev` / `lint` / `type-check` / `test` pipeline.
- `tsconfig.json`: Shared TS (`strict`, `moduleResolution: bundler`).
- `apps/web/tsconfig.json`: Path aliases `@/*` → `./src/*`.
- `apps/web/next.config.js`: `transpilePackages` for `@timeoff/*`, `output: 'standalone'`.
- `apps/web/components.json`: shadcn aliases (`@/components/ui`, `@/lib/utils`).
- `apps/web/tailwind.config.js`: Tailwind + animate plugin.
- `supabase/config.toml`: Local Supabase ports and schemas.
- `vercel.json`: Build `turbo run build --filter=@timeoff/web...`.
- `apps/web/.env.local`: Present (gitignored) — environment configuration only; do not commit.

**Core Logic:**
- `apps/web/src/lib/auth.ts`: Providers, callbacks, JWT session.
- `apps/web/src/lib/supabase.ts`: Browser/server Supabase client used by auth and DI.
- `apps/web/src/providers/database-provider.tsx`: `createDatabaseService(supabase)` + `useDatabaseService()`.
- `apps/web/src/hooks/use-dashboard-data.ts`: Dashboard queries/mutations.
- `apps/web/src/hooks/use-leave-request-operations.ts`: Approve/reject/delete/bulk.
- `packages/database/src/modules/leave-requests/service.ts`: Leave lifecycle + audit/notify/balance side effects.
- `packages/database/src/modules/leave-requests/repository.ts`: `leave_requests` SQL via Supabase.
- `packages/database/src/modules/users/service.ts`: Users + team stats.
- `packages/types/src/index.ts`: Canonical UI-facing types.
- `apps/web/src/lib/validation.ts`: Web Zod schemas.
- `apps/web/src/lib/type-adapters.ts`: DB string → enum adapters.

**Routes (pages):**
- `apps/web/src/app/dashboard/page.tsx` — `/dashboard` (overview).
- `apps/web/src/app/dashboard/[slug]/page.tsx` — `/dashboard/requests`, `/dashboard/calendar`.
- `apps/web/src/app/calendar/page.tsx` — `/calendar`.
- `apps/web/src/app/team-calendar/page.tsx` — `/team-calendar` (supervisor/admin/hr).
- `apps/web/src/app/(admin)/users/page.tsx` — `/users` placeholder.
- `apps/web/src/app/auth/signin/page.tsx`, `signup/page.tsx`, `forgot-password/page.tsx`, `reset-password/page.tsx`, `error/page.tsx`.
- `apps/web/src/app/examples/page.tsx` — component playground.

**Testing:**
- Not detected. No `*.test.*` / `*.spec.*` files. Root `package.json` has `turbo run test`; `apps/web/package.json` has no `test` script. Place new tests next to source as `*.test.ts(x)` under `apps/web/src/` or `packages/*/src/` once a runner is added.

**Documentation (repo, not GSD maps):**
- `README.md`, `DEVELOPMENT.md`, `MIGRATIONS.md`, `ENVIRONMENT_SETUP.md`, `DOCKER_ENV_SETUP.md`
- `apps/web/AUTHENTICATION.md`, `apps/web/SHADCN_UI.md`, `apps/web/SUPABASE_SETUP.md`
- `packages/database/README.md`, `packages/database/USAGE_EXAMPLES.md`

## Naming Conventions

**Files:**
- Next.js routes: `page.tsx`, `layout.tsx`, `route.ts` (App Router conventions).
- React components: `kebab-case.tsx` matching the export (`dashboard-view.tsx` → `DashboardView`).
- Hooks: `use-<name>.ts` (`use-dashboard-data.ts`).
- shadcn primitives: `apps/web/src/components/ui/<component>.tsx` (lowercase, matches CLI).
- Domain modules: `types.ts`, `repository.ts`, `service.ts`, `index.ts` inside `packages/database/src/modules/<plural-entity>/`.
- Migrations: `NNN_description.sql` or timestamp prefix (`001_initial_schema.sql`, `20250807140800_add_deleted_at_column.sql`) in `packages/database/migrations/`.
- Path alias in web: `@/` → `apps/web/src/` (`apps/web/tsconfig.json`).

**Directories:**
- Route segments: lowercase URL paths (`auth`, `dashboard`, `calendar`).
- Route groups: parentheses, no URL segment (`(admin)` → `/users` not `/admin/users`).
- Feature UI folders: `dashboard`, `leave-request`, `shared`.
- Packages: `@timeoff/<name>` matching folder (`database`, `types`, `utils`).
- Database modules: plural kebab-case (`leave-requests`, `leave-balances`, `audit-logs`).

**Symbols:**
- React components: `PascalCase`.
- Hooks: `useCamelCase` (`useDatabaseService`, `useDashboardData`).
- Services/repositories: `PascalCase` + suffix (`LeaveRequestService`, `LeaveRequestRepository`).
- Factory getters: `getLeaveRequestService()`.
- DB columns and most DTOs: `snake_case` (`user_id`, `first_name`, `leave_type`).
- NextAuth session fields: mixed (`first_name` + `managerId`, `hireDate`, `isActive`) — map explicitly in pages (`apps/web/src/app/dashboard/page.tsx`).
- Enums in `@timeoff/types`: `PascalCase` enum name, `SCREAMING` or lowercase string values (`UserRole.EMPLOYEE = 'employee'`).
- Query keys: camelCase arrays (`['recentRequests', user.id]`, `['leaveBalance', user.id]`). Reuse existing keys when invalidating.

**Imports:**
- Web app: `@/components/...`, `@/lib/...`, `@/hooks/...`, `@/providers/...`.
- Cross-package: `@timeoff/database`, `@timeoff/types`. Do not import from `packages/*/src` via relative `../../`.
- shadcn utils: `@/lib/utils` (`cn`).

## Where to Add New Code

**New product feature (e.g. leave policies UI):**
- Domain types (if shared with UI): `packages/types/src/index.ts`
- Persistence + business rules: `packages/database/src/modules/<entity>/` (see New Domain Module)
- Facade method if hooks need it: `IDatabaseService` + `DatabaseService` in `packages/database/src/index.ts`
- Data hook: `apps/web/src/hooks/use-<feature>.ts` using `useDatabaseService()` and React Query
- Page: `apps/web/src/app/<route>/page.tsx` (`'use client'` if it uses session/hooks)
- Feature components: `apps/web/src/components/<feature>/`
- Nav link: `apps/web/src/components/navigation.tsx`
- Tests: `apps/web/src/hooks/use-<feature>.test.ts` and `packages/database/src/modules/<entity>/*.test.ts` (once a runner exists)

**New App Router page:**
- Implementation: `apps/web/src/app/<segment>/page.tsx`
- Nested layout (optional): `apps/web/src/app/<segment>/layout.tsx`
- Auth: middleware already requires JWT except `/auth` and `/api`. Add client role checks like `apps/web/src/app/team-calendar/page.tsx` if the page is role-gated.
- Admin-only URL without `/admin` prefix: use a route group `apps/web/src/app/(admin)/<page>/page.tsx`

**New API route (auth/diagnostics only unless introducing a BFF):**
- Implementation: `apps/web/src/app/api/<path>/route.ts`
- Validate with `apps/web/src/lib/validation.ts` (`validateInput`)
- Prefer `@timeoff/database` services over raw `supabase.from` for domain writes
- Keep using `apps/web/src/lib/supabase.ts` only for identity until auth is migrated

**New Domain Module:**
- Create `packages/database/src/modules/<plural-name>/types.ts`
- Create `repository.ts` taking `DatabaseClient`, using `DatabaseUtils.handleDatabaseError`
- Create `service.ts` taking the repository (+ `AuditLogService` if mutating)
- Create `index.ts` that `export *` from the three files
- Export from `packages/database/src/modules/index.ts`
- Register in `DatabaseServiceFactory.initializeServices` (`packages/database/src/modules/database-service.ts`) and add a `getXService()` getter
- Optionally wrap on `IDatabaseService` for UI
- Add SQL in `packages/database/migrations/NNN_description.sql` (never only under `supabase/migrations/` — that directory is a symlink)

**New React component:**
- Primitive (button, dialog slot): `apps/web/src/components/ui/` via shadcn CLI (`apps/web/components.json`)
- Feature-specific: `apps/web/src/components/<feature>/<kebab-name>.tsx`
- Cross-feature (modals, calendar grid, export): `apps/web/src/components/shared/`
- Dashboard-only: `apps/web/src/components/dashboard/` and export from `apps/web/src/components/dashboard/index.ts`
- Do **not** add to `packages/ui/` until it is a real package

**New hook:**
- Implementation: `apps/web/src/hooks/use-<name>.ts`
- Call `useDatabaseService()` for data; invalidate the same query keys as `use-dashboard-data.ts` / `use-leave-request-operations.ts`

**Utilities:**
- Web-only (`cn`, leave colors, date range display): `apps/web/src/lib/utils.ts` or `apps/web/src/lib/date-utils.ts`
- Web-only Zod: `apps/web/src/lib/validation.ts`
- Shared across packages: `packages/utils/src/index.ts` **and add an import** from the consumer
- DB query helpers: `packages/database/src/modules/shared/utils.ts`

**New TypeScript types:**
- UI / cross-app contracts: `packages/types/src/index.ts`
- NextAuth session shape: `apps/web/src/types/next-auth.d.ts`
- Module-internal DB shapes: `packages/database/src/modules/<entity>/types.ts`
- Adapter types for facade results: `apps/web/src/lib/type-adapters.ts`

**New migration:**
- File: `packages/database/migrations/` (single source of truth)
- Apply: `npm run supabase:db:push` from repo root
- Types: `npm run supabase:gen:types` writes `packages/database/src/types.ts`
- Helper scripts: `scripts/create-migration.js`, `scripts/run-migration.js`

**Environment variables:**
- Declare names and validation in `apps/web/src/lib/env.ts`
- Local values: `apps/web/.env.local` (gitignored). Do not add secrets to git or to these docs.

## Special Directories

**`apps/web/.next` / `packages/*/dist`:**
- Purpose: Build output (Next.js / `tsc`)
- Generated: Yes
- Committed: No (`.gitignore`)

**`node_modules/`:**
- Purpose: npm workspace installs
- Generated: Yes
- Committed: No

**`.turbo/`:**
- Purpose: Turborepo cache
- Generated: Yes
- Committed: No

**`.supabase/`:**
- Purpose: Local Supabase CLI state
- Generated: Yes
- Committed: No

**`packages/database/migrations/`:**
- Purpose: Canonical schema + RLS
- Generated: No (hand-written SQL)
- Committed: Yes

**`supabase/migrations/`:**
- Purpose: CLI-compatible view of the same migrations (symlink)
- Generated: Symlink / mirror
- Committed: Yes (as symlink per `README.md`)

**`apps/web/src/components/ui/`:**
- Purpose: Generated/maintained shadcn primitives
- Generated: CLI-scaffolded, then edited
- Committed: Yes

**`packages/ui/`:**
- Purpose: Placeholder for a future shared UI package
- Generated: No
- Committed: Yes (stub). Do not treat as the component library — that is `apps/web/src/components/ui/`

**`.env`, `.env.local`, `.env*.local`:**
- Purpose: Secrets and local config
- Generated: No
- Committed: No. Files may exist locally (`apps/web/.env.local`); never quote contents.

**`docker-compose*.yml`:**
- Purpose: Compose stacks (referenced by `package.json` / README)
- Generated: No
- Committed: No (`.gitignore` lists `docker-compose*.yml`)

**`.planning/`:**
- Purpose: GSD planning artifacts and codebase maps
- Generated: By GSD commands
- Committed: Per project convention (this mapper writes here)

**`.cursor/`:**
- Purpose: Editor/MCP config (e.g. `.cursor/mcp.json`)
- Generated: No
- Committed: Present in repo; not application runtime

---

*Structure analysis: 2026-08-29*
