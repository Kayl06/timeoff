---
phase: 03-live-remaining-days
verified: 2026-08-29T17:19:36Z
status: human_needed
score: 21/22 must-haves verified
behavior_unverified: 1
overrides_applied: 0
decision_coverage:
  honored: 15
  total: 15
  not_honored: []
mvp_goal_format:
  roadmap_goal_is_user_story: false
  plan_goal_is_user_story: true
  note: "ROADMAP.md Phase 3 goal is not As a / I want to / so that. Every 03-*-PLAN.md carries a valid user story; verification used ROADMAP success criteria as the contract and the PLAN story for User Flow Coverage."
behavior_unverified_items:
  - truth: "GET /api/leave-balances with a valid session inserts missing vacation/sick/personal rows for session.user.id and the current calendar year only, then returns that user's rows (BAL-01, D-04, D-05, D-06)."
    test: "Sign in as an existing Phase 1 user who has no current-year leave_balances. Open Overview and watch Network plus the Leave Balance card."
    expected: "GET /api/leave-balances (credentials include) is 200. After the request, that user has vacation/sick/personal rows for this calendar year with used_days 0 and remaining_days equal to each active policy default_allowance. The card shows those remaining_days. A second GET does not change used_days on rows that already exist."
    why_human: "Route awaits ensureDefaultLeaveBalances(session.user.id, year, policies) then getLeaveBalance. Planner and insert-only create are present. No test invokes GET, mints a tenant JWT, or asserts the persisted self-heal rows."
human_verification:
  - test: "Sign in, open Overview. Watch the Leave Balance card: pulse skeleton while loading, then live remaining_days for vacation, sick, and personal."
    expected: "Title stays Leave Balance. Populated rows show {used_days}/{total_allowance} days and {remaining_days} days remaining from fetched leave_balances — not mock 5/10. Chrome (dots, Progress, spacing) is unchanged."
    why_human: "Harvested from 03-04-PLAN.md <human-check>. Visual chrome and live dashboard numbers cannot be seen from grep. 03-04 SUMMARY D4 is human_judgment."
  - test: "Force GET /api/leave-balances to fail (stop API or revoke session mid-load) and reload Overview."
    expected: "Sonner toast Failed to load leave balances. Card stays visible with No leave balance information available. No mock 5/10 bars. No inline red alert on the card."
    why_human: "useEffect toast and empty branch are in source; runtime toast + empty body together need a browser."
  - test: "If GET can return extra types (or a maternity-only payload), confirm the card."
    expected: "Extra types do not appear. Maternity-only shows the empty copy, not a blank stack. One or two of vacation/sick/personal render only those rows in that order."
    why_human: "balancesForLeaveCard is unit-tested; the painted card is not."
  - test: "Create a new company (credentials signup) and accept an invite. Open Overview as owner and as invitee."
    expected: "Both cards show catalog remaining days (vacation/sick/personal unused start) instead of empty copy. Hosted .env.local still needs a human db push if it does not point at local."
    why_human: "pgTAP proves RPC inserts; the dashboard after real signup/invite is the user-story outcome."
---

# Phase 3: Live Remaining Days Verification Report

**Phase Goal:** Dashboard remaining days come from live `leave_balances` rows; first and invited users have default rows so remaining days are not empty.
**Verified:** 2026-08-29T17:19:36Z
**Status:** human_needed
**Re-verification:** No — initial verification

**MVP note:** ROADMAP.md marks this phase `mode: mvp` but the roadmap goal is not a user-story sentence. Every 03-*-PLAN.md uses: *As a signed-in employee, I want to see my remaining vacation, sick, and personal days from live leave_balances on the dashboard, so that remaining days are real rows after signup or invite instead of empty mock cards.* Verification used the two ROADMAP success criteria as the contract and that PLAN story for User Flow Coverage. Reformat the ROADMAP goal with `/gsd mvp-phase 3` if you want the roadmap sentence to match.

