---
schema_version: 1
open_count: 3
waived_count: 0
fixed_count: 0
total_count: 3
last_updated: 2026-08-29T13:49:48.646Z
---

# Broken Windows Ledger

> Cross-phase defect register. With `workflow.windows_enforce` enabled, `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|-------------|--------|--------|-------------|-------------|
| 1 | 01 | deviation | supabase/seed.sql |  | CLI seed required company_id and half_day_type so supabase start could apply the tenant migration | open |  | 2026-08-29T09:15:07.952Z |  |
| 2 | 01 | unmet-truth | apps/web/.env.local |  | Hosted Supabase matching NEXT_PUBLIC_SUPABASE_URL was not pushed; create_company_with_owner is live on local only | open |  | 2026-08-29T09:15:08.129Z |  |
| 3 | 02 | deviation | apps/web/src/app/api/auth/signup/route.ts |  | Dropped anon testSupabaseConnection from signup so identity does not probe users after REVOKE | open |  | 2026-08-29T13:49:48.646Z |  |

````json
[
  {
    "id": 1,
    "kind": "deviation",
    "phase": "01",
    "file": "supabase/seed.sql",
    "line": null,
    "description": "CLI seed required company_id and half_day_type so supabase start could apply the tenant migration",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-29T09:15:07.952Z",
    "resolved_at": null
  },
  {
    "id": 2,
    "kind": "unmet-truth",
    "phase": "01",
    "file": "apps/web/.env.local",
    "line": null,
    "description": "Hosted Supabase matching NEXT_PUBLIC_SUPABASE_URL was not pushed; create_company_with_owner is live on local only",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-29T09:15:08.129Z",
    "resolved_at": null
  },
  {
    "id": 3,
    "kind": "deviation",
    "phase": "02",
    "file": "apps/web/src/app/api/auth/signup/route.ts",
    "line": null,
    "description": "Dropped anon testSupabaseConnection from signup so identity does not probe users after REVOKE",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-29T13:49:48.646Z",
    "resolved_at": null
  }
]
````
