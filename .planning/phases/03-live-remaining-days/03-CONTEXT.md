# Phase 3: Live Remaining Days - Context

**Gathered:** 2026-08-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Dashboard remaining days show the signed-in user’s live `leave_balances` rows for the current calendar year (not the hardcoded mock card). First-user signup, invite accept, and existing users with no current-year rows get default vacation/sick/personal rows so the card is not empty. Approving that deducts days, bulk parity, mail, and calendars are other phases. Do not restyle the dashboard or turn this into a policy engine.

</domain>

<decisions>
## Implementation Decisions

### Default seed amounts
- **D-01:** Seed `total_allowance` from `leave_policies.default_allowance` for vacation, sick, and personal (catalog today: 20 / 10 / 5). Do not hardcode the mock card’s 10/20/10. Copying catalog numbers is not leave_policies *enforcement* (still out of scope). — **Reversibility:** costly — changing seed numbers later leaves existing rows at old allowances unless a data backfill is added.
- **D-02:** New rows start unused: `used_days = 0`, `remaining_days = total_allowance`, `carried_over = 0`.
- **D-03:** Seed only vacation, sick, and personal — the three types the existing card already lists. Do not seed maternity/paternity/bereavement/unpaid this phase.
- **D-04:** `year` is the current calendar year, matching `GET /api/leave-balances`.

### Existing users without rows
- **D-05:** Also backfill users who already exist (Phase 1) and have no current-year rows for those three types. New-only seed would leave local accounts empty.
- **D-06:** Self-heal on `GET /api/leave-balances`: insert only the signed-in user’s missing vacation/sick/personal rows for this year. Do not fill the whole company on someone else’s dashboard load.
- **D-07:** Insert missing `(user_id, leave_type, year)` only. Never UPDATE `used_days` / `remaining_days` on a row that already exists (demo seed.sql rows stay as-is).

### Empty card
- **D-08:** If GET still returns no rows after the self-heal, show the existing commented empty copy: “No leave balance information available”. Do not hide the card. Do not paint 0-day bars without rows.
- **D-09:** Keep the existing pulse skeleton while loading. On fetch error: sonner toast and the empty state. Do not fall back to mock 5/10 numbers.

### Card numbers
- **D-10:** Keep the existing Leave Balance card chrome (title, colored dots, Progress bars). Delete `mockLeaveBalance`. Bind used / allowance / remaining to fetched rows. Do not restyle.
- **D-11:** “N days remaining” uses the `remaining_days` column (the value Phase 4 will deduct), not `total_allowance - used_days`.
- **D-12:** Display order: vacation, then sick, then personal. If GET returns extra types, do not render them on this card this phase.

### Where seed runs
- **D-13:** Insert in both `create_company_with_owner` and `accept_invite_with_employee` (same transaction as the new user) **and** self-heal on GET. — **Reversibility:** costly — RPC changes are SECURITY DEFINER; keep `search_path = public`; planner must not drop GRANT/REVOKE from Phase 2.
- **D-14:** RPCs SELECT `default_allowance` from `leave_policies` for those three types at insert time (not hardcoded 20/10/5 in SQL).
- **D-15:** If a type has no active policy row, skip that type. Catalog already seeds vacation/sick/personal.

### Claude's Discretion
User chose “You decide” on: seed source (locked to D-01), backfill existing users (D-05), never overwrite existing rows (D-07), remaining_days column (D-11), type order (D-12), RPC reads policies (D-14), skip missing policy (D-15), bind fetch and delete mock (D-10). User chose explicitly: unused start, three types, calendar year, GET self-heal, self only, empty state, skeleton+toast, RPC+GET.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product / requirements
- `.planning/REQUIREMENTS.md` — BAL-01, BAL-02; ACCT-03 policy enforcement is v2
- `.planning/PROJECT.md` — remaining days = live `leave_balances`; signup seeds defaults; do not rebuild dashboard chrome; working-day math out of scope
- `.planning/ROADMAP.md` — Phase 3 goal and success criteria

### Prior phase contracts
- `.planning/phases/02-tenant-isolation-and-server-authz/02-SECURITY.md` — tenant JWT + RLS; identity RPCs stay SECURITY DEFINER
- `apps/web/src/app/api/leave-balances/route.ts` — session-gated GET, current calendar year
- `apps/web/src/lib/tenant-supabase.ts` — tenant queries use minted JWT, not service_role
- `apps/web/src/lib/service-role-supabase.ts` — identity/RPCs only

### Schema and UI
- `packages/database/migrations/001_initial_schema.sql` — `leave_balances`, `leave_policies` defaults (vacation 20, sick 10, personal 5)
- `packages/database/migrations/20250818193735_tenant_rls_and_anon_revoke.sql` — `leave_balances` tenant FOR ALL; `leave_policies` SELECT for authenticated
- `apps/web/src/components/dashboard/leave-balance-card.tsx` — mock card to replace; empty state already written but commented
- `apps/web/src/hooks/use-dashboard-data.ts` — already fetches GET `/api/leave-balances` with credentials
- `packages/database/src/modules/leave-balances/` — repository/service used by the BFF
- `supabase/seed.sql` — demo users may already have vacation/sick rows; do not reset them

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `LeaveBalanceCard`: keep Card/Progress chrome; stop using `mockLeaveBalance`; uncomment empty state.
- `GET /api/leave-balances`: extend to insert missing types for `session.user.id` then return rows (tenant client, RLS).
- `create_company_with_owner` / `accept_invite_with_employee`: add INSERT of three balance rows from `leave_policies`.
- `LeaveBalanceService` / repository: prefer existing create helpers over ad-hoc PostgREST from the route if they already insert.

### Established Patterns
- Session-gated BFF + `credentials: 'include'` (Phase 2). Do not put remaining-day reads back on the browser anon client.
- Identity writes stay on `identitySupabase` / SECURITY DEFINER RPCs. Tenant GET uses `createTenantDatabaseService`.
- `.planning/codebase/ARCHITECTURE.md` still describes pre-Phase-2 client `useDatabaseService` for dashboard data — **do not follow that path**. Use the BFF.

### Integration Points
- Overview dashboard already passes `leaveBalance` into `LeaveBalanceCard`.
- Query key `['leaveBalance', user.id]` — keep it; Phase 4 will need invalidation on approve (out of scope here unless already easy).
- RLS: authenticated INSERT on `leave_balances` for a same-company `user_id`. Self-heal must set `user_id = session.user.id`.

</code_context>

<specifics>
## Specific Ideas

- Mock card today: vacation 10 used 5, sick 20 used 5, personal 10 used 5, year 2025. Replacement must not keep those numbers.
- Catalog allowances to copy: Standard Vacation 20, Sick Leave 10, Personal Leave 5 (`001_initial_schema.sql`).
- Empty copy already in the card file (commented): “No leave balance information available”.

</specifics>

<deferred>
## Deferred Ideas

- Deduct/restore remaining days on approve/reject/cancel — Phase 4
- Bulk balance parity — Phase 5
- Showing maternity/paternity/bereavement on the card — not this phase
- Accrual, carry-over jobs, remaining-day gates on create — v2 ACCT-*
- Working-day / holiday math — out of scope this milestone
- Invalidating `leaveBalance` on approve — Phase 4 (hooks today may not)

None — discussion stayed within phase scope except the deferred items above (already on the roadmap).

</deferred>

---

*Phase: 3-Live Remaining Days*
*Context gathered: 2026-08-29*
