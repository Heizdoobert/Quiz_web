# Implementation Plan: RBAC foundation (roles, permissions, two gated flows)

Intent confirmed with the owner on 2026-10-12. Task list: `tasks/rbac/todo.md`.
This lives in `tasks/rbac/` because `tasks/plan.md` and `tasks/todo.md` hold the SDK-gate agent's unchecked tasks; do not overwrite them.

## Overview

Give each account one role, `user`, `moderator` or `admin` (admin includes everything moderator can do). Roles map to named permissions (`roles.grant`, `disputes.resolve`, `analytics.read`, `db.read`, `config.write`). One server-side check gates server actions and `/api/v1` routes. Two real flows ship with it: an admin grants and revokes roles, and a moderator resolves disputed (quarantined) questions. Admin analytics, database and remote-config pages are later tasks that call the same check.

## What exists today (found while planning)

- No role concept. Access control is ownership checks in server actions plus the service-role `admin()` client, which only `lib/db/*` may import (ESLint boundary, ADR-002).
- Disputes can be filed but not resolved. `disputeQuestion` (`lib/actions/question-actions.ts`) quarantines a question at `QUARANTINE_AT = 3` reports by setting `questions.status = 'quarantined'`. `question_disputes` has no resolution columns. `questions.status` allows `verified | pending | quarantined | rejected`.
- Identity: web uses the `quiz_session` cookie (`getSessionAccount`), the mobile and API v1 use a bearer token (`requireAuth`, account id only). Actions take an optional `authAccount` so both paths share one function.
- `NOT_ALLOWED` already maps to HTTP 403 in `mapErrorCodeToStatus`, but is missing from the `ActionErrorCode` union in `lib/types.ts`.
- `users` has column-level `SELECT` grants for `anon` and `authenticated` (`accounts.sql`), so a new `role` column is unreadable with the public key as long as it is not added to that grant.
- Username accounts sign in through a synthetic email (`usernameToEmail`), email-code accounts use the real address.
- Next free migration number is `21-` (preview has up to `20-drop-web3-schema.sql`).
- The repo is public.

## Architecture decisions

- **One `role` column on `users`** (`TEXT NOT NULL DEFAULT 'user'`, CHECK in the three roles). No role table, no per-user permission rows. Add them only if a second dimension appears.
- **Permissions are code, roles are data.** `lib/services/rbac.ts` holds the permission list and the role-to-permissions map (pure, no I/O). Admin gets every permission; moderator gets `disputes.resolve`.
- **Role read from the DB on every gated call**, never baked into the cookie or bearer token, so a revoked role stops working on the next request. Cost: one small read per gated call, none on ordinary routes.
- **Fail closed.** A DB error while reading the role returns `SERVER_ERROR`, never "allowed".
- **Layering follows the existing pattern:** `lib/db/roles.ts` (only place that touches the role column) then `lib/services/authorize.ts` (permission check) then actions in `lib/actions/` (take optional `authAccount`) then thin routes in `app/api/v1/`. Nothing in `lib/` imports `app/` or `components/`.
- **403 via the existing code:** add `NOT_ALLOWED` to `ActionErrorCode`; `apiError` already maps it.
- **Resolve outcomes:** `restore` sets the question back to `verified`, `retire` sets it to `rejected`. Both stamp the open disputes with `resolved_at`, `resolved_by`, `resolution` and an optional `resolution_note`. Disputes are kept as history. Only a `quarantined` question can be resolved; the update is conditional on that status so two moderators cannot both win.
- **`countDisputes` counts only unresolved disputes**, otherwise a restored question would re-quarantine on its next report because the old three still count.
- **Self-change guard:** an admin cannot change their own role (prevents locking the project out). The first admin comes from the seed.
- **Admin seed is not committed.** The repo is public, so a committed migration would put the owner's email in git history. `21-rbac.sql` is schema only. The seed is a one-off statement with a placeholder, documented in `docs/migrations.md`; the owner runs it with their own email in the Supabase SQL editor. It matches `auth.users.email`, so the admin must sign in with an email code (not a username account), and it must be re-run if the `users` row did not exist yet when it first ran.
- **No audit table.** Actor, target and before/after go to `logger.info`, and `resolved_by` is stored on disputes. Add a table when someone needs to query history.
- **Gated logic lives in `lib/services`, never in a `'use server'` file.** Every export of a `'use server'` file is a public endpoint whose arguments the caller controls, and the existing actions take an `authAccount` argument that a browser could forge (spawned as a separate task). Routes pass the account from `requireAuth`; a future web page wraps the service in a server action that takes no account argument.
- **No UI in this task.** Flows are server actions plus `/api/v1` routes. A moderator needs a queue to resolve against, so one small list endpoint is included.

## Task list

### Phase 1: Foundation
- [x] Task 1: Migration `21-rbac.sql` (role column, dispute resolution columns, anon-cannot-read-role check)
- [x] Task 2: Permission model (`lib/services/rbac.ts`, `NOT_ALLOWED`)
- [x] Task 3: Role storage and `authorize()` (`lib/db/roles.ts`, `lib/services/authorize.ts`)

### Checkpoint: Foundation
- [x] Type-check, lint and tests pass; migration verified on a throwaway Postgres, twice

### Phase 2: Gated flows
- [x] Task 4: Admin grants and revokes roles (`lib/services/role-admin.ts` plus `/api/v1/admin/roles`)
- [x] Task 5: Dispute resolution storage (`resolve_quarantined_question` SQL function, `lib/db/questions.ts`, unresolved-only count)
- [x] Task 6: Moderator queue and resolve (service plus two `/api/v1/moderation` routes)

### Checkpoint: Flows
- [ ] 401/403/200 matrix covered for every gated route; changed-line coverage at least 80%

### Phase 3: Docs and ship
- [x] Task 7: ADR-014, seed template, ledger, CHANGELOG
- [ ] Task 8: `check:task`, PR to `preview`, CI green

## Risks and mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| `role` readable with the public key (someone adds it to the `users` grant later) | High | Not in the column grant; `21-rbac.sql` asserts `anon` cannot select it and raises if it can; Task 1 verification re-checks it |
| Seed does nothing (no `users` row yet, or the owner signed up with a username) | Medium | Seed template prints a NOTICE when no row matched; docs say to sign in once by email code, then run it |
| Two moderators resolve the same question | Low | Conditional update on `status = 'quarantined'`; loser gets `CONFLICT` |
| Restored question re-quarantines instantly | Medium | `countDisputes` ignores resolved disputes (Task 5, tested) |
| Lockout (last admin demotes themselves) | Medium | Self-change guard in Task 4 |
| Other agent is on `feat/sdk-gate` in the main checkout | Medium | Work in a separate worktree off `origin/preview`, branch `feat/rbac`; never touch `sdk/` or `tasks/plan.md` |
| Migration applied to production without a branch test | High | Docs rules: Supabase branch first, then production, date written in the ledger; owner applies |

## Open questions (defaults assumed, say if wrong)

- Moderation queue and role management are API only; a UI is a later task.
- `role` is not added to `getSessionInfo` yet; add it when a page needs to show or hide admin links.
- A retire needs no mandatory note (optional, capped at 500 characters like a dispute reason).
- No rate limit on role changes (admin-only, logged).
