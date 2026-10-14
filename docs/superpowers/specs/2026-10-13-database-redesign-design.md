# Database redesign and migration pipeline: design

Date: 2026-10-13. Status: draft for owner review. Author: Claude, with @alexheiz.

## 1. Goal and constraints

Replace the hand-applied, topic-named SQL files with a CLI-managed migration pipeline, remove the schema that web2-only left dead, fix the weak spots in the data model, and add the tables for topics, a daily challenge, persisted stats and achievements.

Constraints that shape every choice:

- **Production has real players.** No wipe, no rebuild. Every change is in place and expand/contract.
- **Forward-fix only.** No down scripts (`docs/migrations.md`). A bad migration is corrected by a new one.
- **Branch first.** Each migration is applied to a Supabase branch, then production, with the date written in the ledger.
- **Release flow.** Changes reach `preview` through a PR, all CI green, and only then `main` (`CONSTRAINTS.md`). Production migrations are applied by the owner, not by CI.
- **Code that stops using a thing ships before the migration that removes it.** Code that needs a new thing ships after the migration that adds it.
- **The public API shape does not break.** The mobile app and `@heizdoobert/quickquiz-sdk` 0.3.0 read JSON from `/api/v1/*`. New fields are additive; existing fields keep their names and types.
- **Floor rules apply:** no suppression comments, no skipped tests, no secrets, changed lines at least 80% covered.

## 2. What is there today

Replayed all 23 scripts on a throwaway Postgres 16 and dumped the result: 15 tables, 11 functions, 1 view (`client_questions`). Findings that drive the design:

| # | Finding | Consequence |
|---|---|---|
| F1 | `question_lists`, `list_entries`, `question_list_confirmations`, `questions.list_id` and `get_contest_analytics` are dead after ADR-013. No `app/`, `lib/`, `sdk/` or `mobile/` code reads the tables. | Phase 1. |
| F2 | `get_topics()` and `search_questions()` still filter `list_id IS NULL`. Dropping the column without rewriting them breaks both. Contest questions (`list_id` set) are hidden only by that filter. | Rewrite the functions and retire those questions before the drop. |
| F3 | `questions.list_id` is `ON DELETE CASCADE` to `question_lists`. Deleting a list row deletes its questions and their answers. | Drop the column before the tables. Never `DELETE FROM question_lists`. |
| F4 | `get_user_stats`, `get_global_leaderboard` and `get_group_leaderboard` scan and aggregate all of `quiz_results` on every call. | Phase 2 `user_stats` rollup. |
| F5 | `questions.dispute_count` is a counter the app sets after a count-then-write (`lib/db/questions.ts` `setDisputeState`). Two concurrent reports can miss the quarantine threshold. | Phase 2: trigger-maintained. |
| F6 | No `CHECK` ties `correct_index` to `options`, no `answer_index` range, no length limits on `prompt`, `reason` or group `name`. | Phase 2 constraints. |
| F7 | `increment_ai_generation` and `get_question_analytics` are `SECURITY DEFINER` with no `SET search_path` and no `REVOKE`. If prod keeps Supabase's default `EXECUTE` to `PUBLIC`, the public key can call them with any user id. **Unverified: needs the prod ACL query in section 4.** | Phase 0 audit, fix in Phase 2. |
| F8 | `sponsors` is live (`lib/db/sponsors.ts`), but its seed rows are placeholder "Web3" entries pointing at `example.com`. | Phase 1 deactivates them. |
| F9 | `client_questions` view: no code reads it. | Drop in Phase 1 after a grep of `packages/` and `mobile/`. |
| F10 | The earlier idea of purging `auth_attempts` is unnecessary: `rate_limit_hit` already deletes rows older than one day on each call. | Dropped from scope. |

Not wrong, left alone: the account model (`users.id` with `auth_user_id`), RBAC (`users.role`), `remote_config`, `user_ai_usage`, comments, ratings, groups.

## 3. Decisions

| ID | Decision | Why |
|---|---|---|
| D1 | The daily challenge keeps its own answer table. `quiz_results` stays the lifetime ledger (first answer to a question counts) and is the only source of `user_stats`. | `quiz_results` is unique on `(user_id, question_id)`. A daily question the player already answered could not be recorded there. Separate tables avoid changing the anti-farming rule. Daily score is separate from lifetime score. |
| D2 | Contest questions are retired (`status = 'rejected'`), not deleted. | Deleting cascades into `quiz_results` and would change players' scores. |
| D3 | The baseline is taken from production (`supabase db dump`), checked against the replay of the old scripts. | Production was rebuilt from scripts 1 to 23, then may have been touched by hand. Production is the truth the CLI must match. |
| D4 | Production migrations stay a manual `supabase db push` by the owner after preview is green. No automatic prod push. | Hard to reverse and outward-facing. Revisit when a second person applies them. |
| D5 | Existing topic names are stored as locale `en`. | An assumption. If categories are in another language, change the one constant in the backfill. |
| D6 | The `supabase` CLI is added as a pinned devDependency. | CI and every contributor get the same version. This is a new dependency. |
| D7 | Achievement names and descriptions are English only (no translation table yet). | A second language is not real yet. Mirror `topic_translations` when it is. |

## 4. Phase 0: baseline and pipeline

**Outcome:** `supabase db push` and `supabase test db` are the only ways the schema changes. Production DDL does not change in this phase.

### Layout

```
supabase/
  config.toml                         # supabase init
  migrations/
    20261013000000_baseline.sql       # the only file at first
  tests/database/*.sql                # pgTAP
  legacy/
    migrations/*.sql                  # the 24 old files, git mv, never applied again
    tests/*                           # old accounts and drop-web3 test fixtures
```

`supabase/legacy/` keeps history. A header comment in `legacy/README.md` says the files are not run by anything.

### Steps

1. **Drift audit on production**, run in the SQL editor, read-only:
   - the schema dump: `supabase db dump --linked --schema public > prod-schema.sql` (scratch, not committed);
   - ACLs: `SELECT p.proname, p.proacl FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public';` (settles F7);
   - tables without RLS: `SELECT relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity;`
   - row counts for every table (used again in Phase 1).
2. **Replay dump:** apply the old scripts in the documented order to a clean local Postgres and dump with privileges (`pg_dump --schema-only`, without `--no-privileges`, because the column-level `GRANT SELECT` on `questions` is what hides `correct_index`).
3. **Diff** the two dumps. Every difference is either a prod hand-edit to adopt or a stub artifact (the test setup stubs roles) to ignore. Write the explanation next to each in the PR.
4. **Write the baseline** as the production dump, cleaned: no `OWNER TO`, no Supabase-managed schemas, `CREATE ... IF NOT EXISTS` where the CLI allows, grants and column grants kept, RLS policies kept.
5. **Prove the baseline:** `supabase db reset` on a local stack, then dump and diff against the production dump. Empty diff required.
6. **Supabase branch:** create a branch, run `supabase db push`, diff its dump against production. Empty diff required.
7. **Production:** `supabase migration repair --status applied 20261013000000 --linked`. Then `supabase migration list --linked` must show local and remote in sync. Nothing else runs on production.
8. **CI:** add a `db` job to `.github/workflows/ci.yml`: `supabase start`, `supabase db reset`, `supabase test db`, `supabase db lint --level warning`. `scripts/verify-migrations.sh` and its fixed script list are removed after the job is green.
9. **Docs:** rewrite `docs/migrations.md` (naming via `supabase migration new`, expand/contract rules, ledger by timestamp), the README "Database Setup" section, and add ADR-015 recording D3, D4 and the switch away from topic-named files. Replace the "applied by hand" decision in `docs/migrations.md`, which says to revisit when the CLI is wanted.
10. **Constraint:** add a row to `CONSTRAINTS.md` for the database (replay is clean, pgTAP passes, checked by `npm run check:db`, runs in CI). This strengthens the file; it does not weaken anything. `check:db` wraps the same commands as the CI job.

### Rollback

The only production change is one row in the migration history table. Undo with `supabase migration repair --status reverted 20261013000000 --linked`. Local files are plain git.

### Tests

pgTAP baseline checks: every public table has RLS on; `anon` cannot `SELECT` `questions.correct_index` or `users.role`; every `SECURITY DEFINER` function has a pinned `search_path`. These become the permanent guard for F7.

## 5. Phase 1: drop the dead contest schema

**Outcome:** no contest objects remain, and no live question disappears or becomes visible by accident.

### Migration 1a (expand, safe while old code runs)

- `CREATE OR REPLACE` `get_topics()` and `search_questions()` without the `list_id` predicate.
- `UPDATE questions SET status = 'rejected' WHERE list_id IS NOT NULL AND status <> 'rejected'` (D2). Must run in the same migration as the function rewrite, so a contest question is never visible in between.
- Deactivate placeholder sponsors: `UPDATE sponsors SET active = false WHERE url LIKE 'https://example.com/%'` (F8).

### Code release between 1a and 1b

Remove `list_id` from `lib/actions/question-actions.ts`, `lib/actions/community-actions.ts`, `lib/actions/discovery-actions.ts`, `lib/db/community.ts`, `lib/db/questions.ts` and their tests (`tests/community.test.ts`, `tests/moderation-routes.test.ts`, `tests/trivia-guest-access.test.tsx`). This ships to `preview`, then `main`, and runs in production before 1b.

### Migration 1b (contract)

Preconditions the owner checks first: backup or point-in-time recovery confirmed; `SELECT count(*) FROM questions WHERE list_id IS NOT NULL AND status <> 'rejected'` is 0; the three tables dumped with `pg_dump -t` and kept outside the repo.

In this order, because of F3:

```sql
DROP FUNCTION IF EXISTS get_contest_analytics(UUID);
REVOKE SELECT (list_id) ON questions FROM anon, authenticated;
DROP INDEX IF EXISTS idx_questions_list_id;
ALTER TABLE questions DROP COLUMN IF EXISTS list_id;     -- before the tables, never cascade-delete questions
DROP TABLE IF EXISTS question_list_confirmations;
DROP TABLE IF EXISTS list_entries;
DROP TABLE IF EXISTS question_lists;
DROP VIEW IF EXISTS client_questions;                    -- only if the grep of packages/ and mobile/ found no reader
```

### Rollback

Restore the three tables from the `pg_dump -t` file and re-add `list_id`. The data is dead, so the realistic recovery is a point-in-time restore, not a script.

### Tests

pgTAP: the objects are gone; row count of `questions` is unchanged by 1b; `get_topics()` and `search_questions()` still return only `verified` rows.

## 6. Phase 2: integrity, performance, persisted stats

### 2a. `user_stats` rollup

```sql
CREATE TABLE user_stats (
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
CREATE INDEX user_stats_rank ON user_stats (correct_count DESC, accuracy DESC, user_id);
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;       -- no policies: server and definer functions only
```

`accuracy` uses the same `floor(x + 0.5)` on `float8` as today's functions, so it matches JavaScript `Math.round` bit for bit. Score stays equal to `correct_count`.

Trigger, `SECURITY DEFINER`, `SET search_path = public`:

```sql
CREATE FUNCTION apply_quiz_result() RETURNS trigger ... AS $$
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
END $$;
CREATE TRIGGER quiz_results_apply AFTER INSERT ON quiz_results FOR EACH ROW EXECUTE FUNCTION apply_quiz_result();
```

Why this is correct:

- **Ordering.** The app never supplies `answered_at` (grep: reads only), so it defaults to `now()` and insertion order equals time order. That is the order the old `get_user_stats` window function uses, so the streak definition is unchanged: consecutive correct answers ending at the latest answer.
- **Concurrency.** `ON CONFLICT DO UPDATE` takes the row lock, so two simultaneous answers for one player apply one after the other.
- **Backfill and repair share one function.** `rebuild_user_stats(p_user UUID DEFAULT NULL)` recomputes from `quiz_results` with the same window logic as the old function, `service_role` only. It is used for the backfill and for repair after any delete. No code deletes questions today (moderation retires them), so cascades do not drift the table in practice.
- **Backfill without losing a write.** The backfill runs in one transaction that first takes `LOCK TABLE quiz_results IN SHARE ROW EXCLUSIVE MODE` (blocks inserts for a moment, reads continue), after the trigger exists. Otherwise a trigger update that lands before the rebuild's upsert could be overwritten.
- **Proof before the swap.** Before replacing the functions, run a reconcile query: for every user, the old `get_user_stats` result equals the `user_stats` row. Zero mismatches is the gate.

Then swap the readers, keeping signatures and return columns so no app code changes:

- `get_user_stats(UUID)` reads `user_stats` (zeros when no row).
- `get_global_leaderboard(INT, INT)` reads `user_stats JOIN users`, ordered by the `user_stats_rank` index.
- `get_group_leaderboard(UUID, INT, INT)` is `group_members LEFT JOIN user_stats`, so members with no answers still appear with 0 and 0.

### 2b. Integrity

Added as `NOT VALID`, then `VALIDATE CONSTRAINT`, after a preflight query that must return zero offending rows (if not, fix or retire those rows first, in the same PR):

- `questions`: `CHECK (jsonb_typeof(options) = 'array' AND jsonb_array_length(options) BETWEEN 2 AND 4 AND correct_index < jsonb_array_length(options))`.
- `quiz_results`: `CHECK (answer_index BETWEEN 0 AND 3)`.
- Length limits on `questions.prompt`, `question_disputes.reason`, `groups.name`, `groups.description`: **taken from the app's validators**, not invented here. The plan reads them first.
- `question_disputes` already has the resolution checks (21-rbac). Unchanged.

`dispute_count` becomes derived (F5): a trigger on `question_disputes` (`AFTER INSERT OR DELETE OR UPDATE OF resolved_at`) sets `questions.dispute_count` to the count of rows with `resolved_at IS NULL` for the affected question. The quarantine decision stays in the app (`QUARANTINE_AT = 3`); `setDisputeState` shrinks to the status change only. One behavior change: a *retired* question now shows 0 open disputes (all resolved) instead of keeping its old count. The admin quarantine list shows only quarantined questions, so no visible effect.

### 2c. Indexes

- `quiz_results (user_id, answered_at DESC)`: the history query in `lib/db/results.ts` orders this way. The existing unique index leads with `(user_id, question_id)`.
- `questions (status, created_at DESC)`.
- `groups (owner_user)`: unindexed foreign key.

### 2d. Privilege fixes (settles F7)

For each `SECURITY DEFINER` function the prod ACL query shows as callable by the public key and not meant to be: add `SET search_path = public`, `REVOKE ALL ... FROM PUBLIC, anon, authenticated`, `GRANT EXECUTE ... TO service_role`. Candidates: `increment_ai_generation`, `get_question_analytics`. Before revoking, check each caller: if the app calls it with the public client, switch that call to the admin client in the same release. The pgTAP guard from Phase 0 then fails on any future function that skips this.

### Rollback

Each part is additive or a `CREATE OR REPLACE`. To revert the readers, re-run the previous function bodies from the baseline. `user_stats` can stay unused. Constraints are dropped by name.

## 7. Phase 3: topics with translated names

```sql
CREATE TABLE topics (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug       TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE topic_translations (
  topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  locale   TEXT NOT NULL CHECK (locale ~ '^[a-z]{2}(-[A-Z]{2})?$'),
  name     TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  PRIMARY KEY (topic_id, locale)
);
CREATE INDEX topic_translations_name_trgm ON topic_translations USING GIN (lower(name) gin_trgm_ops);
ALTER TABLE questions ADD COLUMN topic_id UUID REFERENCES topics(id);
CREATE INDEX questions_topic ON questions (topic_id, created_at DESC);
```

`topics` and `topic_translations` have RLS on with a public `SELECT` policy and no write policies (server only).

### Three steps (expand, switch, contract)

- **3a: migration.** Create the tables and column. Backfill: group `questions.category` by its slug (lowercase, non-alphanumerics to `-`, trimmed; an empty slug becomes `general`), grouping by slug rather than by `lower(trim(category))` so two spellings that slugify the same do not collide. The translation name is the most recent spelling in the group, the same rule `get_topics()` uses today. A `BEFORE INSERT OR UPDATE OF category` trigger on `questions` fills `topic_id` from `category` through `get_or_create_topic(p_name TEXT)` (`INSERT ... ON CONFLICT (slug) DO NOTHING`, race-safe). Old app code that still writes only `category` keeps working while the code release rolls out.
- **3b: code release.** Reads use `topic_id` and the slug. `get_topics(p_locale TEXT DEFAULT 'en')` returns `slug, name, question_count, latest_at`, falling back to `en` when the locale has no row. `search_questions` also matches topic names. The API keeps the `name` field and adds `slug`, so the mobile app and SDK 0.3.0 keep working.
- **3c: migration (contract).** Preflight: zero rows with `topic_id IS NULL`. Then `topic_id SET NOT NULL`, drop the trigger, drop `category` and its trigram index, remove `category` from the column grants. Question creation (user and AI generation) calls `get_or_create_topic` from the server.

### Rollback

3a and 3b are reversible by ignoring the new objects (the trigger keeps `category` authoritative). 3c is the one-way step; it needs the preflight and a backup, and `category` is restorable from the translation `en` name if it must be.

## 8. Phase 4: daily challenge

Decision D1: separate from lifetime scoring.

```sql
CREATE TABLE daily_challenges (
  challenge_date DATE PRIMARY KEY,                        -- UTC date; the app computes it in UTC
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE daily_challenge_questions (
  challenge_date DATE NOT NULL REFERENCES daily_challenges(challenge_date) ON DELETE CASCADE,
  position       SMALLINT NOT NULL CHECK (position BETWEEN 1 AND 20),
  question_id    UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  PRIMARY KEY (challenge_date, position),
  UNIQUE (challenge_date, question_id)
);
CREATE TABLE daily_attempts (
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
CREATE TABLE daily_attempt_answers (
  attempt_id     UUID NOT NULL,
  challenge_date DATE NOT NULL,
  question_id    UUID NOT NULL,
  answer_index   INT  NOT NULL CHECK (answer_index BETWEEN 0 AND 3),
  is_correct     BOOLEAN NOT NULL,
  answered_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (attempt_id, question_id),
  FOREIGN KEY (attempt_id, challenge_date)    REFERENCES daily_attempts (id, challenge_date) ON DELETE CASCADE,
  FOREIGN KEY (challenge_date, question_id)   REFERENCES daily_challenge_questions (challenge_date, question_id)
);
CREATE INDEX daily_attempts_rank ON daily_attempts (challenge_date, correct_count DESC, finished_at);
```

The two composite foreign keys make the database refuse an answer to a question that is not part of that day's challenge, or an answer attached to another day's attempt. No trigger is needed for that rule.

Functions (all `SECURITY DEFINER`, pinned `search_path`):

- `pick_daily_challenge(p_date DATE, p_count INT DEFAULT 10)`: picks `p_count` random `verified` questions, inserts with `ON CONFLICT DO NOTHING`, so a re-run changes nothing. `service_role` only, called from the existing cron route (`app/api/cron`, `vercel.json`).
- `get_daily_leaderboard(p_date DATE, p_limit INT, p_offset INT DEFAULT 0)`: finished attempts ranked by `correct_count DESC`, then fastest `finished_at - started_at`. Public execute, limits clamped like the existing leaderboards.
- A small `AFTER INSERT` trigger on `daily_attempt_answers` keeps `daily_attempts.correct_count` equal to the count of correct answers (same single-writer pattern as `user_stats`).

Grading stays on the server: the server reads `correct_index` with the secret key and writes `is_correct`. All four tables have RLS on with no policies; reads go through the server or the leaderboard function. Every table is created by an additive migration, so Phase 4 has no contract step.

### Rollback

Drop the four tables and the functions. No existing table is touched.

## 9. Phase 5: achievements

```sql
CREATE TABLE achievements (
  slug        TEXT PRIMARY KEY CHECK (slug ~ '^[a-z0-9_]+$'),
  metric      TEXT NOT NULL CHECK (metric IN ('total_answered', 'correct_count', 'best_streak', 'daily_completed')),
  threshold   INT  NOT NULL CHECK (threshold > 0),
  name        TEXT NOT NULL,
  description TEXT NOT NULL,
  sort_order  INT  NOT NULL DEFAULT 0,
  active      BOOLEAN NOT NULL DEFAULT true
);
CREATE TABLE user_achievements (
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement TEXT NOT NULL REFERENCES achievements(slug) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, achievement)
);
CREATE INDEX user_achievements_user ON user_achievements (user_id, unlocked_at DESC);
```

`achievements` is public read; `user_achievements` is read through the server (RLS on, no policies).

`award_achievements(p_user UUID) RETURNS SETOF TEXT` (`SECURITY DEFINER`, `service_role` only) inserts every achievement whose metric value from `user_stats` (or the count of finished `daily_attempts` for `daily_completed`) is at or above the threshold, `ON CONFLICT DO NOTHING RETURNING achievement`. It returns only the newly unlocked slugs, which is what the UI needs to show "unlocked". The app calls it after recording an answer and after finishing a daily attempt. It is idempotent and race-safe through the primary key. It is a function the app calls rather than a trigger because a trigger cannot hand the new slugs back to the request.

Seed rows (reference data, in the migration): `first_answer` (total_answered 1), `ten_correct` (correct_count 10), `hundred_correct` (100), `streak_5`, `streak_10` (best_streak), `first_daily` (daily_completed 1).

Existing players: one silent `SELECT award_achievements(id) FROM users` after the seed, so nobody gets a flood of toasts on first load. The app shows only slugs returned from calls after the release.

### Rollback

Drop the two tables and the function. No existing table is touched.

## 10. Cross-cutting

### Order and dependencies

```
Phase 0 (baseline, CI)
  └─ Phase 1 (drop dead schema)
       └─ Phase 2 (rollups, integrity)  ── must precede Phase 5 (achievements read user_stats)
            └─ Phase 3 (topics)          ── independent of Phases 4 and 5 once Phase 1 is done
            └─ Phase 4 (daily)           ── needs Phase 3 only if a daily challenge is filtered by topic (not in this design)
                 └─ Phase 5 (achievements, daily_completed metric needs Phase 4)
```

Phases 3 and 4 can be built in parallel after Phase 2. Phase 0 and Phase 1 order is firm: Phase 1 needs the pipeline and the pgTAP guard.

### Verification gate for every migration

1. `supabase db reset` replays cleanly from the baseline on a local stack.
2. `supabase test db` passes (pgTAP).
3. Applied to a Supabase branch, dump diffed against the expected result.
4. For data-changing migrations: preflight query returns zero offenders; row counts logged before and after.
5. App tests for changed code, with changed lines at least 80% covered (`CONSTRAINTS.md`).
6. `npm run check:task` passes. No new suppressions, no skipped tests.

### Release flow per phase

PR to `preview` with the migration and the code that goes with it, CI green, owner applies to the Supabase branch, then production (`supabase db push --linked`), writes the date in the ledger, then the `preview` to `main` promotion PR. Where a phase has code both before and after the migration (Phase 1 and Phase 3), that is two PRs.

### Risks

| Risk | Mitigation |
|---|---|
| Production has drifted from the old scripts. | Phase 0 diff against a production dump; production wins (D3). |
| The `user_stats` backfill disagrees with the old streak logic. | Reconcile query is a hard gate before the swap. `rebuild_user_stats` repairs any later drift. |
| A check constraint fails on legacy rows. | Preflight query first; `NOT VALID` then `VALIDATE`. |
| Dropping `list_id` first, then the tables, is skipped by a future edit. | A comment in the migration and a pgTAP check that `questions` keeps its row count across 1b. |
| `increment_ai_generation` is currently callable by the public key. | Treated as a possible live issue: run the ACL query in Phase 0 step 1 before anything else and fix first if confirmed. |
| Existing category names are not English. | D5: one constant in the 3a backfill. |
| The mobile app reads a changed shape. | API fields only added; mobile smoke test in the Phase 3 PR. |

### Not in scope

Question text translations, practice-round sessions, achievement translations, any reward or payment feature (ADR-013), changing the account or RBAC model, and moving to automatic production migrations.

### Decisions that need the owner

- D4: keep production pushes manual.
- D5: the locale of existing topic names.
- The sponsors placeholder rows (F8): deactivation is reversible but visible in the ad zone.
- Adding the `supabase` devDependency (D6) and the `CONSTRAINTS.md` database row (Phase 0 step 10).
