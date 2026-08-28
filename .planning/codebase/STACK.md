# Technology Stack

**Analysis Date:** 2026-08-29

## Languages

**Primary:**
- TypeScript 5.x (root `package.json` `typescript` `^5.3.0`; lockfile resolves `5.9.3`) — all application and package source. Target `ES2020` in `tsconfig.json`. Strict mode is on (`"strict": true`).
- TSX / React JSX — Next.js App Router UI in `apps/web/src/`. Path alias `@/*` maps to `apps/web/src/*` (`apps/web/tsconfig.json`).

**Secondary:**
- SQL (PostgreSQL dialect) — schema and RLS in `packages/database/migrations/*.sql` and `packages/database/seed.sql`. Local Supabase uses Postgres major version 17 (`supabase/config.toml`).
- JavaScript (CommonJS) — Next/PostCSS/Tailwind configs (`apps/web/next.config.js`, `apps/web/postcss.config.js`, `apps/web/tailwind.config.js`) and migration scripts (`scripts/run-migration.js`, `scripts/create-migration.js`, `scripts/fix-rls.js`, `scripts/apply-rls-fix.js`).
- Bash — `scripts/dev-setup.sh` for Docker-based local services.
- CSS — Tailwind layers and CSS variables in `apps/web/src/app/globals.css`.

When adding code, write TypeScript in packages and the web app. Do not add new `.js` application modules except config files and Node scripts.

## Runtime

**Environment:**
- Node.js `>=18.0.0` (`package.json` `engines`). Docker images use `node:18-alpine` (`Dockerfile`, `Dockerfile.dev`).
- npm `>=9.0.0` required; `packageManager` is pinned to `npm@10.2.4`.

**Package Manager:**
- npm workspaces (`"workspaces": ["apps/*", "packages/*"]` in `package.json`)
- Lockfile: `package-lock.json` present locally (lockfileVersion 3) but listed in `.gitignore` — do not assume it is committed. Prefer `npm install` at the repo root so workspace packages (`@timeoff/web`, `@timeoff/database`, `@timeoff/types`, `@timeoff/utils`) resolve together.

## Frameworks

**Core:**
- Next.js App Router — `apps/web` depends on `next` `^14.2.18` (lockfile: `14.2.35`). This is the app to extend. Root `package.json` also lists `next` `15.4.6`; do not use Next 15 APIs (`async` request APIs, etc.) in `apps/web`. Entry: `apps/web/src/app/`. `output: 'standalone'` in `apps/web/next.config.js` for Docker.
- React 18.3.1 / React DOM 18.3.1 — client and server components. Root layout is `apps/web/src/app/layout.tsx` (`dynamic = 'force-dynamic'`).
- NextAuth.js 4 (`next-auth` `^4.24.5`, lockfile `4.24.15`) — session/JWT auth in `apps/web/src/lib/auth.ts` and `apps/web/src/app/api/auth/[...nextauth]/route.ts`. Use the Pages Router–style `NextAuthOptions` API, not Auth.js v5.
- Tailwind CSS 3.4.x (`apps/web/tailwind.config.js`) + PostCSS + Autoprefixer (`apps/web/postcss.config.js`).
- shadcn/ui (New York style, RSC, Lucide icons) — `apps/web/components.json`. UI primitives live in `apps/web/src/components/ui/`. Add new primitives with the shadcn CLI against that config; do not invent a parallel component kit.
- Turborepo 1.x (`turbo` `^1.11.0`, lockfile `1.13.4`) — `turbo.json` pipelines: `build`, `lint`, `dev`, `clean`, `type-check`, `test`.

**Testing:**
- Not detected. No `*.test.*` / `*.spec.*` files, no Jest/Vitest/Playwright config. `turbo.json` defines a `test` pipeline (`outputs: ["coverage/**"]`) but no workspace `package.json` implements a `test` script. Do not assume a runner exists; add Vitest (packages) or Playwright (web) explicitly if tests are required.

**Build/Dev:**
- `tsc` — packages emit `dist/` (`packages/*/tsconfig.json` `outDir: "./dist"`).
- `next build` / `next dev` / `next start` — `apps/web/package.json`.
- `next lint` with `eslint-config-next` `^14.2.18` — `apps/web`. Root ESLint `^8.55.0` (lockfile `8.57.1`). No committed `.eslintrc*` or `eslint.config.*`; Next.js default config applies.
- Prettier `^3.1.0` (lockfile `3.9.6`) via root script `format`. No `.prettierrc` detected — use Prettier defaults unless a config is added.
- lint-staged `^15.2.0` is a root devDependency with no config and no Husky hooks detected — do not rely on pre-commit linting.
- Supabase CLI scripts on the root: `supabase start|stop|status`, `supabase db push|reset`, `supabase gen types`.

