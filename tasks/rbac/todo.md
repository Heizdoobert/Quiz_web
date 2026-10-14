# Task List: RBAC foundation

Plan and decisions: `tasks/rbac/plan.md`. Work in a separate worktree off `origin/preview` (branch `feat/rbac`); the main checkout belongs to the SDK-gate agent.
Commands: focused test `npx vitest run tests/<file>`, gate `npm run check:task`, migrations `bash scripts/verify-migrations.sh` (needs Docker).

## Phase 1: Foundation

### Task 1: Migration `21-rbac.sql`

**Description:** Add the role column and dispute resolution columns in one idempotent script, with a self-check that the public key cannot read `role`.

**Acceptance criteria:**
- [x] `users.role` is `TEXT NOT NULL DEFAULT 'user'` with a CHECK for `user | moderator | admin`; existing rows become `user`
- [x] `question_disputes` gains `resolved_at`, `resolved_by` (FK to `users(id)`, `ON DELETE SET NULL`), `resolution` (CHECK `restored | retired`), `resolution_note`
- [x] The script raises if `anon` or `authenticated` can `SELECT users.role`
- [x] No email or other personal data in the file

**Verification:**
- [x] `bash scripts/verify-migrations.sh` lists no new errors for `21-rbac.sql`; running it twice is clean
- [x] Manual: a fresh DB shows the column and grants as above

**Dependencies:** None

**Files likely touched:**
- `supabase/migrations/21-rbac.sql`
- `scripts/verify-migrations.sh`
- `README.md` (Database Setup order)

**Estimated scope:** Small

### Task 2: Permission model

**Description:** Pure module with the role and permission lists and the role-to-permissions map, plus `NOT_ALLOWED` in `ActionErrorCode`.

**Acceptance criteria:**
- [x] `can(role, permission)` is true for admin on all five permissions, true for moderator only on `disputes.resolve`, false for user on all
- [x] An unknown or null role is treated as no permissions
- [x] `ActionErrorCode` includes `NOT_ALLOWED`

**Verification:**
- [x] `npx vitest run tests/rbac.test.ts`
- [x] `npm run type-check`

**Dependencies:** None

**Files likely touched:**
- `lib/services/rbac.ts`
- `lib/types.ts`
- `tests/rbac.test.ts`

**Estimated scope:** Small

### Task 3: Role storage and `authorize()`

**Description:** `lib/db/roles.ts` reads and writes the role (the only module touching the column). `authorize(account, permission)` reads the role from the DB on each call and returns the role or a typed denial.

**Acceptance criteria:**
- [x] No account or no `users` row returns `UNAUTHORIZED` or `NOT_ALLOWED` (never allowed)
- [x] Missing permission returns `NOT_ALLOWED`; a DB error returns `SERVER_ERROR` (fail closed) and is logged
- [x] `lib/db/roles.ts` is the only new file importing `admin()`; ESLint boundary still passes

**Verification:**
- [x] `npx vitest run tests/authorize.test.ts`
- [x] `npm run lint && npm run check:architecture`

**Dependencies:** Task 2

**Files likely touched:**
- `lib/db/roles.ts`
- `lib/services/authorize.ts`
- `tests/authorize.test.ts`

**Estimated scope:** Small

## Checkpoint: Foundation
- [x] `npm run type-check`, `npm run lint`, `npm test` pass
- [x] Migration verified twice on a throwaway Postgres
- [ ] Review with the owner before building the flows

## Phase 2: Gated flows

### Task 4: Admin grants and revokes roles

**Description:** `setAccountRole` (in `lib/services/role-admin.ts`, not a 'use server' file) and `PUT /api/v1/admin/roles`, gated by `roles.grant`.

**Acceptance criteria:**
- [x] Admin can set another account to `user`, `moderator` or `admin`; response returns the new role
- [x] Moderator and user callers get 403 (`NOT_ALLOWED`); no token gets 401
- [x] An admin changing their own role gets `CONFLICT`; an unknown role or non-UUID target gets `VALIDATION_ERROR`; a missing target account gets `NOT_FOUND`
- [x] Each change logs actor, target, old and new role

**Verification:**
- [x] `npx vitest run tests/admin-roles.test.ts` covers 401, 403, 400, 404, 409 and 200
- [x] `npm run type-check`

**Dependencies:** Tasks 2, 3

