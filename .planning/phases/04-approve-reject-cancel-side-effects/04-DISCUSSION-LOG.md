# Phase 4: Approve Reject Cancel Side Effects - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-30
**Phase:** 4-approve-reject-cancel-side-effects
**Areas discussed:** Balance deduct/restore, Missing row and year, Audit actor, In-app notification types, Email provider, Failure order, UI invalidation
**Mode:** `--auto` (user: implement and decide all phases)

---

## Balance deduct and restore

| Option | Description | Selected |
|--------|-------------|----------|
| Increment used and decrement remaining_days in place | Preserves carried_over; remaining_days is the Phase 3 card truth | ✓ |
| Recompute remaining as total_allowance − used | Current helper; drops carried_over | |
| Deduct remaining only, leave used_days | Card used/allowance would lie | |

**User's choice:** [auto] Increment used and decrement remaining_days in place (recommended default)
**Notes:** Server `total_days` only. Negative remaining allowed (create gates are v2).

---

## Missing row and year

| Option | Description | Selected |
|--------|-------------|----------|
| 409 if no matching row; year from start_date | No silent no-op; cross-year requests hit the start year | ✓ |
| Silent skip (current) | PROJECT.md forbids this | |
| Insert-on-approve then deduct | Duplicates Phase 3 GET/RPC seed | |
| Always current calendar year | Breaks next-year requests | |

**User's choice:** [auto] 409 if no matching row; year from start_date (recommended default)

---

## Restore rules

| Option | Description | Selected |
|--------|-------------|----------|
| Restore only when cancelling/deleting an approved request | Matches ROADMAP BAL-04 | ✓ |
| Restore on any cancel | Would inflate remaining for pending cancels | |
| Delete never restores | Leaves deducted days stuck | |

**User's choice:** [auto] Restore only approved cancel/delete; reject never deducts; idempotent re-approve is 409

---

## Audit actor

| Option | Description | Selected |
|--------|-------------|----------|
| session.user.id; throw on insert failure | Closes LEAVE-01–03; no fake rows | ✓ |
| Keep user_id 'system' on delete | FK fails today | |
| Swallow audit errors (current) | Insert unproven | |

**User's choice:** [auto] Real actor UUID; createAuditLog throws (recommended default)

---

## In-app notification types

| Option | Description | Selected |
|--------|-------------|----------|
| CHECK types request_approved / request_rejected; throw on failure | Rows actually persist | ✓ |
| Keep success/error types | CHECK swallow + fake id | |
| Add a new notification tray | Out of scope; do not restyle | |

**User's choice:** [auto] CHECK-valid types; no mock rows; Overview unread count is the surface

---

## Email provider

| Option | Description | Selected |
|--------|-------------|----------|
| Resend adapter + EMAIL_FROM; best-effort after durable writes | Fits Vercel; Phase 6 reuses it | ✓ |
| Nodemailer SMTP / Mailhog | Extra local infra; no SMTP in INTEGRATIONS | |
| Block approve if mail fails | Local without a key could not approve | |

**User's choice:** [auto] Resend; mail must not fail the mutation; hosted UAT needs a key

---

## Failure order

| Option | Description | Selected |
|--------|-------------|----------|
| Deduct then status; reverse balance if status write fails | Avoids approved-without-deduct | ✓ |
| Keep best-effort after status (current) | CONCERNS.md known bug | |
| New SECURITY DEFINER RPC this phase | Deferred unless research requires it | |

**User's choice:** [auto] Deduct-before-status with reverse (recommended default)

---

## UI invalidation

| Option | Description | Selected |
|--------|-------------|----------|
| Do not restyle; invalidate leaveBalance on approve/reject/cancel/delete | Card updates after side effects | ✓ |
| Rebuild notification inbox | Scope creep | |

**User's choice:** [auto] No restyle; add leaveBalance invalidation (already on create)

---

## Claude's Discretion

All areas — user instructed to implement and decide all phases. Recommended option selected for every question.

## Deferred Ideas

- Bulk balance/audit parity — Phase 5
- Password-reset mail — Phase 6
- Calendar agreement — Phase 7
- Notification tray UI — not this milestone
- Remaining-day gates / policy engine — v2
