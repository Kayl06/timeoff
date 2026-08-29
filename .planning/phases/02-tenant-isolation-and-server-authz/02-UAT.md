---
status: complete
phase: 02-tenant-isolation-and-server-authz
source: [02-VERIFICATION.md]
started: 2026-08-29T14:12:00Z
updated: 2026-08-29T14:48:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Leave request over the BFF (Network tab)
expected: POST /api/leave-requests (credentials included), not /rest/v1/leave_requests. The new row appears for that user. Manager/admin/hr self-leave is approved in the same POST (no second client approve call).
result: pass

### 2. Approve / reject / cancel / bulk (Network tab)
expected: Calls go to /api/leave-requests/{id} PATCH and /api/leave-requests/bulk POST, not PostgREST leave_requests. Existing sonner toasts and table refresh still happen.
result: pass

### 3. Unauthenticated vs manager GET
expected: Unauthenticated GETs return 401 JSON Unauthorized. Signed-in manager GET /api/manager-team-stats is 200. Signed-in employee GET /api/manager-team-stats is 403.
result: pass

### 4. Live signup / accept-invite after REVOKE
expected: Sign-in, create-company, and accept-invite still succeed (SECURITY DEFINER RPCs). GET /api/test-connection returns env SET/NOT SET only — no user emails or rows.
result: pass

### 5. Two-company UI + dashboard Network
expected: A does not list B people or requests. Dashboard Network has no /rest/v1/leave_requests (or other tenant tables). Personal and unified calendars load /api/calendar/leave-requests. Team calendar page may still show its pre-existing mock rows (Phase 7).
result: pass

## Summary

total: 5
passed: 5
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps
