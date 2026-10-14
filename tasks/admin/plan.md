# Implementation Plan: Admin area (`/admin`)

Intent confirmed 2026-10-13 (interview). Local only, like the other dev-only plans (`tasks/`, `coco/`). `tasks/plan.md` and `tasks/todo.md` belong to the SDK-gate agent and are not touched; this plan and its task list live in `tasks/admin/`, as `tasks/rbac/` does.

## Overview

A role-gated web admin area at `/admin` for the owner, so day-to-day operations stop needing the Supabase dashboard. Four pages:

| Page | Who | What |
|---|---|---|
| `/admin/config` | admin (`config.write`) | Edit the keys registered in `sdk/remote_config`, starting with `maintenance_mode` |
| `/admin/roles` | admin (`roles.grant`) | Find an account by display name, change its role |
| `/admin/quarantine` | moderator and admin (`disputes.resolve`) | Restore or retire quarantined questions |
| `/admin/errors` | admin (`errors.read`, new) | Read-only top unresolved Sentry issues |

Web only. No audit log, no content management, no analytics or database pages, no mobile admin, no `maintenance_mode` consumer, no multi-admin or read-only role.

## What already exists (reuse, do not rebuild)

- `lib/services/rbac.ts`: roles and `PERMISSIONS`, already containing `config.write` and `roles.grant`. Admin gets every permission by construction.
- `lib/services/authorize.ts`: `authorize(permission, authAccount?)` reads the role from the DB each call; with no account it reads the session cookie. Every page and action goes through it.
- `lib/services/role-admin.ts` `setAccountRole`, `lib/services/moderation.ts` `listQuarantinedQuestions` and `resolveQuestionDispute`: already authorize, validate and log. Their header comments say a web page must wrap them in a server action that takes no account argument. That is the pattern here.
- `sdk/remote_config`: `KEYS` (default and `parse` per key) and `getRemoteConfig()` (public client, read only). `app/api/config/route.ts` caches 60 s at the CDN, which is the "within about a minute" in the success criterion.
- `lib/db/client.ts`: only `lib/db/*` and `sdk/remote_config/*` may import it, and `sdk/remote_config` may use `pub` only. So the write cannot live in the SDK; it lives in `lib/db`.
- `components/profile/AccessDeniedView.tsx`: wording is creator-dashboard specific, so a small generic denial view is needed.

## Architecture decisions

1. **Server components for pages, server actions for writes.** Each page calls `authorize(<permission>)` on the server before it renders anything and renders a denial view otherwise. Client islands exist only where there is interaction (toggle, role select, resolve buttons). The first-load JS of public routes is unaffected, so the 360 kB bundle ratchet is not at risk.
2. **Server actions in `lib/actions/admin-actions.ts` take no account argument.** `authorize()` reads the session cookie. This is the rule from `role-admin.ts`: an exported action that accepts an account lets any caller claim to be admin.
3. **Config write path (the "ask first" item, approved in the interview).** `lib/db/remote-config.ts` `upsertConfigValue(key, value)` with `admin()`, setting `updated_at = now()` on every write. `lib/services/config-admin.ts` `setConfigValue({ key, value })`: `authorize('config.write')` first, then `Object.hasOwn(KEYS, key)` and `KEYS[key].parse(value) !== undefined`, then write. No RLS write policy for the public key. The eslint block for `sdk/remote_config` stays untouched.
4. **Roles page lists accounts through `lib/db`.** `listAccounts({ search, limit, offset })` in `lib/db/roles.ts`, secret key (`users.role` is not in the public column grant). `users` has `id`, `display_name`, `role`, `created_at`; there is no email column, so the admin searches by display name. The `ilike` wildcards `%` and `_` in the search term are escaped. Role change goes through the existing `setAccountRole`, which already forbids changing your own role, so the admin cannot lock themselves out.
5. **Errors page: plain `fetch` to the Sentry REST API, in `lib/services/error-issues.ts`.** Not through `sdk/tracking-analytics`: that module is capture-only and deletable, and a REST read needs no vendor package. Env, all server-only: `SENTRY_AUTH_TOKEN` (read scope only), `SENTRY_ORG`, `SENTRY_PROJECT`. Any missing, the service returns `{ configured: false }` and the page shows "not configured". Fetch has a 5 s timeout and `cache: 'no-store'`. Sentry strings render as React text; the issue link is rendered only when its URL starts with `https://`.
6. **New permission `errors.read`** in `PERMISSIONS`. Admin gets it automatically; moderator does not. A reviewed code change, as `rbac.ts` intends. `tests/rbac.test.ts` iterates `PERMISSIONS`, so it covers the new one with no edit beyond an explicit moderator-denied assertion.
7. **Shell.** `app/admin/layout.tsx` sets `robots: noindex` metadata and renders a nav showing only the pages the caller's role may open. `app/robots.ts` disallows `/admin`. No link from the public header: the owner types the URL. Per-page `authorize()` is the guard; the nav is a convenience, never the check.
8. **No migration.** `remote_config` (`supabase/migrations/remote-config.sql`) and `users.role` (`21-rbac.sql`) already exist. The owner still has to confirm both are applied to the rebuilt production database before the pages are useful.
9. **Branch.** Worktree off `origin/preview` on `feat/admin-area` (RBAC precedent). When done it is merged into `company/update-code` per the standing rule; the PR to `preview` is opened only when the owner says.

