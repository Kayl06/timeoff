---
phase: 01-company-signup-and-invites
plan: 02
subsystem: database
tags: [supabase, postgres, rpc, signup, tenant, next.js]

requires:
  - phase: 01-company-signup-and-invites
    provides: hashInviteTokenHex, decideGoogleSignIn, isCompanyOwner, web node:test script
provides:
  - companies table with owner_id
  - company_invites.token_hash VARCHAR(64)
  - users.company_id NOT NULL
  - create_company_with_owner (nullable p_password) granted to anon
  - buildCreateCompanyWithOwnerArgs
  - credentials signup POST creates company + admin owner
affects:
  - 01-03 Google create-company (same RPC, p_password NULL)
  - 01-04 invite APIs (token_hash hex)
  - 01-05 accept-invite lookup
  - Phases 2–7 company_id filters

actuals:
  tokens: 9046
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - Atomic plpgsql RPC for circular companies.owner_id / users.company_id FK
    - Identity writes stay on Route Handlers + @/lib/supabase (not IDatabaseService)
    - CLI seed lives at supabase/seed.sql (config.toml sql_paths), not packages/database/seed.sql

key-files:
  created:
    - packages/database/migrations/20250818193733_add_companies_and_invites.sql
    - apps/web/src/lib/create-company-rpc.ts
    - apps/web/src/lib/create-company-rpc.test.ts
  modified:
    - packages/database/seed.sql
    - supabase/seed.sql
    - packages/types/src/index.ts
    - packages/database/src/modules/users/types.ts
    - apps/web/src/lib/validation.ts
    - apps/web/src/app/api/auth/signup/route.ts
    - apps/web/src/app/auth/signup/page.tsx
    - apps/web/package.json

key-decisions:
  - "option-a: companies.owner_id + users.company_id NOT NULL + RPC create_company_with_owner (no fifth users.role)"
  - "Applied schema to local Supabase (db push --local); hosted project needs database password to link"

patterns-established:
  - "create_company_with_owner is the only company+owner insert path; p_password string|null always present in JS args"
  - "Signup page posts camelCase firstName/lastName/confirmPassword/companyName"
  - "supabase/seed.sql must insert companies before users after company_id is NOT NULL"

requirements-completed: [TENANT-01]

coverage:
  - id: D1
    description: Tenant schema — companies, company_invites.token_hash VARCHAR(64), users.company_id NOT NULL, create_company_with_owner with nullable p_password
    requirement: TENANT-01
    verification:
      - kind: other
        ref: docker exec supabase_db_timeoff psql — create_company_with_owner args and company_id/token_hash
        status: pass
      - kind: other
        ref: npm run supabase:db:push -- --yes --local
        status: pass
    human_judgment: false
  - id: D2
    description: buildCreateCompanyWithOwnerArgs always includes p_password (hash string or null)
    requirement: TENANT-01
    verification:
      - kind: unit
        ref: apps/web/src/lib/create-company-rpc.test.ts#buildCreateCompanyWithOwnerArgs
        status: pass
    human_judgment: false
  - id: D3
    description: Credentials signup UI and POST /api/auth/signup create company + admin owner via RPC; camelCase body including companyName
    requirement: TENANT-01
    verification:
      - kind: unit
        ref: npm test --workspace=@timeoff/web
        status: pass
    human_judgment: true
    rationale: UI-SPEC copy, loading state, and visual CTA must be judged on /auth/signup; unit tests cover RPC helper only
  - id: D4
    description: Duplicate email returns 409 and does not create a second company
    requirement: TENANT-01
    verification: []
    human_judgment: true
    rationale: No integration test hits live Postgres; duplicate-email 409 is coded but not executed against the applied schema in this plan

duration: 17min
completed: 2026-08-29
status: complete
---

# Phase 01 Plan 02: Credentials Create-Company Tracer Summary

**Credentials signup creates a company via `create_company_with_owner` (nullable `p_password`) with `companies.owner_id` and `users.company_id NOT NULL`**

## Performance

- **Duration:** 17 min
- **Started:** 2026-08-29T08:57:23Z
- **Completed:** 2026-08-29T09:14:30Z
- **Tasks:** 3
- **Files modified:** 11

## Accomplishments

- Confirmed tenant model option-a: `companies.owner_id` plus `users.company_id NOT NULL`; first-user role remains `admin` (no fifth CHECK value)
- Shipped credentials create-company tracer: UI → `POST /api/auth/signup` → `create_company_with_owner`
- Applied migration `20250818193733_add_companies_and_invites.sql` to local Supabase; RPC exists with non-STRICT `p_password`, `users.company_id` uuid NOT NULL, `company_invites.token_hash` varchar(64)
- `npm test --workspace=@timeoff/web` exits 0 (15 tests)

## Task Commits

Each task was committed atomically:

1. **Task 1: Confirm tenant schema (one-way door)** - no commit (decision `option-a`)
2. **Task 2: End-to-end credentials create company — one path** - `650cea4` (feat)
3. **Task 3: [BLOCKING] Push companies schema to the database** - `9c26bc5` (chore)

**Plan metadata:** this docs commit (`docs(01-02): complete credentials create-company tracer plan`)

_Note: TDD tasks may have multiple commits (test → feat → refactor)_

## Files Created/Modified

