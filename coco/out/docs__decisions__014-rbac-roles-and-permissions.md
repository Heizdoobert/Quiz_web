# docs/decisions/014-rbac-roles-and-permissions.md
lines:26 exports:
---
# ADR-014: Roles and Permissions (RBAC)

## Status
Accepted (requested by the project owner, 2026-10-12).

## Context
Every signed-in account was equal. The owner needs a few accounts that can look after the product: resolve disputed questions now, and later read analytics, browse the database and change remote config. Those later features are not built here; this decision is the foundation they will sit on.

## Decision
- **One role per account**, stored in `users.role`: `user`, `moderator` or `admin`. The column is `NOT NULL DEFAULT 'user'` with a check constraint, so an unknown role cannot be stored.
- **Permissions are code, roles are data.** `lib/services/rbac.ts` maps each role to named permissions (`roles.grant`, `disputes.resolve`, `analytics.read`, `db.read`, `config.write`). A role is a higher tier that includes the lower one: an admin can do everything a moderator can. Changing what a role can do is a code change that goes through review; changing who has a role is a database write.
- **One check.** `authorize(permission, account?)` in `lib/services/authorize.ts` is the only place a permission is decided. It reads the role from the database on every call, so a revocation applies on the next request. A role is never copied into a session cookie or a mobile bearer token.
- **Fail closed.** No account is `UNAUTHORIZED` (401). A missing `users` row, an unknown role or a role without the permission is `NOT_ALLOWED` (403). A database error while reading the role is `SERVER_ERROR` (500), never an allow. The check runs before input validation, so a caller without the permission learns nothing from the error messages.
- **Gated logic lives in `lib/services/`, never in a `'use server'` file.** Every export of a `'use server'` file is a public endpoint whose arguments the caller controls, and the existing actions take an optional `authAccount` argument that a caller can forge. The gated functions are reachable only from route handlers, which pass the account verified from the bearer token. A future web page must wrap a service in a server action that takes no account argument, so `authorize` reads the session cookie.
- **Two gated flows ship with it.** `PUT /api/v1/admin/roles` (admin) grants or revokes a role; an admin cannot change their own role, so the last admin cannot demote themselves by accident. `GET /api/v1/moderation/questions` and `POST /api/v1/moderation/questions/[id]/resolve` (moderator or admin) list quarantined questions and either restore them (back to `verified`, dispute count reset) or retire them (`rejected`), with an optional note of up to 500 characters.
- **Dispute resolution is one database function**, `resolve_quarantined_question`, so the question and its disputes change together and two moderators cannot both resolve the same question. Disputes are kept, stamped with `resolved_at`, `resolved_by`, `resolution` and `resolution_note`; only unresolved disputes count towards quarantine, so a restored question does not re-quarantine on its next report.
- **The first admin is not in the repository.** The repository is public, so the owner's email is not committed. `docs/migrations.md` holds a one-off statement with a placeholder that the owner runs once in the Supabase SQL editor.
- **`question_disputes` is closed to the public key.** Its public read policy exposed reporter ids and reasons; the migration drops it. The app reads and writes it with the secret key only.

## Consequences
- Accounts are `user` until an admin grants more. Until the owner runs the seed there is no admin and the gated routes answer 403 to everyone.
- Admin analytics, database and remote-config pages, permission editing, several roles per account, per-user detail views and any UI are not part of this change. Adding one is a new permission in `ROLE_PERMISSIONS` and a new gated service function.
- There is no audit table yet. Role changes and dispute resolutions are written to the application log (`role_changed`, `dispute_resolved`),
