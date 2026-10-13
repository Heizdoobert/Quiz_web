# Admin area

A role-gated web UI at `/admin` for the owner and moderators. It sits on the roles and permissions in [ADR-014](decisions/014-rbac-roles-and-permissions.md).

| Page | Permission | Who | What |
|---|---|---|---|
| `/admin/config` | `config.write` | admin | Switch the keys registered in `sdk/remote_config/keys.ts` (today `maintenance_mode`) |
| `/admin/roles` | `roles.grant` | admin | Search accounts by display name and change a role |
| `/admin/quarantine` | `disputes.resolve` | moderator, admin | Restore or retire quarantined questions, with an optional note |
| `/admin/errors` | `errors.read` | admin | Read-only list of the most frequent unresolved Sentry issues |

`/admin` sends you to the first page your role may open. The nav shows only those pages. It is a convenience: every page and every action calls `authorize()` itself, which reads the role from the database on each request, so a revoked role stops working on the next one. The area is `noindex` and disallowed in `robots.txt`; there is no link to it from the public site.

## How a write works

Server actions in `lib/actions/admin-actions.ts` take no account argument (an exported action that did would let any caller claim to be an admin). Each calls a service that authorizes from the session cookie before it validates anything.

- **Config:** `lib/services/config-admin.ts` accepts only keys registered in `KEYS`, runs the key's `parse` on the value, then `lib/db/remote-config.ts` upserts the row with the secret key and stamps `updated_at`. The public key has no write policy on `remote_config`. A change reaches `GET /api/config` within about a minute under steady traffic, and up to six minutes after a quiet spell (`s-maxage=60`, `stale-while-revalidate=300`). To add a switch, add the key to `KEYS`; a value type other than boolean needs its own control in `components/admin/`.
- **Roles:** `setAccountRole` refuses to change your own role, so the only admin cannot lock themselves out. There is no email on the `users` table, so accounts are found by display name.
- **Quarantine:** reuses `listQuarantinedQuestions` and `resolveQuestionDispute`.

## Error tracking setup

`/admin/errors` calls Sentry's organization issues endpoint on the server. Set these on the server (Vercel project settings, or `.env`); without them the page says "not configured":

| Variable | Value |
|---|---|
| `SENTRY_AUTH_TOKEN` | An auth token with only the `event:read` scope |
| `SENTRY_ORG` | Organization slug |
| `SENTRY_PROJECT` | Project slug |

The token is read only in `lib/services/error-issues.ts` and is never sent to the browser or logged. This is separate from `NEXT_PUBLIC_SENTRY_DSN`, which only sends events.

## Not included

Audit log, content management for questions and quizzes, analytics and database pages, a mobile admin, moderator access to config or errors, more than one admin tier, and a consumer of `maintenance_mode` (banner or blocking play).
