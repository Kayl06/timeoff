# Timeoff

Multi-tenant leave management: a company signs itself up, people request and approve leave, remaining days stay live, and one company cannot see another’s data.

**Live:** [timeoff-delta.vercel.app](https://timeoff-delta.vercel.app)

Sign in with email/password. Use **Create a company** on first visit. Google sign-in is optional and only appears when Google env vars are set.

## Stack

- Next.js 14 (App Router) in `apps/web`
- NextAuth.js v4 (credentials; optional Google)
- Supabase Postgres + Row Level Security
- TanStack Query, shadcn/ui, Tailwind CSS
- Turborepo npm workspaces (`apps/web`, `packages/database`, `packages/types`, `packages/utils`)

Application login is NextAuth, not Supabase Auth. Identity routes use the service-role key; tenant leave/notification APIs mint a short-lived PostgREST JWT with `company_id`.

## Local setup

### Prerequisites

- Node.js 18+ and npm 9+
- [Supabase CLI](https://supabase.com/docs/guides/cli) and Docker (for the local stack)

### Install

```bash
git clone https://github.com/Kayl06/timeoff.git
cd timeoff
npm install
```

### Environment

Copy `apps/web/env.example` to `apps/web/.env.local`.

**Required**

| Variable | Local | Production (Vercel) |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `http://127.0.0.1:54321` after `supabase start` | Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `npx supabase status -o env` (`ANON_KEY`). Use the legacy `eyJ...` JWT, not `sb_publishable_...` | API → `anon` `public` |
| `SUPABASE_SERVICE_ROLE_KEY` | `SERVICE_ROLE_KEY` from `supabase status -o env` | API → `service_role`. Never `NEXT_PUBLIC_` |
| `SUPABASE_JWT_SECRET` | `JWT_SECRET` from `supabase status -o env` | [JWT settings](https://supabase.com/dashboard/project/_/settings/jwt) → Legacy JWT secret. Never `NEXT_PUBLIC_` |
| `NEXTAUTH_URL` | `http://localhost:3000` | Production origin with no trailing slash, e.g. `https://timeoff-delta.vercel.app` |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` | Same; generate a new value for production |

**Optional**

| Variable | Notes |
|---|---|
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Leave empty for email/password only. Callback is `{NEXTAUTH_URL}/api/auth/callback/google` |
| `RESEND_API_KEY` / `EMAIL_FROM` | Approve/reject email. Unset is fine; the request still succeeds |
| `NODE_ENV` | Do not set on Vercel; the platform sets `production` |

`DATABASE_URL` is not used by the app.

### Database

```bash
npm run supabase:start
npm run supabase:db:push
```

Migrations live in `packages/database/migrations/` and are symlinked to `supabase/migrations/`.

Hosted project: apply the same migrations (`supabase db push` after `supabase link`, or the SQL editor). Then copy the hosted API URL, anon key, service-role key, and JWT secret into Vercel.

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Other useful scripts: `npm run build`, `npm run lint`, `npm run type-check`, `npm run test`.

## Deploy (Vercel + Supabase)

The Next.js app root is `apps/web`. Framework preset: Next.js. Install/build from the repo root:

```text
install: cd ../.. && npm install
build:   cd ../.. && npx turbo run build --filter=@timeoff/web
```

Set the six required env vars on **Production, Preview, and Development**. Redeploy after changing them.

1. Create or reuse a Supabase project and apply migrations.
2. Import the GitHub repo in Vercel (or `npx vercel --prod`).
3. Set Root Directory to `apps/web`.
4. Fill the env table above.
5. If you add Google, also add the production callback URI in Google Cloud Console.

## License

MIT. See `LICENSE`.
