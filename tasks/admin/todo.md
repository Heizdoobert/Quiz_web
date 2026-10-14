# Task list: Admin area (`/admin`)

Plan: `tasks/admin/plan.md`. Branch `feat/admin-area` in a worktree off `origin/preview`. Verify every task with `npm run check:task`; focused runs with `npx vitest run <file>`. Never overwrite `tasks/plan.md` or `tasks/todo.md` (SDK-gate agent).

Standing bar for every task: tests written with the code; no suppression comments; no component file over 200 lines; no secret in source; `authorize()` is the first await in any page or action.

## Phase 1: Foundation

### T1: Admin shell and guard
**Description:** The `/admin` frame: a layout with noindex metadata and a role-aware nav, a generic denial view, the new `errors.read` permission, and `/admin` kept out of crawlers. Pages arrive in later tasks; the index redirects to the first page the caller may open.
**Acceptance criteria:**
- [ ] `PERMISSIONS` contains `errors.read`; admin can, moderator and user cannot
- [ ] `app/admin/layout.tsx` sets `robots: { index: false, follow: false }` and renders nav links only for the permissions the caller holds
- [ ] `app/admin/page.tsx` redirects: admin to `/admin/config`, moderator to `/admin/quarantine`, a user or guest sees the denial view
- [ ] `components/admin/AdminDenied.tsx` shows a generic "no access" with a link home and an actionable message for a signed-out guest ("sign in first")
- [ ] `app/robots.ts` disallows `/admin` alongside `/api/`
**Verification:**
- [ ] `npx vitest run tests/rbac.test.ts tests/admin-shell.test.tsx` (new test: nav per role, redirect per role, guest, robots disallow)
- [ ] `npm run check:fast`
**Dependencies:** None
**Files likely touched:** `lib/services/rbac.ts`, `app/admin/layout.tsx`, `app/admin/page.tsx`, `components/admin/AdminNav.tsx`, `components/admin/AdminDenied.tsx`, `app/robots.ts`, `tests/rbac.test.ts`, `tests/admin-shell.test.tsx`
**Scope:** M (about 8 files, all small)

### Checkpoint: Foundation
- [ ] `npm run check:task` green; `npm run build` builds `/admin`
- [ ] In `npm run dev`, a signed-out visit shows the denial view and a signed-in `user` is denied

## Phase 2: Pages, in the owner's priority order