## Key Dependencies

**Critical:**
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

**Infrastructure:**
- `@types/node` `^20.10.0`, `@types/react` `^18.3.23`, `@types/react-dom` `^18.3.7`.
- `dotenv` `^16.6.1` — Node scripts (`scripts/run-migration.js`).
- Declared but unused in source (do not adopt without a real call site): `recharts` `^2.8.0`, `framer-motion` `^10.16.5`, `react-intersection-observer` `^9.5.3`, `@tanstack/react-query-devtools`.
- `packages/ui` is a stub (`packages/ui/src/index.ts` only, no `package.json`) — do not import `@timeoff/ui`. Put shared UI in `apps/web/src/components/`.

## Configuration

**Environment:**
- Copy `apps/web/env.example` to `apps/web/.env.local` (file present locally; gitignored). Root and `apps/web/.env.local.backup` also exist as env files — never commit or quote their values.
- Validate via `apps/web/src/lib/env.ts`. Always required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`. Production also requires `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`. Optional: `SUPABASE_SERVICE_ROLE_KEY` (read in `env.ts` but not used by clients).
- `turbo.json` `globalDependencies` includes `**/.env.*local` so env changes bust Turbo cache.
- `NODE_ENV` defaults to `development` in `apps/web/src/lib/env.ts`.
- `DATABASE_URL` appears in `README.md` only — not read by application code. Do not introduce Postgres drivers; go through Supabase JS.
- `SUPABASE_PROJECT_ID` is used by `packages/database` `generate-types` script. Root `supabase:gen:types` hardcodes `--project-id lvscrngetawbztaiadpr` into `packages/database/src/types.ts` (that generated file is currently absent).
- `apps/web/next.config.js` currently sets `typescript.ignoreBuildErrors` and `eslint.ignoreDuringBuilds` to `true` — do not treat a green `next build` as type-safe.

**Build:**
- Root `tsconfig.json` — shared compiler options (`moduleResolution: "bundler"`, `jsx: "react-jsx"`, declarations on).
- `apps/web/tsconfig.json` — Next plugin, `jsx: "preserve"`, `noEmit: true`, path aliases.
- Package tsconfigs: `packages/database/tsconfig.json`, `packages/types/tsconfig.json`, `packages/utils/tsconfig.json`.
- `turbo.json` — `build` depends on `^build`; outputs `.next/**` and `dist/**`.
- `vercel.json` — `buildCommand`: `npm install && npx turbo run build --filter=@timeoff/web...`; API functions under `apps/web/src/app/api/**/*.ts` `maxDuration` 30s.
- `apps/web/next.config.js` — `transpilePackages` for workspace pkgs; `images.domains` for Google/GitHub avatars; `serverComponentsExternalPackages: ['@tanstack/react-query']`.
- `Dockerfile` (production, Node 18 Alpine, standalone Next) and `Dockerfile.dev`. Compose files (`docker-compose*.yml`) are gitignored and not present in the tree; `scripts/dev-setup.sh` still expects `docker-compose.dev.yml`.

## Platform Requirements

**Development:**
- Node 18+ and npm 9+ (`README.md`, `package.json` `engines`).
- Docker (for `Dockerfile.dev` / `scripts/dev-setup.sh`; compose file expected as `docker-compose.dev.yml`).
- Supabase CLI for local stack (`supabase/config.toml`: API `54321`, DB `54322`, Studio `54323`, Inbucket `54324`, Postgres 17).
- Google Cloud OAuth client for Google sign-in (optional in development — Google provider is omitted when env vars are empty in `apps/web/src/lib/auth.ts`).
- Start with `npm run dev` (Turbo) or `npm run supabase:start` then `npm run dev`.

**Production:**
- Vercel (`vercel.json`). Next standalone output also supports Docker (`Dockerfile`, `npm run docker:prod` in `package.json`).
- Hosted Supabase (Postgres + PostgREST + Realtime). Auth for the product is NextAuth, not Supabase Auth.
- Set production env vars from `apps/web/env.example`; Google OAuth redirect: `{origin}/api/auth/callback/google`.
- Image allowlist already includes `lh3.googleusercontent.com` and `avatars.githubusercontent.com` (`apps/web/next.config.js`).

When adding a dependency: put app-only libs in `apps/web/package.json`; shared types in `packages/types`; DB access in `packages/database`; pure helpers/schemas in `packages/utils`. Do not add runtime deps to the root `package.json` (it currently duplicates Next/React/Supabase — avoid expanding that).

---

*Stack analysis: 2026-08-29*
