# Phase 2: User Setup Required

**Generated:** 2026-08-29
**Phase:** tenant-isolation-and-server-authz
**Status:** Incomplete

Complete these items so the leave-requests BFF can mint a PostgREST JWT. Code and placeholders shipped in 02-02; these values must come from the local Supabase stack (or the hosted project). Never commit them. Never prefix them with `NEXT_PUBLIC_`.

## Environment Variables

| Status | Variable | Source | Add to |
|--------|----------|--------|--------|
| [ ] | `SUPABASE_JWT_SECRET` | Local: `npx supabase status -o env` (`JWT_SECRET`). Hosted: Supabase Dashboard → Project Settings → API → JWT Secret. Never `NEXT_PUBLIC_`. Do not commit the value. | `apps/web/.env.local` |
| [ ] | `SUPABASE_SERVICE_ROLE_KEY` | Local: `npx supabase status -o env` (`SERVICE_ROLE_KEY`). Hosted: Project Settings → API → `service_role`. Already listed in `apps/web/env.example`; required in `env.ts` as of this plan. | `apps/web/.env.local` |

## Account Setup

- [ ] **Start local Supabase** (if the stack is down)
  - Command: `npm run supabase:start`
  - Skip if: `npx supabase status` already shows the API and DB running

## Local Development

```bash
npm run supabase:start
npx supabase status -o env
```

Copy `JWT_SECRET` into `SUPABASE_JWT_SECRET` and `SERVICE_ROLE_KEY` into `SUPABASE_SERVICE_ROLE_KEY` in `apps/web/.env.local`. Do not paste those values into chat, logs, or git.

## Verification

After completing setup, verify names are set (this does not print values):

```bash
awk -F= '/^(SUPABASE_JWT_SECRET|SUPABASE_SERVICE_ROLE_KEY)=/ {print $1}' apps/web/.env.local
```

Expected results:
- Both names print
- Unauthenticated `POST /api/leave-requests` still returns 401
- Signed-in create on the existing form shows `POST /api/leave-requests` in the network tab (not PostgREST `/rest/v1/leave_requests`)

---

**Once all items complete:** Mark status as "Complete" at top of file.
