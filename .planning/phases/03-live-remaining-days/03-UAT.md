---
status: testing
phase: 03-live-remaining-days
source: [03-VERIFICATION.md]
started: 2026-08-29T17:20:00Z
updated: 2026-08-29T17:20:00Z
---

## Current Test

number: 1
name: Sign in, open Overview. Watch the Leave Balance card.
expected: |
  Title stays Leave Balance. Pulse skeleton while loading, then live remaining_days for vacation, sick, and personal — not mock 5/10. Chrome (dots, Progress, spacing) is unchanged.
awaiting: user response

## Tests

### 1. Overview live remaining days
expected: Title stays Leave Balance. Populated rows show {used_days}/{total_allowance} days and {remaining_days} days remaining from fetched leave_balances — not mock 5/10. Chrome (dots, Progress, spacing) is unchanged.
result: [pending]

### 2. Fetch error
expected: Sonner toast Failed to load leave balances. Card stays visible with No leave balance information available. No mock 5/10 bars. No inline red alert on the card.
result: [pending]

### 3. Extra / partial types
expected: Extra types do not appear. Maternity-only shows the empty copy, not a blank stack. One or two of vacation/sick/personal render only those rows in that order.
result: [pending]

### 4. Signup and invite
expected: New owner and invitee cards show catalog remaining days (vacation/sick/personal unused start) instead of empty copy. Hosted .env.local still needs a human db push if it does not point at local.
result: [pending]

### 5. GET self-heal for existing user
expected: Sign in as an existing Phase 1 user who has no current-year leave_balances. GET /api/leave-balances is 200. After the request, that user has vacation/sick/personal rows for this calendar year with used_days 0 and remaining_days equal to each active policy default_allowance. The card shows those remaining_days. A second GET does not change used_days on rows that already exist.
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
