# Database Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the Supabase schema to CLI-managed timestamped migrations, remove the dead contest schema, harden and speed up the data model, and add topics, a daily challenge, persisted stats and achievements, all in place on a database that holds real players.

**Architecture:** One baseline migration taken from production, then six phases of small forward-only migrations, each paired with pgTAP tests and, where the app is affected, a code release ordered by expand/contract. The database does the invariant work (triggers, composite foreign keys, constraints); the app calls thin wrappers in `lib/db/`.

**Tech Stack:** Supabase CLI (pinned devDependency), Postgres 15+/pgTAP (`supabase test db`), Next.js server code in `lib/db/*`, Vitest.

**Spec:** [docs/superpowers/specs/2026-10-13-database-redesign-design.md](../specs/2026-10-13-database-redesign-design.md). Read it first: this plan implements it section by section and refers to its finding numbers (F1 to F10) and decisions (D1 to D7).

## Global Constraints

- Production has real players. No wipe, no rebuild. Every change is in place and expand/contract.
- Forward-fix only: no down scripts. A migration already applied anywhere shared is never edited; a new one corrects it.
- Each migration is applied to a Supabase branch first, then production, by the owner. Production migrations are never run by CI (D4).
- Code that stops using something ships (and runs in production) before the migration that removes it. Code that needs something new ships after the migration that adds it. Because `supabase db push` applies every pending file, a contract migration (Tasks 1.4 and 3.4) is committed only after the matching code is live in production.
- Public API shape does not break. `/api/v1/*` JSON keeps its field names and types; new fields are additive. The mobile app and `@heizdoobert/quickquiz-sdk` 0.3.0 depend on this.
- `CONSTRAINTS.md` floor: no new suppression comments (`@ts-ignore`, `eslint-disable`, `istanbul ignore`, ...), no unimplemented stubs, no skipped or deleted tests without a reason in the commit message, no secrets in source, no direct pushes or merges to `main`. `CONSTRAINTS.md` is never weakened.
- Gates: `npm run type-check`, `npm run lint`, `npm run check:architecture`, `npm run test:coverage` (changed lines at least 80% covered, project ratchet 53.8 / 50.7 / 49.4 must not fall).
- Branch rule for this machine: work in the `company/update-code` worktree (`/mnt/second_drive/web_quiz/.worktrees/company/update-code`). Open PRs into `preview` only when the owner asks, then promote `preview` to `main` after all CI is green.
- The spec and this plan are dev-only files: do not stage them for `main`.
- End every commit message with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` as a second `-m` argument.
- New SQL objects follow the existing pattern: `SECURITY DEFINER` functions pin `SET search_path = public`; new tables have RLS on and `REVOKE ALL ... FROM anon, authenticated` unless they are meant to be public-read; functions meant for the server only `REVOKE ALL ... FROM PUBLIC, anon, authenticated` and `GRANT EXECUTE ... TO service_role`.
- pgTAP files live in `supabase/tests/database/NN_name.test.sql` and use `begin; select plan(N); ... select * from finish(); rollback;`.

## Scope

In: everything in the spec's phases 0 to 5 at the database layer, plus the `lib/db/` wrappers, the cron route and the one call site the spec names (`award_achievements` after a recorded answer).

Out (needs its own spec): HTTP endpoints and UI for the daily challenge and achievements, an "achievement unlocked" toast, and any change to the mobile client.

## File Structure

| Path | Responsibility | Task |
|---|---|---|
| `supabase/config.toml`, `supabase/.gitignore` | CLI project config (from `supabase init`) | 0.1 |
| `supabase/migrations/20261013000000_baseline.sql` | The production schema, the only file at first | 0.4 |
| `supabase/legacy/` | The 24 old SQL files and the old test fixtures, kept as history, never run | 0.1 |
| `supabase/tests/database/*.test.sql` | pgTAP tests, one file per area | 0.5, 1.1, 1.4, 2.x, 3.x, 4.1, 5.1 |
| `scripts/db-schema-diff.sh` | Compares two schema dumps after dropping run-to-run noise | 0.3 |
| `docs/migrations.md`, `README.md`, `docs/decisions/015-supabase-cli-migrations.md`, `CONSTRAINTS.md` | Process documentation and the new database constraint | 0.7 |
| `.github/workflows/ci.yml`, `package.json` | `db` CI job, `check:db` script, pinned CLI | 0.1, 0.6 |
| `lib/db/questions.ts`, `lib/db/community.ts` | Stop reading `list_id`; later read topics through embeds | 1.2, 2.4, 3.2 |
| `lib/db/topics.ts` | Topic name helpers (`TOPIC_EMBED`, `topicName`, `withCategory`, `resolveTopicId`) | 3.2 |
| `lib/db/daily-challenge.ts`, `lib/db/achievements.ts` | Wrappers for the Phase 4 and 5 functions | 4.2, 5.2 |
| `lib/services/cron-auth.ts`, `app/api/cron/daily-challenge/route.ts`, `vercel.json` | Shared cron auth, the daily pick job and its schedule | 4.2 |

---

# Phase 0: baseline and pipeline

Outcome: `supabase db push` and `supabase test db` are the only ways the schema changes. No production DDL runs in this phase.

### Task 0.1: Install the CLI, initialise, move the old files to `supabase/legacy/`

**Files:**
- Modify: `package.json`, `package-lock.json`
- Create: `supabase/config.toml`, `supabase/.gitignore` (by `supabase init`), `supabase/legacy/README.md`
- Move: `supabase/migrations/*.sql` to `supabase/legacy/migrations/`, `supabase/tests/*` to `supabase/legacy/tests/`

**Interfaces:**
- Produces: `npx supabase ...` available to every later task; `supabase/migrations/` empty and ready for the baseline.

- [ ] **Step 1: Work in the right worktree and confirm a clean tree**

```bash
cd /mnt/second_drive/web_quiz/.worktrees/company/update-code
git status --short
git branch --show-current
```

Expected: branch `company/update-code`, no uncommitted changes you did not make.

- [ ] **Step 2: Add the CLI as an exact-pinned devDependency (D6)**

```bash
npm install --save-dev --save-exact supabase --legacy-peer-deps
npx supabase --version
```

Expected: a version number prints. Record it in the commit message.

- [ ] **Step 3: Move the old files with history**

```bash
mkdir -p supabase/legacy
git mv supabase/migrations supabase/legacy/migrations
git mv supabase/tests supabase/legacy/tests
mkdir -p supabase/migrations
```

- [ ] **Step 4: Initialise the CLI project**

```bash
npx supabase init --with-vscode-settings=false --with-intellij-settings=false
ls supabase
```

Expected: `config.toml` and `.gitignore` exist next to `legacy/` and `migrations/`. If the CLI reports the project is already initialised, `supabase/config.toml` already exists; keep it and continue.

- [ ] **Step 5: Write `supabase/legacy/README.md`**

```markdown
# Legacy SQL (history only)

These files were applied by hand in the Supabase SQL editor until 2026-10-13. They are kept so
the history is readable. **Nothing runs them any more.** The current schema is
`supabase/migrations/20261013000000_baseline.sql` plus the migrations after it.

`docs/decisions/015-supabase-cli-migrations.md` records the switch. `migrations/` here is the
order the production database was rebuilt in on 2026-10-12 (scripts 1 to 23 in the old README,
`retire-sample-questions.sql` skipped). `tests/` holds the fixtures for the old
accounts and drop-web3 migration checks.
```

- [ ] **Step 6: Verify nothing else points at the moved paths**

Run: `grep -rn "supabase/migrations\|supabase/tests" --include=*.ts --include=*.tsx --include=*.mjs --include=*.json --include=*.yml --include=*.sh . 2>/dev/null | grep -v node_modules | grep -v "^./supabase/legacy" | grep -v "^./docs\|^./tasks\|^./README"`
Expected: only `scripts/verify-migrations.sh` (removed in Task 0.7). Anything else: update its path to `supabase/legacy/...` or delete the reference.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json supabase
git commit -m "chore(db): add pinned supabase CLI and move the hand-applied SQL to supabase/legacy" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

### Task 0.2: [OWNER] Audit production (read-only)

This task is run by the owner: it needs their Supabase login and touches production, read-only. Nothing in it changes data. The agent waits for the output files.

**Files:**
- Create (local only, dev-only, not committed): `tasks/db-audit/prod-audit.sql`, then its outputs under `tasks/db-audit/`

- [ ] **Step 1: Write the audit SQL file**

Create `tasks/db-audit/prod-audit.sql`:

```sql
-- Read-only. Run in the Supabase SQL editor on PRODUCTION; save each result next to this file.

-- 1. Server version (sets supabase/config.toml [db] major_version).
select version();

-- 2. Tables without row level security (expect zero rows).
select c.relname
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;

-- 3. Function ACLs. proacl NULL means the default: EXECUTE for PUBLIC.
select p.proname, pg_get_function_identity_arguments(p.oid) as args, p.prosecdef as security_definer,
       p.proconfig, p.proacl
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public'
 order by p.proname;

-- 4. Can the public key execute the SECURITY DEFINER functions? (settles spec finding F7)
select p.proname,
       has_function_privilege('anon', p.oid, 'execute')          as anon_can_execute,
       has_function_privilege('authenticated', p.oid, 'execute') as authenticated_can_execute
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' and p.prosecdef
 order by p.proname;

-- 5. Column privileges that hide answers and roles (expect all false).
select has_column_privilege('anon', 'public.questions', 'correct_index', 'select')          as anon_correct_index,
       has_column_privilege('authenticated', 'public.questions', 'correct_index', 'select') as auth_correct_index,
       has_column_privilege('anon', 'public.questions', 'explanation', 'select')            as anon_explanation,
       has_column_privilege('anon', 'public.users', 'role', 'select')                       as anon_role,
       has_column_privilege('authenticated', 'public.users', 'role', 'select')              as auth_role;

-- 6. Row counts (used again by Phase 1).
select 'users' as t, count(*) from users
union all select 'questions', count(*) from questions
union all select 'questions with list_id', count(*) from questions where list_id is not null
union all select 'questions with list_id not rejected', count(*) from questions where list_id is not null and status <> 'rejected'
union all select 'quiz_results', count(*) from quiz_results
union all select 'groups', count(*) from groups
union all select 'question_disputes', count(*) from question_disputes
union all select 'question_lists', count(*) from question_lists
union all select 'list_entries', count(*) from list_entries
union all select 'question_list_confirmations', count(*) from question_list_confirmations
union all select 'sponsors', count(*) from sponsors
union all select 'distinct categories', count(distinct lower(trim(category))) from questions;
```

- [ ] **Step 2: Run it and save the output**

Run each statement in the SQL editor on production. Save the results as `tasks/db-audit/prod-audit-output.txt`.

- [ ] **Step 3: Dump the production schema**

```bash
npx supabase login
npx supabase link --project-ref <production project ref>
npx supabase db dump --linked --schema public -f tasks/db-audit/prod-schema.sql
```

Expected: `tasks/db-audit/prod-schema.sql` exists and contains `CREATE TABLE "public"."questions"`.

- [ ] **Step 4: Decide the urgent item**

Open `prod-audit-output.txt`, query 4. If `increment_ai_generation` or `get_question_analytics` shows `anon_can_execute = true`, tell the agent now: spec finding F7 is a live issue and Task 2.5 moves to the front of Phase 2 (it has no dependency on the other Phase 2 tasks).

### Task 0.3: Replay the legacy scripts and add the dump diff script

**Files:**
- Create: `scripts/db-schema-diff.sh`, `tasks/db-audit/replay-legacy.sh` (local only)

**Interfaces:**
- Produces: `bash scripts/db-schema-diff.sh a.sql b.sql` exits 0 when two dumps are identical after normalisation; used by Tasks 0.4 and 0.8.

- [ ] **Step 1: Write the diff script**

Create `scripts/db-schema-diff.sh`:

```bash
#!/usr/bin/env bash
# Prints the differences between two schema dumps, ignoring what varies from run to run:
# comments, blank lines, SET lines, set_config calls and pg_dump's \restrict tokens.
# Usage: bash scripts/db-schema-diff.sh before.sql after.sql   (exit 0 means identical)
set -euo pipefail
norm() { grep -vE '^(--|$|\\(un)?restrict |SET |SELECT pg_catalog\.set_config)' "$1" | sed -E 's/[[:space:]]+$//'; }
diff <(norm "$1") <(norm "$2")
```

- [ ] **Step 2: Prove the script on identical and different input**

```bash
printf -- '-- a comment\nCREATE TABLE t (id int);\n' > /tmp/db-diff-a.sql
printf 'CREATE TABLE t (id int);\n\n' > /tmp/db-diff-b.sql
printf 'CREATE TABLE t (id bigint);\n' > /tmp/db-diff-c.sql
bash scripts/db-schema-diff.sh /tmp/db-diff-a.sql /tmp/db-diff-b.sql; echo "identical exit=$?"
bash scripts/db-schema-diff.sh /tmp/db-diff-a.sql /tmp/db-diff-c.sql; echo "different exit=$?"
```

Expected: `identical exit=0`, then a diff and `different exit=1`.

- [ ] **Step 3: Write the legacy replay script**

Create `tasks/db-audit/replay-legacy.sh`:

```bash
#!/usr/bin/env bash
# Applies the old scripts in the documented order to a throwaway Postgres and dumps the result
# WITH privileges. Usage: bash tasks/db-audit/replay-legacy.sh tasks/db-audit/replay-schema.sql
set -eu
OUT=$1
REPO=$(cd "$(dirname "$0")/../.." && pwd)
N="replay-legacy-$$"
trap 'docker rm -f "$N" >/dev/null 2>&1' EXIT
docker run -d --rm --name "$N" -e POSTGRES_PASSWORD=x \
  -v "$REPO/supabase/legacy/migrations":/m:ro -v "$REPO/supabase/legacy/tests":/t:ro postgres:16-alpine >/dev/null
until [ "$(docker logs "$N" 2>&1 | grep -c 'ready to accept connections')" -ge 2 ]; do sleep 0.5; done
P="docker exec -i $N psql -U postgres -q"
$P -f /t/00-setup.sql >/dev/null 2>&1
for f in schema.sql schema.sql lock-down-public-writes.sql question-lists.sql secure-rewards-and-answers.sql \
         restrict-quiz-results-insert.sql contest-escrow.sql widen-reward-claims-amount.sql accounts.sql \
         stats-functions.sql topics.sql search.sql community.sql reward-payee.sql 15-sponsors.sql \
         16-leaderboard-pagination.sql 17-analytics.sql 17-auth-rate-limit.sql 18-ai-usage.sql 19-secure-ai-usage.sql \
         20-drop-web3-schema.sql remote-config.sql 21-rbac.sql; do
  $P -f "/m/$f" >/dev/null 2>&1 || true
done
docker exec "$N" pg_dump -U postgres --schema-only --no-owner -n public > "$OUT"
echo "wrote $OUT"
```

- [ ] **Step 4: Run it**

Run: `bash tasks/db-audit/replay-legacy.sh tasks/db-audit/replay-schema.sql && grep -c "CREATE TABLE" tasks/db-audit/replay-schema.sql`
Expected: `wrote tasks/db-audit/replay-schema.sql`, then `15`.

- [ ] **Step 5: Compare replay to production and write down every difference**

```bash
bash scripts/db-schema-diff.sh tasks/db-audit/replay-schema.sql tasks/db-audit/prod-schema.sql > tasks/db-audit/replay-vs-prod.diff || true
wc -l tasks/db-audit/replay-vs-prod.diff
```

Read the diff. Classify each hunk in `tasks/db-audit/replay-vs-prod.notes.md` as one of: **stub artifact** (the legacy test setup stubs the Supabase roles, so owner, default-privilege and role lines differ; ignore) or **prod hand-edit** (a real difference; the baseline takes production's version). This note goes into the PR description in Task 0.4.

- [ ] **Step 6: Commit the diff script**

```bash
git add scripts/db-schema-diff.sh
git commit -m "chore(db): add a schema dump diff script" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

### Task 0.4: Write the baseline and prove it matches production

**Files:**
- Create: `supabase/migrations/20261013000000_baseline.sql`
- Modify: `supabase/config.toml` (`[db] major_version`)

**Interfaces:**
- Consumes: `tasks/db-audit/prod-schema.sql` (Task 0.2), `scripts/db-schema-diff.sh` (Task 0.3).
- Produces: a baseline for which `npx supabase db reset` followed by a dump equals the production dump.

- [ ] **Step 1: Set the database major version**

Open `tasks/db-audit/prod-audit-output.txt`, query 1 (for example `PostgreSQL 17.4 ...`). In `supabase/config.toml` set `[db] major_version = 17` (use the number production reports).

- [ ] **Step 2: Start from the production dump**

```bash
cp tasks/db-audit/prod-schema.sql supabase/migrations/20261013000000_baseline.sql
sed -i -E '/^\\(un)?restrict /d' supabase/migrations/20261013000000_baseline.sql
```

- [ ] **Step 3: Append the reference data a fresh database needs**

The dump is schema only; `remote_config` needs its `maintenance_mode` row or `GET /api/config` returns nothing on a new environment. Append to the end of the baseline:

```sql

-- Reference data a fresh database needs (the dump holds schema only).
INSERT INTO "public"."remote_config" ("key", "value")
VALUES ('maintenance_mode', 'false'::jsonb)
ON CONFLICT ("key") DO NOTHING;
```

- [ ] **Step 4: Start the local stack and replay**

```bash
npx supabase start
npx supabase db reset
```

Expected: ends with `Finished supabase db reset`. If it fails, fix the line the error names by editing the baseline (typical causes: a statement for a Supabase-managed schema, or `CREATE EXTENSION` placed after a use). Record each edit in `tasks/db-audit/baseline-edits.md`.

- [ ] **Step 5: Dump the local result and diff against production**

```bash
npx supabase db dump --local --schema public -f tasks/db-audit/local-schema.sql
bash scripts/db-schema-diff.sh tasks/db-audit/prod-schema.sql tasks/db-audit/local-schema.sql
echo "exit=$?"
```

Expected: no diff output, `exit=0`. Anything else: fix the baseline and repeat Steps 4 and 5 until it is empty. Do not "explain away" a difference here; the baseline must equal production.

- [ ] **Step 6: Confirm the data row landed**

Run: `docker exec supabase_db_$(basename "$PWD") psql -U postgres -tAc "select value from remote_config where key = 'maintenance_mode'"`
If that container name is wrong, run `docker ps --format '{{.Names}}' | grep supabase_db` and use the name shown.
Expected: `false`.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20261013000000_baseline.sql supabase/config.toml
git commit -m "feat(db): add the production schema as the CLI baseline migration" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

### Task 0.5: pgTAP guard tests

**Files:**
- Create: `supabase/tests/database/00_baseline_guards.test.sql`

**Interfaces:**
- Produces: a permanent guard for RLS, answer-hiding column privileges and `search_path` pinning. Task 2.5 removes the two function-name exclusions and Task 2.5 adds the callable-by-public-key list.

- [ ] **Step 1: Write the test**

Create `supabase/tests/database/00_baseline_guards.test.sql`:

```sql
begin;
select plan(8);

select is(
  (select count(*)::int
     from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity),
  0, 'every public table has row level security on');

select is(has_column_privilege('anon', 'public.questions', 'correct_index', 'select'), false,
  'anon cannot read questions.correct_index');
select is(has_column_privilege('authenticated', 'public.questions', 'correct_index', 'select'), false,
  'authenticated cannot read questions.correct_index');
select is(has_column_privilege('anon', 'public.questions', 'explanation', 'select'), false,
  'anon cannot read questions.explanation');
select is(has_column_privilege('anon', 'public.users', 'role', 'select'), false,
  'anon cannot read users.role');
select is(has_column_privilege('authenticated', 'public.users', 'role', 'select'), false,
  'authenticated cannot read users.role');
select is(has_column_privilege('anon', 'public.questions', 'prompt', 'select'), true,
  'anon can still read questions.prompt');

-- Spec finding F7: these two are fixed in Phase 2 (Task 2.5), which removes this exclusion.
select is(
  (select count(*)::int
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef
      and p.proname not in ('increment_ai_generation', 'get_question_analytics')
      and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%')),
  0, 'every SECURITY DEFINER function pins its search_path');

select * from finish();
rollback;
```

- [ ] **Step 2: Run it**

Run: `npx supabase test db`
Expected: `Result: PASS`, 8 tests. A failure here is a real finding about production (for example a function without a pinned `search_path`); tell the owner before changing the test.

- [ ] **Step 3: Prove the guard can fail**

```bash
docker exec -i "$(docker ps --format '{{.Names}}' | grep supabase_db | head -1)" psql -U postgres -c "alter table public.remote_config disable row level security"
npx supabase test db
```

Expected: the first test fails. Then restore: `npx supabase db reset`.

- [ ] **Step 4: Commit**

```bash
git add supabase/tests/database/00_baseline_guards.test.sql
git commit -m "test(db): add pgTAP guards for RLS, hidden columns and pinned search_path" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

### Task 0.6: `check:db` script and the `db` CI job

**Files:**
- Modify: `package.json` (scripts), `.github/workflows/ci.yml`

**Interfaces:**
- Produces: `npm run check:db` (needs `npx supabase start` first) and a required CI job `db` wired into `ci-gate`.

- [ ] **Step 1: Find the strictest lint level that is clean**

Run: `npx supabase db lint --level warning; echo "exit=$?"`
If `exit=0`, use `--level warning` below. If it printed warnings about existing legacy functions, run `npx supabase db lint --level error; echo "exit=$?"` (must be 0), save the warning list to the PR description as the starting debt, and use `--level error` below.

- [ ] **Step 2: Add the script**

In `package.json` `scripts`, after `"check:deps"`:

```json
    "check:db": "supabase db reset && supabase test db && supabase db lint --level warning",
```

(Use `--level error` instead if Step 1 required it.)

- [ ] **Step 3: Run it**

Run: `npm run check:db`
Expected: `db reset` finishes, pgTAP prints `Result: PASS`, lint exits 0.

- [ ] **Step 4: Add the CI job**

In `.github/workflows/ci.yml`, add after the `test` job and before `build`:

```yaml
  db:
    name: Database (migrations replay + pgTAP)
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v7

      - name: Setup Node.js
        uses: actions/setup-node@v7
        with:
          node-version: '24'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Start local Supabase
        run: npx supabase start

      - name: Replay migrations, run pgTAP and lint
        run: npm run check:db
```

And in `ci-gate`, change `needs` to include it:

```yaml
    needs: [secrets, typecheck, lint, architecture, test, db, build, security, semgrep]
```

- [ ] **Step 5: Validate the workflow file**

Run: `npx --yes @action-validator/cli .github/workflows/ci.yml` (or `python3 -c "import yaml,sys; yaml.safe_load(open('.github/workflows/ci.yml'))"` if the validator is unavailable).
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add package.json .github/workflows/ci.yml
git commit -m "ci(db): replay migrations and run pgTAP in a required db job" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

### Task 0.7: Documentation, ADR-015, the constraint row, remove the old verify script

**Files:**
- Create: `docs/decisions/015-supabase-cli-migrations.md`
- Modify: `docs/migrations.md` (full rewrite), `README.md` (Database Setup section), `CONSTRAINTS.md`
- Delete: `scripts/verify-migrations.sh`

- [ ] **Step 1: Write the ADR**

Create `docs/decisions/015-supabase-cli-migrations.md`:

```markdown
# ADR-015: Supabase CLI migrations and a production-derived baseline

## Status
Accepted (owner approval of the database redesign design, 2026-10-13). Replaces the manual-process decision in `docs/migrations.md` of 2026-10-09.

## Context
The schema lived in 24 topic-named SQL files applied by hand in the Supabase SQL editor, in an order kept in the README. `schema.sql` could not be re-run, two files shared the number 17, wallet and reward columns were added and then dropped across `accounts.sql` and `20-drop-web3-schema.sql`, and the only check was `scripts/verify-migrations.sh` with a hard-coded file list. Production now holds real players, so rebuilding is no longer an option.

## Decision
- Migrations are timestamped files in `supabase/migrations/`, created with `supabase migration new` and applied with `supabase db push`.
- The first file, `20261013000000_baseline.sql`, is the production schema (`supabase db dump`), checked against a replay of the old scripts. Production is the source of truth (D3 in the design spec). Production records the baseline as applied with `supabase migration repair`; no DDL runs.
- The old files move to `supabase/legacy/` as history and are never run.
- CI replays the migrations on a local Supabase stack, runs the pgTAP tests in `supabase/tests/database/` and lints (`npm run check:db`).
- The owner applies migrations to production by hand after `preview` is green (D4). CI never pushes to production.
- Changes that remove or rename anything follow expand/contract: code stops using the old thing and ships, then a later migration removes it.

## Consequences
- A new contributor can build the database with `supabase start`; there is no order to remember.
- A destructive migration cannot ride along with the code that still needs the old object, because the contract file is only committed after that code is live.
- `supabase` is a devDependency, pinned exactly.
- Revisit D4 (manual production pushes) when a second person applies migrations.
```

- [ ] **Step 2: Rewrite `docs/migrations.md`**

Replace the whole file with:

```markdown
# Database migrations: process and ledger

The schema is managed with the Supabase CLI (ADR-015). Files in `supabase/migrations/` are timestamped and applied in name order. `supabase/legacy/` holds the old hand-applied scripts as history only.

## Rules

- **Forward-fix only.** No down scripts. A migration already applied anywhere shared is never edited; a new one corrects it.
- **Create files with the CLI:** `npx supabase migration new <snake_case_name>`. Never hand-pick a number.
- **Idempotent where cheap** (`IF NOT EXISTS`, `CREATE OR REPLACE`, `DROP ... IF EXISTS`), and wrapped in `BEGIN; ... COMMIT;` so a failure leaves nothing half-applied.
- **Expand then contract.** A migration that removes or renames something is committed only after the code that stops using it is live in production, because `db push` applies every pending file at once.
- **Every function that is `SECURITY DEFINER` pins `SET search_path = public`.** New tables have RLS on. Server-only functions `REVOKE ALL ... FROM PUBLIC, anon, authenticated` and grant `service_role`. `supabase/tests/database/` enforces both.
- **Every migration comes with a pgTAP test** in `supabase/tests/database/`.
- **Backup first** (or confirm point-in-time recovery) before anything that rewrites or drops data.

## Commands

| Task | Command |
|---|---|
| Start the local stack (needs Docker) | `npx supabase start` |
| Replay everything, run pgTAP, lint | `npm run check:db` |
| New migration | `npx supabase migration new <name>` |
| Apply to a Supabase branch or production (owner) | `npx supabase link --project-ref <ref>` then `npx supabase db push` |
| See what is pending | `npx supabase migration list` |
| Schema dump for a diff | `npx supabase db dump --linked --schema public -f out.sql` |
| Compare two dumps | `bash scripts/db-schema-diff.sh a.sql b.sql` |

## Applying a migration (owner)

1. Merge the PR into `preview` with CI green.
2. `db push` to a Supabase branch, run the migration's preflight query if its task lists one, check the app against the branch.
3. `db push` to production. Write the date in the ledger below.
4. Promote `preview` to `main`.

## Ledger

| Timestamp | Migration | Applied to production |
|---|---|---|
| 20261013000000 | `baseline`: production schema as of 2026-10-13, recorded with `migration repair`, no DDL run | |

Add one row per migration as it ships. The 2026-10-12 rebuild applied legacy scripts 1 to 23 (see `supabase/legacy/README.md`); the baseline reproduces their end state.

## First admin (run once, never commit the real address)

The RBAC migration creates no admin: this repository is public and the owner's email must not be in it. Request an email code in the app once so your sign-in exists, then run this in the Supabase SQL editor, replacing the placeholder with your own address. It creates your account row if the first sign-in did not and sets the role either way:

```sql
INSERT INTO users (auth_user_id, display_name, role)
SELECT id, 'Player-' || left(id::text, 4), 'admin'
  FROM auth.users
 WHERE email = 'YOUR-EMAIL@example.com'
ON CONFLICT (auth_user_id) DO UPDATE SET role = 'admin'
RETURNING id, role;
```

It must return one row. No rows means no sign-in exists for that address. After that, an admin grants and revokes every other role through `PUT /api/v1/admin/roles`.
```

- [ ] **Step 3: Replace the README "Database Setup" section**

In `README.md`, replace everything from the line `### Database Setup` up to (not including) `Email sign-in also needs the Supabase Auth email provider on` with:

```markdown
### Database Setup

The schema is managed with the Supabase CLI (see [`docs/migrations.md`](docs/migrations.md) and ADR-015). With Docker running:

```bash
npx supabase start       # local Supabase: database, auth, API
npx supabase db reset    # applies supabase/migrations/ from the baseline on
npm run check:db         # replay + pgTAP tests + lint
```

To apply to a hosted project: `npx supabase link --project-ref <ref>`, then `npx supabase db push` (a Supabase branch first, then production). The old hand-applied scripts are in [`supabase/legacy/`](supabase/legacy/) for history only.

```

- [ ] **Step 4: Add the constraint row (strengthens `CONSTRAINTS.md`, weakens nothing)**

In `CONSTRAINTS.md`, in the "Enforced with numbers" table, after the `Performance (bundle)` row add:

```markdown
| Database | Migrations replay from the baseline without error, the pgTAP suite passes, lint is clean at the level `check:db` sets | `npm run check:db` (needs `npx supabase start`) | CI (`db` job), on-demand |
```

And change the first line under the title to `Last reviewed: 2026-10-13 by @alexheiz`.

- [ ] **Step 5: Remove the superseded script and its references**

```bash
git rm scripts/verify-migrations.sh
grep -rn "verify-migrations" --include=*.md --include=*.json --include=*.yml --include=*.ts . 2>/dev/null | grep -v node_modules | grep -v "^./tasks\|^./supabase/legacy"
```

Expected: no remaining references (edit any that appear).

- [ ] **Step 6: Run the gates that cover these files**

Run: `npm run check:fast`
Expected: type-check, lint and gitleaks all pass.

- [ ] **Step 7: Commit**

```bash
git add docs/decisions/015-supabase-cli-migrations.md docs/migrations.md README.md CONSTRAINTS.md
git commit -m "docs(db): document CLI migrations, add ADR-015 and the database constraint" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

### Task 0.8: [OWNER] Prove on a Supabase branch, then record the baseline in production

Run by the owner after the Phase 0 PR is green on `preview`.

- [ ] **Step 1: Branch check.** Create a Supabase branch of the production project. `npx supabase link --project-ref <branch ref>` then `npx supabase db push`. Dump it: `npx supabase db dump --linked --schema public -f tasks/db-audit/branch-schema.sql`. Run `bash scripts/db-schema-diff.sh tasks/db-audit/prod-schema.sql tasks/db-audit/branch-schema.sql`. Expected: no output.
- [ ] **Step 2: Production.** `npx supabase link --project-ref <production ref>`, then:

```bash
npx supabase migration repair --status applied 20261013000000
npx supabase migration list
```

Expected: the baseline shows in both the Local and Remote columns. Nothing else runs on production.
- [ ] **Step 3: Ledger.** Fill in the date in the baseline row of `docs/migrations.md` and commit: `docs(db): record baseline applied to production`.
- [ ] **Step 4: Undo path if needed.** `npx supabase migration repair --status reverted 20261013000000` removes only the history row.

---

# Phase 1: drop the dead contest schema

Outcome: no contest objects remain, and no live question disappears or becomes visible by accident (spec F1, F2, F3, F8, F9).

### Task 1.1: Migration 1a: retire contest questions and decouple the readers

**Files:**
- Create: `supabase/migrations/20261013000100_retire_contest_questions.sql`, `supabase/tests/database/10_retire_contest_questions.test.sql`

**Interfaces:**
- Produces: `get_topics()` and `search_questions(TEXT, INT, INT)` that no longer mention `list_id` (still same signatures, so old code keeps working); every question with `list_id` set has `status = 'rejected'`.

- [ ] **Step 1: Write the failing test**

Create `supabase/tests/database/10_retire_contest_questions.test.sql`:

```sql
begin;
select plan(5);

-- Fixture: a contest list with one live-looking question, and one ordinary question.
insert into users (id, display_name) values ('00000000-0000-4000-8000-0000000000b1', 'p1');
insert into question_lists (id, owner_user, title) values ('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000b1', 'contest');
insert into questions (id, prompt, options, correct_index, status, list_id) values
  ('00000000-0000-4000-8000-0000000000d1', 'contest question prompt', '["a","b"]', 0, 'verified', '00000000-0000-4000-8000-0000000000c1'),
  ('00000000-0000-4000-8000-0000000000d2', 'ordinary question prompt', '["a","b"]', 0, 'verified', null);

select unlike(pg_get_functiondef('get_topics()'::regprocedure), '%list_id%', 'get_topics no longer filters on list_id');
select unlike(pg_get_functiondef('search_questions(text,integer,integer)'::regprocedure), '%list_id%', 'search_questions no longer filters on list_id');

-- The migration's retire statement, run again on the fixture: it must touch only contest rows.
update questions set status = 'rejected' where list_id is not null and status <> 'rejected';
select is((select status from questions where id = '00000000-0000-4000-8000-0000000000d1'), 'rejected', 'the contest question is retired');
select is((select status from questions where id = '00000000-0000-4000-8000-0000000000d2'), 'verified', 'the ordinary question is untouched');
select is((select question_count from get_topics() limit 1), 1, 'only the ordinary question is counted in topics');

select * from finish();
rollback;
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx supabase test db`
Expected: FAIL on the two `unlike` tests (the functions still mention `list_id`).

- [ ] **Step 3: Write the migration**

Create `supabase/migrations/20261013000100_retire_contest_questions.sql`:

```sql
-- Phase 1a (expand). Safe while the old code runs: the two public readers stop depending on
-- list_id, and the contest questions that list_id used to hide are retired in the same
-- transaction so none becomes visible in between. Rows are retired, not deleted: deleting would
-- cascade into quiz_results and change players' scores (spec D2, F3).
BEGIN;

UPDATE questions SET status = 'rejected' WHERE list_id IS NOT NULL AND status <> 'rejected';

CREATE OR REPLACE FUNCTION get_topics()
RETURNS TABLE (name TEXT, question_count INT, latest_at TIMESTAMPTZ)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (ARRAY_AGG(category ORDER BY created_at DESC))[1] AS name,
    COUNT(*)::INT AS question_count,
    MAX(created_at) AS latest_at
  FROM questions
  WHERE status = 'verified'
  GROUP BY lower(TRIM(category))
  ORDER BY latest_at DESC;
$$;

CREATE OR REPLACE FUNCTION search_questions(p_query TEXT, p_limit INT, p_offset INT)
RETURNS TABLE (
  id UUID,
  prompt TEXT,
  category TEXT,
  author_name TEXT,
  created_at TIMESTAMPTZ,
  score REAL
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH escaped AS (
    SELECT
      replace(replace(replace(p_query, '\', '\\'), '%', '\%'), '_', '\_') AS pattern,
      lower(p_query) AS raw
  )
  SELECT
    q.id,
    q.prompt,
    q.category,
    COALESCE(u.display_name, 'Player') AS author_name,
    q.created_at,
    GREATEST(
      word_similarity(escaped.raw, lower(q.prompt)),
      word_similarity(escaped.raw, lower(q.category))
    ) AS score
  FROM questions q
  LEFT JOIN users u ON u.id = q.created_by_user
  CROSS JOIN escaped
  WHERE q.status = 'verified'
    AND (
      lower(q.prompt) ILIKE '%' || lower(escaped.pattern) || '%' ESCAPE '\'
      OR lower(q.category) ILIKE '%' || lower(escaped.pattern) || '%' ESCAPE '\'
      OR word_similarity(escaped.raw, lower(q.prompt)) > 0.3
      OR word_similarity(escaped.raw, lower(q.category)) > 0.3
    )
  ORDER BY score DESC, q.created_at DESC
  LIMIT LEAST(GREATEST(p_limit, 1), 100)
  OFFSET GREATEST(p_offset, 0);
$$;

-- Placeholder rows from the old seed: example.com links shown in the ad zone (spec F8).
UPDATE sponsors SET active = false WHERE active AND url LIKE 'https://example.com/%';

COMMIT;
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm run check:db`
Expected: PASS, including the 5 new tests.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20261013000100_retire_contest_questions.sql supabase/tests/database/10_retire_contest_questions.test.sql
git commit -m "feat(db): retire contest questions and stop filtering on list_id (phase 1a)" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

### Task 1.2: Code release: stop reading `list_id`

**Files:**
- Modify: `lib/db/questions.ts`, `lib/db/community.ts`, `lib/actions/question-actions.ts`, `lib/actions/community-actions.ts`, `lib/actions/discovery-actions.ts` (comment only)
- Test: `tests/trivia-guest-access.test.tsx`, `tests/community.test.ts`, `tests/moderation-routes.test.ts`

**Interfaces:**
- Produces: `QuestionRow` and `answerKey()` return value without `list_id`; `questionForDiscussion()` returns `{ id, status, created_by_user }`.

- [ ] **Step 1: Update the tests first so they fail**

In `tests/trivia-guest-access.test.tsx`:

Replace the first test (starts at line 22):

```tsx
  it('serves only status = verified AND list_id IS NULL', async () => {
    const row = { id: 'q1', category: 'General', prompt: 'p', options: ['a', 'b'], created_by: null, status: 'verified' };
    const { eq, is } = mockChain({ data: [row], error: null });

    const result = await fetchRandomQuestion();

    expect(eq).toHaveBeenCalledWith('status', 'verified');
    expect(is).toHaveBeenCalledWith('list_id', null);
    expect(result?.id).toBe('q1');
  });
```

with:

```tsx
  it('serves only status = verified and never filters on the removed list_id column', async () => {
    const row = { id: 'q1', category: 'General', prompt: 'p', options: ['a', 'b'], created_by: null, status: 'verified' };
    const { eq, is } = mockChain({ data: [row], error: null });

    const result = await fetchRandomQuestion();

    expect(eq).toHaveBeenCalledWith('status', 'verified');
    expect(is).not.toHaveBeenCalled();
    expect(result?.id).toBe('q1');
  });
```

And in the `getPublicQuestion` test, replace `expect(is).toHaveBeenCalledWith('list_id', null);` (line 118) with `expect(is).not.toHaveBeenCalled();`.

In `tests/community.test.ts`, replace the contest test (line 113):

```ts
  it('rejects non-public or contest questions with NOT_ALLOWED', async () => {
    (supabaseAdmin!.from as ReturnType<typeof vi.fn>).mockImplementation(
      createTableMock({
        questions: [{ id: VALID_QID, status: 'verified', list_id: 'some-contest-list', created_by_user: AUTHOR_ID }],
      })
    );
```

with:

```ts
  it('rejects non-public questions with NOT_ALLOWED', async () => {
    (supabaseAdmin!.from as ReturnType<typeof vi.fn>).mockImplementation(
      createTableMock({
        questions: [{ id: VALID_QID, status: 'quarantined', created_by_user: AUTHOR_ID }],
      })
    );
```

Then remove the now-meaningless field from every other fixture in that file and in `tests/moderation-routes.test.ts`:

```bash
sed -i "s/ list_id: null,//" tests/community.test.ts
sed -i "s/, list_id: null }/ }/" tests/moderation-routes.test.ts
grep -n "list_id" tests/community.test.ts tests/moderation-routes.test.ts
```

Expected grep output: nothing.

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/trivia-guest-access.test.tsx tests/community.test.ts tests/moderation-routes.test.ts`
Expected: FAIL in the two `is` assertions (code still calls `.is('list_id', null)`) and in the community test that expects `NOT_ALLOWED` for a row without `list_id` while the code compares `list_id !== null` (an `undefined` field is `!== null`, so that test passes by accident; the guest-access failures are the real red).

- [ ] **Step 3: Change the code**

`lib/db/questions.ts`:

- Remove the line `  list_id: string | null;` from `QuestionRow`.
- Replace the `listPublicQuestions` comment and query:

```ts
// Public questions: verified. Unordered, up to `limit`.
export async function listPublicQuestions(opts: {
  excludeIds?: string[];
  category?: string;
  limit: number;
}): Promise<PublicQuestionRow[]> {
  let query = pub.from('questions').select(PUBLIC_FIELDS).eq('status', 'verified');
```

- In `publicQuestion`, replace `.eq('id', id).eq('status', 'verified').is('list_id', null).single()` with `.eq('id', id).eq('status', 'verified').single()`.
- Replace `answerKey`:

```ts
// The answer key and visibility only; secret key only.
export async function answerKey(id: string): Promise<{ correct_index: number; status: string } | null> {
  return unwrapOne(
    'questions.answerKey',
    await admin().from('questions').select('correct_index, status').eq('id', id).single()
  );
}
```

- In `listTopicQuestions`, delete the line `      .is('list_id', null)`.

`lib/db/community.ts`: replace `questionForDiscussion`:

```ts
export async function questionForDiscussion(
  id: string
): Promise<{ id: string; status: string; created_by_user: string | null } | null> {
  return unwrap(
    'community.question',
    await admin().from('questions').select('id, status, created_by_user').eq('id', id).maybeSingle()
  );
}
```

`lib/actions/community-actions.ts`: change the comment to `// 1. The question must be public (status = 'verified')` and the condition to `if (!question || question.status !== 'verified') {`.

`lib/actions/question-actions.ts` (line ~262-265): replace the comment and condition:

```ts
    // Eliminating two wrong options narrows the answer to one of two, so this is only offered for
    // public verified questions (whose answers submitAnswer shows anyway). Pending and
    // quarantined questions reveal nothing.
    if (data.status !== 'verified') return [];
```

`lib/actions/discovery-actions.ts` (comment at line 65): change `// Public-question rule (status = 'verified' AND list_id IS NULL), same as` to `// Public-question rule (status = 'verified'), same as`.

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/trivia-guest-access.test.tsx tests/community.test.ts tests/moderation-routes.test.ts tests/answer-guards.test.ts tests/discovery.test.ts`
Expected: PASS.

- [ ] **Step 5: Confirm no reader of `list_id` is left, then the gates**

Run: `grep -rn "list_id\|question_lists\|list_entries" app lib components hooks sdk/*.ts tests --include=*.ts --include=*.tsx`
Expected: nothing. Then `npm run check:task`. Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib tests
git commit -m "refactor(questions): stop reading the contest list_id column" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

### Task 1.3: [OWNER] Ship 1a and the code release, wait for production

- [ ] **Step 1:** PR to `preview` containing Tasks 1.1 and 1.2 (migration 1a, tests, code). CI green, merge.
- [ ] **Step 2:** `npx supabase db push` on the Supabase branch, then on production (1a is a quick, reversible `UPDATE` plus two `CREATE OR REPLACE`). Write the date in the `docs/migrations.md` ledger.
- [ ] **Step 3:** Promote `preview` to `main` so the code that stops reading `list_id` runs in production.
- [ ] **Step 4:** Tell the agent when production runs the new code. Task 1.4 must not be committed to any branch before this point.

### Task 1.4: Migration 1b: drop the contest schema (after Task 1.3 is live)

**Files:**
- Create: `supabase/migrations/20261013000200_drop_contest_schema.sql`, `supabase/tests/database/11_drop_contest_schema.test.sql`

**Interfaces:**
- Consumes: Task 1.3 complete (production reads no `list_id`).
- Produces: a schema without `question_lists`, `list_entries`, `question_list_confirmations`, `questions.list_id`, `get_contest_analytics`, `client_questions`.

- [ ] **Step 1: Check the view has no reader**

Run: `grep -rn "client_questions" app lib components hooks sdk packages mobile tests --include=*.ts --include=*.tsx --include=*.dart --include=*.js 2>/dev/null | grep -v node_modules`
Expected: nothing. If a reader exists, delete the `DROP VIEW` line from the migration below and leave the view.

- [ ] **Step 2: [OWNER] Preconditions on production**
  - Backup taken, or point-in-time recovery confirmed.
  - `select count(*) from questions where list_id is not null and status <> 'rejected';` returns `0`.
  - Keep a copy of the three dead tables outside the repo: `pg_dump --data-only -t question_lists -t list_entries -t question_list_confirmations "<connection string>" | gzip > dead-contest-tables.sql.gz`.
  - Record `select count(*) from questions;` (it must be the same afterwards).

- [ ] **Step 3: Write the failing test**

Create `supabase/tests/database/11_drop_contest_schema.test.sql`:

```sql
begin;
select plan(7);

select hasnt_table('question_lists', 'question_lists is gone');
select hasnt_table('list_entries', 'list_entries is gone');
select hasnt_table('question_list_confirmations', 'question_list_confirmations is gone');
select hasnt_column('questions', 'list_id', 'questions.list_id is gone');
select hasnt_function('get_contest_analytics', 'get_contest_analytics is gone');
select hasnt_view('client_questions', 'client_questions is gone');

-- Only verified questions appear in topics and search.
insert into questions (id, prompt, options, correct_index, status) values
  ('00000000-0000-4000-8000-0000000000e1', 'a verified question prompt', '["a","b"]', 0, 'verified'),
  ('00000000-0000-4000-8000-0000000000e2', 'a rejected question prompt', '["a","b"]', 0, 'rejected');
select is((select sum(question_count)::int from get_topics()), 1, 'topics count only verified questions');

select * from finish();
rollback;
```

- [ ] **Step 4: Run to verify it fails**

Run: `npx supabase test db`
Expected: FAIL (the objects still exist).

- [ ] **Step 5: Write the migration**

Create `supabase/migrations/20261013000200_drop_contest_schema.sql`:

```sql
-- Phase 1b (contract). Apply only after the code that stops reading list_id is live in production
-- (docs/migrations.md, expand/contract). ORDER MATTERS: questions.list_id is ON DELETE CASCADE to
-- question_lists, so the column goes first and the tables after. Never DELETE FROM question_lists:
-- it would delete the questions and their answers.
BEGIN;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema = 'public' AND table_name = 'questions' AND column_name = 'list_id') THEN
    IF EXISTS (SELECT 1 FROM questions WHERE list_id IS NOT NULL AND status <> 'rejected') THEN
      RAISE EXCEPTION 'drop_contest_schema: a contest question is not rejected; apply retire_contest_questions first';
    END IF;
  END IF;
END $$;

DROP FUNCTION IF EXISTS get_contest_analytics(UUID);
DROP INDEX IF EXISTS idx_questions_list_id;
ALTER TABLE questions DROP COLUMN IF EXISTS list_id;
DROP TABLE IF EXISTS question_list_confirmations;
DROP TABLE IF EXISTS list_entries;
DROP TABLE IF EXISTS question_lists;
DROP VIEW IF EXISTS client_questions;

COMMIT;
```

- [ ] **Step 6: Run to verify it passes**

Run: `npm run check:db`
Expected: PASS. If `db reset` fails on `DROP VIEW`, a dependent object exists; read the error, do not use `CASCADE`.

- [ ] **Step 7: Commit, then the owner applies**

```bash
git add supabase/migrations/20261013000200_drop_contest_schema.sql supabase/tests/database/11_drop_contest_schema.test.sql
git commit -m "feat(db)!: drop the contest tables, questions.list_id and unused view (phase 1b)" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 8: [OWNER] Apply.** PR to `preview`, green, `db push` to the branch, then production. Check `select count(*) from questions;` equals the number recorded in Step 2. Fill in the ledger. Promote to `main`.

---

# Phase 2: integrity, performance, persisted stats

Phase 2 migrations are independent of Phase 1 contract timing but run after Task 1.4 so `quiz_results` carries no contest answers whose scoring depends on retired questions. Task 2.5 has no dependency on 2.1 to 2.4 and moves first if Task 0.2 Step 4 found the privilege problem live.

### Task 2.1: `user_stats` table, trigger and rebuild function

**Files:**
- Create: `supabase/migrations/20261013000300_user_stats.sql`, `supabase/tests/database/20_user_stats.test.sql`

**Interfaces:**
- Produces: table `user_stats`; trigger `quiz_results_apply` on `quiz_results`; `rebuild_user_stats(p_user UUID DEFAULT NULL) RETURNS INT` (service role only, returns the number of rows upserted).

- [ ] **Step 1: Write the failing test**

Create `supabase/tests/database/20_user_stats.test.sql`:

```sql
begin;
select plan(9);

insert into users (id, display_name) values ('00000000-0000-4000-8000-0000000000a1', 'stats-a');
insert into questions (id, prompt, options, correct_index)
select ('00000000-0000-4000-8000-0000000001' || lpad(g::text, 2, '0'))::uuid, 'stats question ' || g, '["a","b"]'::jsonb, 0
  from generate_series(1, 7) g;

select has_table('user_stats', 'user_stats exists');

-- Answers 1..6: right, right, wrong, right, right, right. answered_at is explicit and rising
-- because now() is constant inside a test transaction.
insert into quiz_results (user_id, question_id, answer_index, is_correct, answered_at)
select '00000000-0000-4000-8000-0000000000a1'::uuid,
       ('00000000-0000-4000-8000-0000000001' || lpad(g::text, 2, '0'))::uuid,
       0, g <> 3, now() + (g || ' seconds')::interval
  from generate_series(1, 6) g;

select results_eq(
  $$ select total_answered, correct_count, streak, best_streak from user_stats where user_id = '00000000-0000-4000-8000-0000000000a1' $$,
  $$ values (6, 5, 3, 3) $$,
  'the trigger builds total, correct, streak and best streak');

insert into quiz_results (user_id, question_id, answer_index, is_correct, answered_at)
values ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-000000000107', 1, false, now() + interval '7 seconds');

select results_eq(
  $$ select total_answered, correct_count, streak, best_streak from user_stats where user_id = '00000000-0000-4000-8000-0000000000a1' $$,
  $$ values (7, 5, 0, 3) $$,
  'a wrong answer resets the streak and keeps the best streak');

select is(
  (select accuracy from user_stats where user_id = '00000000-0000-4000-8000-0000000000a1'),
  71, 'accuracy is floor(x + 0.5) of 5/7 = 71, as the old functions computed it');

update user_stats set total_answered = 99, correct_count = 1, streak = 0, best_streak = 0
 where user_id = '00000000-0000-4000-8000-0000000000a1';
select is(rebuild_user_stats('00000000-0000-4000-8000-0000000000a1'), 1, 'rebuild upserts the one account');
select results_eq(
  $$ select total_answered, correct_count, streak, best_streak from user_stats where user_id = '00000000-0000-4000-8000-0000000000a1' $$,
  $$ values (7, 5, 0, 3) $$,
  'rebuild recomputes the same numbers the trigger produced');

delete from quiz_results where user_id = '00000000-0000-4000-8000-0000000000a1';
select is(rebuild_user_stats('00000000-0000-4000-8000-0000000000a1'), 0, 'rebuild with no results upserts nothing');
select is_empty(
  $$ select 1 from user_stats where user_id = '00000000-0000-4000-8000-0000000000a1' $$,
  'rebuild removes the stats row of an account with no results');

select is(has_table_privilege('anon', 'public.user_stats', 'select'), false, 'anon cannot read user_stats');

select * from finish();
rollback;
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx supabase test db`
Expected: FAIL (`user_stats` does not exist).

- [ ] **Step 3: Write the migration**

Create `supabase/migrations/20261013000300_user_stats.sql`:

```sql
-- Phase 2a. Persisted per-player totals, kept by a trigger on quiz_results (spec section 6).
-- The streak definition is the one get_user_stats always used: consecutive correct answers ending
-- at the latest answer, ordered by (answered_at, id). The app never supplies answered_at, so
-- insertion order equals time order.
BEGIN;

CREATE TABLE IF NOT EXISTS user_stats (
  user_id          UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  total_answered   INT  NOT NULL DEFAULT 0 CHECK (total_answered >= 0),
  correct_count    INT  NOT NULL DEFAULT 0 CHECK (correct_count BETWEEN 0 AND total_answered),
  streak           INT  NOT NULL DEFAULT 0 CHECK (streak >= 0),
  best_streak      INT  NOT NULL DEFAULT 0 CHECK (best_streak >= streak),
  last_answered_at TIMESTAMPTZ,
  accuracy         INT  GENERATED ALWAYS AS (
                     CASE WHEN total_answered = 0 THEN 0
                          ELSE floor(correct_count::float8 / total_answered * 100 + 0.5)::int END) STORED,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_stats_rank ON user_stats (correct_count DESC, accuracy DESC, user_id);

ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON user_stats FROM anon, authenticated;

CREATE OR REPLACE FUNCTION apply_quiz_result()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO user_stats AS s (user_id, total_answered, correct_count, streak, best_streak, last_answered_at)
  VALUES (NEW.user_id, 1, NEW.is_correct::int, NEW.is_correct::int, NEW.is_correct::int, NEW.answered_at)
  ON CONFLICT (user_id) DO UPDATE SET
    total_answered   = s.total_answered + 1,
    correct_count    = s.correct_count + NEW.is_correct::int,
    streak           = CASE WHEN NEW.is_correct THEN s.streak + 1 ELSE 0 END,
    best_streak      = GREATEST(s.best_streak, CASE WHEN NEW.is_correct THEN s.streak + 1 ELSE 0 END),
    last_answered_at = NEW.answered_at,
    updated_at       = now();
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION apply_quiz_result() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS quiz_results_apply ON quiz_results;
CREATE TRIGGER quiz_results_apply
  AFTER INSERT ON quiz_results
  FOR EACH ROW EXECUTE FUNCTION apply_quiz_result();

-- Recompute from quiz_results with the same window logic the old get_user_stats used. Used for
-- the backfill below and for repair after any delete (a cascade does not touch user_stats).
-- Returns the number of rows upserted.
CREATE OR REPLACE FUNCTION rebuild_user_stats(p_user UUID DEFAULT NULL)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n INT;
BEGIN
  DELETE FROM user_stats s
   WHERE (p_user IS NULL OR s.user_id = p_user)
     AND NOT EXISTS (SELECT 1 FROM quiz_results r WHERE r.user_id = s.user_id);

  WITH ordered AS (
    SELECT user_id, is_correct, answered_at,
           ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY answered_at, id) AS rn,
           ROW_NUMBER() OVER (PARTITION BY user_id, is_correct ORDER BY answered_at, id) AS rn_in_group
      FROM quiz_results
     WHERE p_user IS NULL OR user_id = p_user
  ),
  runs AS (
    -- Rows in the same run of correct answers share rn - rn_in_group.
    SELECT user_id, COUNT(*) AS len, MAX(rn) AS last_rn
      FROM ordered
     WHERE is_correct
     GROUP BY user_id, rn - rn_in_group
  ),
  totals AS (
    SELECT user_id, COUNT(*) AS total, COUNT(*) FILTER (WHERE is_correct) AS correct,
           MAX(rn) AS max_rn, MAX(answered_at) AS last_at
      FROM ordered
     GROUP BY user_id
  )
  INSERT INTO user_stats AS s (user_id, total_answered, correct_count, streak, best_streak, last_answered_at, updated_at)
  SELECT t.user_id, t.total, t.correct,
         COALESCE((SELECT r.len FROM runs r WHERE r.user_id = t.user_id AND r.last_rn = t.max_rn), 0),
         COALESCE((SELECT MAX(r.len) FROM runs r WHERE r.user_id = t.user_id), 0),
         t.last_at, now()
    FROM totals t
  ON CONFLICT (user_id) DO UPDATE SET
    total_answered   = EXCLUDED.total_answered,
    correct_count    = EXCLUDED.correct_count,
    streak           = EXCLUDED.streak,
    best_streak      = EXCLUDED.best_streak,
    last_answered_at = EXCLUDED.last_answered_at,
    updated_at       = now();
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;
REVOKE ALL ON FUNCTION rebuild_user_stats(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION rebuild_user_stats(UUID) TO service_role;

-- Backfill. The trigger now exists, and CREATE TRIGGER already holds SHARE ROW EXCLUSIVE on
-- quiz_results until COMMIT; the explicit lock states the intent: no answer can slip in between
-- the rebuild's snapshot and the commit, so no incremental update is overwritten.
LOCK TABLE quiz_results IN SHARE ROW EXCLUSIVE MODE;
SELECT rebuild_user_stats();

COMMIT;
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm run check:db`
Expected: PASS, including the 9 new tests.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20261013000300_user_stats.sql supabase/tests/database/20_user_stats.test.sql
git commit -m "feat(db): add user_stats rollup kept by a trigger on quiz_results (phase 2a)" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

### Task 2.2: Swap the stats and leaderboard readers onto `user_stats`

**Files:**
- Create: `supabase/migrations/20261013000400_stats_readers.sql`, `supabase/tests/database/21_stats_readers.test.sql`

**Interfaces:**
- Consumes: `user_stats` (Task 2.1).
- Produces: `get_user_stats(UUID)`, `get_global_leaderboard(INT, INT)`, `get_group_leaderboard(UUID, INT, INT)` with unchanged signatures and return columns, so `lib/db/rpc.ts` and the API shape do not change.

- [ ] **Step 1: Write the failing test**

Create `supabase/tests/database/21_stats_readers.test.sql`:

```sql
begin;
select plan(5);

insert into users (id, display_name) values
  ('00000000-0000-4000-8000-0000000000a1', 'lb-a'),
  ('00000000-0000-4000-8000-0000000000a2', 'lb-b'),
  ('00000000-0000-4000-8000-0000000000a3', 'lb-c');
insert into questions (id, prompt, options, correct_index)
select ('00000000-0000-4000-8000-0000000001' || lpad(g::text, 2, '0'))::uuid, 'reader question ' || g, '["a","b"]'::jsonb, 0
  from generate_series(1, 3) g;

-- lb-a: 3 of 3. lb-b: 2 of 3. lb-c: no answers.
insert into quiz_results (user_id, question_id, answer_index, is_correct, answered_at)
select '00000000-0000-4000-8000-0000000000a1'::uuid, ('00000000-0000-4000-8000-0000000001' || lpad(g::text, 2, '0'))::uuid, 0, true, now() + (g || ' seconds')::interval
  from generate_series(1, 3) g;
insert into quiz_results (user_id, question_id, answer_index, is_correct, answered_at)
select '00000000-0000-4000-8000-0000000000a2'::uuid, ('00000000-0000-4000-8000-0000000001' || lpad(g::text, 2, '0'))::uuid, 0, g <> 2, now() + (g || ' seconds')::interval
  from generate_series(1, 3) g;
insert into groups (id, name, owner_user) values ('00000000-0000-4000-8000-0000000000f1', 'reader-group', '00000000-0000-4000-8000-0000000000a1');
insert into group_members (group_id, user_id) values
  ('00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-0000000000a1'),
  ('00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-0000000000a2'),
  ('00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-0000000000a3');

select results_eq(
  $$ select display_name, score, accuracy from get_global_leaderboard(10) $$,
  $$ values ('lb-a'::text, 3, 100), ('lb-b'::text, 2, 67) $$,
  'global leaderboard ranks by score then accuracy and omits players with no answers');

select results_eq(
  $$ select display_name, score, accuracy from get_group_leaderboard('00000000-0000-4000-8000-0000000000f1', 10) $$,
  $$ values ('lb-a'::text, 3, 100), ('lb-b'::text, 2, 67), ('lb-c'::text, 0, 0) $$,
  'group leaderboard lists members with no answers as 0 and 0');

select results_eq(
  $$ select display_name, score from get_global_leaderboard(1, 1) $$,
  $$ values ('lb-b'::text, 2) $$,
  'offset pages the leaderboard');

select results_eq(
  $$ select total_answered, correct_count, streak, best_streak from get_user_stats('00000000-0000-4000-8000-0000000000a1') $$,
  $$ values (3, 3, 3, 3) $$,
  'get_user_stats reads the rollup');

select results_eq(
  $$ select total_answered, correct_count, streak, best_streak from get_user_stats('00000000-0000-4000-8000-0000000000a3') $$,
  $$ values (0, 0, 0, 0) $$,
  'get_user_stats returns one row of zeros for a player with no answers');

select * from finish();
rollback;
```

- [ ] **Step 2: Run to verify it fails or passes for the right reason**

Run: `npx supabase test db`
Expected: these tests may already pass (the old functions compute the same numbers). That is the point of the gate: the swap must not change a single result. Continue to Step 3 regardless.

- [ ] **Step 3: Write the migration with the reconcile gate**

Create `supabase/migrations/20261013000400_stats_readers.sql`:

```sql
-- Phase 2a (readers). The gate below compares, for every account, the OLD get_user_stats (window
-- functions over quiz_results) with the rollup. Any difference aborts the whole migration, so
-- the swap never ships a different number. Re-running after the swap is a harmless equality check.
BEGIN;

DO $$
DECLARE
  bad INT;
BEGIN
  SELECT count(*) INTO bad
    FROM users u
   CROSS JOIN LATERAL get_user_stats(u.id) g
    LEFT JOIN user_stats s ON s.user_id = u.id
   WHERE (g.total_answered, g.correct_count, g.streak, g.best_streak)
         IS DISTINCT FROM (COALESCE(s.total_answered, 0), COALESCE(s.correct_count, 0),
                           COALESCE(s.streak, 0), COALESCE(s.best_streak, 0));
  IF bad > 0 THEN
    RAISE EXCEPTION 'stats_readers: % account(s) differ between get_user_stats and user_stats; run rebuild_user_stats() and investigate', bad;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION get_user_stats(p_user UUID)
RETURNS TABLE (total_answered INT, correct_count INT, streak INT, best_streak INT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(s.total_answered, 0), COALESCE(s.correct_count, 0), COALESCE(s.streak, 0), COALESCE(s.best_streak, 0)
    FROM (SELECT 1) one
    LEFT JOIN user_stats s ON s.user_id = p_user;
$$;

CREATE OR REPLACE FUNCTION get_global_leaderboard(p_limit INT, p_offset INT DEFAULT 0)
RETURNS TABLE (user_id UUID, display_name TEXT, score INT, accuracy INT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id, u.display_name, s.correct_count, s.accuracy
    FROM user_stats s
    JOIN users u ON u.id = s.user_id
   ORDER BY s.correct_count DESC, s.accuracy DESC, u.id
   LIMIT LEAST(GREATEST(p_limit, 1), 100)
  OFFSET GREATEST(p_offset, 0);
$$;

CREATE OR REPLACE FUNCTION get_group_leaderboard(p_group_id UUID, p_limit INT, p_offset INT DEFAULT 0)
RETURNS TABLE (user_id UUID, display_name TEXT, score INT, accuracy INT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id, u.display_name, COALESCE(s.correct_count, 0), COALESCE(s.accuracy, 0)
    FROM group_members m
    JOIN users u ON u.id = m.user_id
    LEFT JOIN user_stats s ON s.user_id = m.user_id
   WHERE m.group_id = p_group_id
   ORDER BY COALESCE(s.correct_count, 0) DESC, COALESCE(s.accuracy, 0) DESC, u.id
   LIMIT LEAST(GREATEST(p_limit, 1), 100)
  OFFSET GREATEST(p_offset, 0);
$$;

COMMIT;
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm run check:db`
Expected: PASS (the gate finds no accounts on the empty local database, and the five reader tests pass against the new functions).

- [ ] **Step 5: Prove the gate can fail**

```bash
CONTAINER=$(docker ps --format '{{.Names}}' | grep supabase_db | head -1)
docker exec -i "$CONTAINER" psql -U postgres -c "insert into users (id, display_name) values ('00000000-0000-4000-8000-0000000000aa','gate'); insert into questions (id, prompt, options, correct_index) values ('00000000-0000-4000-8000-0000000000ab','gate question prompt','[\"a\",\"b\"]',0); alter table quiz_results disable trigger quiz_results_apply; insert into quiz_results (user_id, question_id, answer_index, is_correct) values ('00000000-0000-4000-8000-0000000000aa','00000000-0000-4000-8000-0000000000ab',0,true);"
npx supabase db push --local --include-all 2>&1 | tail -5
```

Expected: if the migration is re-run now, the gate raises `1 account(s) differ`. Then `npx supabase db reset` to clean up. (If `db push --local` reports nothing to apply, run the `DO $$ ... $$` block from the migration directly with `psql` against the container and expect the exception.)

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20261013000400_stats_readers.sql supabase/tests/database/21_stats_readers.test.sql
git commit -m "feat(db): read stats and leaderboards from user_stats behind a reconcile gate (phase 2a)" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

### Task 2.3: Integrity constraints and indexes

**Files:**
- Create: `supabase/migrations/20261013000500_integrity_and_indexes.sql`, `supabase/tests/database/22_integrity.test.sql`

**Interfaces:**
- Produces: CHECK constraints `questions_options_shape`, `questions_prompt_length`, `questions_explanation_length`, `quiz_results_answer_index_range`, `question_disputes_reason_length`, `groups_name_length`, `groups_description_length`; indexes `quiz_results_user_answered`, `questions_status_created`, `groups_owner_user`. Limits come from the app's validators (`lib/utils/validation.ts`: prompt 300, explanation 1000; `lib/actions/question-actions.ts`: dispute reason 500; `lib/actions/group-actions.ts`: name 50, description 200).

- [ ] **Step 1: [OWNER] Preflight on production (must return zero for every line)**

```sql
select 'options shape' as rule, count(*) from questions
 where not (case when jsonb_typeof(options) = 'array'
                 then jsonb_array_length(options) between 2 and 4 and correct_index < jsonb_array_length(options)
                 else false end)
union all select 'prompt length', count(*) from questions where char_length(prompt) not between 1 and 300
union all select 'explanation length', count(*) from questions where explanation is not null and char_length(explanation) > 1000
union all select 'answer_index range', count(*) from quiz_results where answer_index not between -1 and 3
union all select 'dispute reason length', count(*) from question_disputes where char_length(reason) not between 1 and 500
union all select 'group name length', count(*) from groups where char_length(name) not between 1 and 50
union all select 'group description length', count(*) from groups where description is not null and char_length(description) > 200;
```

If any line is not zero, list the offending rows and decide with the owner whether to correct or retire them (`status = 'rejected'`) before pushing. The migration below validates the constraints and aborts if any row offends, so a skipped preflight fails safely.

- [ ] **Step 2: Write the failing test**

Create `supabase/tests/database/22_integrity.test.sql`:

```sql
begin;
select plan(11);

insert into users (id, display_name) values ('00000000-0000-4000-8000-0000000000a1', 'integrity');
insert into questions (id, prompt, options, correct_index) values
  ('00000000-0000-4000-8000-0000000000d1', 'integrity question prompt', '["a","b"]', 0);

select throws_ok($$ insert into questions (prompt, options, correct_index) values ('p', '["a"]', 0) $$,
  '23514', null, 'a question needs at least 2 options');
select throws_ok($$ insert into questions (prompt, options, correct_index) values ('p', '["a","b","c","d","e"]', 0) $$,
  '23514', null, 'a question has at most 4 options');
select throws_ok($$ insert into questions (prompt, options, correct_index) values ('p', '{"a":1}', 0) $$,
  '23514', null, 'options must be a JSON array');
select throws_ok($$ insert into questions (prompt, options, correct_index) values ('p', '["a","b"]', 3) $$,
  '23514', null, 'correct_index must point at an option');
select throws_ok($$ insert into questions (prompt, options, correct_index) values (repeat('x', 301), '["a","b"]', 0) $$,
  '23514', null, 'a prompt is at most 300 characters');
select throws_ok($$ insert into quiz_results (user_id, question_id, answer_index, is_correct) values ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000d1', 4, false) $$,
  '23514', null, 'answer_index is 0 to 3');
select throws_ok($$ insert into question_disputes (question_id, reporter_user, reason) values ('00000000-0000-4000-8000-0000000000d1', '00000000-0000-4000-8000-0000000000a1', repeat('x', 501)) $$,
  '23514', null, 'a dispute reason is at most 500 characters');
select throws_ok($$ insert into groups (name, owner_user) values (repeat('x', 51), '00000000-0000-4000-8000-0000000000a1') $$,
  '23514', null, 'a group name is at most 50 characters');

select has_index('quiz_results', 'quiz_results_user_answered', 'history index exists');
select has_index('questions', 'questions_status_created', 'status index exists');
select has_index('groups', 'groups_owner_user', 'owner index exists');

select * from finish();
rollback;
```

- [ ] **Step 3: Run to verify it fails**

Run: `npx supabase test db`
Expected: FAIL (no constraints, no indexes yet).

- [ ] **Step 4: Write the migration**

Create `supabase/migrations/20261013000500_integrity_and_indexes.sql`:

```sql
-- Phase 2b/2c. Constraints are added NOT VALID then validated in the same transaction, so a
-- legacy row that breaks one aborts the migration instead of leaving a half-applied state.
-- Limits mirror the app's validators. Run the preflight query from the plan first.
BEGIN;

ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_options_shape;
ALTER TABLE questions ADD CONSTRAINT questions_options_shape CHECK (
  CASE WHEN jsonb_typeof(options) = 'array'
       THEN jsonb_array_length(options) BETWEEN 2 AND 4 AND correct_index < jsonb_array_length(options)
       ELSE false END
) NOT VALID;
ALTER TABLE questions VALIDATE CONSTRAINT questions_options_shape;

ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_prompt_length;
ALTER TABLE questions ADD CONSTRAINT questions_prompt_length CHECK (char_length(prompt) BETWEEN 1 AND 300) NOT VALID;
ALTER TABLE questions VALIDATE CONSTRAINT questions_prompt_length;

ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_explanation_length;
ALTER TABLE questions ADD CONSTRAINT questions_explanation_length CHECK (explanation IS NULL OR char_length(explanation) <= 1000) NOT VALID;
ALTER TABLE questions VALIDATE CONSTRAINT questions_explanation_length;

ALTER TABLE quiz_results DROP CONSTRAINT IF EXISTS quiz_results_answer_index_range;
ALTER TABLE quiz_results ADD CONSTRAINT quiz_results_answer_index_range CHECK (answer_index BETWEEN 0 AND 3) NOT VALID;
ALTER TABLE quiz_results VALIDATE CONSTRAINT quiz_results_answer_index_range;

ALTER TABLE question_disputes DROP CONSTRAINT IF EXISTS question_disputes_reason_length;
ALTER TABLE question_disputes ADD CONSTRAINT question_disputes_reason_length CHECK (char_length(reason) BETWEEN 1 AND 500) NOT VALID;
ALTER TABLE question_disputes VALIDATE CONSTRAINT question_disputes_reason_length;

ALTER TABLE groups DROP CONSTRAINT IF EXISTS groups_name_length;
ALTER TABLE groups ADD CONSTRAINT groups_name_length CHECK (char_length(name) BETWEEN 1 AND 50) NOT VALID;
ALTER TABLE groups VALIDATE CONSTRAINT groups_name_length;

ALTER TABLE groups DROP CONSTRAINT IF EXISTS groups_description_length;
ALTER TABLE groups ADD CONSTRAINT groups_description_length CHECK (description IS NULL OR char_length(description) <= 200) NOT VALID;
ALTER TABLE groups VALIDATE CONSTRAINT groups_description_length;

-- The history query in lib/db/results.ts orders by answered_at for one user; the unique index leads
-- with (user_id, question_id).
CREATE INDEX IF NOT EXISTS quiz_results_user_answered ON quiz_results (user_id, answered_at DESC);
CREATE INDEX IF NOT EXISTS questions_status_created ON questions (status, created_at DESC);
CREATE INDEX IF NOT EXISTS groups_owner_user ON groups (owner_user);

COMMIT;
```

- [ ] **Step 5: Run to verify it passes**

Run: `npm run check:db`
Expected: PASS (all 11 new tests).

- [ ] **Step 6: App-side check that nothing it writes now violates a constraint**

Run: `npx vitest run tests/answer-guards.test.ts tests/question-actions.test.ts tests/group-actions.test.ts`
Expected: PASS (validators already enforce these limits; nothing in code changes).

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20261013000500_integrity_and_indexes.sql supabase/tests/database/22_integrity.test.sql
git commit -m "feat(db): add integrity constraints and missing indexes (phase 2b, 2c)" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

### Task 2.4: Derived `dispute_count`

**Files:**
- Create: `supabase/migrations/20261013000600_dispute_count.sql`, `supabase/tests/database/23_dispute_count.test.sql`
- Modify: `lib/db/questions.ts` (`setDisputeState` becomes `quarantineQuestion`), `lib/actions/question-actions.ts`
- Test: `tests/dispute-quarantine.test.ts` (new)

**Interfaces:**
- Produces: `questions.dispute_count` always equals the number of unresolved disputes; `quarantineQuestion(questionId: string): Promise<void>` replaces `setDisputeState(questionId, disputeCount, quarantine)`.

- [ ] **Step 1: Write the failing SQL test**

Create `supabase/tests/database/23_dispute_count.test.sql`:

```sql
begin;
select plan(5);

insert into users (id, display_name) values
  ('00000000-0000-4000-8000-0000000000a1', 'rep1'),
  ('00000000-0000-4000-8000-0000000000a2', 'rep2'),
  ('00000000-0000-4000-8000-0000000000a3', 'mod1');
insert into questions (id, prompt, options, correct_index) values
  ('00000000-0000-4000-8000-0000000000d1', 'dispute question prompt', '["a","b"]', 0);

insert into question_disputes (id, question_id, reporter_user, reason) values
  ('00000000-0000-4000-8000-0000000000e1', '00000000-0000-4000-8000-0000000000d1', '00000000-0000-4000-8000-0000000000a1', 'wrong'),
  ('00000000-0000-4000-8000-0000000000e2', '00000000-0000-4000-8000-0000000000d1', '00000000-0000-4000-8000-0000000000a2', 'wrong');
select is((select dispute_count from questions where id = '00000000-0000-4000-8000-0000000000d1'), 2, 'two open disputes count as 2');

update question_disputes set resolved_at = now(), resolution = 'restored' where id = '00000000-0000-4000-8000-0000000000e1';
select is((select dispute_count from questions where id = '00000000-0000-4000-8000-0000000000d1'), 1, 'a resolved dispute no longer counts');

delete from question_disputes where id = '00000000-0000-4000-8000-0000000000e2';
select is((select dispute_count from questions where id = '00000000-0000-4000-8000-0000000000d1'), 0, 'a deleted dispute no longer counts');

insert into question_disputes (question_id, reporter_user, reason)
values ('00000000-0000-4000-8000-0000000000d1', '00000000-0000-4000-8000-0000000000a2', 'again');
update questions set status = 'quarantined' where id = '00000000-0000-4000-8000-0000000000d1';
select is(resolve_quarantined_question('00000000-0000-4000-8000-0000000000d1', 'restored', '00000000-0000-4000-8000-0000000000a3', 'ok'), true, 'moderator restores');
select is((select dispute_count from questions where id = '00000000-0000-4000-8000-0000000000d1'), 0, 'a restored question starts again from zero');

select * from finish();
rollback;
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx supabase test db`
Expected: FAIL on the first test (`dispute_count` stays 0 because nothing maintains it).

- [ ] **Step 3: Write the migration**

Create `supabase/migrations/20261013000600_dispute_count.sql`:

```sql
-- Phase 2b. questions.dispute_count becomes derived: the number of unresolved disputes.
-- The app used to count and then write, so two concurrent reports could miss the quarantine
-- threshold. The quarantine decision itself stays in the app (QUARANTINE_AT = 3).
-- One visible change: a retired question now shows 0 open disputes (they are all resolved).
BEGIN;

CREATE OR REPLACE FUNCTION sync_dispute_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  qid UUID := COALESCE(NEW.question_id, OLD.question_id);
BEGIN
  UPDATE questions
     SET dispute_count = (SELECT count(*) FROM question_disputes WHERE question_id = qid AND resolved_at IS NULL)
   WHERE id = qid;
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION sync_dispute_count() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS question_disputes_sync_count ON question_disputes;
CREATE TRIGGER question_disputes_sync_count
  AFTER INSERT OR DELETE OR UPDATE OF resolved_at ON question_disputes
  FOR EACH ROW EXECUTE FUNCTION sync_dispute_count();

-- Backfill to the derived value.
UPDATE questions q
   SET dispute_count = d.n
  FROM (SELECT question_id, count(*)::int AS n FROM question_disputes WHERE resolved_at IS NULL GROUP BY question_id) d
 WHERE q.id = d.question_id AND q.dispute_count <> d.n;
UPDATE questions q
   SET dispute_count = 0
 WHERE q.dispute_count <> 0
   AND NOT EXISTS (SELECT 1 FROM question_disputes d WHERE d.question_id = q.id AND d.resolved_at IS NULL);

COMMIT;
```

- [ ] **Step 4: Run to verify the SQL passes**

Run: `npm run check:db`
Expected: PASS.

- [ ] **Step 5: Write the failing app test**

Create `tests/dispute-quarantine.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db/client', () => ({ admin: vi.fn(), pub: {} }));

import { admin } from '@/lib/db/client';
import { quarantineQuestion } from '@/lib/db/questions';
import { DbError } from '@/lib/db/errors';

const Q_ID = '00000000-0000-4000-8000-0000000000d1';

beforeEach(() => vi.mocked(admin).mockReset());

describe('quarantineQuestion', () => {
  it('sets only the status; dispute_count is kept by the database', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({ eq });
    vi.mocked(admin).mockReturnValue({ from: vi.fn().mockReturnValue({ update }) } as never);

    await quarantineQuestion(Q_ID);

    expect(update).toHaveBeenCalledWith({ status: 'quarantined' });
    expect(eq).toHaveBeenCalledWith('id', Q_ID);
  });

  it('throws a DbError when the update fails', async () => {
    const eq = vi.fn().mockResolvedValue({ error: { message: 'boom' } });
    vi.mocked(admin).mockReturnValue({ from: vi.fn().mockReturnValue({ update: vi.fn().mockReturnValue({ eq }) }) } as never);

    await expect(quarantineQuestion(Q_ID)).rejects.toBeInstanceOf(DbError);
  });
});
```

- [ ] **Step 6: Run to verify it fails**

Run: `npx vitest run tests/dispute-quarantine.test.ts`
Expected: FAIL (`quarantineQuestion` is not exported).

- [ ] **Step 7: Change the code**

In `lib/db/questions.ts`, replace `setDisputeState`:

```ts
// The count is kept by the database (a trigger on question_disputes); only the status changes here.
export async function quarantineQuestion(questionId: string): Promise<void> {
  unwrap('questions.quarantine', await admin().from('questions').update({ status: 'quarantined' }).eq('id', questionId));
}
```

In `lib/actions/question-actions.ts`: in the import list replace `setDisputeState` with `quarantineQuestion`, and replace the block that calls it:

```ts
    const quarantined = disputeCount >= QUARANTINE_AT;
    let updated = true;
    if (quarantined) {
      try {
        await quarantineQuestion(params.questionId);
      } catch (err) {
        logger.error('dispute_question_update_failed', err, { questionId: params.questionId });
        updated = false;
      }
    }
```

- [ ] **Step 8: Run to verify everything passes**

Run: `npx vitest run tests/dispute-quarantine.test.ts tests/answer-guards.test.ts tests/question-actions.test.ts tests/moderation.test.ts && npm run type-check && npm run lint`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add supabase/migrations/20261013000600_dispute_count.sql supabase/tests/database/23_dispute_count.test.sql lib tests/dispute-quarantine.test.ts
git commit -m "feat(db): derive dispute_count from unresolved disputes with a trigger (phase 2b)" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

### Task 2.5: Privilege fixes and the permanent callable-function guard (spec F7)

**Files:**
- Create: `supabase/migrations/20261013000700_function_privileges.sql`, `supabase/tests/database/90_function_privileges.test.sql`
- Modify: `supabase/tests/database/00_baseline_guards.test.sql` (remove the exclusion), `lib/db/rpc.ts`
- Test: `tests/question-analytics.test.ts` (new)

**Interfaces:**
- Produces: `increment_ai_generation(UUID)` and `get_question_analytics(UUID)` callable only by `service_role` with a pinned `search_path`; `questionAnalytics()` uses the secret-key client. A guard test lists exactly which `SECURITY DEFINER` functions the public key may call: `get_user_stats, get_global_leaderboard, get_group_leaderboard, get_topics, search_questions, get_rating_summary`. Later phases add their public readers to that list (Tasks 3.1 and 4.1).

- [ ] **Step 1: Write the failing guard test**

Create `supabase/tests/database/90_function_privileges.test.sql`:

```sql
begin;
select plan(3);

select set_eq(
  $$ select p.proname::text
       from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.prosecdef and has_function_privilege('anon', p.oid, 'execute') $$,
  array['get_user_stats', 'get_global_leaderboard', 'get_group_leaderboard', 'get_topics', 'search_questions', 'get_rating_summary'],
  'only the public read functions are callable with the public key');

select is(has_function_privilege('authenticated', 'increment_ai_generation(uuid)', 'execute'), false,
  'authenticated cannot burn another account''s AI quota');
select is(has_function_privilege('service_role', 'get_question_analytics(uuid)', 'execute'), true,
  'the server can still read question analytics');

select * from finish();
rollback;
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx supabase test db`
Expected: FAIL in `set_eq` (the baseline allows the public key to execute `increment_ai_generation` and `get_question_analytics`, and possibly others; the diff names them). If it names a function not in this plan, stop and tell the owner: it is a new finding, and the right fix (revoke, or add to the list on purpose) is theirs to choose.

- [ ] **Step 3: Write the migration**

Create `supabase/migrations/20261013000700_function_privileges.sql`:

```sql
-- Phase 2d (spec F7). Two SECURITY DEFINER functions had no pinned search_path and were callable
-- with the public key: increment_ai_generation (any caller could burn another account's daily AI
-- quota) and get_question_analytics. Both are now server-only. Bodies are unchanged.
BEGIN;

CREATE OR REPLACE FUNCTION increment_ai_generation(p_user_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count INT;
BEGIN
    INSERT INTO user_ai_usage (user_id, action_date, generations_count)
    VALUES (p_user_id, CURRENT_DATE, 1)
    ON CONFLICT (user_id, action_date)
    DO UPDATE SET generations_count = user_ai_usage.generations_count + 1
    RETURNING generations_count INTO v_count;

    RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION get_question_analytics(p_user_id UUID)
RETURNS TABLE (question_id UUID, prompt TEXT, play_count BIGINT, accuracy_rate NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        q.id AS question_id,
        q.prompt,
        COUNT(qr.id) AS play_count,
        COALESCE(SUM(CASE WHEN qr.is_correct THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(qr.id), 0), 0) AS accuracy_rate
    FROM questions q
    LEFT JOIN quiz_results qr ON q.id = qr.question_id
    WHERE q.created_by_user = p_user_id
    GROUP BY q.id, q.prompt;
END;
$$;

REVOKE ALL ON FUNCTION increment_ai_generation(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION increment_ai_generation(UUID) TO service_role;
REVOKE ALL ON FUNCTION get_question_analytics(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION get_question_analytics(UUID) TO service_role;

COMMIT;
```

- [ ] **Step 4: Remove the temporary exclusion from the Phase 0 guard**

In `supabase/tests/database/00_baseline_guards.test.sql`, delete the comment line `-- Spec finding F7: ...` and the line `      and p.proname not in ('increment_ai_generation', 'get_question_analytics')`.

- [ ] **Step 5: Run to verify it passes**

Run: `npm run check:db`
Expected: PASS. If the `set_eq` still lists an unexpected function, handle as in Step 2.

- [ ] **Step 6: Write the failing app test**

Create `tests/question-analytics.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db/client', () => ({ admin: vi.fn(), pub: { rpc: vi.fn() } }));

import { admin, pub } from '@/lib/db/client';
import { questionAnalytics } from '@/lib/db/rpc';

const ACCOUNT = '00000000-0000-4000-8000-0000000000a1';

beforeEach(() => {
  vi.mocked(admin).mockReset();
  vi.mocked(pub.rpc).mockReset();
});

describe('questionAnalytics', () => {
  it('calls get_question_analytics with the secret key, never the public one', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [{ question_id: 'q1' }], error: null });
    vi.mocked(admin).mockReturnValue({ rpc } as never);

    const rows = await questionAnalytics(ACCOUNT);

    expect(rpc).toHaveBeenCalledWith('get_question_analytics', { p_user_id: ACCOUNT });
    expect(pub.rpc).not.toHaveBeenCalled();
    expect(rows).toEqual([{ question_id: 'q1' }]);
  });
});
```

- [ ] **Step 7: Run to verify it fails**

Run: `npx vitest run tests/question-analytics.test.ts`
Expected: FAIL (the code calls `pub.rpc`).

- [ ] **Step 8: Change the code**

In `lib/db/rpc.ts` replace `questionAnalytics`:

```ts
// Server-only function (supabase/migrations/20261013000700_function_privileges.sql): secret key.
export async function questionAnalytics(accountId: string): Promise<unknown[]> {
  return unwrap('rpc.get_question_analytics', await admin().rpc('get_question_analytics', { p_user_id: accountId })) ?? [];
}
```

- [ ] **Step 9: Run to verify, then the gates**

Run: `npx vitest run tests/question-analytics.test.ts tests/profile-actions.test.ts && npm run check:task`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add supabase lib/db/rpc.ts tests/question-analytics.test.ts
git commit -m "fix(db): make increment_ai_generation and get_question_analytics server-only (phase 2d)" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

**Release order for this task:** the code change (secret key for analytics) must be live in production before the migration is pushed, otherwise the profile analytics call fails between the two. PR the code and migration together, merge to `preview`, promote the code to `main`, then `db push` to production. If Task 0.2 Step 4 showed the exposure is live, the owner may instead push this migration immediately and accept a short window where analytics returns an error (the call site already treats errors as an empty list).

### Task 2.6: [OWNER] Ship Phase 2

- [ ] **Step 1:** PR to `preview` with Tasks 2.1 to 2.5, CI green, merge.
- [ ] **Step 2:** Run the Task 2.3 preflight query on production. Fix or retire offending rows as agreed.
- [ ] **Step 3:** `npx supabase db push` to the Supabase branch, then production. The `stats_readers` gate (Task 2.2) is the proof for `user_stats`: if it raises, run `select rebuild_user_stats();` and retry, and tell the agent which accounts differed.
- [ ] **Step 4:** Spot check on production: `select * from get_global_leaderboard(5);` equals what the app shows.
- [ ] **Step 5:** Fill in the ledger rows for the five Phase 2 migrations. Promote `preview` to `main`.

---

# Phase 3: topics with translated names

Three steps (spec section 7): 3a adds the objects and keeps old code working, 3b switches the code, 3c removes `category`. Spec deviation to note in the PR: `slugify_topic` runs `unaccent` first. Without it, a Vietnamese name such as "Lịch sử" would slugify to `l-ch-s` and different names would merge into one topic. Names that slugify to nothing (for example CJK) get `topic-` plus eight characters of an MD5 of the name, so they stay distinct.

### Task 3.1: Migration 3a: topics, translations, backfill, bridge trigger

**Files:**
- Create: `supabase/migrations/20261013000800_topics.sql`, `supabase/tests/database/30_topics.test.sql`
- Modify: `supabase/tests/database/90_function_privileges.test.sql` (public list gains `resolve_topic`)

**Interfaces:**
- Produces: tables `topics(id, slug, created_at)` and `topic_translations(topic_id, locale, name)`; `questions.topic_id` (nullable until Task 3.4); functions `slugify_topic(TEXT) RETURNS TEXT`, `get_or_create_topic(TEXT) RETURNS UUID` (service only), `resolve_topic(TEXT) RETURNS UUID` (public read), `get_topics(p_locale TEXT DEFAULT 'en') RETURNS TABLE (slug TEXT, name TEXT, question_count INT, latest_at TIMESTAMPTZ)`, `search_questions(p_query TEXT, p_limit INT, p_offset INT, p_locale TEXT DEFAULT 'en')` returning the same columns as before. A `BEFORE INSERT OR UPDATE OF category` trigger fills `topic_id` from `category` for old code.

- [ ] **Step 1: Write the failing test**

Create `supabase/tests/database/30_topics.test.sql`:

```sql
begin;
select plan(13);

select is(slugify_topic('  DeFi & NFTs '), 'defi-nfts', 'slug lowercases and collapses punctuation');
select is(slugify_topic('Lịch sử'), 'lich-su', 'slug strips accents so different names stay different');
select is(slugify_topic('歴史'), 'topic-' || substr(md5('歴史'), 1, 8), 'a name with no latin letters gets a stable hash slug');

-- A question inserted with only a category (what old code does) gets its topic from the trigger.
insert into questions (id, prompt, options, correct_index, category) values
  ('00000000-0000-4000-8000-0000000000d1', 'first topic question', '["a","b"]', 0, 'DeFi'),
  ('00000000-0000-4000-8000-0000000000d2', 'second topic question', '["a","b"]', 0, ' defi ');
select isnt((select topic_id from questions where id = '00000000-0000-4000-8000-0000000000d1'), null, 'the trigger sets topic_id');
select is(
  (select topic_id from questions where id = '00000000-0000-4000-8000-0000000000d1'),
  (select topic_id from questions where id = '00000000-0000-4000-8000-0000000000d2'),
  'two spellings of one name share a topic');
select is((select count(*)::int from topics where slug = 'defi'), 1, 'one topic row for the slug');
select is((select name from topic_translations where topic_id = (select id from topics where slug = 'defi') and locale = 'en'), 'DeFi', 'the first spelling becomes the en name');

select results_eq(
  $$ select slug, name, question_count from get_topics() $$,
  $$ values ('defi'::text, 'DeFi'::text, 2) $$,
  'get_topics groups by topic and falls back to en');
select results_eq(
  $$ select slug, name from get_topics('fr') $$,
  $$ values ('defi'::text, 'DeFi'::text) $$,
  'a locale with no translation falls back to en');

select is(resolve_topic('DEFI'), (select id from topics where slug = 'defi'), 'resolve_topic matches case-insensitively');
select is(resolve_topic('nothing like it'), null, 'resolve_topic returns null for an unknown name');

select is((select count(*)::int from search_questions('defi', 10, 0)), 2, 'search still finds the questions, now through the topic name');
select is(has_function_privilege('anon', 'get_or_create_topic(text)', 'execute'), false, 'only the server may create topics');

select * from finish();
rollback;
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx supabase test db`
Expected: FAIL (`slugify_topic` does not exist).

- [ ] **Step 3: Write the migration**

Create `supabase/migrations/20261013000800_topics.sql`:

```sql
-- Phase 3a (expand). Topics become rows with per-locale names. questions.category stays and stays
-- authoritative until the code release in Task 3.2 is live: a trigger fills topic_id from it, so
-- code that still writes only category keeps working. Existing names are stored as locale 'en' (D5).
BEGIN;

CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA public;

CREATE OR REPLACE FUNCTION slugify_topic(p_name TEXT)
RETURNS TEXT
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    NULLIF(trim(BOTH '-' FROM regexp_replace(lower(unaccent(trim(p_name))), '[^a-z0-9]+', '-', 'g')), ''),
    'topic-' || substr(md5(lower(trim(p_name))), 1, 8)
  );
$$;

CREATE TABLE IF NOT EXISTS topics (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug       TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS topic_translations (
  topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  locale   TEXT NOT NULL CHECK (locale ~ '^[a-z]{2}(-[A-Z]{2})?$'),
  name     TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  PRIMARY KEY (topic_id, locale)
);

CREATE INDEX IF NOT EXISTS topic_translations_name_trgm ON topic_translations USING GIN (lower(name) gin_trgm_ops);

ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE topic_translations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read for topics" ON topics;
CREATE POLICY "Allow public read for topics" ON topics FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public read for topic_translations" ON topic_translations;
CREATE POLICY "Allow public read for topic_translations" ON topic_translations FOR SELECT USING (true);
REVOKE ALL ON topics, topic_translations FROM anon, authenticated;
GRANT SELECT ON topics, topic_translations TO anon, authenticated;

ALTER TABLE questions ADD COLUMN IF NOT EXISTS topic_id UUID REFERENCES topics(id);
CREATE INDEX IF NOT EXISTS questions_topic ON questions (topic_id, created_at DESC);
GRANT SELECT (topic_id) ON questions TO anon, authenticated;

CREATE OR REPLACE FUNCTION get_or_create_topic(p_name TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name TEXT := COALESCE(NULLIF(trim(p_name), ''), 'General');
  v_slug TEXT := slugify_topic(v_name);
  v_id   UUID;
BEGIN
  INSERT INTO topics (slug) VALUES (v_slug) ON CONFLICT (slug) DO NOTHING;
  SELECT id INTO v_id FROM topics WHERE slug = v_slug;
  INSERT INTO topic_translations (topic_id, locale, name) VALUES (v_id, 'en', left(v_name, 60))
    ON CONFLICT (topic_id, locale) DO NOTHING;
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION get_or_create_topic(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION get_or_create_topic(TEXT) TO service_role;

CREATE OR REPLACE FUNCTION resolve_topic(p_name TEXT)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM topics WHERE slug = slugify_topic(p_name);
$$;
GRANT EXECUTE ON FUNCTION resolve_topic(TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION set_question_topic()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.topic_id IS NULL
     OR (TG_OP = 'UPDATE' AND NEW.category IS DISTINCT FROM OLD.category AND NEW.topic_id IS NOT DISTINCT FROM OLD.topic_id) THEN
    NEW.topic_id := get_or_create_topic(NEW.category);
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION set_question_topic() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS questions_set_topic ON questions;
CREATE TRIGGER questions_set_topic
  BEFORE INSERT OR UPDATE OF category ON questions
  FOR EACH ROW EXECUTE FUNCTION set_question_topic();

-- Backfill: group by slug (not by lower(trim(category))) so two spellings that slugify the same
-- cannot collide; the name is the most recent spelling, the rule get_topics() has always used.
CREATE TEMP TABLE _topic_names ON COMMIT DROP AS
  SELECT DISTINCT ON (slugify_topic(category))
         slugify_topic(category) AS slug,
         left(COALESCE(NULLIF(trim(category), ''), 'General'), 60) AS name
    FROM questions
   ORDER BY slugify_topic(category), created_at DESC NULLS LAST;
INSERT INTO topics (slug) SELECT slug FROM _topic_names ON CONFLICT (slug) DO NOTHING;
INSERT INTO topic_translations (topic_id, locale, name)
  SELECT t.id, 'en', n.name FROM _topic_names n JOIN topics t ON t.slug = n.slug
  ON CONFLICT (topic_id, locale) DO NOTHING;
UPDATE questions q SET topic_id = t.id FROM topics t
 WHERE t.slug = slugify_topic(q.category) AND q.topic_id IS DISTINCT FROM t.id;

DROP FUNCTION IF EXISTS get_topics();
CREATE OR REPLACE FUNCTION get_topics(p_locale TEXT DEFAULT 'en')
RETURNS TABLE (slug TEXT, name TEXT, question_count INT, latest_at TIMESTAMPTZ)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    t.slug,
    (SELECT tr.name FROM topic_translations tr WHERE tr.topic_id = t.id
      ORDER BY (tr.locale = p_locale) DESC, (tr.locale = 'en') DESC, tr.locale LIMIT 1),
    COUNT(*)::INT,
    MAX(q.created_at)
  FROM questions q
  JOIN topics t ON t.id = q.topic_id
  WHERE q.status = 'verified'
  GROUP BY t.id, t.slug
  ORDER BY MAX(q.created_at) DESC;
$$;
GRANT EXECUTE ON FUNCTION get_topics(TEXT) TO anon, authenticated;

-- A 4th parameter would add an overload next to the 3-argument version and make a 3-argument call
-- ambiguous, so the old one goes first. Old callers still work through the default.
DROP FUNCTION IF EXISTS search_questions(TEXT, INT, INT);
CREATE OR REPLACE FUNCTION search_questions(p_query TEXT, p_limit INT, p_offset INT, p_locale TEXT DEFAULT 'en')
RETURNS TABLE (
  id UUID,
  prompt TEXT,
  category TEXT,
  author_name TEXT,
  created_at TIMESTAMPTZ,
  score REAL
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH escaped AS (
    SELECT
      replace(replace(replace(p_query, '\', '\\'), '%', '\%'), '_', '\_') AS pattern,
      lower(p_query) AS raw
  )
  SELECT
    q.id,
    q.prompt,
    tn.name AS category,
    COALESCE(u.display_name, 'Player') AS author_name,
    q.created_at,
    GREATEST(
      word_similarity(escaped.raw, lower(q.prompt)),
      word_similarity(escaped.raw, lower(tn.name))
    ) AS score
  FROM questions q
  JOIN topics t ON t.id = q.topic_id
  CROSS JOIN LATERAL (
    SELECT tr.name FROM topic_translations tr WHERE tr.topic_id = t.id
     ORDER BY (tr.locale = p_locale) DESC, (tr.locale = 'en') DESC, tr.locale LIMIT 1
  ) tn
  LEFT JOIN users u ON u.id = q.created_by_user
  CROSS JOIN escaped
  WHERE q.status = 'verified'
    AND (
      lower(q.prompt) ILIKE '%' || lower(escaped.pattern) || '%' ESCAPE '\'
      OR lower(tn.name) ILIKE '%' || lower(escaped.pattern) || '%' ESCAPE '\'
      OR word_similarity(escaped.raw, lower(q.prompt)) > 0.3
      OR word_similarity(escaped.raw, lower(tn.name)) > 0.3
    )
  ORDER BY score DESC, q.created_at DESC
  LIMIT LEAST(GREATEST(p_limit, 1), 100)
  OFFSET GREATEST(p_offset, 0);
$$;
GRANT EXECUTE ON FUNCTION search_questions(TEXT, INT, INT, TEXT) TO anon, authenticated;

COMMIT;
```

- [ ] **Step 4: Add `resolve_topic` to the public list in the guard**

In `supabase/tests/database/90_function_privileges.test.sql`, change the `array[...]` to:

```sql
  array['get_user_stats', 'get_global_leaderboard', 'get_group_leaderboard', 'get_topics', 'search_questions', 'get_rating_summary', 'resolve_topic'],
```

- [ ] **Step 5: Run to verify it passes**

Run: `npm run check:db`
Expected: PASS (13 new tests, guard still green).

- [ ] **Step 6: Commit**

```bash
git add supabase
git commit -m "feat(db): add topics and translated names with a bridge trigger (phase 3a)" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

### Task 3.2: Code release: read and write topics through the helpers

**Files:**
- Create: `lib/db/topics.ts`, `tests/topics-db.test.ts`
- Modify: `lib/db/questions.ts`, `lib/db/rpc.ts`, `lib/actions/question-actions.ts`, `app/api/v1/topics/route.ts` (no change needed beyond the action), `tests/trivia-guest-access.test.tsx`, `tests/discovery.test.ts`

**Interfaces:**
- Produces in `lib/db/topics.ts`: `DEFAULT_LOCALE = 'en'`, `TOPIC_EMBED = 'topics(slug, topic_translations(locale, name))'`, `type TopicEmbed = { slug: string; topic_translations: Array<{ locale: string; name: string }> } | null`, `topicName(topic: TopicEmbed, locale?: string): string`, `withCategory<T extends { topics: TopicEmbed }>(row: T): Omit<T, 'topics'> & { category: string }`, `resolveTopicId(name: string): Promise<string | null>`, `getOrCreateTopicId(name: string): Promise<string>`.
- Contract preserved: every function in `lib/db/questions.ts` that returned a row with `category` still returns `category` (derived), so actions, API routes and the mobile app see no change. `topics()` rows gain `slug`; `getTopics()` output gains `slug` (additive).

- [ ] **Step 1: Write the failing helper tests**

Create `tests/topics-db.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db/client', () => ({ admin: vi.fn(), pub: { rpc: vi.fn() } }));

import { admin, pub } from '@/lib/db/client';
import {
  DEFAULT_LOCALE, TOPIC_EMBED, getOrCreateTopicId, resolveTopicId, topicName, withCategory,
} from '@/lib/db/topics';

const TOPIC = { slug: 'defi', topic_translations: [{ locale: 'fr', name: 'Finance' }, { locale: 'en', name: 'DeFi' }] };

beforeEach(() => {
  vi.mocked(admin).mockReset();
  vi.mocked(pub.rpc).mockReset();
});

describe('topicName', () => {
  it('prefers the asked locale, then the default, then any, then General', () => {
    expect(topicName(TOPIC, 'fr')).toBe('Finance');
    expect(topicName(TOPIC, 'de')).toBe('DeFi');
    expect(topicName({ slug: 'x', topic_translations: [{ locale: 'vi', name: 'Lịch sử' }] }, 'de')).toBe('Lịch sử');
    expect(topicName({ slug: 'x', topic_translations: [] })).toBe('General');
    expect(topicName(null)).toBe('General');
    expect(DEFAULT_LOCALE).toBe('en');
  });
});

describe('withCategory', () => {
  it('replaces the embed with a category string and keeps the other fields', () => {
    expect(withCategory({ id: 'q1', prompt: 'p', topics: TOPIC })).toEqual({ id: 'q1', prompt: 'p', category: 'DeFi' });
  });
});

describe('TOPIC_EMBED', () => {
  it('is the PostgREST embed topicName reads', () => {
    expect(TOPIC_EMBED).toBe('topics(slug, topic_translations(locale, name))');
  });
});

describe('resolveTopicId', () => {
  it('asks resolve_topic with the public key and returns the id', async () => {
    vi.mocked(pub.rpc).mockResolvedValue({ data: 'topic-1', error: null } as never);
    await expect(resolveTopicId('DeFi')).resolves.toBe('topic-1');
    expect(pub.rpc).toHaveBeenCalledWith('resolve_topic', { p_name: 'DeFi' });
  });

  it('returns null for an unknown name', async () => {
    vi.mocked(pub.rpc).mockResolvedValue({ data: null, error: null } as never);
    await expect(resolveTopicId('nope')).resolves.toBeNull();
  });
});

describe('getOrCreateTopicId', () => {
  it('creates or finds the topic with the secret key', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: 'topic-2', error: null });
    vi.mocked(admin).mockReturnValue({ rpc } as never);
    await expect(getOrCreateTopicId('History')).resolves.toBe('topic-2');
    expect(rpc).toHaveBeenCalledWith('get_or_create_topic', { p_name: 'History' });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/topics-db.test.ts`
Expected: FAIL (module `lib/db/topics` does not exist).

- [ ] **Step 3: Write `lib/db/topics.ts`**

```ts
import 'server-only';
import { admin, pub } from './client';
import { unwrap } from './errors';

// Topics are rows with per-locale names (supabase/migrations/20261013000800_topics.sql). The rest of
// the app still sees a `category` string: the db layer derives it here.

export const DEFAULT_LOCALE = 'en';

// Joined through questions.topic_id.
export const TOPIC_EMBED = 'topics(slug, topic_translations(locale, name))';

export type TopicEmbed = { slug: string; topic_translations: Array<{ locale: string; name: string }> } | null;

export function topicName(topic: TopicEmbed, locale: string = DEFAULT_LOCALE): string {
  const names = topic?.topic_translations ?? [];
  const hit = names.find((n) => n.locale === locale) ?? names.find((n) => n.locale === DEFAULT_LOCALE) ?? names[0];
  return hit?.name ?? 'General';
}

export function withCategory<T extends { topics: TopicEmbed }>(row: T): Omit<T, 'topics'> & { category: string } {
  const { topics, ...rest } = row;
  return { ...rest, category: topicName(topics) };
}

// Case- and accent-insensitive: the same slug rule the database uses. Null when no such topic.
export async function resolveTopicId(name: string): Promise<string | null> {
  return (unwrap('rpc.resolve_topic', await pub.rpc('resolve_topic', { p_name: name })) as string | null) ?? null;
}

// Secret key: only the server creates topics.
export async function getOrCreateTopicId(name: string): Promise<string> {
  return unwrap('rpc.get_or_create_topic', await admin().rpc('get_or_create_topic', { p_name: name })) as string;
}
```

- [ ] **Step 4: Run to verify the helpers pass**

Run: `npx vitest run tests/topics-db.test.ts`
Expected: PASS.

- [ ] **Step 5: Write failing tests for the switched reads and writes**

In `tests/topics-db.test.ts`, change the top mock so `pub` also has `from`: `vi.mock('@/lib/db/client', () => ({ admin: vi.fn(), pub: { rpc: vi.fn(), from: vi.fn() } }));`, and add `import { insertQuestion, listPublicQuestions, publicQuestion } from '@/lib/db/questions';` next to the other imports. Then append these tests at the end of the file:

```ts
describe('questions through topics', () => {
  const ROW = { id: 'q1', prompt: 'p', options: ['a', 'b'], created_by_user: null, status: 'verified', topics: TOPIC };

  function chain(rows: unknown) {
    const calls: Array<[string, unknown[]]> = [];
    const c: Record<string, unknown> = {};
    for (const m of ['select', 'eq', 'not', 'limit', 'single']) {
      c[m] = (...args: unknown[]) => {
        calls.push([m, args]);
        return c;
      };
    }
    c.then = (resolve: (v: unknown) => unknown) => resolve({ data: rows, error: null });
    vi.mocked(pub.from).mockReturnValue(c as never);
    return calls;
  }

  it('listPublicQuestions embeds the topic and returns a derived category', async () => {
    const calls = chain([ROW]);
    const rows = await listPublicQuestions({ limit: 5 });
    expect(calls[0][1][0]).toContain(TOPIC_EMBED);
    expect(rows[0]).toMatchObject({ id: 'q1', category: 'DeFi' });
    expect(rows[0]).not.toHaveProperty('topics');
  });

  it('listPublicQuestions filters by topic id resolved from the category name', async () => {
    vi.mocked(pub.rpc).mockResolvedValue({ data: 'topic-1', error: null } as never);
    const calls = chain([ROW]);
    await listPublicQuestions({ category: 'DeFi', limit: 5 });
    expect(calls).toContainEqual(['eq', ['topic_id', 'topic-1']]);
  });

  it('listPublicQuestions returns nothing when the category names no topic', async () => {
    vi.mocked(pub.rpc).mockResolvedValue({ data: null, error: null } as never);
    chain([ROW]);
    await expect(listPublicQuestions({ category: 'nope', limit: 5 })).resolves.toEqual([]);
  });

  it('publicQuestion returns the derived category', async () => {
    chain(ROW);
    await expect(publicQuestion('q1')).resolves.toMatchObject({ id: 'q1', category: 'DeFi' });
  });

  it('insertQuestion stores topic_id, not category', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const rpc = vi.fn().mockResolvedValue({ data: 'topic-9', error: null });
    vi.mocked(admin).mockReturnValue({ rpc, from: vi.fn().mockReturnValue({ insert }) } as never);

    await insertQuestion({
      prompt: 'A long enough prompt', options: ['a', 'b', 'c', 'd'], correct_index: 1, category: 'History',
      explanation: null, created_by_user: 'u1', status: 'verified', dispute_count: 0,
    });

    expect(rpc).toHaveBeenCalledWith('get_or_create_topic', { p_name: 'History' });
    const row = insert.mock.calls[0][0];
    expect(row.topic_id).toBe('topic-9');
    expect(row).not.toHaveProperty('category');
  });
});
```

The `beforeEach` at the top of the file already resets `admin` and `pub.rpc`; add `vi.mocked(pub.from).mockReset();` to it.

- [ ] **Step 6: Run to verify they fail**

Run: `npx vitest run tests/topics-db.test.ts`
Expected: FAIL in the new `questions through topics` tests.

- [ ] **Step 7: Change `lib/db/questions.ts`**

- Add the import: `import { TOPIC_EMBED, type TopicEmbed, getOrCreateTopicId, resolveTopicId, withCategory } from './topics';`
- Replace `const PUBLIC_FIELDS = 'id, category, prompt, options, created_by_user, status';` with:

```ts
const PUBLIC_FIELDS = `id, prompt, options, created_by_user, status, ${TOPIC_EMBED}`;
type PublicQuestionDbRow = Omit<PublicQuestionRow, 'category'> & { topics: TopicEmbed };
```

- Replace `insertQuestion`:

```ts
export async function insertQuestion(row: NewQuestion): Promise<void> {
  const { category, ...rest } = row;
  const topic_id = await getOrCreateTopicId(category);
  unwrap('questions.insert', await admin().from('questions').insert({ ...rest, topic_id }));
}
```

- Replace `listPublicQuestions` body after the signature:

```ts
  let query = pub.from('questions').select(PUBLIC_FIELDS).eq('status', 'verified');
  if (opts.excludeIds?.length) query = query.not('id', 'in', `(${opts.excludeIds.join(',')})`);
  if (opts.category) {
    const topicId = await resolveTopicId(opts.category);
    if (!topicId) return [];
    query = query.eq('topic_id', topicId);
  }
  const rows = unwrap('questions.listPublic', await query.limit(opts.limit)) as PublicQuestionDbRow[] | null;
  return (rows ?? []).map(withCategory);
```

- Replace `publicQuestion`:

```ts
export async function publicQuestion(id: string): Promise<PublicQuestionRow | null> {
  const row = unwrapOne(
    'questions.public',
    await pub.from('questions').select(PUBLIC_FIELDS).eq('id', id).eq('status', 'verified').single()
  ) as PublicQuestionDbRow | null;
  return row ? withCategory(row) : null;
}
```

- Replace `listTopicQuestions`:

```ts
export async function listTopicQuestions(topic: string, offset: number, pageSize: number): Promise<unknown[]> {
  const topicId = await resolveTopicId(topic);
  if (!topicId) return [];
  const rows = unwrap(
    'questions.listTopic',
    await pub
      .from('questions')
      .select(`id, prompt, created_at, users(display_name), ${TOPIC_EMBED}`)
      .eq('status', 'verified')
      .eq('topic_id', topicId)
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize)
  ) as Array<{ topics: TopicEmbed }> | null;
  return (rows ?? []).map(withCategory);
}
```

- Replace `listQuestionsByAuthor`'s select and category filter:

```ts
  let query = pub
    .from('questions')
    .select(`id, prompt, options, status, created_at, ${TOPIC_EMBED}`)
    .eq('created_by_user', accountId);
  if (f.category) {
    const topicId = await resolveTopicId(f.category);
    if (!topicId) return [];
    query = query.eq('topic_id', topicId);
  }
  if (f.status) query = query.eq('status', f.status);
  const rows = unwrap(
    'questions.listByAuthor',
    await query.order('created_at', { ascending: false }).range(f.offset, f.offset + f.limit - 1)
  ) as Array<{ topics: TopicEmbed }> | null;
  return (rows ?? []).map(withCategory);
```

- Replace `quarantinedQuestions` select and mapping:

```ts
export async function quarantinedQuestions(limit: number, offset: number): Promise<QuarantinedQuestion[]> {
  const rows: (Omit<QuarantinedQuestion, 'disputes' | 'category'> & { topics: TopicEmbed; question_disputes: QuarantinedQuestion['disputes'] | null })[] | null = unwrap(
    'questions.quarantined',
    await admin()
      .from('questions')
      .select(`id, prompt, options, correct_index, explanation, dispute_count, created_at, ${TOPIC_EMBED}, question_disputes(id, reason, created_at)`)
      .eq('status', 'quarantined')
      .is('question_disputes.resolved_at', null)
      .order('dispute_count', { ascending: false })
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1)
  );
  return (rows ?? []).map(({ question_disputes, ...question }) => ({ ...withCategory(question), disputes: question_disputes ?? [] }));
}
```

- `escapeLikePattern` is no longer used in this file: remove its import if `npm run lint` flags it.

`lib/db/rpc.ts`: replace `topics`:

```ts
export async function topics(locale?: string): Promise<Array<{ slug: string; name: string; question_count: number; latest_at: string }>> {
  return unwrap('rpc.get_topics', await pub.rpc('get_topics', locale ? { p_locale: locale } : undefined)) ?? [];
}
```

`lib/actions/question-actions.ts`: replace `getTopics`:

```ts
export async function getTopics(): Promise<Array<{ slug: string; name: string; questionCount: number; latestAt: string }>> {
  try {
    return (await topics()).map((row) => ({
      slug: row.slug,
      name: row.name,
      questionCount: row.question_count,
      latestAt: row.latest_at,
    }));
  } catch (err) {
    logger.error('getTopics error:', err);
    return [];
  }
}
```

- [ ] **Step 8: Run the affected suites and fix fixtures**

Run: `npx vitest run tests/topics-db.test.ts tests/trivia-guest-access.test.tsx tests/discovery.test.ts tests/answer-guards.test.ts tests/question-actions.test.ts tests/moderation.test.ts tests/profile-actions.test.ts`

Fix the failures this change causes, and only those:
- `tests/discovery.test.ts` `getTopicQuestions` cases: `listTopicQuestions` now calls `supabase.rpc('resolve_topic', ...)` first. In each case add `(supabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({ data: 'topic-1', error: null });` before the call, and change the stub's recorded method list from `'ilike'` to `'eq'` and the assertion that checked `ilike('category', ...)` to `eq('topic_id', 'topic-1')`. Add one case: with `rpc` resolving `{ data: null, error: null }`, `getTopicQuestions('nope')` returns `{ results: [], hasMore: false }` and `supabase.from` is not called.
- `tests/trivia-guest-access.test.tsx` `getTopics` case: the mocked `get_topics` rows now include `slug`; add `slug: 'defi'` to the input row and `slug: 'defi'` to the expected camelCase output. The mocked `fetchRandomQuestion` row has `category: 'General'` at the top level; wrap it as `topics: { slug: 'general', topic_translations: [{ locale: 'en', name: 'General' }] }` and keep the assertion on the derived `category`.
- `tests/moderation.test.ts` `quarantinedQuestions`: the fixture `ROW` gets `topics: { slug: 'science', topic_translations: [{ locale: 'en', name: 'Science' }] }` instead of `category: 'Science'`; the expected value keeps `category: 'Science'`.

Expected after fixes: PASS.

- [ ] **Step 9: Gates**

Run: `npm run check:task`
Expected: PASS, coverage ratchet holds.

- [ ] **Step 10: Commit**

```bash
git add lib tests
git commit -m "feat(topics): read and write questions through topics, keep the category field" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

### Task 3.3: [OWNER] Apply 3a, then ship the code, then wait

- [ ] **Step 1:** PR to `preview` with Tasks 3.1 and 3.2, CI green, merge.
- [ ] **Step 2:** `db push` 3a to the Supabase branch, then production. Check: `select count(*) from questions where topic_id is null;` is `0`; `select slug, count(*) from topics join questions on topics.id = questions.topic_id group by 1 order by 2 desc limit 10;` looks like the old topic list. If existing names are not English (D5), say so now so the locale is changed with a follow-up migration before the code ships.
- [ ] **Step 3:** Promote `preview` to `main` so the code runs in production. Confirm in the app: topic bar, a topic page, search, creating a question, the moderation queue.
- [ ] **Step 4:** Tell the agent when production runs the new code. Task 3.4 must not be committed before this point.

### Task 3.4: Migration 3c: contract (after Task 3.3 is live)

**Files:**
- Create: `supabase/migrations/20261013000900_topics_contract.sql`, `supabase/tests/database/31_topics_contract.test.sql`
- Modify: every pgTAP file that inserts into `questions`

**Interfaces:**
- Consumes: Task 3.3 complete.
- Produces: `questions.topic_id NOT NULL`, no `questions.category`, no bridge trigger.

- [ ] **Step 1: [OWNER] Preconditions on production**
  - Backup or point-in-time recovery confirmed.
  - `select count(*) from questions where topic_id is null;` returns `0`.
  - `select count(*) from questions where topic_id is not distinct from null;` and a manual look at the app confirm nothing reads `category` (the db layer derives it).

- [ ] **Step 2: Write the failing test**

Create `supabase/tests/database/31_topics_contract.test.sql`:

```sql
begin;
select plan(4);

select hasnt_column('questions', 'category', 'questions.category is gone');
select col_not_null('questions', 'topic_id', 'topic_id is required');
select hasnt_trigger('questions', 'questions_set_topic', 'the bridge trigger is gone');
select throws_ok(
  $$ insert into questions (prompt, options, correct_index) values ('no topic given', '["a","b"]', 0) $$,
  '23502', null, 'a question without a topic is refused');

select * from finish();
rollback;
```

- [ ] **Step 3: Run to verify it fails**

Run: `npx supabase test db`
Expected: FAIL (`category` still exists).

- [ ] **Step 4: Write the migration**

Create `supabase/migrations/20261013000900_topics_contract.sql`:

```sql
-- Phase 3c (contract). Apply only after the code that reads topics through the embed is live in
-- production (Task 3.3). questions.category is dropped; its column grant and trigram index go with it.
BEGIN;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema = 'public' AND table_name = 'questions' AND column_name = 'category') THEN
    IF EXISTS (SELECT 1 FROM questions WHERE topic_id IS NULL) THEN
      RAISE EXCEPTION 'topics_contract: % question(s) have no topic_id', (SELECT count(*) FROM questions WHERE topic_id IS NULL);
    END IF;
  END IF;
END $$;

ALTER TABLE questions ALTER COLUMN topic_id SET NOT NULL;
DROP TRIGGER IF EXISTS questions_set_topic ON questions;
DROP FUNCTION IF EXISTS set_question_topic();
DROP INDEX IF EXISTS idx_questions_category_trgm;
ALTER TABLE questions DROP COLUMN IF EXISTS category;

COMMIT;
```

- [ ] **Step 5: Fix the older pgTAP fixtures**

Every earlier test inserts questions without a topic. Find them:

Run: `grep -ln "insert into questions" supabase/tests/database/*.test.sql`

In each file, add this line right after the first `begin;`/`select plan(...)` pair, and add `topic_id` to each `insert into questions (...)` column list with the value `(select id from topics where slug = 'general')`:

```sql
insert into topics (slug) values ('general') on conflict (slug) do nothing;
```

For example `insert into questions (id, prompt, options, correct_index) values ('...d1', '...', '["a","b"]', 0)` becomes `insert into questions (id, prompt, options, correct_index, topic_id) values ('...d1', '...', '["a","b"]', 0, (select id from topics where slug = 'general'))`, and the `insert ... select ... from generate_series` fixtures append `, (select id from topics where slug = 'general')` to the select list and `, topic_id` to the column list. In `30_topics.test.sql` leave the inserts alone (they set `category`, which no longer exists): replace that file's two `insert into questions` statements with inserts that name the topic explicitly, using `get_or_create_topic('DeFi')` and `get_or_create_topic(' defi ')` as the `topic_id` values, and delete the assertion `the trigger sets topic_id`.

- [ ] **Step 6: Run to verify it passes**

Run: `npm run check:db`
Expected: PASS for every file, including `31_topics_contract`.

- [ ] **Step 7: Commit, then the owner applies**

```bash
git add supabase
git commit -m "feat(db)!: make topic_id required and drop questions.category (phase 3c)" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 8: [OWNER] Apply.** PR to `preview`, green, `db push` to the branch, check the app against it, then production. Fill in the ledger. Promote.

---

# Phase 4: daily challenge

Decision D1: daily answers live in their own tables; `quiz_results` and `user_stats` stay the lifetime record.

### Task 4.1: Migration: daily challenge tables and functions

**Files:**
- Create: `supabase/migrations/20261013001000_daily_challenge.sql`, `supabase/tests/database/40_daily_challenge.test.sql`
- Modify: `supabase/tests/database/90_function_privileges.test.sql` (public list gains `get_daily_leaderboard`)

**Interfaces:**
- Produces: tables `daily_challenges(challenge_date)`, `daily_challenge_questions(challenge_date, position, question_id)`, `daily_attempts(id, user_id, challenge_date, started_at, finished_at, correct_count)`, `daily_attempt_answers(attempt_id, challenge_date, question_id, answer_index, is_correct, answered_at)`; functions `pick_daily_challenge(p_date DATE, p_count INT DEFAULT 10) RETURNS INT` (service only; rows inserted, 0 on a repeat) and `get_daily_leaderboard(p_date DATE, p_limit INT, p_offset INT DEFAULT 0) RETURNS TABLE (user_id UUID, display_name TEXT, correct_count INT, duration_seconds INT)` (public).

- [ ] **Step 1: Write the failing test**

Create `supabase/tests/database/40_daily_challenge.test.sql`:

```sql
begin;
select plan(11);

insert into topics (slug) values ('general') on conflict (slug) do nothing;
insert into users (id, display_name) values
  ('00000000-0000-4000-8000-0000000000a1', 'day-a'),
  ('00000000-0000-4000-8000-0000000000a2', 'day-b');
insert into questions (id, prompt, options, correct_index, topic_id)
select ('00000000-0000-4000-8000-0000000001' || lpad(g::text, 2, '0'))::uuid, 'daily question ' || g, '["a","b"]'::jsonb, 0,
       (select id from topics where slug = 'general')
  from generate_series(1, 12) g;
insert into questions (id, prompt, options, correct_index, status, topic_id)
values ('00000000-0000-4000-8000-000000000199', 'rejected daily question', '["a","b"]', 0, 'rejected', (select id from topics where slug = 'general'));

select is(pick_daily_challenge('2026-11-20', 10), 10, 'picks ten questions');
select is(pick_daily_challenge('2026-11-20', 10), 0, 'a second pick for the same day changes nothing');
select is((select count(*)::int from daily_challenge_questions where challenge_date = '2026-11-20' and question_id = '00000000-0000-4000-8000-000000000199'), 0, 'a rejected question is never picked');
select throws_ok($$ select pick_daily_challenge('2026-11-21', 21) $$, 'P0001', null, 'at most 20 questions');

-- Attempts: one per player per day.
insert into daily_attempts (id, user_id, challenge_date, started_at, finished_at) values
  ('00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-0000000000a1', '2026-11-20', '2026-11-20 10:00:00+00', '2026-11-20 10:01:30+00'),
  ('00000000-0000-4000-8000-0000000000b2', '00000000-0000-4000-8000-0000000000a2', '2026-11-20', '2026-11-20 11:00:00+00', '2026-11-20 11:00:40+00');
select throws_ok(
  $$ insert into daily_attempts (user_id, challenge_date) values ('00000000-0000-4000-8000-0000000000a1', '2026-11-20') $$,
  '23505', null, 'one attempt per player per day');

-- Answers: only questions of that day's challenge, and only against that day's attempt.
select throws_ok(
  $$ insert into daily_attempt_answers (attempt_id, challenge_date, question_id, answer_index, is_correct)
     values ('00000000-0000-4000-8000-0000000000b1', '2026-11-20', '00000000-0000-4000-8000-000000000199', 0, true) $$,
  '23503', null, 'an answer to a question outside the challenge is refused');
select throws_ok(
  $$ insert into daily_attempt_answers (attempt_id, challenge_date, question_id, answer_index, is_correct)
     select '00000000-0000-4000-8000-0000000000b1', '2026-11-19', question_id, 0, true
       from daily_challenge_questions where challenge_date = '2026-11-20' limit 1 $$,
  '23503', null, 'an answer attached to another day is refused');

-- Scoring: a1 gets 2 right in 90s, a2 gets 2 right in 40s, so a2 ranks first on time.
insert into daily_attempt_answers (attempt_id, challenge_date, question_id, answer_index, is_correct)
select a.id, '2026-11-20', q.question_id, 0, true
  from (values ('00000000-0000-4000-8000-0000000000b1'::uuid), ('00000000-0000-4000-8000-0000000000b2'::uuid)) a(id)
  cross join lateral (select question_id from daily_challenge_questions where challenge_date = '2026-11-20' order by position limit 2) q;
select is((select correct_count from daily_attempts where id = '00000000-0000-4000-8000-0000000000b1'), 2, 'the trigger keeps correct_count');
select results_eq(
  $$ select display_name, correct_count, duration_seconds from get_daily_leaderboard('2026-11-20', 10) $$,
  $$ values ('day-b'::text, 2, 40), ('day-a'::text, 2, 90) $$,
  'leaderboard ranks by score, then by time');
select is(has_function_privilege('anon', 'pick_daily_challenge(date,integer)', 'execute'), false, 'only the server picks the challenge');
select is(has_table_privilege('anon', 'public.daily_attempts', 'select'), false, 'anon cannot read attempts');

select * from finish();
rollback;
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx supabase test db`
Expected: FAIL (`pick_daily_challenge` does not exist).

- [ ] **Step 3: Write the migration**

Create `supabase/migrations/20261013001000_daily_challenge.sql`:

```sql
-- Phase 4 (spec section 8, decision D1). The daily challenge keeps its own answer tables:
-- quiz_results is unique per (user, question) and is the lifetime ledger behind user_stats, so a
-- daily question the player already answered could not be recorded there. challenge_date is a UTC
-- date; the app computes it in UTC. Additive only: no existing table changes.
BEGIN;

CREATE TABLE IF NOT EXISTS daily_challenges (
  challenge_date DATE PRIMARY KEY,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS daily_challenge_questions (
  challenge_date DATE NOT NULL REFERENCES daily_challenges(challenge_date) ON DELETE CASCADE,
  position       SMALLINT NOT NULL CHECK (position BETWEEN 1 AND 20),
  question_id    UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  PRIMARY KEY (challenge_date, position),
  UNIQUE (challenge_date, question_id)
);

CREATE TABLE IF NOT EXISTS daily_attempts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  challenge_date DATE NOT NULL REFERENCES daily_challenges(challenge_date) ON DELETE CASCADE,
  started_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at    TIMESTAMPTZ,
  correct_count  INT NOT NULL DEFAULT 0 CHECK (correct_count >= 0),
  UNIQUE (user_id, challenge_date),
  UNIQUE (id, challenge_date),
  CHECK (finished_at IS NULL OR finished_at >= started_at)
);

-- The two composite foreign keys make the database refuse an answer to a question that is not part
-- of that day's challenge, or an answer attached to another day's attempt. No trigger needed.
CREATE TABLE IF NOT EXISTS daily_attempt_answers (
  attempt_id     UUID NOT NULL,
  challenge_date DATE NOT NULL,
  question_id    UUID NOT NULL,
  answer_index   INT NOT NULL CHECK (answer_index BETWEEN 0 AND 3),
  is_correct     BOOLEAN NOT NULL,
  answered_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (attempt_id, question_id),
  FOREIGN KEY (attempt_id, challenge_date) REFERENCES daily_attempts (id, challenge_date) ON DELETE CASCADE,
  FOREIGN KEY (challenge_date, question_id) REFERENCES daily_challenge_questions (challenge_date, question_id)
);

CREATE INDEX IF NOT EXISTS daily_attempts_rank ON daily_attempts (challenge_date, correct_count DESC, finished_at);

ALTER TABLE daily_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_challenge_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_attempt_answers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON daily_challenges, daily_challenge_questions, daily_attempts, daily_attempt_answers FROM anon, authenticated;

CREATE OR REPLACE FUNCTION apply_daily_answer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_correct THEN
    UPDATE daily_attempts SET correct_count = correct_count + 1 WHERE id = NEW.attempt_id;
  END IF;
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION apply_daily_answer() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS daily_attempt_answers_apply ON daily_attempt_answers;
CREATE TRIGGER daily_attempt_answers_apply
  AFTER INSERT ON daily_attempt_answers
  FOR EACH ROW EXECUTE FUNCTION apply_daily_answer();

-- Picks p_count random verified questions for a day. A repeat for the same day inserts nothing
-- (returns 0), so the cron job can retry safely. An advisory lock keeps two runs from interleaving.
CREATE OR REPLACE FUNCTION pick_daily_challenge(p_date DATE, p_count INT DEFAULT 10)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n INT;
BEGIN
  IF p_count < 1 OR p_count > 20 THEN
    RAISE EXCEPTION 'pick_daily_challenge: p_count must be 1 to 20';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('daily_challenge:' || p_date::text));
  INSERT INTO daily_challenges (challenge_date) VALUES (p_date) ON CONFLICT DO NOTHING;
  IF EXISTS (SELECT 1 FROM daily_challenge_questions WHERE challenge_date = p_date) THEN
    RETURN 0;
  END IF;
  INSERT INTO daily_challenge_questions (challenge_date, position, question_id)
  SELECT p_date, (row_number() OVER ())::smallint, r.id
    FROM (SELECT id FROM questions WHERE status = 'verified' ORDER BY random() LIMIT p_count) r;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;
REVOKE ALL ON FUNCTION pick_daily_challenge(DATE, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION pick_daily_challenge(DATE, INT) TO service_role;

CREATE OR REPLACE FUNCTION get_daily_leaderboard(p_date DATE, p_limit INT, p_offset INT DEFAULT 0)
RETURNS TABLE (user_id UUID, display_name TEXT, correct_count INT, duration_seconds INT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.user_id, u.display_name, a.correct_count,
         EXTRACT(EPOCH FROM (a.finished_at - a.started_at))::INT
    FROM daily_attempts a
    JOIN users u ON u.id = a.user_id
   WHERE a.challenge_date = p_date AND a.finished_at IS NOT NULL
   ORDER BY a.correct_count DESC, a.finished_at - a.started_at ASC, a.user_id
   LIMIT LEAST(GREATEST(p_limit, 1), 100)
  OFFSET GREATEST(p_offset, 0);
$$;
GRANT EXECUTE ON FUNCTION get_daily_leaderboard(DATE, INT, INT) TO anon, authenticated;

COMMIT;
```

- [ ] **Step 4: Add `get_daily_leaderboard` to the public list in the guard**

In `supabase/tests/database/90_function_privileges.test.sql`, add `'get_daily_leaderboard'` to the `array[...]`.

- [ ] **Step 5: Run to verify it passes**

Run: `npm run check:db`
Expected: PASS (11 new tests).

- [ ] **Step 6: Commit**

```bash
git add supabase
git commit -m "feat(db): add the daily challenge tables, picker and leaderboard (phase 4)" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

### Task 4.2: Wrappers, shared cron auth, the daily pick job

**Files:**
- Create: `lib/db/daily-challenge.ts`, `lib/services/cron-auth.ts`, `app/api/cron/daily-challenge/route.ts`, `tests/daily-challenge-db.test.ts`, `tests/api/cron/daily-challenge.test.ts`, `tests/services/cron-auth.test.ts`
- Modify: `app/api/cron/system-report/route.ts` (use the shared auth), `vercel.json`

**Interfaces:**
- Consumes: `pick_daily_challenge`, `get_daily_leaderboard` (Task 4.1).
- Produces: `pickDailyChallenge(date: string, count?: number): Promise<number>`, `dailyLeaderboard(date: string, limit: number, offset: number): Promise<unknown[]>`, `isCronAuthorized(req: Request): boolean`, and `GET`/`POST /api/cron/daily-challenge`.

- [ ] **Step 1: Write the failing tests**

Create `tests/services/cron-auth.test.ts`:

```ts
import { describe, it, expect, afterEach } from 'vitest';
import { isCronAuthorized } from '@/lib/services/cron-auth';

const URL_BASE = 'https://quickquiz.app/api/cron/x';
const original = process.env.CRON_SECRET;
afterEach(() => {
  if (original === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = original;
});

describe('isCronAuthorized', () => {
  it('denies everything when CRON_SECRET is not set', () => {
    delete process.env.CRON_SECRET;
    expect(isCronAuthorized(new Request(URL_BASE, { headers: { Authorization: 'Bearer anything' } }))).toBe(false);
  });

  it('accepts the bearer token and the secret query parameter', () => {
    process.env.CRON_SECRET = 's3cret';
    expect(isCronAuthorized(new Request(URL_BASE, { headers: { Authorization: 'Bearer s3cret' } }))).toBe(true);
    expect(isCronAuthorized(new Request(`${URL_BASE}?secret=s3cret`))).toBe(true);
  });

  it('rejects a wrong or missing token', () => {
    process.env.CRON_SECRET = 's3cret';
    expect(isCronAuthorized(new Request(URL_BASE, { headers: { Authorization: 'Bearer nope' } }))).toBe(false);
    expect(isCronAuthorized(new Request(URL_BASE))).toBe(false);
  });
});
```

Create `tests/daily-challenge-db.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db/client', () => ({ admin: vi.fn(), pub: { rpc: vi.fn() } }));

import { admin, pub } from '@/lib/db/client';
import { dailyLeaderboard, pickDailyChallenge } from '@/lib/db/daily-challenge';

beforeEach(() => {
  vi.mocked(admin).mockReset();
  vi.mocked(pub.rpc).mockReset();
});

describe('pickDailyChallenge', () => {
  it('calls pick_daily_challenge with the secret key and returns the number inserted', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: 10, error: null });
    vi.mocked(admin).mockReturnValue({ rpc } as never);
    await expect(pickDailyChallenge('2026-11-20')).resolves.toBe(10);
    expect(rpc).toHaveBeenCalledWith('pick_daily_challenge', { p_date: '2026-11-20', p_count: 10 });
  });

  it('passes a custom count', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: 5, error: null });
    vi.mocked(admin).mockReturnValue({ rpc } as never);
    await pickDailyChallenge('2026-11-20', 5);
    expect(rpc).toHaveBeenCalledWith('pick_daily_challenge', { p_date: '2026-11-20', p_count: 5 });
  });
});

describe('dailyLeaderboard', () => {
  it('reads get_daily_leaderboard with the public key', async () => {
    vi.mocked(pub.rpc).mockResolvedValue({ data: [{ display_name: 'a' }], error: null } as never);
    await expect(dailyLeaderboard('2026-11-20', 50, 0)).resolves.toEqual([{ display_name: 'a' }]);
    expect(pub.rpc).toHaveBeenCalledWith('get_daily_leaderboard', { p_date: '2026-11-20', p_limit: 50, p_offset: 0 });
  });
});
```

Create `tests/api/cron/daily-challenge.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/db/daily-challenge', () => ({ pickDailyChallenge: vi.fn() }));

import { pickDailyChallenge } from '@/lib/db/daily-challenge';
import { GET, POST } from '@/app/api/cron/daily-challenge/route';

const original = process.env.CRON_SECRET;
beforeEach(() => {
  process.env.CRON_SECRET = 's3cret';
  vi.mocked(pickDailyChallenge).mockReset();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-20T00:05:00Z'));
});
afterEach(() => {
  vi.useRealTimers();
  if (original === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = original;
});

const authed = () => new Request('https://quickquiz.app/api/cron/daily-challenge', { headers: { Authorization: 'Bearer s3cret' } });

describe('daily-challenge cron', () => {
  it('rejects an unauthenticated request and picks nothing', async () => {
    const res = await GET(new Request('https://quickquiz.app/api/cron/daily-challenge'));
    expect(res.status).toBe(401);
    expect(pickDailyChallenge).not.toHaveBeenCalled();
  });

  it('picks the challenge for today in UTC', async () => {
    vi.mocked(pickDailyChallenge).mockResolvedValue(10);
    const res = await POST(authed());
    expect(res.status).toBe(200);
    expect(pickDailyChallenge).toHaveBeenCalledWith('2026-11-20');
    expect(await res.json()).toEqual({ success: true, date: '2026-11-20', picked: 10 });
  });

  it('reports a failure without leaking the error', async () => {
    vi.mocked(pickDailyChallenge).mockRejectedValue(new Error('db down'));
    const res = await GET(authed());
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ success: false, error: 'Failed to pick the daily challenge' });
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run tests/services/cron-auth.test.ts tests/daily-challenge-db.test.ts tests/api/cron/daily-challenge.test.ts`
Expected: FAIL (modules do not exist).

- [ ] **Step 3: Write the modules**

Create `lib/services/cron-auth.ts` (the logic moved out of `app/api/cron/system-report/route.ts`):

```ts
// Vercel cron sends `Authorization: Bearer $CRON_SECRET`. With no CRON_SECRET configured every
// request is denied.
export function isCronAuthorized(req: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;

  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    if (authHeader.slice(7).trim() === cronSecret) return true;
  }

  try {
    if (new URL(req.url).searchParams.get('secret') === cronSecret) return true;
  } catch {
    // an unparseable URL is not authorized
  }
  return false;
}
```

Create `lib/db/daily-challenge.ts`:

```ts
import 'server-only';
import { admin, pub } from './client';
import { unwrap } from './errors';

// Daily challenge functions (supabase/migrations/20261013001000_daily_challenge.sql).

// Rows inserted: 0 when the day already has a challenge. Secret key only.
export async function pickDailyChallenge(date: string, count = 10): Promise<number> {
  return unwrap('rpc.pick_daily_challenge', await admin().rpc('pick_daily_challenge', { p_date: date, p_count: count })) ?? 0;
}

export async function dailyLeaderboard(date: string, limit: number, offset: number): Promise<unknown[]> {
  return unwrap('rpc.get_daily_leaderboard', await pub.rpc('get_daily_leaderboard', { p_date: date, p_limit: limit, p_offset: offset })) ?? [];
}
```

Create `app/api/cron/daily-challenge/route.ts`:

```ts
import { pickDailyChallenge } from '@/lib/db/daily-challenge';
import { isCronAuthorized } from '@/lib/services/cron-auth';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

async function handleCron(req: Request) {
  if (!isCronAuthorized(req)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // The challenge date is the UTC date; the database function is idempotent, so a retry is safe.
  const date = new Date().toISOString().slice(0, 10);
  try {
    const picked = await pickDailyChallenge(date);
    return Response.json({ success: true, date, picked });
  } catch (err) {
    logger.error('daily_challenge_cron_failed', { error: err instanceof Error ? err.message : String(err) });
    return Response.json({ success: false, error: 'Failed to pick the daily challenge' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  return handleCron(req);
}

export async function POST(req: Request) {
  return handleCron(req);
}
```

- [ ] **Step 4: Point the existing cron route at the shared auth**

In `app/api/cron/system-report/route.ts`, delete the local `isAuthorized` function (the block from `function isAuthorized(req: Request): boolean {` through its closing `}`), add `import { isCronAuthorized } from '@/lib/services/cron-auth';` to the imports and change `if (!isAuthorized(req)) {` to `if (!isCronAuthorized(req)) {`.

- [ ] **Step 5: Schedule it**

In `vercel.json`, change `crons` to:

```json
  "crons": [
    {
      "path": "/api/cron/system-report",
      "schedule": "0 0 * * *"
    },
    {
      "path": "/api/cron/daily-challenge",
      "schedule": "5 0 * * *"
    }
  ]
```

- [ ] **Step 6: Run to verify they pass**

Run: `npx vitest run tests/services/cron-auth.test.ts tests/daily-challenge-db.test.ts tests/api/cron && npm run check:task`
Expected: PASS (the existing `system-report` cron tests still pass through the shared helper).

- [ ] **Step 7: Commit**

```bash
git add lib app tests vercel.json
git commit -m "feat(daily): add daily challenge wrappers and a cron job that picks the day's questions" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

### Task 4.3: [OWNER] Ship Phase 4

- [ ] **Step 1:** PR to `preview` with Tasks 4.1 and 4.2, CI green, merge.
- [ ] **Step 2:** `db push` to the branch, then production; fill in the ledger. The migration is additive.
- [ ] **Step 3:** Promote `preview` to `main`. Vercel registers the new cron. Check: after 00:05 UTC, `select * from daily_challenge_questions order by challenge_date desc, position limit 10;` has ten rows for today.

---

# Phase 5: achievements

### Task 5.1: Migration: achievements, unlocks and `award_achievements`

**Files:**
- Create: `supabase/migrations/20261013001100_achievements.sql`, `supabase/tests/database/50_achievements.test.sql`

**Interfaces:**
- Consumes: `user_stats` (Task 2.1), `daily_attempts` (Task 4.1).
- Produces: tables `achievements(slug, metric, threshold, name, description, sort_order, active)` and `user_achievements(user_id, achievement, unlocked_at)`; `award_achievements(p_user UUID) RETURNS SETOF TEXT` (service only) returning only the newly unlocked slugs; six seed achievements; a silent backfill for existing players.

- [ ] **Step 1: Write the failing test**

Create `supabase/tests/database/50_achievements.test.sql`:

```sql
begin;
select plan(8);

insert into topics (slug) values ('general') on conflict (slug) do nothing;
insert into users (id, display_name) values ('00000000-0000-4000-8000-0000000000a1', 'ach-a');
insert into questions (id, prompt, options, correct_index, topic_id)
select ('00000000-0000-4000-8000-0000000001' || lpad(g::text, 2, '0'))::uuid, 'achievement question ' || g, '["a","b"]'::jsonb, 0,
       (select id from topics where slug = 'general')
  from generate_series(1, 5) g;

select is((select count(*)::int from achievements), 6, 'the six seed achievements exist');
select is_empty($$ select award_achievements('00000000-0000-4000-8000-0000000000a1') $$, 'a player with no answers unlocks nothing');

-- One correct answer unlocks first_answer.
insert into quiz_results (user_id, question_id, answer_index, is_correct, answered_at)
values ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-000000000101', 0, true, now() + interval '1 second');
select results_eq($$ select award_achievements('00000000-0000-4000-8000-0000000000a1') $$, $$ values ('first_answer'::text) $$, 'the first answer unlocks first_answer');
select is_empty($$ select award_achievements('00000000-0000-4000-8000-0000000000a1') $$, 'calling again returns no new unlocks');

-- Four more correct answers reach a best streak of 5.
insert into quiz_results (user_id, question_id, answer_index, is_correct, answered_at)
select '00000000-0000-4000-8000-0000000000a1'::uuid, ('00000000-0000-4000-8000-0000000001' || lpad(g::text, 2, '0'))::uuid, 0, true, now() + (g || ' seconds')::interval
  from generate_series(2, 5) g;
select results_eq($$ select award_achievements('00000000-0000-4000-8000-0000000000a1') $$, $$ values ('streak_5'::text) $$, 'a streak of 5 unlocks streak_5 only');
select is((select count(*)::int from user_achievements where user_id = '00000000-0000-4000-8000-0000000000a1'), 2, 'two unlocks are stored');

-- A finished daily attempt unlocks first_daily.
insert into daily_challenges (challenge_date) values ('2026-12-01');
insert into daily_attempts (user_id, challenge_date, finished_at) values ('00000000-0000-4000-8000-0000000000a1', '2026-12-01', now());
select results_eq($$ select award_achievements('00000000-0000-4000-8000-0000000000a1') $$, $$ values ('first_daily'::text) $$, 'a finished daily unlocks first_daily');

select is(has_function_privilege('anon', 'award_achievements(uuid)', 'execute'), false, 'only the server awards achievements');

select * from finish();
rollback;
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx supabase test db`
Expected: FAIL (`achievements` does not exist).

- [ ] **Step 3: Write the migration**

Create `supabase/migrations/20261013001100_achievements.sql`:

```sql
-- Phase 5 (spec section 9). Achievements are rows (metric + threshold), unlocked by a function the
-- app calls after an answer or a finished daily attempt. A function, not a trigger, because the
-- request needs the newly unlocked slugs back. Idempotent and race-safe through the primary key.
-- Names and descriptions are English only for now (D7); mirror topic_translations when a second
-- language is real.
BEGIN;

CREATE TABLE IF NOT EXISTS achievements (
  slug        TEXT PRIMARY KEY CHECK (slug ~ '^[a-z0-9_]+$'),
  metric      TEXT NOT NULL CHECK (metric IN ('total_answered', 'correct_count', 'best_streak', 'daily_completed')),
  threshold   INT  NOT NULL CHECK (threshold > 0),
  name        TEXT NOT NULL,
  description TEXT NOT NULL,
  sort_order  INT  NOT NULL DEFAULT 0,
  active      BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS user_achievements (
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement TEXT NOT NULL REFERENCES achievements(slug) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, achievement)
);
CREATE INDEX IF NOT EXISTS user_achievements_user ON user_achievements (user_id, unlocked_at DESC);

ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read for achievements" ON achievements;
CREATE POLICY "Allow public read for achievements" ON achievements FOR SELECT USING (true);
REVOKE ALL ON achievements, user_achievements FROM anon, authenticated;
GRANT SELECT ON achievements TO anon, authenticated;

INSERT INTO achievements (slug, metric, threshold, name, description, sort_order) VALUES
  ('first_answer',    'total_answered',  1,   'First answer',     'Answer your first question.',        10),
  ('ten_correct',     'correct_count',   10,  'Ten right',        'Get 10 questions right.',            20),
  ('hundred_correct', 'correct_count',   100, 'Hundred right',    'Get 100 questions right.',           30),
  ('streak_5',        'best_streak',     5,   'On a roll',        'Answer 5 in a row correctly.',       40),
  ('streak_10',       'best_streak',     10,  'Unstoppable',      'Answer 10 in a row correctly.',      50),
  ('first_daily',     'daily_completed', 1,   'Daily challenger', 'Finish your first daily challenge.',  60)
ON CONFLICT (slug) DO NOTHING;

-- Returns only the achievements unlocked by THIS call.
CREATE OR REPLACE FUNCTION award_achievements(p_user UUID)
RETURNS SETOF TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s       user_stats%ROWTYPE;
  v_daily INT;
BEGIN
  SELECT * INTO s FROM user_stats WHERE user_id = p_user;
  SELECT count(*)::INT INTO v_daily FROM daily_attempts WHERE user_id = p_user AND finished_at IS NOT NULL;

  RETURN QUERY
  WITH ins AS (
    INSERT INTO user_achievements (user_id, achievement)
    SELECT p_user, a.slug
      FROM achievements a
     WHERE a.active
       AND a.threshold <= CASE a.metric
             WHEN 'total_answered'  THEN COALESCE(s.total_answered, 0)
             WHEN 'correct_count'   THEN COALESCE(s.correct_count, 0)
             WHEN 'best_streak'     THEN COALESCE(s.best_streak, 0)
             WHEN 'daily_completed' THEN v_daily
           END
    ON CONFLICT DO NOTHING
    RETURNING achievement
  )
  SELECT achievement FROM ins;
END;
$$;
REVOKE ALL ON FUNCTION award_achievements(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION award_achievements(UUID) TO service_role;

-- Existing players get what they already earned, silently: the app shows an unlock only for slugs
-- returned by calls after the release.
SELECT count(*) FROM users u, LATERAL award_achievements(u.id);

COMMIT;
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm run check:db`
Expected: PASS (8 new tests, guard still green: `award_achievements` is server-only).

- [ ] **Step 5: Commit**

```bash
git add supabase
git commit -m "feat(db): add achievements and award_achievements (phase 5)" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

### Task 5.2: Wrapper and the call after a recorded answer

**Files:**
- Create: `lib/db/achievements.ts`, `tests/achievements-db.test.ts`, `tests/submit-answer-achievements.test.ts`
- Modify: `lib/actions/quiz-actions.ts`

**Interfaces:**
- Consumes: `award_achievements` (Task 5.1).
- Produces: `awardAchievements(accountId: string): Promise<string[]>` (newly unlocked slugs). `submitAnswer` calls it after a `recorded` outcome; a failure is logged and never changes the answer result. No response-shape change (an unlock toast is a separate feature).

- [ ] **Step 1: Write the failing tests**

Create `tests/achievements-db.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db/client', () => ({ admin: vi.fn(), pub: {} }));

import { admin } from '@/lib/db/client';
import { awardAchievements } from '@/lib/db/achievements';

const ACCOUNT = '00000000-0000-4000-8000-0000000000a1';
beforeEach(() => vi.mocked(admin).mockReset());

describe('awardAchievements', () => {
  it('returns the slugs unlocked by this call', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: ['first_answer', 'streak_5'], error: null });
    vi.mocked(admin).mockReturnValue({ rpc } as never);
    await expect(awardAchievements(ACCOUNT)).resolves.toEqual(['first_answer', 'streak_5']);
    expect(rpc).toHaveBeenCalledWith('award_achievements', { p_user: ACCOUNT });
  });

  it('returns an empty list when nothing unlocked', async () => {
    vi.mocked(admin).mockReturnValue({ rpc: vi.fn().mockResolvedValue({ data: null, error: null }) } as never);
    await expect(awardAchievements(ACCOUNT)).resolves.toEqual([]);
  });
});
```

Create `tests/submit-answer-achievements.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db/questions', () => ({ questionForAnswer: vi.fn() }));
vi.mock('@/lib/db/results', () => ({ insertResult: vi.fn() }));
vi.mock('@/lib/db/achievements', () => ({ awardAchievements: vi.fn() }));
vi.mock('@/lib/services/session', () => ({ getSessionAccount: vi.fn() }));
vi.mock('@/lib/services/rate-limit', () => ({ allowAttemptFromIp: vi.fn() }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));

import { questionForAnswer } from '@/lib/db/questions';
import { insertResult } from '@/lib/db/results';
import { awardAchievements } from '@/lib/db/achievements';
import { getSessionAccount } from '@/lib/services/session';
import { allowAttemptFromIp } from '@/lib/services/rate-limit';
import { logger } from '@/lib/logger';
import { submitAnswer } from '@/lib/actions/quiz-actions';

const Q_ID = '00000000-0000-4000-8000-0000000000d1';
const ACCOUNT = { id: '00000000-0000-4000-8000-0000000000a1' };

beforeEach(() => {
  vi.mocked(questionForAnswer).mockReset().mockResolvedValue({ id: Q_ID, status: 'verified', correct_index: 1, explanation: null, created_by_user: null } as never);
  vi.mocked(insertResult).mockReset();
  vi.mocked(awardAchievements).mockReset().mockResolvedValue([]);
  vi.mocked(getSessionAccount).mockReset().mockResolvedValue(ACCOUNT as never);
  vi.mocked(allowAttemptFromIp).mockReset().mockResolvedValue(true as never);
  vi.mocked(logger.error).mockReset();
});

describe('submitAnswer awards achievements', () => {
  it('awards after a recorded answer', async () => {
    vi.mocked(insertResult).mockResolvedValue('recorded');
    const res = await submitAnswer({ questionId: Q_ID, answerIndex: 1 });
    expect(res.recorded).toBe(true);
    expect(awardAchievements).toHaveBeenCalledWith(ACCOUNT.id);
  });

  it('does not award for a duplicate answer', async () => {
    vi.mocked(insertResult).mockResolvedValue('duplicate');
    await submitAnswer({ questionId: Q_ID, answerIndex: 1 });
    expect(awardAchievements).not.toHaveBeenCalled();
  });

  it('keeps the recorded result when awarding fails', async () => {
    vi.mocked(insertResult).mockResolvedValue('recorded');
    vi.mocked(awardAchievements).mockRejectedValue(new Error('db down'));
    const res = await submitAnswer({ questionId: Q_ID, answerIndex: 1 });
    expect(res).toMatchObject({ recorded: true, isCorrect: true });
    expect(logger.error).toHaveBeenCalled();
  });
});
```

The mocks match the guards `submitAnswer` runs before it grades (uuid check, `allowAttemptFromIp`, `questionForAnswer` returning a `verified` row, then `getSessionAccount`); the question is not the account's own because `created_by_user` is `null`.

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run tests/achievements-db.test.ts tests/submit-answer-achievements.test.ts`
Expected: FAIL (module `lib/db/achievements` does not exist).

- [ ] **Step 3: Write the wrapper**

Create `lib/db/achievements.ts`:

```ts
import 'server-only';
import { admin } from './client';
import { unwrap } from './errors';

// supabase/migrations/20261013001100_achievements.sql. Secret key only.

// Slugs unlocked by this call (none when nothing new).
export async function awardAchievements(accountId: string): Promise<string[]> {
  return unwrap('rpc.award_achievements', await admin().rpc('award_achievements', { p_user: accountId })) ?? [];
}
```

- [ ] **Step 4: Call it after a recorded answer**

In `lib/actions/quiz-actions.ts`, add `import { awardAchievements } from '@/lib/db/achievements';` and replace

```ts
      return outcome === 'recorded'
        ? { ...revealed, recorded: true }
        : { ...revealed, recorded: false, notSavedReason: 'already-answered' };
```

with

```ts
      if (outcome !== 'recorded') return { ...revealed, recorded: false, notSavedReason: 'already-answered' };
      // The answer is saved either way; a failed award is logged and never changes the result.
      await awardAchievements(account.id).catch((err) =>
        logger.error('award_achievements_failed', err, { userId: account.id })
      );
      return { ...revealed, recorded: true };
```

- [ ] **Step 5: Run to verify, then the gates**

Run: `npx vitest run tests/achievements-db.test.ts tests/submit-answer-achievements.test.ts tests/answer-guards.test.ts tests/submit-answer-no-admin.test.ts`
If `answer-guards` or `submit-answer-no-admin` now fail because they reach the real `awardAchievements`, add `vi.mock('@/lib/db/achievements', () => ({ awardAchievements: vi.fn().mockResolvedValue([]) }));` next to their other `vi.mock` calls. Then `npm run check:task`.
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib tests
git commit -m "feat(achievements): award achievements after a recorded answer" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

### Task 5.3: [OWNER] Ship Phase 5 and close out

- [ ] **Step 1:** PR to `preview` with Tasks 5.1 and 5.2, CI green, merge. The migration (Task 5.1) must reach production **before** the code (Task 5.2), because the code calls `award_achievements` on every recorded answer. Order: `db push` to the branch, then production, then promote the code to `main`. If the order is reversed the call fails, is logged, and answers still record.
- [ ] **Step 2:** Spot check: `select * from user_achievements limit 10;` shows the silent backfill; answer one question in the app and confirm `award_achievements_failed` does not appear in the logs.
- [ ] **Step 3:** Fill in the ledger. Update `docs/migrations.md` Ledger with every migration from this plan and its production date.
- [ ] **Step 4:** Delete the local `tasks/db-audit/` scratch directory once the owner no longer needs the dumps.

---

# Self-review against the spec

Coverage, spec section to task:

| Spec | Covered by |
|---|---|
| 1 Goal and constraints | Global Constraints; expand/contract ordering in 1.3, 1.4, 3.3, 3.4, 5.3 |
| 2 Findings F1, F2, F3 | 1.1 (functions and retire), 1.4 (drop order, guard) |
| F4 | 2.1, 2.2 |
| F5 | 2.4 |
| F6 | 2.3 |
| F7 | 0.2 (audit), 0.5 (guard), 2.5 (fix and permanent list) |
| F8 | 1.1 (sponsors) |
| F9 | 1.4 Step 1 |
| F10 | dropped from scope (no task) |
| 3 Decisions D1 to D7 | D1 Phase 4; D2 1.1; D3 0.2 to 0.4; D4 Global Constraints and 0.7; D5 3.1 and 3.3; D6 0.1; D7 5.1 |
| 4 Phase 0 | 0.1 to 0.8 (steps 1 to 10 of the spec map to 0.2, 0.3, 0.4, 0.8, 0.6, 0.7) |
| 5 Phase 1 | 1.1 to 1.4 |
| 6 Phase 2 (2a to 2d) | 2.1, 2.2 (2a); 2.3, 2.4 (2b); 2.3 (2c); 2.5 (2d); 2.6 ship |
| 7 Phase 3 | 3.1 (3a), 3.2 (3b), 3.4 (3c), 3.3 ship |
| 8 Phase 4 | 4.1, 4.2, 4.3 |
| 9 Phase 5 | 5.1, 5.2, 5.3 |
| 10 Cross-cutting (gate, release flow, risks) | Global Constraints; each task's run steps and owner tasks |

Deviations from the spec, all deliberate and listed here so the owner sees them:

1. `slugify_topic` uses `unaccent` and a hash fallback (Phase 3 intro). The spec said "lowercase, non-alphanumerics to -", which merges distinct non-English names.
2. A `resolve_topic(TEXT)` public function was added (Task 3.1). The category filters in the app need to turn a name into a topic id with the public key, and the spec had no function for that.
3. The reconcile gate for `user_stats` is inside the readers migration (Task 2.2) rather than a separate manual query, so `db push` cannot apply the swap past a mismatch.
4. `check:db` lint level falls back to `error` if `warning` is not clean on the baseline (Task 0.6); the warning list becomes tracked debt.
5. `search_questions` gains a fourth parameter `p_locale` with a default, and the 3-argument version is dropped first so a 3-argument call is not ambiguous (Task 3.1).
6. `award_achievements` is awaited in `submitAnswer` rather than fire-and-forget (Task 5.2), because an un-awaited promise can be cut off when a serverless function returns.

Interfaces were checked for consistency across tasks: `rebuild_user_stats(UUID)` (2.1) is the function named in 2.2's failure message and 2.6; `quarantineQuestion(questionId)` (2.4) is what `question-actions.ts` imports; `getOrCreateTopicId` and `resolveTopicId` (3.2) call `get_or_create_topic` and `resolve_topic` (3.1) with parameter `p_name`; `pickDailyChallenge(date, count)` (4.2) calls `pick_daily_challenge(p_date, p_count)` (4.1); `awardAchievements(accountId)` (5.2) calls `award_achievements(p_user)` (5.1); the callable-by-public-key list in `90_function_privileges.test.sql` grows in 3.1 (`resolve_topic`) and 4.1 (`get_daily_leaderboard`) and matches the `GRANT EXECUTE ... TO anon` statements in those migrations.