### T2: Remote config page (admin)
**Description:** Admin flips `maintenance_mode` in the UI. Write path per decision 3: `lib/db` upsert with the secret key, a service that authorizes and validates, a server action with no account argument, and a toggle with a confirm step.
**Acceptance criteria:**
- [ ] `lib/db/remote-config.ts` `upsertConfigValue(key, value)` uses `admin()` and sets `updated_at` on every write
- [ ] `lib/services/config-admin.ts` `setConfigValue({ key, value })` runs `authorize('config.write')` first, then rejects any key not own-registered in `KEYS` (including `__proto__`, `constructor`, `toString`) and any value whose `parse` returns `undefined`, then writes, then logs `config_changed` with actor, key and the new value (not a secret; the table holds none by rule)
- [ ] `lib/actions/admin-actions.ts` `updateConfigAction(key, value)` takes no account and returns `ActionResult`
- [ ] `/admin/config` (server component) authorizes `config.write`, reads the current values with `getRemoteConfig()`, and shows each registered key with its value and a "takes effect within about a minute" note; a DB failure shows a clear "could not load" state, not a blank page
- [ ] A client toggle for `maintenance_mode` with a confirm step; the result (success or the error message) is announced to assistive tech
- [ ] No RLS write policy added; the eslint `sdk/remote_config` block is unchanged
**Verification:**
- [ ] `npx vitest run tests/config-admin.test.ts tests/admin-config-page.test.tsx`: moderator and guest denied and the DB mock is never called; unknown and prototype keys rejected; wrong type rejected; valid write passes the right row to the DB mock; DB error returns `SERVER_ERROR` with no DB text
- [ ] `npm run lint` (boundary rule still blocks `@/lib/db/client` from anywhere new)
- [ ] `npm run check:architecture`
- [ ] Manual (owner's DB): toggle in the UI, `curl -s /api/config` shows the new value within about a minute
**Dependencies:** T1
**Files likely touched:** `lib/db/remote-config.ts`, `lib/services/config-admin.ts`, `lib/actions/admin-actions.ts`, `app/admin/config/page.tsx`, `components/admin/ConfigToggle.tsx`, `tests/config-admin.test.ts`, `tests/admin-config-page.test.tsx`
**Scope:** M (7 files)

### T3: Roles page (admin)
**Description:** Admin finds an account by display name and changes its role, using the existing `setAccountRole` (self-change already refused).
**Acceptance criteria:**
- [ ] `lib/db/roles.ts` `listAccounts({ search, limit, offset })` (secret key): returns `id`, `display_name`, `role`, `created_at`; escapes `%`, `_` and `\` in the search term; orders by `created_at` desc; `limit` capped
- [ ] `lib/services/role-admin.ts` gains `listAccountsForAdmin(params, authAccount?)`: `authorize('roles.grant')` first, clamps `limit` and `offset` as `moderation.ts` does
- [ ] `lib/actions/admin-actions.ts` gains `listAccountsAction` and `setRoleAction`, no account argument; `setRoleAction` calls `setAccountRole`
- [ ] `/admin/roles` authorizes `roles.grant`, has a search box and a paged table; a role select per row with a confirm step; the caller's own row has the select disabled with a reason
- [ ] The account id is never shown to anyone but the admin; no email is shown (the table has none)
**Verification:**
- [ ] `npx vitest run tests/admin-roles-page.test.tsx tests/roles-db.test.ts`: moderator denied and the list function is not called; `%` and `_` in the search arrive escaped; setting a role succeeds; own row refused
- [ ] `npm run check:task`
**Dependencies:** T1
**Files likely touched:** `lib/db/roles.ts`, `lib/services/role-admin.ts`, `lib/actions/admin-actions.ts`, `app/admin/roles/page.tsx`, `components/admin/RoleTable.tsx`, `tests/admin-roles-page.test.tsx`, `tests/roles-db.test.ts`
**Scope:** M (7 files)

### Checkpoint: owner flow
- [ ] `npm run check:task` green
- [ ] Owner can flip `maintenance_mode` and grant a moderator role from the UI on a real database
- [ ] Review with the owner before T4 and T5

### T4: Quarantine page (moderator and admin)
**Description:** A queue UI over the existing moderation services. No new DB code.
**Acceptance criteria:**
- [ ] `lib/actions/admin-actions.ts` gains `listQuarantineAction` and `resolveQuarantineAction`, no account argument, delegating to `listQuarantinedQuestions` and `resolveQuestionDispute`
- [ ] `/admin/quarantine` authorizes `disputes.resolve` (moderator and admin both pass), lists each question with its answer key, the open disputes' reasons and counts, and a paged "load more"
- [ ] Restore and retire buttons with an optional note (maximum `MAX_NOTE_LENGTH` characters, shown as a counter); the resolved question leaves the list
- [ ] An empty queue shows an explicit "nothing awaiting moderation" state
- [ ] A user is denied; the answer key is never fetched for a denied caller
**Verification:**
- [ ] `npx vitest run tests/admin-quarantine-page.test.tsx`: user denied and no list call; moderator and admin allowed; resolve passes the right outcome and note; a CONFLICT result (already resolved) is shown as a message and the row stays consistent
- [ ] `npm run check:task`
**Dependencies:** T1
**Files likely touched:** `lib/actions/admin-actions.ts`, `app/admin/quarantine/page.tsx`, `components/admin/QuarantineList.tsx`, `components/admin/QuarantineItem.tsx`, `tests/admin-quarantine-page.test.tsx`
**Scope:** M (5 files)

### T5: Error tracking page (admin, read-only)
**Description:** Top unresolved Sentry issues pulled server-side by REST. "Not configured" when the env is absent.
**Acceptance criteria:**
- [ ] First step: check the current Sentry "list a project's issues" endpoint, query and response fields against Sentry's docs before coding; the plan's assumption (`/api/0/projects/{org}/{project}/issues/?query=is:unresolved`, fields `title`, `count`, `lastSeen`, `permalink`, `level`) is unverified
- [ ] `lib/services/error-issues.ts` (`server-only`): `authorize('errors.read')` first; reads `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`; any missing returns `{ configured: false }`; `fetch` with a 5 s timeout and `cache: 'no-store'`; a non-2xx or network error returns a generic failure, never the response body or the token; the token is never logged
- [ ] `/admin/errors` shows title, level, count, last seen and a link per issue, "not configured" when absent, and a clear "could not load" on failure
- [ ] Issue text is rendered as React text; the link renders only when it starts with `https://`
- [ ] `.env.example` documents the three variables, with the token scope noted as read-only (`project:read`, `event:read`)
**Verification:**
- [ ] `npx vitest run tests/error-issues.test.ts tests/admin-errors-page.test.tsx`: moderator denied and `fetch` not called; no env gives `configured: false` and `fetch` not called; 200 maps to rows; 500 and a thrown error give the failure state with no body text; a `javascript:` permalink renders no link
- [ ] `npm run check:security` (semgrep) and gitleaks via `check:fast`
**Dependencies:** T1
**Files likely touched:** `lib/services/error-issues.ts`, `app/admin/errors/page.tsx`, `components/admin/IssueList.tsx`, `.env.example`, `tests/error-issues.test.ts`, `tests/admin-errors-page.test.tsx`
**Scope:** M (6 files)

## Phase 3: Close

### T6: Docs, ops, final proof
**Description:** Document the area, the new env, and the owner steps, then prove the whole change.
**Acceptance criteria:**
- [x] `docs/` gains a short "Admin area" note: pages, who sees what, the config write path, the Sentry env, and that moderators see quarantine only
- [x] `CHANGELOG.md` entry (Added: admin area; the new `errors.read` permission)
- [x] No change to `CONSTRAINTS.md`; the coverage ratchet and the 360 kB bundle ratchet still pass
- [ ] Owner steps listed in the PR body: apply `21-rbac.sql` and `remote-config.sql` to production if not yet applied; set the Sentry env in Vercel; confirm the first admin row exists
**Verification:**
- [x] `npm run check:full` and `npm run build && npm run check:bundle`
- [x] `npm run check:a11y` on `/admin/*` pages that render for the dev admin (zero critical or serious)
- [ ] Manual: signed in as admin, moderator and user in turn; each page allows or denies as the table in the plan says
**Dependencies:** T2, T3, T4, T5
**Files likely touched:** `docs/admin-area.md`, `CHANGELOG.md`
**Scope:** S (2 files)

### Checkpoint: Complete
- [ ] All acceptance criteria met; `check:full` green
- [ ] Merged into `company/update-code` per the standing rule
- [ ] PR to `preview` only when the owner says; then the usual promotion to `main`