- `packages/database/migrations/20250818193733_add_companies_and_invites.sql` - companies, company_invites, users.company_id, RPC
- `packages/database/seed.sql` - demo company + company_id on sample users
- `supabase/seed.sql` - CLI seed used on `supabase start` / reset (company_id + half_day_type)
- `apps/web/src/lib/create-company-rpc.ts` - `buildCreateCompanyWithOwnerArgs`
- `apps/web/src/lib/create-company-rpc.test.ts` - hash vs null `p_password`
- `apps/web/src/lib/validation.ts` - `companyName` 1–80
- `apps/web/src/app/api/auth/signup/route.ts` - RPC after 409/bcrypt
- `apps/web/src/app/auth/signup/page.tsx` - Create your company UI, camelCase POST
- `packages/types/src/index.ts` / `packages/database/src/modules/users/types.ts` - `company_id`
- `apps/web/package.json` - includes create-company-rpc test

## Decisions Made

- **option-a** (Task 1): `companies.owner_id` + `users.company_id NOT NULL` + `create_company_with_owner`. Rejected fifth `users.role` and nullable `company_id`.
- Local schema apply: `supabase start` applied the new migration; `npm run supabase:db:push -- --yes --local` reported up to date. Hosted project `dvbadruesmlzwzuzzbbz` (same ref as `NEXT_PUBLIC_SUPABASE_URL`) was not linked — CLI needs the database password.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] CLI seed is supabase/seed.sql, not packages/database/seed.sql**
- **Found during:** Task 3 (schema push)
- **Issue:** `supabase start` seeds `supabase/seed.sql` per `config.toml` `[db.seed]`. Task 2 updated `packages/database/seed.sql` only. Seed users had no `company_id`, violating NOT NULL after the new migration.
- **Fix:** Insert demo company, set `users.company_id`, then set `companies.owner_id` to admin.
- **Files modified:** `supabase/seed.sql`
- **Verification:** `supabase start` passed the company_id constraint
- **Committed in:** `9c26bc5` (Task 3)

**2. [Rule 3 - Blocking] Seed leave_requests failed check_half_day_type_consistency**
- **Found during:** Task 3 (second `supabase start`)
- **Issue:** Pre-existing CLI seed inserted `is_half_day = true` with null `half_day_type`. Blocked local start after company_id was fixed.
- **Fix:** Add `half_day_type` (`morning` on half-day rows, NULL otherwise).
- **Files modified:** `supabase/seed.sql`
- **Verification:** `supabase start` completed; API URL on 54321
- **Committed in:** `9c26bc5` (Task 3)

**3. [Rule 3 - Blocking] db push defaulted to --linked with no project-ref**
- **Found during:** Task 3
- **Issue:** `npm run supabase:db:push -- --yes` failed: `Cannot find project ref`. `supabase link --project-ref dvbadruesmlzwzuzzbbz --yes` failed SASL auth (database password required). Plan forbids a different migration runner.
- **Fix:** Same runner with `--local` against the stack started in this task. Migration was already applied during `supabase start`.
- **Files modified:** none (CLI flags only)
- **Verification:** `Remote database is up to date`; `create_company_with_owner` present locally
- **Committed in:** n/a (no extra code)

---

**Total deviations:** 3 auto-fixed (3 blocking)
**Impact on plan:** Required to get local schema live. No scope creep. Hosted schema remains unpushed until a human supplies the database password.

## Issues Encountered

- Default `supabase db push` targets the linked remote. Login succeeded (`supabase projects list`) but the repo was not linked and link needs the Postgres password. Schema is live on local Docker only.
- `apps/web/.env.local` still points at hosted Supabase. Signup against the running Next app will not see `create_company_with_owner` until hosted is pushed or `.env.local` is pointed at `http://127.0.0.1:54321`.

## Authentication Gates

- **Task 3:** `supabase link` to the hosted project matching `.env.local` failed password auth. User had completed CLI login; database password was not available. Proceeded with local apply instead of stopping after login-only. Hosted push still needs the password (or a linked project).

## User Setup Required

**External services require manual configuration.** See plan `user_setup` (supabase):

- Local stack is running (Docker + `npm run supabase:start`); schema applied locally
- To apply the same migration to hosted: `supabase link --project-ref dvbadruesmlzwzuzzbbz` (database password) then `npm run supabase:db:push -- --yes`

## Next Phase Readiness

- Ready for 01-03 (Google create-company) on **local** Postgres: RPC signature and `buildCreateCompanyWithOwnerArgs` already accept `p_password: null`
- Blocker for hosted/dev-against-`.env.local`: push this migration to the linked project, or point the app at local
- Do not create `packages/database/src/modules/companies/` this phase; identity stays on Route Handlers

---
*Phase: 01-company-signup-and-invites*
*Completed: 2026-08-29*

## Self-Check: PASSED

- FOUND: packages/database/migrations/20250818193733_add_companies_and_invites.sql
- FOUND: apps/web/src/lib/create-company-rpc.ts
- FOUND: apps/web/src/lib/create-company-rpc.test.ts
- FOUND: supabase/seed.sql
- FOUND: .planning/phases/01-company-signup-and-invites/01-02-SUMMARY.md
- FOUND: 650cea4 feat(01-02): implement credentials create-company tracer
- FOUND: 9c26bc5 chore(01-02): apply companies schema and fix CLI seed
