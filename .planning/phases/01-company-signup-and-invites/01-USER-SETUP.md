# Phase 1: User Setup Required

**Generated:** 2026-08-29
**Phase:** company-signup-and-invites
**Status:** Incomplete

Complete these items for live Google sign-in (TENANT-05). Unit tests of `decideGoogleSignIn` do not need Google credentials.

## Environment Variables

| Status | Variable | Source | Add to |
|--------|----------|--------|--------|
| [ ] | `GOOGLE_CLIENT_ID` | Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client ID | `apps/web/.env.local` |
| [ ] | `GOOGLE_CLIENT_SECRET` | Same OAuth client | `apps/web/.env.local` |

Presence check this session: both vars were unset in `apps/web/.env.local`. Values were not printed.

## Dashboard Configuration

- [ ] **Authorized redirect URI**
  - Location: Google Cloud Console → APIs & Services → Credentials → OAuth client
  - Set to: `{NEXTAUTH_URL}/api/auth/callback/google`
  - Notes: Local example `http://localhost:3000/api/auth/callback/google`. Do not add Gmail, Calendar, Drive, or People API scopes.

## Verification

After completing setup, verify with:

```bash
# Presence-only; do not print secret values
grep -qE '^GOOGLE_CLIENT_ID=.+' apps/web/.env.local && echo GOOGLE_CLIENT_ID=set
grep -qE '^GOOGLE_CLIENT_SECRET=.+' apps/web/.env.local && echo GOOGLE_CLIENT_SECRET=set
```

Expected results:

- Both vars report `set`
- `/auth/signin` shows Continue with Google
- Unknown Gmail on sign-in lands on `/auth/error?error=InviteRequired`

---

**Once all items complete:** Mark status as "Complete" at top of file.
