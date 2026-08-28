# Codebase Concerns

**Analysis Date:** 2026-08-29

## Tech Debt

**RLS disabled in favor of "application-layer" authorization that does not exist:**
- Issue: After NextAuth replaced Supabase Auth, migrations replaced real RLS predicates with `USING (true)` / `WITH CHECK (true)` and documented that the app would enforce authorization. The app talks to Supabase from the browser with the public anon key and never implements those checks.
- Files: `packages/database/migrations/009_fix_rls_for_nextauth.sql`, `packages/database/migrations/010_add_delete_policies.sql`, `packages/database/migrations/012_add_audit_logs_policies.sql`, `packages/database/migrations/013_add_notifications_insert_policy.sql`, `packages/database/RLS_POLICY_FIX.md`, `apps/web/src/providers/database-provider.tsx`, `apps/web/src/lib/supabase.ts`
- Impact: Database-level access control is a no-op. Any holder of the public anon key can read and mutate leave requests, users, notifications, and related tables.
- Fix approach: Move all writes behind Next.js API routes (or server actions) that use the session. Restore RLS using a custom JWT claim or a service-role server client. Do not keep `USING (true)` policies.

**Client-side DatabaseService as the write path:**
- Issue: `DatabaseServiceProvider` instantiates `@timeoff/database` against the browser Supabase client. Mutations (create/approve/reject/delete/bulk update) run in the browser.
- Files: `apps/web/src/providers/database-provider.tsx`, `packages/database/src/index.ts`, `apps/web/src/hooks/use-dashboard-data.ts`, `apps/web/src/hooks/use-leave-request-operations.ts`
- Impact: Role flags (`isManager`, `isAdminOrHR`) are UI-only. A user can call `getAllLeaveRequests()`, `approveLeaveRequest()`, or `bulkUpdateLeaveRequests()` regardless of role.
- Fix approach: Expose a server API that checks `session.user.role` and `session.user.id` before calling repositories. Keep the React Query hooks; change `mutationFn` to hit those routes.

**Circular service construction and singleton factory:**
- Issue: `UserService` needs `LeaveRequestService` and vice versa. The factory constructs `UserService` with `null as any`, then mutates the private field. The factory is a process-wide singleton keyed on the first `DatabaseClient` it sees.
- Files: `packages/database/src/modules/database-service.ts`
- Impact: Tests cannot inject isolated clients. First client wins for the process. The `null as any` path is a runtime landmine if `getManagerTeamStats` runs before the patch.
- Fix approach: Break the cycle (stats live on a dedicated service or repository). Pass dependencies through constructors. Drop the singleton or key it by client.

**Duplicated type systems and a legacy facade:**
- Issue: The same domain types are defined in `packages/types/src/index.ts`, `packages/database/src/index.ts` (hand-written `Database` schema), per-module `packages/database/src/modules/*/types.ts`, and `apps/web/src/lib/type-adapters.ts`. `IDatabaseService` / `DatabaseService` is marked legacy but is the only interface the web app uses. Supabase generated types (`npm run supabase:gen:types` → `packages/database/src/types.ts`) are not present.
- Files: `packages/types/src/index.ts`, `packages/database/src/index.ts`, `apps/web/src/lib/type-adapters.ts`, `packages/database/src/modules/users/types.ts`
- Impact: `as any` casts everywhere (`unified-calendar-view.tsx`, `data-table.tsx`, `export-utils.ts`). Schema drift is invisible. `UserRole` is an enum in types and a string everywhere else.
- Fix approach: Generate types from Supabase, re-export from `@timeoff/types`, delete the hand-written `Database` interface and adapters.

**Build quality gates turned off:**
- Issue: Next.js ignores TypeScript and ESLint during build. Root env validation that would throw on missing vars is commented out. There is no ESLint/Prettier config file despite those packages being listed.
- Files: `apps/web/next.config.js`, `apps/web/src/lib/env.ts`, `package.json`, `apps/web/package.json`
- Impact: Broken types and lint ship. Missing env fails later with opaque runtime errors instead of a clear boot failure.
- Fix approach: Set `ignoreBuildErrors` and `ignoreDuringBuilds` to false. Uncomment `validateEnvironment` throw. Add `eslint-config-next` config and a Prettier config.