## User Flow Coverage

User story (from PLAN files): As a signed-in employee, I want to see my remaining vacation, sick, and personal days from live leave_balances on the dashboard, so that remaining days are real rows after signup or invite instead of empty mock cards.

| Step | Expected | Evidence | Status |
|------|----------|----------|--------|
| Sign in | Session user reaches Overview | Existing dashboard; `useDashboardData(user)` fetches `GET /api/leave-balances` with `credentials: 'include'` | ✓ wired |
| See Leave Balance | Card title Leave Balance; loading pulse then rows or empty copy | `leave-balance-card.tsx`: pulse `h-4`+`h-2 bg-gray-200`; empty `No leave balance information available`; populated `cardBalances.map` | ✓ wired |
| Remaining days | Vacation, sick, personal from live `remaining_days` | `mockLeaveBalance` gone repo-wide. Card `{balance.remaining_days} days remaining`. GET returns `getLeaveBalance` after self-heal | ✓ wired; live numbers need human |
| After signup | First user has default rows so the card is not empty | `create_company_with_owner` INSERT SELECT from `leave_policies`; pgTAP owner 3 rows, remaining_days = default_allowance | ✓ VERIFIED at Postgres |
| After invite | Invitee has the same default rows | `accept_invite_with_employee` same INSERT; pgTAP invitee 3 rows | ✓ VERIFIED at Postgres |
| Outcome | Remaining days are real rows, not empty mock cards | Mock deleted; RPC seed + GET self-heal + card bind all present | ✓ code; dashboard walk-through needs human |

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | ------- | ---------- | -------------- |
| 1 | Dashboard remaining days show the signed-in user’s `leave_balances` rows (not mock 5/10 cards) | ✓ VERIFIED | `mockLeaveBalance` has zero matches in `*.{ts,tsx}`. Card maps `leaveBalance` through `balancesForLeaveCard` and renders `used_days`/`total_allowance`/`remaining_days`. Hook `adaptLeaveBalances` passes `remaining_days` through. Overview left column (`lg:col-span-3`) still mounts `LeaveBalanceCard`. |
| 2 | The first user of a new company and invited users have default `leave_balances` so remaining days are not empty | ✓ VERIFIED | Migration `20250830120000_seed_default_leave_balances.sql` INSERT SELECT `default_allowance` in both RPCs. `supabase/tests/seed_default_leave_balances.test.sql` asserts 3 current-year vacation/sick/personal rows for owner and invitee, unused start, remaining_days = active policy allowance. SUMMARY recorded `npx supabase test db` 36 pass (not re-run here). |
| 3 | `balancesForLeaveCard` returns vacation, then sick, then personal when all three exist, and omits any other leave_type (BAL-01, D-12) | ✓ VERIFIED | Named test `returns vacation, then sick, then personal regardless of input order` PASS. Extra-type drop test in `leave-balance-display.test.ts`. |
| 4 | `balancesForLeaveCard` returns only the types present (partial list stays ordered) and returns `[]` for no rows (BAL-01, D-08, D-15) | ✓ VERIFIED | Tests: one-element sick array; empty input `[]`. Implementation is `CARD_TYPES.map(find).filter`. |
| 5 | `planDefaultBalanceInserts` copies `total_allowance` from the matching active policy and sets used_days 0, remaining_days equal, carried_over 0 (BAL-02, D-01, D-02, D-14) | ✓ VERIFIED | Named test `returns three unused-start inserts from active policy allowances` PASS (20/10/5). Name-sort test uses 12 from `Alpha Sick`. |
| 6 | `planDefaultBalanceInserts` emits only vacation, sick, and personal; skips a type with no active policy and skips a type that already has a row even when used_days is non-zero (BAL-02, D-03, D-07, D-15) | ✓ VERIFIED | Tests: existing vacation used_days 5 → sick+personal only; no personal policy → vacation+sick; maternity catalog row omitted; missing `is_active` treated inactive. |
| 7 | Every planned insert uses the userId argument (never a second user's id) and the year argument (BAL-02, D-04, D-06) | ✓ VERIFIED | Test `uses the userId argument for every insert and never a second user id` PASS. |
| 8 | GET `/api/leave-balances` with a valid session inserts missing vacation/sick/personal rows for `session.user.id` and the current calendar year only, then returns that user's rows (BAL-01, D-04, D-05, D-06) | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | Route: `createTenantDatabaseService` → `getLeavePolicies` → `ensureDefaultLeaveBalances(session.user.id, year, policies)` → `getLeaveBalance(session.user.id, year)`. No identitySupabase. No test hits GET or persists self-heal rows. |
| 9 | Self-heal inserts use `leave_policies.default_allowance` via `getLeavePolicies` plus `planDefaultBalanceInserts`; unused start (BAL-01, D-01, D-02, D-14) | ✓ VERIFIED | `getLeavePolicies` → `getActivePolicies` (`is_active: true`). `ensureDefaultBalances` calls `planDefaultBalanceInserts(existing, policies, userId, year)` then `repository.create`. Facade does not call `updateLeaveBalance`. |
| 10 | A row that already exists for `(user_id, leave_type, year)` is not updated; duplicate insert is treated as success and GET re-selects (BAL-01, D-07) | ✓ VERIFIED | `ensureDefaultBalances` catch `DUPLICATE_ENTRY` continue; never `repository.update` / `createLeaveBalance` / `updateBalanceAfterApproval`. RPC `ON CONFLICT (user_id, leave_type, year) DO NOTHING`. pgTAP: used_days stays 7 after conflicting insert. `grep DO UPDATE` on the migration is 0. |
| 11 | Leave Balance card populated rows bind `used_days`, `total_allowance`, and `remaining_days` from the `leaveBalance` prop; remaining label uses `remaining_days` (BAL-01, D-10, D-11) | ✓ VERIFIED | `{balance.used_days}/{balance.total_allowance} days`; `{balance.remaining_days} days remaining`. Progress is `used_days/total_allowance`. No local `total_allowance - used_days`. |
| 12 | GET `/api/leave-balances` uses `createTenantDatabaseService` (tenant JWT + RLS), not the identity client (BAL-01) | ✓ VERIFIED | Route imports `createTenantDatabaseService` only. `tenant-supabase.ts`: minted JWT + anon apikey; "Does not use … the service_role key." `identitySupabase` / `service_role` / `updateLeaveBalance` absent in the route. |
| 13 | `create_company_with_owner` inserts vacation/sick/personal from active `leave_policies` in the same transaction (BAL-02, D-01, D-13, D-14) | ✓ VERIFIED | INSERT after owner_id update, before `RETURN v_user`. SELECT `lp.default_allowance` from DISTINCT ON (leave_type) active policies. No hardcoded 20/10/5 in the INSERT. pgTAP owner remaining_days = catalog. |
| 14 | `accept_invite_with_employee` inserts the same three types for the new employee in the same transaction (BAL-02, D-13) | ✓ VERIFIED | Same INSERT after invite accepted, still before `RETURN v_user`. pgTAP invitee 3 rows + vacation remaining_days = allowance. |
| 15 | RPC inserts set used_days 0, remaining_days = default_allowance, carried_over 0, year `EXTRACT(YEAR FROM CURRENT_DATE)`; skip inactive; `SECURITY DEFINER SET search_path = public` + GRANT EXECUTE to anon, authenticated, service_role (BAL-02, D-02, D-04, D-15, D-13) | ✓ VERIFIED | Both CREATE OR REPLACE lines plus ALTER/GRANT. WHERE `leave_type IN ('vacation','sick','personal') AND is_active = true`. pgTAP unused-start assertions. |
| 16 | After load, zero rows (or fetch error) render Empty state body inside the still-visible Card. Do not hide the card. Do not paint 0-day bars without rows (D-08) | ✓ VERIFIED | Empty when `cardBalances.length === 0` (covers `[]`, missing, extra-only). Copy `No leave balance information available` in `py-8`. Card + title stay. Source-contract test PASS. A `remaining_days === 0` row still has length > 0. |
| 17 | `isLoading` true shows the existing three-row pulse skeleton (`h-4` + `h-2 bg-gray-200`, `space-y-4`). Title stays. No spinner, no mock numbers (D-09) | ✓ VERIFIED | Loading branch: Calendar + Leave Balance + three `animate-pulse` rows. No `mockLeaveBalance`, no Spinner. |
| 18 | Failed GET: sonner Error state toast + same empty Card as empty (D-09). No mock 5/10 fallback. No inline red alert on the card | ✓ VERIFIED | `leaveBalanceError` → `toast.error('Failed to load leave balances')` in `useEffect`. Query fallbackError is the same string. `adaptLeaveBalances(leaveBalance \|\| [])` yields `[]` so empty branch runs. Existing `<Sonner richColors />` in `session-provider.tsx`. Source-contract test PASS. |
| 19 | One or two of the three types present: render only those rows in vacation then sick then personal order. Extra GET types are not rendered. At most three rows (D-12, D-15) | ✓ VERIFIED | Populated map is `cardBalances.map` after `balancesForLeaveCard(leaveBalance ?? [])`. Source-contract: no `leaveBalance.map`; no maternity-capable extra list. Helper unit tests cover order/partial/drop. |
| 20 | `balancesForLeaveCard` is the only mapper the card uses before rendering type rows; leaveBalance query key stays `['leaveBalance', user.id]` (BAL-01, D-12, D-09) | ✓ VERIFIED | Card imports `@/lib/leave-balance-display`. Hook queryKey `['leaveBalance', user.id]`; fetch `/api/leave-balances` with `credentials: 'include'`. |
| 21 | Flagged assumption BAL-01: remaining-day card binds current-calendar-year rows for the signed-in user only; extra leave types and other users are not this card | ✓ VERIFIED | GET uses `session.user.id` and `new Date().getFullYear()`. Card filters to vacation/sick/personal. No company-member loop. |
| 22 | Flagged assumption BAL-02: default seed is insert-only for vacation/sick/personal when an active `leave_policies` row exists; unique `(user_id, leave_type, year)` conflict is ignored and never becomes an UPDATE of used_days | ✓ VERIFIED | Planner + `repository.create` + RPC `DO NOTHING`. `ensureDefaultBalances` does not call upsert/update. |

**Score:** 21/22 truths verified (1 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | ----------- | ------ | ------- |
| `apps/web/src/lib/leave-balance-display.ts` | `balancesForLeaveCard` | ✓ VERIFIED | Exists, exports mapper, wired by card + tests |
| `packages/database/src/modules/leave-balances/plan-default-inserts.ts` | `planDefaultBalanceInserts` | ✓ VERIFIED | Pure insert-only planner; wired by `ensureDefaultBalances` |
| `apps/web/package.json` | web tests include display + card-states | ✓ VERIFIED | `leave-balance-display.test.ts` and `leave-balance-card-states.test.ts` on scripts.test |
| `packages/database/package.json` | database test script | ✓ VERIFIED | `plan-default-inserts.test.ts` on scripts.test |
| `packages/database/src/modules/leave-balances/repository.ts` | insert-only `create` | ✓ VERIFIED | `.insert(sanitizedData)`; existing `upsert` left for `createLeaveBalance` |
| `packages/database/src/modules/leave-balances/service.ts` | `ensureDefaultBalances` | ✓ VERIFIED | Planner + create; `DUPLICATE_ENTRY` continue |
| `packages/database/src/index.ts` | `ensureDefaultLeaveBalances` | ✓ VERIFIED | On `IDatabaseService` and `DatabaseService` |
| `apps/web/src/app/api/leave-balances/route.ts` | GET self-heal then list | ✓ VERIFIED | Tenant JWT; session.user.id; re-select |
| `apps/web/src/components/dashboard/leave-balance-card.tsx` | empty + ordered + `remaining_days` | ✓ VERIFIED | No `mockLeaveBalance`; `balancesForLeaveCard`; empty copy live |
| `apps/web/src/hooks/use-dashboard-data.ts` | leaveBalance toast | ✓ VERIFIED | `useEffect` on `leaveBalanceError` (TanStack Query v5 has no useQuery `onError`) |
| `packages/database/migrations/20250830120000_seed_default_leave_balances.sql` | both RPCs + policy INSERT | ✓ VERIFIED | `supabase/migrations` is a symlink; files identical |
| `supabase/tests/seed_default_leave_balances.test.sql` | pgTAP owner/invitee/conflict | ✓ VERIFIED | plan(14); create + accept + used_days stays 7 |

`gsd-tools query verify.artifacts` on all four plans: 13/13 passed.

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | --- | --- | ------ | ------- |
| `leave-balance-display.ts` | `leave-balance-card.tsx` | `balancesForLeaveCard` | ✓ WIRED | Import + `balancesForLeaveCard(leaveBalance ?? [])` |
| `plan-default-inserts.ts` | `service.ts` | `planDefaultBalanceInserts` then `create` | ✓ WIRED | `ensureDefaultBalances` |
| `leave-balances/route.ts` | `tenant-supabase.ts` | `createTenantDatabaseService` | ✓ WIRED | After `requireTenantSession` |
| `leave-balances/route.ts` | `packages/database` | `ensureDefaultLeaveBalances` then `getLeaveBalance` | ✓ WIRED | `session.user.id`, current year |
| `leave-balance-card.tsx` | `use-dashboard-data.ts` | `leaveBalance` prop | ✓ WIRED | dashboard-view → tabs → overview → card |
| `use-dashboard-data.ts` | `/api/leave-balances` | fetch credentials include | ✓ WIRED | `fetchSessionJson` |
| `use-dashboard-data.ts` | `session-provider.tsx` | `toast.error` / existing Sonner | ✓ WIRED | One `<Sonner richColors />` |
| seed migration | prior onboarding RPCs | CREATE OR REPLACE + INSERT before RETURN | ✓ WIRED | Both function bodies |
| seed migration | Phase 2 GRANT/search_path | ALTER + GRANT re-applied | ✓ WIRED | `search_path = public` |
| pgTAP | seed migration | `create_company_with_owner` / `accept_invite_with_employee` | ✓ WIRED | Test file calls both |

`gsd-tools query verify.key-links` on all four plans: 12/12 verified.

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| LeaveBalanceCard | `leaveBalance` / `cardBalances` | `useDashboardData` → GET `/api/leave-balances` → `getLeaveBalance` `.from('leave_balances').select` | Yes — PostgREST select after insert-only ensure | ✓ FLOWING |
| GET JSON | `balances` | `databaseService.getLeaveBalance(session.user.id, year)` | Yes — not `[]` hardcoded; returns query result | ✓ FLOWING |
| Self-heal inserts | planned rows | `getLeavePolicies()` (active catalog) + `planDefaultBalanceInserts` + `repository.create` `.insert` | Yes — `default_allowance` from DB policies | ✓ FLOWING |
| RPC seed | new user balances | INSERT SELECT `leave_policies.default_allowance` for `v_user.id` | Yes — no SQL literals 20/10/5 | ✓ FLOWING |
| Overview card | `leaveBalance` prop | Passed from `useDashboardData`; not `={[]}` | Yes | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Card order helper | `node --test --experimental-strip-types --test-name-pattern='returns vacation, then sick' apps/web/src/lib/leave-balance-display.test.ts` | 1 pass | ✓ PASS |
| Insert-only planner | `node --test --experimental-strip-types --test-name-pattern='returns three unused-start' packages/database/src/modules/leave-balances/plan-default-inserts.test.ts` | 1 pass | ✓ PASS |
| Web suite (orchestrator, not re-run) | `npm test --workspace=@timeoff/web` | 86 passed (executor/orchestrator) | ✓ PASS (recorded) |
| Database suite (orchestrator, not re-run) | `npm test --workspace=@timeoff/database` | 7 passed (executor/orchestrator) | ✓ PASS (recorded) |
| pgTAP seed (orchestrator, not re-run) | `npx supabase test db` | 36 pass including seed + tenant_rls (03-03 SUMMARY) | ? SKIP (no server start this verify) |

### Probe Execution

| Probe | Command | Result | Status |
| ----- | ------- | ------ | ------ |
| — | — | No `scripts/**/tests/probe-*.sh`; PLANs do not declare probes | SKIP |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ---------- | ----------- | ------ | -------- |
| **BAL-01** | 03-01, 03-02, 03-04 | Dashboard remaining days come from the user’s `leave_balances` rows (no mock card) | ✓ SATISFIED | Mock deleted; card binds `remaining_days`; GET tenant list after ensure; empty/toast/order wired. GET insert itself is present but not HTTP-tested (see truth 8). |
| **BAL-02** | 03-01, 03-03 | First user and invited users get default `leave_balances` so remaining days are not empty | ✓ SATISFIED | Both onboarding RPCs INSERT from `leave_policies`; planner unit tests; pgTAP owner + invitee + conflict skip. |

**Orphaned requirements:** none. REQUIREMENTS.md maps BAL-01 and BAL-02 to Phase 3; both IDs appear in PLAN frontmatter. BAL-03+ are later phases.

### Decision Coverage

All trackable CONTEXT.md decisions are honored by shipped artifacts. **15/15 honored** (D-01 through D-15). Non-blocking.

### Test Quality Audit

| Test File | Linked Req | Active | Skipped | Circular | Assertion Level | Verdict |
|-----------|-----------|--------|---------|----------|-----------------|---------|
| `apps/web/src/lib/leave-balance-display.test.ts` | BAL-01 | 4 | 0 | no | Value (order, types, empty) | PASS |
| `packages/database/src/modules/leave-balances/plan-default-inserts.test.ts` | BAL-02 | 7 | 0 | no | Value (allowance, skip, userId) | PASS |
| `apps/web/src/lib/leave-balance-card-states.test.ts` | BAL-01 | 6 | 0 | no | Source-contract (file contains patterns) | WARNING — proves source text, not React render |
| `supabase/tests/seed_default_leave_balances.test.sql` | BAL-02 | 14 | 0 | no | Value (counts, remaining_days vs catalog, used_days 7) | PASS |
| GET `/api/leave-balances` self-heal | BAL-01 | 0 | — | — | none | WARNING — no route/integration test |

**Disabled tests on requirements:** 0
**Circular patterns detected:** 0
**Insufficient assertions:** 2 WARNING (card-states source-contract; missing GET HTTP test) — not blockers; helper + pgTAP carry BAL-01/BAL-02 value-level proof.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| — | — | TBD / FIXME / XXX in phase files | none | No debt-marker blockers |
| `leave-balances/service.ts` | `createLeaveBalance` / `updateBalanceAfterApproval` | Pre-existing upsert and approve-deduct | ℹ️ Info | Self-heal does not call them. Deduct is Phase 4 (BAL-03). |
| `dashboard-view.tsx` | `created_at` / `updated_at` | "Mock value for now" on session user timestamps | ℹ️ Info | Pre-existing; not remaining-day numbers |

### Prohibitions

| Statement | Status | Evidence |
| --------- | ------ | -------- |
| Do not restyle the Leave Balance card | judgment — covered by human chrome check | Classes match UI-SPEC lock (space-y-6, w-3 h-3 dots, Progress h-2, text-green-600). Visual lock needs human. |
| Do not fall back to mock 5/10 | ✓ did not happen | `mockLeaveBalance` deleted; empty/error paths have no 5/10 literals |
| Do not UPDATE existing used_days/remaining_days this phase | ✓ did not happen | ensure + RPC are insert-only / DO NOTHING |
| Do not seed maternity/paternity/bereavement/unpaid | ✓ did not happen | Planner + SQL `IN ('vacation','sick','personal')` |
| Do not use service_role for GET `/api/leave-balances` | ✓ did not happen | `createTenantDatabaseService` only |
| Do not drop Phase 2 GRANT/REVOKE or `search_path = public` | ✓ did not happen | ALTER + GRANT re-applied on both RPCs |
| Do not add `company_id` columns to `leave_balances` | ✓ did not happen | INSERT lists user_id, leave_type, allowances, year only |
| Do not deduct remaining days on approve/reject/cancel | ✓ not this phase | `updateBalanceAfterApproval` unchanged and unused by GET/RPC. Phase 4. |

### Human Verification Required

### 1. Overview live remaining days (harvested 03-04)

**Test:** Sign in, open Overview. Watch Leave Balance: pulse, then live remaining_days.
**Expected:** Title Leave Balance. Rows show fetched used/allowance/remaining — not mock 5/10. Chrome unchanged.
**Why human:** Visual + live Network/card; D4 human_judgment.

### 2. Fetch error toast + empty copy

**Test:** Fail GET `/api/leave-balances` and reload Overview.
**Expected:** Toast `Failed to load leave balances`. Card visible with empty copy. No 5/10 bars. No inline red alert.
**Why human:** Toast + empty body together need a browser.

### 3. Extra types and partial lists

**Test:** Payload with extra types or only one of the three.
**Expected:** Extra types hidden. Partial list ordered vacation → sick → personal. Extra-only shows empty copy.
**Why human:** Helper is unit-tested; painted card is not.

### 4. Signup and invite outcome

**Test:** New company signup and invite accept, then Overview as owner and invitee.
**Expected:** Both see catalog remaining days, not empty copy. If `.env.local` points at hosted, apply `20250830120000_seed_default_leave_balances.sql` there first (03-03 did local push only).
**Why human:** User-story outcome. pgTAP is not the dashboard.

### 5. GET self-heal for an existing user (truth 8)

**Test:** Sign in as a Phase 1 user with no current-year `leave_balances`. Load Overview. Repeat GET.
**Expected:** First GET inserts vacation/sick/personal for `session.user.id` this year (unused start from policies). Card shows those remaining_days. Second GET does not overwrite used_days.
**Why human:** No HTTP test exercises the insert-then-reselect path.

## Gaps Summary

**No automated gaps.** Phase goal is implemented and wired: mock card is gone, remaining days bind `leave_balances.remaining_days`, onboarding RPCs seed from `leave_policies`, GET self-heals insert-only on the tenant JWT. One must-have (GET self-heal persist) is present and wired but not behaviorally proven by a test. Status is `human_needed` for the harvested UI walk-through and that GET path — not `gaps_found`.

Hosted schema push remains a human ops step if the web app is not on local Postgres (same as Phase 2). That is setup, not a code gap.

### Decision Coverage

All trackable CONTEXT.md decisions are honored by shipped artifacts. (15/15)

---

## Verification Metadata

**Verification approach:** Goal-backward (ROADMAP success criteria + PLAN must_haves; SUMMARY claims not treated as evidence)
**Must-haves source:** ROADMAP.md Phase 3 success criteria + 03-01 through 03-04 PLAN frontmatter (deduplicated)
**Automated checks:** artifacts 13/13, key links 12/12, named unit tests 2/2 PASS, requirements 2/2
**Human checks required:** 5 (1 behavior-unverified truth + harvested UI / signup flow)
**Total verification time:** ~8 min

---

_Verified: 2026-08-29T17:19:36Z_
_Verifier: Claude (gsd-verifier)_
