---
status: testing
phase: 02-tenant-isolation-and-server-authz
source: [02-VERIFICATION.md]
started: 2026-08-29T14:12:00Z
updated: 2026-08-29T14:12:00Z
---

## Current Test

number: 1
name: Leave request over the BFF (Network tab)
expected: |
  POST /api/leave-requests (credentials included), not /rest/v1/leave_requests. The new row appears for that user. Manager/admin/hr self-leave is approved in the same POST (no second client approve call).
awaiting: user response

## Tests

### 1. Leave request over the BFF (Network tab)
expected: POST /api/leave-requests (credentials included), not /rest/v1/leave_requests. The new row appears for that user. Manager/admin/hr self-leave is approved in the same POST (no second client approve call).
result: [pending]

### 2. Approve / reject / cancel / bulk (Network tab)
expected: Calls go to /api/leave-requests/{id} PATCH and /api/leave-requests/bulk POST, not PostgREST leave_requests. Existing sonner toasts and table refresh still happen.
result: [pending]

### 3. Unauthenticated vs manager GET
expected: Unauthenticated GETs return 401 JSON Unauthorized. Signed-in manager GET /api/manager-team-stats is 200. Signed-in employee GET /api/manager-team-stats is 403.
result: [pending]

### 4. Live signup / accept-invite after REVOKE
expected: Sign-in, create-company, and accept-invite still succeed (SECURITY DEFINER RPCs). GET /api/test-connection returns env SET/NOT SET only — no user emails or rows.
result: [pending]

### 5. Two-company UI + dashboard Network
expected: A does not list B people or requests. Dashboard Network has no /rest/v1/leave_requests (or other tenant tables). Personal and unified calendars load /api/calendar/leave-requests. Team calendar page may still show its pre-existing mock rows (Phase 7).
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