**Duplicate UI kits, calendars, and toast systems:**
- Issue: Three toast stacks (`sonner`, `react-hot-toast`, shadcn `use-toast`). Auth pages import `react-hot-toast` but the root provider only mounts `<Sonner />`, so signup/forgot-password toasts never appear. Two approve dialogs. Three calendar views. Two session providers (`ClientSessionProvider` used; `MinimalSessionProvider` unused). `ErrorBoundary` is never mounted.
- Files: `apps/web/src/providers/session-provider.tsx`, `apps/web/src/providers/minimal-session-provider.tsx`, `apps/web/src/app/auth/signup/page.tsx`, `apps/web/src/app/auth/forgot-password/page.tsx`, `apps/web/src/components/leave-request/approve-leave-request-dialog.tsx`, `apps/web/src/components/leave-request/enhanced-approve-dialog.tsx`, `apps/web/src/components/dashboard/unified-calendar-view.tsx`, `apps/web/src/components/dashboard/leave-calendar-view.tsx`, `apps/web/src/components/dashboard/team-calendar-view.tsx`, `apps/web/src/components/error-boundary.tsx`, `apps/web/src/app/layout.tsx`
- Impact: Dead code, inconsistent UX, silent toast failures, larger bundle.
- Fix approach: Standardize on Sonner. Delete unused dialogs/calendars/providers. Wrap the tree with `ErrorBoundary`.

**Global `force-dynamic` and mock timestamps:**
- Issue: Root layout forces dynamic rendering for every page. Dashboard maps `created_at`/`updated_at` to `new Date()` ("mock value").
- Files: `apps/web/src/app/layout.tsx`, `apps/web/src/app/dashboard/page.tsx`, `apps/web/src/components/dashboard/dashboard-view.tsx`
- Impact: No static/ISR benefit. User objects on the client have fake timestamps that can leak into displays or writes.
- Fix approach: Limit `force-dynamic` to auth-gated routes. Pass real `created_at`/`updated_at` from the users table.

**Dead / demo surfaces in the app router:**
- Issue: `/examples` is a component gallery. `/(admin)/users` is a stub (`return <div>Users</div>`). `shared/modal-examples.tsx` is a playground. Migration helper scripts exist alongside official `supabase db` commands.
- Files: `apps/web/src/app/examples/page.tsx`, `apps/web/src/app/(admin)/users/page.tsx`, `apps/web/src/components/shared/modal-examples.tsx`, `scripts/run-migration.js`, `scripts/fix-rls.js`, `scripts/apply-rls-fix.js`
- Impact: Demo routes are reachable to any authenticated user (middleware only checks a JWT exists, not role). Admin IA is unfinished.
- Fix approach: Gate or remove `/examples`. Build the users admin page or unroute it. Prefer `supabase db push` over custom JS migrators.