**Files likely touched:**
- `lib/services/role-admin.ts`
- `app/api/v1/admin/roles/route.ts`
- `lib/db/roles.ts` (set role)
- `tests/admin-roles.test.ts`

**Estimated scope:** Medium

### Task 5: Dispute resolution storage

**Description:** DB functions to list quarantined questions with their open disputes and to resolve one (a Postgres function in `21-rbac.sql`, so the question and its disputes change in one transaction); `countDisputes` counts unresolved disputes only.

**Acceptance criteria:**
- [x] Resolve updates the question only while `status = 'quarantined'` and returns whether it won
- [x] `restore` sets `verified` and resets `dispute_count` to 0; `retire` sets `rejected`
- [x] Open disputes get `resolved_at`, `resolved_by`, `resolution`, `resolution_note`; disputes are not deleted
- [x] After a restore, `countDisputes` returns 0, so a new report does not re-quarantine

**Verification:**
- [x] `npx vitest run tests/question-actions.test.ts tests/moderation.test.ts`
- [x] Existing dispute tests still pass

**Dependencies:** Task 1

**Files likely touched:**
- `lib/db/questions.ts`
- `supabase/migrations/21-rbac.sql` (`resolve_quarantined_question`)
- `scripts/verify-migrations.sh`
- `tests/moderation.test.ts`

**Estimated scope:** Small

### Task 6: Moderator queue and resolve

**Description:** Service functions `listQuarantinedQuestions` and `resolveQuestionDispute`, with `GET /api/v1/moderation/questions` and `POST /api/v1/moderation/questions/[id]/resolve`, gated by `disputes.resolve` (moderator and admin).

**Acceptance criteria:**
- [x] Queue returns quarantined questions (prompt, options, correct answer, explanation) with their open dispute reasons and no reporter identities; the correct answer is reachable only through this gated route
- [x] Resolve takes `outcome` (`restore | retire`) and an optional note of at most 500 characters; stores the moderator as `resolved_by`
- [x] Resolving a question that is not quarantined, or already resolved, returns `CONFLICT`
- [x] User callers get 403, no token 401, bad id or outcome 400

**Verification:**
- [x] `npx vitest run tests/moderation-routes.test.ts` covers the 401/403/400/404/409/200 matrix for both routes
- [x] `npm run type-check && npm run lint`

**Dependencies:** Tasks 3, 5

**Files likely touched:**
- `lib/services/moderation.ts` (not a `use server` file, see Task 4)
- `app/api/v1/moderation/questions/route.ts`
- `app/api/v1/moderation/questions/[id]/resolve/route.ts`
- `tests/moderation-routes.test.ts`

**Estimated scope:** Medium

## Checkpoint: Flows
- [x] `npm test` passes; every gated route has a 401, 403 and success test
- [x] `npm run test:coverage`: changed lines at least 80%, project ratchet not lowered
- [ ] Review with the owner before docs and PR

## Phase 3: Docs and ship

### Task 7: Docs

**Description:** Record the decision and give the owner the run-once seed.

**Acceptance criteria:**
- [x] `docs/decisions/014-rbac-roles-and-permissions.md` states role-in-DB, DB read per call, fail closed, no audit table yet
- [x] `docs/migrations.md` ledger row for `21-rbac.sql` ("not applied") and the seed template with a placeholder email, no real address in the repo
- [x] `CHANGELOG.md` entry

**Verification:**
- [x] `git grep -n "@" -- docs/migrations.md` shows only the placeholder; `npm run check:fast`

**Dependencies:** Tasks 1, 4, 6

**Files likely touched:**
- `docs/decisions/014-rbac-roles-and-permissions.md`
- `docs/migrations.md`
- `CHANGELOG.md`

**Estimated scope:** Small

### Task 8: Gate and PR

**Description:** Run the full local gate, open the PR to `preview` only when the owner says so, and watch CI.

**Acceptance criteria:**
- [x] `npm run check:task` passes
- [x] PR to `preview` is green on CI (Gitleaks included) (#131)
- [x] Owner tasks listed in the PR: apply `21-rbac.sql` to a Supabase branch, then production; run the admin seed with their own email; sign in once by email code first

**Verification:**
- [x] CI green; no direct push to `main`

**Dependencies:** Tasks 1 to 7

**Estimated scope:** Small
