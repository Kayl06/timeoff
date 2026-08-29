# Walking Skeleton — Timeoff (brownfield)

**Phase:** 1
**Generated:** 2026-08-29

## Capability Proven End-to-End

A first user creates a company at `/auth/signup`, the owner copy-link invites a teammate, and the invitee joins **only that company** (no company picker, no global employee pool).

This is a brownfield record. Do **not** scaffold a new Next.js app, routing tree, or auth stack.

## Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Framework | Next.js 14 App Router (`apps/web`, `next` `^14.2.18`) | Existing runtime app. Do not use Next 15 async `cookies()` / `params`. Root `package.json` listing Next 15 is not the app to extend. |
| Data layer | Supabase Postgres via `@supabase/supabase-js`; migrations in `packages/database/migrations/` (`supabase/migrations` is a symlink) | Only persistence client. No Prisma/Drizzle/`DATABASE_URL` driver. |
| Auth | NextAuth v4 JWT (`NextAuthOptions` in `apps/web/src/lib/auth.ts`), Credentials + optional Google | Already wired. Identity writes stay on `apps/web/src/lib/supabase.ts`, not `UserService`. |
| Domain services | `@timeoff/database` repository → service → factory; browser `IDatabaseService` facade | Leave/approval stay on the facade. Company/invite writes are identity Route Handlers — do not put them on the browser facade. |
| UI | shadcn New York + Tailwind + Inter; lucide icons | UI-SPEC lock. No new component library, font, or palette. |
| Deployment / local run | `npm run supabase:start` (or linked hosted project) then `npm run dev` (Turbo) | Vercel + Docker standalone exist; Phase 1 proves the stack locally. Google OAuth redirect: `{NEXTAUTH_URL}/api/auth/callback/google`. |
| Directory layout | Turborepo npm workspaces: `apps/web`, `packages/database`, `packages/types`, `packages/utils` | Existing monorepo. Auth pages under `apps/web/src/app/auth/`. API under `apps/web/src/app/api/auth/`. |

## Stack Touched in Phase 1

- [x] Project scaffold (framework, build, lint, test runner) — **already exists**; Wave 0 adds `apps/web` `"test"` via `node:test` only
- [x] Routing — existing `/auth/signup`, `/auth/signin`, `/auth/error`; Phase 1 adds `/auth/accept-invite`
- [ ] Database — real write: `create_company_with_owner` RPC + `company_invites` insert; real read: invite preview + session `company_id`
- [ ] UI — signup company name, owner Invite teammates dialog (copy link), accept-invite join
- [x] Deployment — documented local full-stack run (below); do not add a new host

## Local full-stack run command

```bash
# From repo root, with apps/web/.env.local already present
npm run supabase:start    # or use the already-linked hosted project
npm run supabase:db:push  # after Phase 1 migrations exist
npm run dev               # Turbo; web app at http://localhost:3000
```

Required env (already in `apps/web/env.example`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`. Google optional in development: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.

## Out of Scope (Deferred to Later Slices)

- Tenant row isolation / restrictive RLS (Phase 2) — `USING (true)` stays
- Closing browser anon-key mutations for leave (Phase 2)
- Default `leave_balances` on signup (Phase 3)
- Approve/reject side effects, audit, in-app + email notices (Phase 4)
- Bulk approve parity (Phase 5)
- Password reset mail + persist hash (Phase 6)
- Calendar/dashboard data agreement (Phase 7)
- Mailer productization (copy-link only this phase)
- Stub `/(admin)/users` as HR admin IA
- New `UserRole` value for owner; Auth.js v5; Zod 4; Vitest

## Subsequent Slice Plan

Each later phase adds one vertical slice on top of this skeleton without altering its architectural decisions:

- Phase 2: Company A cannot read or mutate Company B; leave writes use the signed-in session
- Phase 3: Dashboard remaining days come from live `leave_balances`
- Phase 4: Single approve/reject/cancel deducts or restores days, audits, and notifies
- Phase 5: Bulk approve/reject matches single-action side effects
- Phase 6: Honest password reset and deactivated sign-in
- Phase 7: Personal and team calendars match tenant-scoped dashboards
