# API Coverage — Phase 1 Google

**Phase:** 01-company-signup-and-invites
**Provider:** Google (existing `next-auth/providers/google` in `apps/web/src/lib/auth.ts`)
**Default:** INTEGRATE; this matrix is the subtraction record.

Phase 1 uses Google only as an OAuth **sign-in** provider (OpenID Connect profile/email). No other Google API is called.

| capability | decision | reason |
|---|---|---|
| Google OAuth / OpenID sign-in | INTEGRATE | TENANT-01 create-company and TENANT-03/05 join-or-deny via existing GoogleProvider |
| Gmail API | OPT-OUT | No mailer this phase; invites are copy-link only. |
| Google Calendar API | OPT-OUT | Calendars in this product are in-app leave calendars (Phase 7); not Google Calendar. |
| Google Drive API | OPT-OUT | No attachment storage milestone; `attachments` are unused text arrays. |
| People API / Contacts | OPT-OUT | Invite target is a typed work email, not a Google contact picker. |
| Admin SDK / Workspace Directory | OPT-OUT | Companies self-serve via signup + invites; no Workspace sync. |
| Google Maps / Places | OPT-OUT | No location features in scope. |
| YouTube / other Google product APIs | OPT-OUT | Unrelated to leave tenancy. |
| GitHub OAuth | OPT-OUT | `images.domains` includes GitHub avatars only; no GitHub provider exists. Do not add one. |

## Scopes

Use the NextAuth Google provider defaults (openid / email / profile). Do not request Gmail, Calendar, or Drive scopes.

## Env

`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — already optional in development (provider omitted when empty). Redirect URI remains `{NEXTAUTH_URL}/api/auth/callback/google`.