**Lockfile and compose files gitignored:**
- Issue: Root `.gitignore` ignores `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, and `docker-compose*.yml`.
- Files: `.gitignore`
- Impact: Installs are not reproducible. CI/CD (when added) cannot pin versions. Compose files cannot be shared.
- Fix approach: Commit the npm lockfile (`packageManager` is `npm@10.2.4`). Stop ignoring compose files; keep secrets in env files only.

---

## Known Bugs

**Leave balance card ignores live data and always renders mocks:**
- Symptoms: Dashboard always shows vacation 5/10, sick 5/20, personal 5/10 for year 2025, regardless of the user's real balances.
- Files: `apps/web/src/components/dashboard/leave-balance-card.tsx`
- Trigger: Open dashboard overview.
- Workaround: None in UI. Real data is fetched by `useDashboardData` but unused by this card.

**Notifications use invalid `type` values and are swallowed:**
- Symptoms: Approval/rejection notifications never persist. `createNotification` catches the CHECK failure and returns a fake row with `id: 'notification-failed'`. Callers treat that as success.
- Files: `packages/database/src/modules/notifications/service.ts`, `packages/database/migrations/001_initial_schema.sql`
- Trigger: Approve or reject a leave request. Schema allows `request_approved | request_rejected | request_pending | leave_balance_update | policy_change | system_announcement`; service writes `success | error | warning | info`.
- Workaround: None. Users will not see in-app notifications.

**Audit logs with `user_id: 'system'` cannot insert:**
- Symptoms: Soft-delete and restore audit rows fail the `audit_logs.user_id` FK (`users.id` is UUID). Failures are swallowed; a mock audit row is returned.
- Files: `packages/database/src/modules/leave-requests/service.ts`, `packages/database/src/modules/audit-logs/service.ts`, `packages/database/migrations/001_initial_schema.sql`
- Trigger: Soft-delete or restore a leave request.
- Workaround: None. Compliance trail is incomplete.

**`changeUserRole` logs the new role as `previous_role`:**
- Symptoms: Audit `CHANGE_USER_ROLE` details have `previous_role` equal to `new_role`.
- Files: `packages/database/src/modules/users/service.ts`
- Trigger: Call `changeUserRole`. The user is updated first; then `user.role` (already new) is written as previous.
- Workaround: Read the user before update.

**Bulk approve/reject skips balance, audit, and notifications:**
- Symptoms: Bulk actions set `status` via `bulkUpdateLeaveRequests` and do not call `approveLeaveRequest` / `rejectLeaveRequest`. Used days are not incremented. No emails/in-app notices.
- Files: `apps/web/src/hooks/use-leave-request-operations.ts`, `packages/database/src/modules/leave-requests/repository.ts`
- Trigger: Select multiple rows and bulk approve/reject.
- Workaround: Approve one-by-one.

**Balance update after approval can silently no-op or go negative:**
- Symptoms: If no `leave_balances` row exists for that user/type/year, approval succeeds and nothing is deducted. Remaining days are not clamped. Year is `new Date().getFullYear()`, not the request's year.
- Files: `packages/database/src/modules/leave-balances/service.ts`, `packages/database/src/modules/leave-requests/service.ts`
- Trigger: Approve a request with no balance row, a cross-year request, or more days than remaining.
- Workaround: Seed balances before go-live; do not rely on this path.

**Deactivated users can still sign in; `is_active` mapping is wrong:**
- Symptoms: `authorize` in NextAuth never checks `is_active`. `mapUserFromDatabase` uses `dbUser.is_active || dbUser.isActive`, so `false` falls through. DashboardView then does `session?.user.isActive || true`, forcing inactive users to appear active.
- Files: `apps/web/src/lib/auth.ts`, `apps/web/src/lib/supabase.ts`, `apps/web/src/components/dashboard/dashboard-view.tsx`
- Trigger: Deactivate a user, then sign in with their credentials.
- Workaround: None.

**Password reset is simulated:**
- Symptoms: Forgot-password waits 2s and shows success without sending mail. Reset-password does not persist a new hash. `passwordResetSchema` exists but has no API.
- Files: `apps/web/src/app/auth/forgot-password/page.tsx`, `apps/web/src/app/auth/reset-password/page.tsx`, `apps/web/src/lib/validation.ts`
- Trigger: Use "Forgot password" from sign-in.
- Workaround: An admin would have to hash and write `users.password` directly.

**Signup never creates leave balances or assigns department/team:**
- Symptoms: New users get `department: 'Unassigned'`, `team: 'Unassigned'`, no `leave_balances` rows. Managers auto-approve their own requests (`use-dashboard-data.ts`).
- Files: `apps/web/src/app/api/auth/signup/route.ts`, `apps/web/src/hooks/use-dashboard-data.ts`
- Trigger: Self-signup then open dashboard / submit leave.
- Workaround: Manually insert balances and org fields.

**`getNotificationsByUser` limit is dropped:**
- Symptoms: Dashboard requests 5 notifications; `DatabaseService.getNotificationsByUser` ignores the second argument. Repository default is 50.
- Files: `packages/database/src/index.ts`, `apps/web/src/hooks/use-dashboard-data.ts`, `packages/database/src/modules/notifications/repository.ts`
- Trigger: Load dashboard.
- Workaround: None needed for correctness, but the API contract is a lie.

**`getTeamLeaveRequests` ignores department:**
- Symptoms: `IDatabaseService.getTeamLeaveRequests(managerId, managerDepartment)` drops `managerDepartment`. Filtering is only `users.manager_id`.
- Files: `packages/database/src/index.ts`, `packages/database/src/modules/leave-requests/repository.ts`
- Trigger: Manager with a department that does not match `manager_id` links.
- Workaround: Keep `manager_id` accurate.

**User enumeration on credentials login:**
- Symptoms: Distinct errors `'User not found'` vs `'Invalid password'` before both collapse to `return null`. Combined with open signup, this helps account probing.
- Files: `apps/web/src/lib/auth.ts`
- Trigger: POST credentials with unknown email vs wrong password.
- Workaround: Always return a generic invalid-credentials result.

**Day counts include weekends and holidays:**
- Symptoms: `apps/web/src/lib/date-utils.ts` uses inclusive calendar days. `packages/utils/src/index.ts` has `calculateWorkingDays` but the web app does not use it. No holiday calendar subtraction.
- Files: `apps/web/src/lib/date-utils.ts`, `packages/utils/src/index.ts`
- Trigger: Request Mon–Fri (5) vs Fri–Mon (4 calendar days including weekend).
- Workaround: Manual `total_days` is not exposed; users over/under consume allowance.

**Dashboard `[slug]` is a Next 14 sync `params` page:**
- Symptoms: `apps/web` depends on Next `^14.2.18` while the root workspace depends on Next `15.4.6`. If 15 is hoisted, `params` becomes a Promise and this page breaks.
- Files: `apps/web/src/app/dashboard/[slug]/page.tsx`, `apps/web/package.json`, `package.json`
- Trigger: Install with hoisted Next 15.
- Workaround: Pin Next to one major in the workspace.

**`rememberMe` does nothing:**
- Symptoms: Sign-in switch is stored in local state only. Session `maxAge` is always 30 days.
- Files: `apps/web/src/app/auth/signin/page.tsx`, `apps/web/src/lib/auth.ts`
- Trigger: Toggle Remember me.
- Workaround: None.

---

## Security Considerations

**Open RLS + public anon key + browser client:**
- Risk: Anyone with the published anon key (it is `NEXT_PUBLIC_*`) can SELECT/INSERT/UPDATE/DELETE rows that policies allow with `true`. That includes `users.password` hashes (`SELECT *` in repositories), all leave requests, and role changes via `users` UPDATE.
- Files: `packages/database/migrations/009_fix_rls_for_nextauth.sql`, `packages/database/migrations/004_fix_infinite_recursion.sql`, `packages/database/src/modules/users/repository.ts`, `apps/web/src/lib/supabase.ts`, `apps/web/src/lib/env.ts`
- Current mitigation: Middleware requires a NextAuth JWT for page routes. This does not bind the Supabase client to that user. RLS does not use `auth.uid()` for NextAuth sessions.
- Recommendations: Server-only data access. Restore restrictive RLS. Never `select('*')` on `users`; exclude `password`. Consider moving passwords out of this table (Supabase Auth or a dedicated credentials table).

**Hardcoded Supabase URL and anon JWT fallback:**
- Risk: `scripts/run-migration.js` embeds a production project URL and anon JWT as defaults when env vars are missing. The key is a secret-in-repo even if "anon". Combined with open RLS it is a live credential.
- Files: `scripts/run-migration.js`
- Current mitigation: Other scripts (`scripts/fix-rls.js`, `scripts/apply-rls-fix.js`) require env vars.
- Recommendations: Remove hardcoded fallbacks. Rotate the anon key in the Supabase project. Use env-only config.

**Unauthenticated API surface:**
- Risk: Middleware matcher excludes `api/**`. `/api/test-connection` is unauthenticated and returns user emails plus `first_name`/`last_name`. `/api/auth/signup` is open (no invite, no rate limit). NextAuth credentials have no lockout.
- Files: `apps/web/src/middleware.ts`, `apps/web/src/app/api/test-connection/route.ts`, `apps/web/src/app/api/auth/signup/route.ts`, `apps/web/src/lib/auth.ts`
- Current mitigation: Signup validates with Zod (`apps/web/src/lib/validation.ts`) and hashes with bcrypt (12 rounds).
- Recommendations: Delete or gate `test-connection` behind admin + non-production. Invite-only or domain-restricted signup. Rate-limit auth routes. Add lockout / generic errors.

**Password hashes stored in `users` and indexed:**
- Risk: `idx_users_password` indexes the hash column. `mapUserFromDatabase` copies `password` onto the User object. Client-side `getUserById` / `getAllUsers` can return hashes to the browser.
- Files: `packages/database/migrations/002_add_auth_fields.sql`, `apps/web/src/lib/supabase.ts`, `packages/database/src/modules/users/repository.ts`
- Current mitigation: Signup response strips password (`apps/web/src/app/api/auth/signup/route.ts`).
- Recommendations: Drop the password index. Never map password into app User types. Column-level privileges or a view without `password`.

**Google sign-in auto-provisions employees:**
- Risk: Any Google account can create an `employee` row if OAuth is enabled. No domain allowlist. JWT session lasts 30 days.
- Files: `apps/web/src/lib/auth.ts`
- Current mitigation: OAuth providers are omitted when Google env vars are unset.
- Recommendations: Restrict by hosted domain. Require admin approval before `is_active`. Shorter session for credentials.

**Role and admin routes are not server-gated:**
- Risk: `(admin)/users` has no layout role check. Middleware `authorized` only tests `!!token`. Role-sensitive queries are enabled by client flags in `use-dashboard-data.ts`.
- Files: `apps/web/src/middleware.ts`, `apps/web/src/app/(admin)/users/page.tsx`, `apps/web/src/hooks/use-dashboard-data.ts`
- Current mitigation: UI hides some tabs by role.
- Recommendations: Middleware role map per path prefix. Server components that 403 on wrong role.

**Audit-log SELECT still uses `auth.uid()` while the app uses NextAuth:**
- Risk: INSERT is `WITH CHECK (true)` so anyone can write fake audit rows. SELECT/UPDATE/DELETE use `auth.uid()`, which is null for NextAuth, so legitimate admin reads fail and attackers can still insert.
- Files: `packages/database/migrations/012_add_audit_logs_policies.sql`
- Current mitigation: Application swallows insert failures.
- Recommendations: Service-role inserts from the server only. No client INSERT on `audit_logs`.

**Env files:**
- Risk: `apps/web/.env.local` and root `.env*` exist as local secrets (contents not read). `.gitignore` covers `.env`, `.env.local`, `.env*.local` but not a generic `.env.development` / `.env.production` without `.local` (those two specific names are listed).
- Files: `.gitignore`, `apps/web/env.example` (template only)
- Current mitigation: Example file at `apps/web/env.example`. Validation helper exists but the throw is commented out in `apps/web/src/lib/env.ts`.
- Recommendations: Keep secrets out of git. Fail boot if required vars missing. Never commit `env.example` with real project JWTs.

---

## Performance Bottlenecks

**Unbounded list fetches, then filter in memory:**
- Problem: `getStats` loads every leave request (`select('leave_type, status')`) and aggregates in JS. `getUserStats` loads every user. `getUnreadCount` loads all notifications then `.filter`. `findAll` leave requests has no pagination.
- Files: `packages/database/src/modules/leave-requests/repository.ts`, `packages/database/src/modules/users/repository.ts`, `packages/database/src/modules/notifications/service.ts`, `apps/web/src/hooks/use-dashboard-data.ts`
- Cause: No SQL `count()` / `group by`. Dashboard fires 5–6 queries per load including `getAllLeaveRequests()` for admin/HR.
- Improvement path: Postgres aggregates, pagination (`limit`/`range` already in `DatabaseUtils.applyQueryOptions` but unused), and server-side filtered endpoints.

**Inclusive day math and N+1 notification/user lookups:**
- Problem: `createLeaveRequest` loads the full user to get a first name. Unread counts scan full notification lists.
- Files: `packages/database/src/modules/leave-requests/service.ts`, `packages/database/src/modules/notifications/service.ts`
- Cause: No targeted `select('first_name')` or `count(*)` with `is_read = false`.
- Improvement path: Narrow selects; add `getUnreadCount` as a SQL count.

**Global dynamic rendering:**
- Problem: `export const dynamic = 'force-dynamic'` and `revalidate = 0` on the root layout disable static optimization for the whole app.
- Files: `apps/web/src/app/layout.tsx`
- Cause: Workaround for session/SSR.
- Improvement path: Use `auth()` in specific server pages; allow static shells.

**Session callback hits the database on every session read:**
- Problem: `session` callback `select('*')` from `users` by email on each session access, including password hash.
- Files: `apps/web/src/lib/auth.ts`
- Cause: JWT already stores role/name; session still re-queries.
- Improvement path: Trust JWT claims; refresh user on sign-in only or via a dedicated `/api/me`.

**Realtime subscriptions unused at scale config:**
- Problem: Client is created with `eventsPerSecond: 10`. Subscribe helpers exist on `DatabaseService` but dashboard uses React Query polling/invalidation, not these channels.
- Files: `packages/database/src/index.ts`
- Cause: Dead realtime path plus a low event cap if later enabled.
- Improvement path: Wire subscriptions or remove them to avoid unused channels.

---

## Fragile Areas

**Leave request lifecycle (approve / reject / cancel / delete / bulk):**
- Files: `packages/database/src/modules/leave-requests/service.ts`, `packages/database/src/modules/leave-requests/repository.ts`, `apps/web/src/hooks/use-leave-request-operations.ts`, `apps/web/src/hooks/use-dashboard-data.ts`
- Why fragile: Side effects (balance, audit, notifications) are best-effort and diverge by code path. No overlap check. No remaining-balance check. Auto-approve for managers. Soft delete vs cancel vs bulk update are three different state machines.
- Safe modification: Change one path at a time (e.g. only `approveLeaveRequest`) behind a server transaction. Add tests for balance arithmetic before touching bulk.
- Test coverage: None. No `*.test.*` or `*.spec.*` files in the repo.

**Auth + RLS + NextAuth hybrid:**
- Files: `apps/web/src/lib/auth.ts`, `apps/web/src/middleware.ts`, `packages/database/migrations/003_fix_rls_policies.sql`, `packages/database/migrations/004_fix_infinite_recursion.sql`, `packages/database/migrations/009_fix_rls_for_nextauth.sql`
- Why fragile: Policy history flipped between `auth.uid()`, JWT email claims, public read, and `USING (true)`. Recursion was already a production incident (`004`). Next change can reintroduce recursion or lock out signup.
- Safe modification: New policies in a dedicated migration; test with both anon and authenticated roles. Do not mix `auth.uid()` with NextAuth.
- Test coverage: None. Manual SQL docs only (`packages/database/RLS_POLICY_FIX.md`).

**Type adapters and `as any` UI:**
- Files: `apps/web/src/lib/type-adapters.ts`, `apps/web/src/components/dashboard/unified-calendar-view.tsx`, `apps/web/src/components/leave-request/data-table.tsx`, `apps/web/src/components/shared/export-utils.ts`
- Why fragile: Nested `users` join shape is untyped. `console.log(request)` in the data table runs per cell. Export CSV/HTML assumes `request.users`.
- Safe modification: Introduce `LeaveRequestWithUser` from the database package and type the table row. Remove `as any`.
- Test coverage: None.

**Monorepo package graph:**
- Files: `package.json`, `apps/web/package.json`, `packages/database/package.json`, `packages/utils/package.json`, `turbo.json`
- Why fragile: Root and app disagree on Next, date-fns, `@hookform/resolvers`, lucide-react, `@supabase/supabase-js`. `transpilePackages` lists workspace packages. Database `main` is `./dist/index.js` so `turbo` build order matters. Lockfile is gitignored.
- Safe modification: Deduplicate versions at the root. Always `turbo run build` before web. Commit the lockfile.
- Test coverage: `turbo.json` has a `test` pipeline but no workspace implements `test`.

**Env proxy and commented validation:**
- Files: `apps/web/src/lib/env.ts`, `packages/database/src/index.ts`
- Why fragile: `env` is a Proxy that lazy-validates; throw is disabled. Database client throws only when first used. Two clients (`apps/web/src/lib/supabase.ts` and `packages/database/src/index.ts`) can disagree.
- Safe modification: Single server client factory. Fail fast at process start.
- Test coverage: None.

---

## Scaling Limits

**In-memory aggregation of full tables:**
- Current capacity: Fine for tens of users / hundreds of requests (implied by current `findAll` + JS reduce).
- Limit: `getLeaveRequestStats` and `getUserStats` load entire tables. Admin dashboard `getAllLeaveRequests()` with `users(*)` join grows linearly. Browser holds that payload.
- Scaling path: SQL aggregation, pagination, server-side role-scoped queries, indexes already exist on status/dates (`001_initial_schema.sql`) — use them with filters.

**Client-side mutation fan-out:**
- Current capacity: One user, one tab, React Query invalidates 6 query keys per mutation.
- Limit: Each mutation is a direct PostgREST round trip plus optional audit + notification + balance writes. No transactions, so partial failure leaves inconsistent state (approved without deduction).
- Scaling path: Single Postgres function / RPC wrapping approve+balance+audit. Server actions with one request.

**Realtime and QueryClient:**
- Current capacity: `eventsPerSecond: 10` on the database client. Query staleTime 1 minute.
- Limit: Many open dashboards would exceed the realtime cap if subscriptions were enabled. `MinimalSessionProvider` creates a new `QueryClient` per render (unused today; dangerous if wired up).
- Scaling path: Shared QueryClient via `useState` (already correct in `session-provider.tsx`). Prefer invalidation over realtime until RLS is user-scoped.

**Auth session size:**
- Current capacity: JWT stores id, names, department, team, role, managerId, hireDate, isActive.
- Limit: 30-day JWT with stale role if an admin changes role in DB (session callback does re-fetch by email, which helps freshness but costs a query).
- Scaling path: Short-lived access JWT + role in a server session store, or re-fetch only when `updated_at` changes.

**No horizontal-scale story for jobs:**
- Current capacity: Accrual, carry-over (`carryOverBalances`), and password-reset email are unimplemented or manual.
- Limit: Year-end carry-over is a loop per user in `LeaveBalanceService.carryOverBalances` with no job runner.
- Scaling path: Scheduled Supabase Edge Function or a worker; batch SQL upserts.

---

## Dependencies at Risk

**Next.js 14 (app) vs Next.js 15 (workspace root):**
- Risk: Root `package.json` pins `next@15.4.6` and `react@18.3.1`; `apps/web/package.json` pins `next@^14.2.18`. Hoisting can run the wrong compiler. Next 15 async `params` would break `dashboard/[slug]/page.tsx`. `images.domains` is deprecated; `serverComponentsExternalPackages` moved.
- Impact: Non-deterministic builds, broken dynamic routes, ignored config keys.
- Migration plan: One Next major for the workspace. Prefer staying on 14 until Auth.js/v15 migration is planned, or upgrade the app fully (async params, `images.remotePatterns`).

**next-auth v4:**
- Risk: `next-auth@^4.24.5` is maintenance-mode relative to Auth.js v5. JWT + Credentials + Google is the entire identity layer, parallel to unused Supabase Auth.
- Impact: Security patches lag. Dual-auth confusion caused the RLS `USING (true)` workaround.
- Migration plan: Either Auth.js v5 with a database session, or Supabase Auth only — not both.

**Turbo 1.x:**
- Risk: Root uses `turbo@^1.11.0` (`pipeline` key). Current Turbo uses `tasks`.
- Impact: Cache/config examples from current docs will not apply.
- Migration plan: Upgrade Turbo 2 and rename `pipeline` → `tasks` in `turbo.json`.

**Split date-fns / lucide-react / hookform / supabase-js versions:**
- Risk: Root has `date-fns@^4.1.0`, app and utils have `^2.30.0`. Dual lucide and `@hookform/resolvers` (root `^5.2.1` vs app `^3.10.0`). Dual `@supabase/supabase-js` (`^2.55.0` vs `^2.53.0` vs database `^2.38.0`).
- Impact: Duplicate bundles, subtle date API differences (`date-fns` v3+).
- Migration plan: Deduplicate via workspace `overrides` / single versions at root. Align date-fns to one major.

**Lockfile not committed:**
- Risk: `.gitignore` excludes `package-lock.json`.
- Impact: `npm ci` cannot be used; supply-chain drift.
- Migration plan: Stop ignoring the lockfile; commit it; use `npm ci` in CI.

**ESLint 8 + no config file:**
- Risk: `eslint@^8.55.0` without `.eslintrc*` / `eslint.config.*`. Next build ignores ESLint anyway.
- Impact: `npm run lint` is weakly defined.
- Migration plan: Add `eslint-config-next` config; eventually ESLint 9 flat config with the Next upgrade.

---

## Missing Critical Features

**Server-side authorization and real RLS:**
- Problem: Documented as "application layer" in migrations 009/010/012/013; not implemented.
- Blocks: Production deployment with untrusted users. Any multi-tenant or confidential HR data.

**Leave policy enforcement:**
- Problem: Policies exist (`leave_policies`) with `approval_required`, `default_allowance`, `max_carry_over`, `accrual_*`. Create/approve paths do not consult them. No overlap detection. No remaining-balance gate. Weekends/holidays not excluded. Accrual never runs.
- Blocks: Accurate allowances, compliance with HR rules, preventing double-booking.

**Password reset, email verification, invite flow:**
- Problem: Columns `email_verified`, `email_verified_at` exist; signup does not set or check them. Reset UI is a stub. Open self-signup.
- Blocks: Account recovery, disabling unused emails, controlled onboarding.

**User / department / team / policy admin UI:**
- Problem: `/(admin)/users` is a placeholder. No screens for departments, teams, policies, or seeding balances on hire.
- Blocks: Operating the product without SQL. Assigning managers (`manager_id`) that team queries depend on.

**Working notifications and audit that cannot be bypassed:**
- Problem: Wrong notification types, mock rows on failure, client-writable audit inserts.
- Blocks: Manager inbox, compliance reporting.

**CI, tests, observability:**
- Problem: No `.github/` workflows. No test runner in workspace packages. No Sentry/Datadog. `ErrorBoundary` claims "Our team has been notified" with no notifier. `devLog.error` is console-only.
- Blocks: Safe refactors, production incident response.

**Transactional approve path:**
- Problem: Approve → balance → audit → notify is sequential with swallowed errors.
- Blocks: Trustworthy balances once more than a handful of requests exist.

---

## Test Coverage Gaps

**Entire application — no automated tests:**
- What's not tested: Auth, RLS, leave lifecycle, balances, notifications, validation schemas, date math, middleware.
- Files: No `*.test.*`, `*.spec.*`, `vitest.config.*`, or `jest.config.*`. Root `npm test` → `turbo run test` with no implementing scripts. `apps/web/package.json` has no `test` script.
- Risk: The bugs listed above (mock balances, invalid notification types, bulk approve skipping balances, `is_active` mapping) ship unnoticed.
- Priority: High

**Leave request service and balance arithmetic:**
- What's not tested: Approval deduction, rejection (no refund path for already-approved cancel), half-day (`011`/`007` migrations), bulk update vs single approve, auto-approve for managers.
- Files: `packages/database/src/modules/leave-requests/service.ts`, `packages/database/src/modules/leave-balances/service.ts`, `apps/web/src/hooks/use-dashboard-data.ts`
- Risk: Payroll/HR-facing numbers silently wrong.
- Priority: High

**Authz and RLS:**
- What's not tested: Policy `USING (true)` vs intended role matrix; middleware exclusions for `api`; signup duplicate email; deactivated user login.
- Files: `packages/database/migrations/*.sql`, `apps/web/src/middleware.ts`, `apps/web/src/lib/auth.ts`, `apps/web/src/app/api/auth/signup/route.ts`
- Risk: Data leak or lockout on the next policy migration (recursion already happened in `004`).
- Priority: High

**Validation and date utilities:**
- What's not tested: `leaveRequestSchema` past-date rule, half-day refine, password rules (12 chars in `validation.ts` vs 8 on reset page vs 6 on sign-in). Dual `calculateTotalDays` implementations.
- Files: `apps/web/src/lib/validation.ts`, `apps/web/src/lib/date-utils.ts`, `packages/utils/src/index.ts`, `apps/web/src/app/auth/signin/page.tsx`, `apps/web/src/app/auth/reset-password/page.tsx`
- Risk: Inconsistent password policy and wrong day counts.
- Priority: Medium

**UI hooks and tables:**
- What's not tested: `useDashboardData` tab data selection, `useLeaveRequestOperations` cache invalidation, data-table row selection / export.
- Files: `apps/web/src/hooks/use-dashboard-data.ts`, `apps/web/src/hooks/use-leave-request-operations.ts`, `apps/web/src/components/leave-request/data-table.tsx`, `apps/web/src/components/shared/export-utils.ts`
- Risk: Wrong dataset on Requests vs Team vs Admin tabs; PII in CSV export.
- Priority: Medium

**Filter builders in `@timeoff/utils`:**
- What's not tested: `buildLeaveRequestFilter` / `buildUserFilter` emit Mongo-style `$in` operators unused by Supabase PostgREST.
- Files: `packages/utils/src/index.ts`
- Risk: If wired up, filters silently do nothing or error.
- Priority: Low

---

*Concerns audit: 2026-08-29*