## Dependency graph

```
rbac.ts (+ errors.read) ── T1 shell, guard, denial view, robots
                              │
        ┌─────────────────────┼──────────────────────┬───────────────┐
        T2 config page        T3 roles page          T4 quarantine   T5 errors page
        (lib/db write +       (lib/db list +         (action + UI,   (service + page,
         service + UI)         action + UI)           no new DB)      env)
        └─────────────────────┴──────────────────────┴───────────────┘
                                         │
                                  T6 docs, ops, final proof
```

T2 to T5 share only T1, so they are independent after it. Run them in the order of the owner's priority (config, roles, quarantine, errors), one at a time.

## Task list

### Phase 1: Foundation
- [x] T1 Admin shell and guard (b30ce00)
### Checkpoint: Foundation
### Phase 2: Pages, in priority order
- [x] T2 Remote config page
- [x] T3 Roles page
### Checkpoint: owner flow (config and roles work end to end)
- [x] T4 Quarantine page
- [x] T5 Error tracking page
### Phase 3: Close
- [x] T6 Docs, env, final proof (2026-10-13; owner steps still open: apply 21-rbac.sql and remote-config.sql in production, first admin row, Sentry env in Vercel)

Details, acceptance criteria and verification per task are in `tasks/admin/todo.md`.

## Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| A server action accepts an account argument, so anyone can claim admin | High | Actions take no account; `authorize()` reads the cookie. A test calls each action with no session and with a moderator session and asserts denial |
| A config write stores a value of the wrong type or a key that is not registered | High | `setConfigValue` allows registered keys only and runs `parse`; test covers an unknown key, a wrong type, a prototype key (`__proto__`, `constructor`) |
| Page renders data before the permission check | High | `authorize()` is the first await in each page and the page returns the denial view before touching data; test asserts the data function is not called for a denied role |
| Sentry token leaks to the client or into logs | High | Read only in `lib/services/error-issues.ts` (`server-only`), never in a client component, never logged; gitleaks and semgrep run in `check:full` |
| Sentry issue text or link carries markup or a `javascript:` URL | Med | Text rendered by React; link only when it starts with `https://` |
| Production DB lacks `remote_config` or `users.role` | Med | T6 lists the check as an owner step; the config page shows a clear "could not load" state on a DB error instead of a blank page |
| Cached config: UI shows the new value, `/api/config` still serves the old one for up to 6 min after a quiet spell | Low | Documented in the page ("takes effect within about a minute"); the config page itself reads fresh from the DB |
| Component files exceed the 200-line cap | Low | One client island per concern; lint enforces it |
| Coverage ratchet falls | Low | Each task ships its tests; `check:task` runs the ratchet |

## Open questions (defaults taken; say if wrong)

1. **Header link.** Default: none. The owner types `/admin`. A link shown only to admins would need the role on the client session, which is a larger change.
2. **`maintenance_mode` UI control.** Default: a toggle with a confirm step, because flipping it in production affects every client. Generic per-key editors are not built: with one registered key, a boolean toggle is enough, and a new key type is added with its control when the key is added.
3. **Sentry scope.** Default: one project, top 25 unresolved issues by frequency. Tell me if the project has a different slug layout.
