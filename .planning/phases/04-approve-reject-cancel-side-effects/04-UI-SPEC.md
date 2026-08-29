---
phase: 4
slug: approve-reject-cancel-side-effects
status: approved
shadcn_initialized: true
preset: new-york
created: 2026-08-30
reviewed_at: 2026-08-30T01:10:00Z
---

# Phase 4 — UI Design Contract

> Visual and interaction contract for frontend phases.

Brownfield lock: keep shipped approve/reject/cancel/delete dialogs, Leave Balance card, and Overview Notifications stats card. Side effects are server-truth; the UI only invalidates queries and keeps existing sonner toasts. Do not add a notification tray, restyle chrome, or change dialog copy.

Sources: `04-CONTEXT.md` D-12, D-19, D-20; `REQUIREMENTS.md` NOTIF-01/02, BAL-03/04; Phase 3 `03-UI-SPEC.md` (approved token lock). Canonical files: `apps/web/src/hooks/use-leave-request-operations.ts`, `apps/web/src/components/dashboard/leave-balance-card.tsx`, `apps/web/src/components/dashboard/dashboard-stats.tsx`, `apps/web/src/components/leave-request/data-table.tsx`.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | shadcn |
| Preset | `new-york` (baseColor `neutral`, cssVariables `true`, rsc `true`, iconLibrary `lucide`) |
| Component library | Radix UI via `@/components/ui/*` |
| Icon library | lucide-react (`Bell` on Notifications stats card — do not swap) |
| Font | Inter |

New primitives: none. Do not `npx shadcn add`. Reuse existing dialogs, sonner, Card.

---

## Spacing Scale

Lock existing classes on Leave Balance card (Phase 3), Notifications stats card, and leave-request dialogs. Do not tighten or loosen.

---

## Typography

Do not change titles, dialog headings, or stats-card labels. Notification **data** that appears after approve/reject is stored copy (`Leave Request approved` / `Leave Request rejected`); the Overview card still shows the unread **count** only.

---

## Color

Do not change Progress colors, Bell muted icon, or toast variants. Existing sonner success/error stay.

---

## Copywriting Contract

| Surface | Copy | Notes |
|---------|------|-------|
| Approve success toast | Keep existing sonner | Do not rewrite |
| Reject success toast | Keep existing sonner | Do not rewrite |
| Approve 409 missing balance | Use API `error` string in existing error toast | No new inline alert on the table |
| Notifications stats label | `Notifications` | Unchanged |
| In-app stored title | `Leave Request approved` / `Leave Request rejected` | Type is CHECK `request_approved` / `request_rejected`; title/message stay |
| Email subject | Same sense as in-app title | Not rendered in the app |
| Empty notifications count | `0` on the stats card | Do not hide the card |

---

## UI Considerations

Applicable state considerations resolved: 8 covered, 0 backstop, 0 unresolved (probe kinds: E1 list-collection leave table; E2 static-content stats count; E3 static-content leave balance card)

| Category | Element(s) | Status | Resolution / Reason |
|----------|------------|--------|---------------------|
| empty | E2 Notifications count | ✅ covered | Count `0` stays visible on the stats card. Do not hide the card. Do not invent a list empty-state this phase (D-12). |
| loading | E1 Leave table actions | ✅ covered | Existing dialog pending flags (`isApprovingLeaveRequest`). No new spinner chrome. |
| error | E1 Leave table actions | ✅ covered | Failed PATCH: existing sonner error from `payload.error` (including 409 missing balance). Table stays. |
| populated | E2 Notifications count | ✅ covered | After employee refetch, unread count includes persisted `request_approved` / `request_rejected` rows. |
| populated | E3 Leave Balance card | ✅ covered | After approve/cancel refetch, remaining_days match deducted/restored rows (Phase 3 chrome). |
| partial | E3 Leave Balance card | ✅ covered | Unchanged Phase 3 type-order rules. |
| overflow | E1 Leave table | ✅ covered | Existing table; no new columns or bulk chrome this phase. |
| zero-one-many | E2 Notifications count | ✅ covered | Integer count only. One persisted notice → count at least 1 for that employee. |

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | none new | not required |
| third-party | Resend is server-only, not a UI registry | not applicable |

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS

**Approval:** approved 2026-08-30
