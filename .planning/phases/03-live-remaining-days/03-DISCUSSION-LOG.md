# Phase 3: Live Remaining Days - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-29
**Phase:** 3-Live Remaining Days
**Areas discussed:** Default seed amounts, Existing users without rows, Empty card, Card numbers, Where seed runs

---

## Default seed amounts

| Option | Description | Selected |
|--------|-------------|----------|
| Copy leave_policies.default_allowance | vacation 20 / sick 10 / personal 5 | ✓ (via You decide) |
| Hardcode mock card | 10 / 20 / 10 | |
| You decide | | ✓ on source |

**User's choice:** You decide on source → locked to copy policies. Explicit: unused start; vacation/sick/personal only; calendar year.

**Notes:** Not a policy engine. Catalog already has those three policies.

---

## Existing users without rows

| Option | Description | Selected |
|--------|-------------|----------|
| New signup/accept only | Phase 1 users stay empty | |
| Backfill existing | | ✓ (via You decide) |
| Fill on GET /api/leave-balances | | ✓ |
| One-shot SQL migration | | |
| Fill on login | | |
| Signed-in user only | | ✓ |
| Whole company | | |
| Insert missing rows only | | ✓ (via You decide) |
| Reset existing used_days | | |

**User's choice:** You decide on backfill + overwrite → backfill yes, never overwrite. Explicit: on GET, self only.

---

## Empty card

| Option | Description | Selected |
|--------|-------------|----------|
| Existing empty copy | “No leave balance information available” | ✓ |
| Hide the card | | |
| Fake 0-day bars | | |
| Skeleton + toast on error | | ✓ |
| Fall back to mock on error | | |

**User's choice:** Empty state + keep skeleton; toast on error.

---

## Card numbers

| Option | Description | Selected |
|--------|-------------|----------|
| Bind fetch, delete mock | Same chrome | ✓ (via You decide) |
| Render whatever GET returns | | |
| remaining_days column | | ✓ (via You decide) |
| Compute allowance − used | | |
| Vacation, sick, personal order | | ✓ (via You decide) |
| API return order | | |

**User's choice:** You decide on bind, remaining column, and order.

---

## Where seed runs

| Option | Description | Selected |
|--------|-------------|----------|
| RPC + GET self-heal | | ✓ |
| GET only | | |
| Next.js after RPC | | |
| RPC SELECT from leave_policies | | ✓ (via You decide) |
| Hardcode 20/10/5 in SQL | | |
| Skip type if no policy | | ✓ (via You decide) |
| Insert 0-allowance row | | |

**User's choice:** Explicit RPC+GET. You decide on SELECT policies and skip missing type.

---

## Claude's Discretion

Seed source; backfill existing users; insert-missing-only; remaining_days column; type order; RPC reads policies; skip missing policy type; bind fetch / delete mock.

## Deferred Ideas

Phase 4 deduct/restore; Phase 5 bulk; extra leave types on the card; v2 policy engine / accrual; working-day math.
