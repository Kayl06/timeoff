# External Integrations

**Analysis Date:** 2026-08-29

## APIs and Services

**Supabase (hosted + local CLI):**
- Purpose: PostgreSQL database, PostgREST queries, Row Level Security, Realtime postgres_changes, generated types, local Studio. Application auth does **not** use Supabase Auth; the JS client is used as a data API.
- SDK/Client: `@supabase/supabase-js` — app client `apps/web/src/lib/supabase.ts`; package client `packages/database/src/index.ts` (lazy Proxy); scripts `scripts/run-migration.js`, `scripts/fix-rls.js`, `scripts/apply-rls-fix.js`.
- Auth: anon key via `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Optional `SUPABASE_SERVICE_ROLE_KEY` is parsed in `apps/web/src/lib/env.ts` but no service-role client is constructed — do not query privileged APIs with the anon client. Local stack: `supabase/config.toml` (`project_id = "timeoff"`). Remote typegen: `npm run supabase:gen:types` writes to `packages/database/src/types.ts` using `--project-id lvscrngetawbztaiadpr`.
- Used by: `apps/web/src/lib/auth.ts`, `apps/web/src/app/api/auth/signup/route.ts`, `apps/web/src/app/api/test-connection/route.ts`, `apps/web/src/providers/database-provider.tsx`, all repositories under `packages/database/src/modules/*/repository.ts`.
- Prescriptive: always go through `createDatabaseService` / module services (`packages/database/src/modules/database-service.ts`). Do not scatter `supabase.from(...)` in new UI except auth/signup which already talks to `users` directly.

**Google OAuth 2.0:**
- Purpose: SSO sign-in. Enabled only when both Google env vars are set (`apps/web/src/lib/auth.ts`).
- SDK/Client: `next-auth/providers/google` (`GoogleProvider`).
- Auth: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`. Callback: `/api/auth/callback/google` (NextAuth catch-all `apps/web/src/app/api/auth/[...nextauth]/route.ts`).
- Used by: `apps/web/src/lib/auth.ts`, `apps/web/src/app/auth/signin/page.tsx`, `apps/web/src/app/auth/signup/page.tsx`.
- On first Google sign-in, a `users` row is inserted via Supabase (`mapUserToDatabase` in `apps/web/src/lib/supabase.ts`) with role `employee` and department/team `Unassigned`.
- Avatar images load from `lh3.googleusercontent.com` (`apps/web/next.config.js` `images.domains`).

**Google Fonts (next/font):**
- Purpose: Inter typeface on the document body.
- SDK/Client: `next/font/google` in `apps/web/src/app/layout.tsx`.
- Auth: none.
- Used by: `apps/web/src/app/layout.tsx`.

**Vercel:**
- Purpose: production hosting and serverless API duration.
- SDK/Client: platform config `vercel.json` (no Vercel SDK).
- Auth: Vercel project env (same names as `apps/web/env.example`).
- Used by: `vercel.json` build `npx turbo run build --filter=@timeoff/web...`; functions glob `apps/web/src/app/api/**/*.ts`.

**GitHub avatars (CDN only):**
- Purpose: `images.domains` includes `avatars.githubusercontent.com` in `apps/web/next.config.js`. No GitHub OAuth provider exists. Do not add GitHub login without a NextAuth provider and env vars.

## Databases

**Supabase PostgreSQL:**
- Type: SQL (PostgreSQL 17 locally per `supabase/config.toml` `major_version = 17`)
- ORM/Client: none. Use `@supabase/supabase-js` query builder. Schema types are intended from `supabase gen types typescript` into `packages/database/src/types.ts` (file not present; `packages/database/src/index.ts` currently inlines a partial `Database` type).
- Schema location: `packages/database/migrations/` (numbered `001_`–`013_` plus timestamped files). Seed: `packages/database/seed.sql` and `supabase/config.toml` `[db.seed]` `sql_paths = ["./seed.sql"]`. README describes `supabase/migrations` as a symlink to the package migrations; treat `packages/database/migrations/` as the source of truth (`MIGRATIONS.md`, root `supabase:migration:*` scripts).
- Tables (from `packages/database/migrations/001_initial_schema.sql` and later migrations): `users`, `departments`, `teams`, `leave_policies`, `leave_balances`, `leave_requests`, `calendar_events`, `notifications`, `audit_logs`, plus auth/preference columns (`002_add_auth_fields.sql`, `008_add_user_preferences.sql`), half-day fields, `deleted_at`, approval comments.
- Used by: `packages/database/src/modules/{users,leave-requests,leave-balances,departments,teams,notifications,calendar-events,leave-policies,audit-logs}/repository.ts`.
- Prescriptive: new tables need a SQL migration in `packages/database/migrations/`, a module under `packages/database/src/modules/`, registration in `packages/database/src/modules/database-service.ts` and `packages/database/src/modules/index.ts`, plus types in `packages/types/src/index.ts`. Apply with `npm run supabase:db:push` (local) or the documented remote reset scripts. Do not add Prisma/Drizzle.

**Direct Postgres / DATABASE_URL:**
- Not applicable in application code. `DATABASE_URL` is documented in `README.md` only. `scripts/dev-setup.sh` expects a Compose Postgres (`timeoff_dev` on port 5432) and Adminer on 8080, but `docker-compose*.yml` is gitignored and absent — do not wire `pg`/`postgres` clients.

## Authentication

**Provider:**
- NextAuth.js v4 (Credentials + optional Google). Implementation: `apps/web/src/lib/auth.ts`, route `apps/web/src/app/api/auth/[...nextauth]/route.ts`, middleware `apps/web/src/middleware.ts`, session types `apps/web/src/types/next-auth.d.ts`, providers `apps/web/src/providers/session-provider.tsx`.
- Session strategy: JWT, `maxAge` 30 days, `secret: env.NEXTAUTH_SECRET`. Custom pages: `/auth/signin`, `/auth/error`.
- Credentials: email/password against `users.password` using `bcryptjs` (`apps/web/src/lib/auth.ts`). Signup hashes with 12 rounds (`apps/web/src/app/api/auth/signup/route.ts`) and Zod `userRegistrationSchema` (`apps/web/src/lib/validation.ts`).
- Middleware: `withAuth` protects all non-`/auth`, non-`/api`, non-static paths (`apps/web/src/middleware.ts`). API routes are **not** covered by this matcher — new `/api/*` handlers must authenticate themselves.
- Supabase Auth in `supabase/config.toml` (`[auth]`, `[auth.email]`, `[auth.external.apple]` disabled, Twilio SMS disabled, MFA off) is local-platform default, not the app login path. Do not mix `supabase.auth.signIn*` with NextAuth unless a dedicated migration is planned.
- Env: `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, optional `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (required in production per `apps/web/src/lib/env.ts`).

## Webhooks / Callbacks

**NextAuth OAuth callback:**
- Endpoint: `apps/web/src/app/api/auth/[...nextauth]/route.ts` (GET/POST). Google redirect URI must be `{NEXTAUTH_URL}/api/auth/callback/google`.
- Purpose: OAuth code exchange and session cookies.

**Incoming webhooks (Stripe, GitHub, Slack, Supabase Edge, etc.):**
- Not detected. No `apps/web/src/app/api` routes besides auth and `apps/web/src/app/api/test-connection/route.ts`. `[auth.hook.*]` in `supabase/config.toml` is commented out.

**Outgoing webhooks:**
- Not detected.

When adding a webhook, put it under `apps/web/src/app/api/` and verify the caller; middleware will not enforce NextAuth on `/api`.

## File Storage

**Supabase Storage (platform, unused by app):**
- Purpose: local config enables Storage with `file_size_limit = "50MiB"` (`supabase/config.toml` `[storage]`). No buckets are defined. Application `attachments` fields are `TEXT[]` / `string[]` (`packages/database/migrations/001_initial_schema.sql`, `packages/types/src/index.ts`) — not Storage object paths.
- Implementation: not used in TypeScript clients. Do not call `supabase.storage` until a bucket + RLS + upload UI exist.
- Next.js `output: 'standalone'` copies `public/` in `Dockerfile`; static assets belong in `apps/web/public/` if that directory is added.

**Local filesystem / S3 / Cloudinary:**
- Not detected. Experimental S3 keys in `supabase/config.toml` `[experimental]` are unset env placeholders (`S3_HOST`, `S3_REGION`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`) for OrioleDB — not application file upload.

## Email / Notifications

**In-app notifications (database):**
- Purpose: leave-request workflow messages stored in `notifications`. Created by `packages/database/src/modules/notifications/service.ts` (failures are swallowed and a mock row returned). Wired from leave-request service via `DatabaseServiceFactory` (`packages/database/src/modules/database-service.ts`).
- Implementation: `packages/database/src/modules/notifications/{service,repository,types}.ts`. No email/SMS/push.

**Password reset UI (simulated):**
- Purpose: `/auth/forgot-password` and `/auth/reset-password` pages exist (`apps/web/src/app/auth/forgot-password/page.tsx`, `apps/web/src/app/auth/reset-password/page.tsx`) but submit handlers use `setTimeout` only — no mailer, no token table, no NextAuth email provider.
- Do not tell users a real email was sent until an SMTP/Resend/SendGrid integration exists.

**Supabase Inbucket (local Auth emails):**
- Purpose: catch emails from **Supabase Auth** locally (`supabase/config.toml` `[inbucket]` port `54324`). App login does not send those emails. Production SMTP block `[auth.email.smtp]` is commented (example host `smtp.sendgrid.net`).

**Twilio SMS:**
- Config present but `enabled = false` (`supabase/config.toml` `[auth.sms.twilio]`). Token env name `SUPABASE_AUTH_SMS_TWILIO_AUTH_TOKEN`. Do not enable without product requirement.

**Transactional email providers (Resend, SendGrid, Nodemailer):**
- Not detected in application dependencies or imports.

## Third-Party SDKs

**@supabase/supabase-js:**
- Purpose: all persistence and optional Realtime channels.
- Files: `apps/web/src/lib/supabase.ts`, `packages/database/src/index.ts` (`realtime.params.eventsPerSecond: 10`; `subscribeToLeaveRequests`, `subscribeToNotifications`, `subscribeToApprovals`). The web app does **not** call those subscribe helpers — do not assume live UI updates until hooks subscribe.

**next-auth:**
- Purpose: sessions, Google, credentials.
- Files: `apps/web/src/lib/auth.ts`, `apps/web/src/middleware.ts`, `apps/web/src/app/api/auth/[...nextauth]/route.ts`, `apps/web/src/providers/session-provider.tsx`.

**bcryptjs:**
- Purpose: password hash/verify for Credentials provider.
- Files: `apps/web/src/app/api/auth/signup/route.ts`, `apps/web/src/lib/auth.ts`.

**@tanstack/react-query:**
- Purpose: cache leave/dashboard queries.
- Files: `apps/web/src/providers/session-provider.tsx`, `apps/web/src/hooks/use-dashboard-data.ts`, `apps/web/src/hooks/use-leave-request-operations.ts`, calendar/dashboard components under `apps/web/src/components/dashboard/`.

**zod / react-hook-form:**
- Purpose: input validation.
- Files: `apps/web/src/lib/validation.ts`, `packages/utils/src/index.ts`, `apps/web/src/components/ui/form.tsx`.

**sonner / react-hot-toast / lucide-react / Radix / CVA:**
- Purpose: UI. Files under `apps/web/src/components/ui/` and auth pages.

**Monitoring (Sentry, PostHog, analytics SDKs):**
- Not detected. Logging is `console` via `devLog` in `apps/web/src/lib/env.ts`. Supabase `[analytics]` in `config.toml` is local platform (port `54327`), not product analytics.

**CI/CD:**
- Not detected (no `.github/workflows`). Deploy via Vercel config and/or Docker.

**Secrets location:**
- Template: `apps/web/env.example`. Runtime: `apps/web/.env.local` (gitignored; `.env*.local` in `.gitignore`). Do not read or commit `.env.local` / `.env.local.backup`. Migration scripts must use env vars only — `scripts/run-migration.js` currently falls back to a hardcoded project URL/anon key; new scripts must not copy that pattern.

**Required env vars (names only):**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (production)
- Optional: `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_PROJECT_ID` (typegen), `NODE_ENV`

When adding an external service: put the client in `apps/web/src/lib/` (or `packages/database` if it is data-layer only), add env names to `apps/web/src/lib/env.ts` and `apps/web/env.example`, and keep secrets out of git and out of script fallbacks.

---

*Integrations analysis: 2026-08-29*
