# Database migrations: process and ledger

The schema is managed with the Supabase CLI (ADR-015). Files in `supabase/migrations/` are timestamped and applied in name order. `supabase/legacy/` holds the old hand-applied scripts as history only.

## Rules

- **Forward-fix only.** No down scripts. A migration already applied anywhere shared is never edited; a new one corrects it.
- **Create files with the CLI:** `npx supabase migration new <snake_case_name>`. Never hand-pick a number.
- **Idempotent where cheap** (`IF NOT EXISTS`, `CREATE OR REPLACE`, `DROP ... IF EXISTS`), and wrapped in `BEGIN; ... COMMIT;` so a failure leaves nothing half-applied.
- **Expand then contract.** A migration that removes or renames something is applied (`db push`) only after the code that stops using it is live in production, because `db push` applies every pending file at once. Until then it stays out of the release; the repository may carry it committed.
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
| 20261013000000 | `baseline`: provisional until the production dump is verified (see the header of the file); then recorded with `migration repair`, no DDL run | |

Add one row per migration as it ships. The 2026-10-12 rebuild applied legacy scripts 1 to 23 (see `supabase/legacy/README.md`); the baseline reproduces their end state (provisional, see above).

## Pending releases (the 2026-10 redesign)

Task numbers below (0.2, 1.2, 2.3, 3.2, ...) refer to the implementation plan `docs/superpowers/plans/2026-10-13-database-redesign.md`, which is kept locally and not committed.

`db push` applies every pending file in name order, so never leave a LATER-release migration pending when pushing an earlier release: keep those files out of the branch you push (they stay on the redesign branch for now). When a LATER-release file is added afterwards (1b, 3c), it sorts before migrations that are already applied, so the CLI refuses it unless you pass `supabase db push --include-all`. That refusal is safe (it stops with an error and applies nothing); use `--include-all` for those releases after checking `supabase migration list`.

| Migration | Needs | Code relation | Release |
|---|---|---|---|
| 20261013000000 baseline | plan Task 0.4 redone from the prod dump | `migration repair` only, no DDL | owner |
| 20261013000100 retire_contest_questions (1a) | baseline | apply BEFORE the code that stops reading list_id (commit 8987d1d) | release A |
| 20261013000200 drop_contest_schema (1b, contract) | 1a | 1.2 code must be live first | LATER release |
| 20261013000300 user_stats | none | none | release B (off-peak: locks quiz_results during backfill) |
| 20261013000400 stats_readers | user_stats; reconcile gate aborts on drift | none | release B |
| 20261013000500 integrity_and_indexes | owner preflight (answer_index not between -1 and 3, option shape, lengths) | the answer-index guard code (854651e, 5f5f04d) live first | release B (code first) |
| 20261013000600 dispute_count | none | 2.4 code after | release B |
| 20261013000700 function_privileges | none | the admin()-client code for questionAnalytics (lib/db/rpc.ts in a4e0dd0) must be live FIRST (it ships in release A) or AI generation and profile analytics fail | release B, after release A's code is live |
| 20261013000800 topics (3a) | none | 3.2 code after | release B (off-peak; takes ACCESS EXCLUSIVE on questions during the backfill) |
| 20261013000900 topics_contract (3c) | 3a | 3.2 code AND the code half of 9b93d5a (insertQuestion stops writing category) live first | LATER release |
| 20261013001000 daily_challenge | none | 4.2 code after | release C |
| 20261013001100 achievements | user_stats, daily_attempts | 5.2 code after (award failures are logged only) | release C |

Minimum sequence:

- **A** = Phase 0 + 1a + the 1.2 code, plus the code-only halves of a4e0dd0 (`lib/db/rpc.ts`, `tests/question-analytics.test.ts`) and of 854651e/5f5f04d (quiz-actions guard + tests).
- **B** = user_stats through function_privileges, topics 3a, and the 3.2 code (4116595). 1b is NOT in B.
- **C** = the code half of 9b93d5a, then the 3c migration, then daily_challenge and achievements.

Commits a4e0dd0 and 9b93d5a mix a migration with code (and 854651e/5f5f04d edited the integrity migration in place alongside code), so they must be split: cherry-pick the code halves into the earlier release and keep the migration halves for their own release.

### Owner checklist

1. Redo Task 0.2, 0.4 and 0.8 first (audit, real dump, branch proof), then `migration repair` for the baseline.
2. Before integrity_and_indexes (the 2.3 preflight), every line must return 0 (the web timer's -1 is the timeout sentinel, so -1 is valid). The migration also validates and aborts on any offending row, so a skipped preflight fails safely:

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
3. Take a backup or confirm point-in-time recovery before 1b and 3c.
4. Before topics (3a):
   - `select extnamespace::regnamespace from pg_extension where extname='unaccent'`. The migration creates it in `public`; if it already lives in `extensions`, `slugify_topic`'s search_path cannot resolve `unaccent`.
   - Slug collisions (`slugify_topic` is created by 3a itself, so run this on the branch/preview database after 3a is applied there, and decide before production): `select slugify_topic(category), array_agg(distinct category) from questions group by 1 having count(distinct lower(trim(category))) > 1`. Names such as `C++`, `C#` and `C` all slugify to `c` and would merge into one topic.
   - The topic display name is the most recent spelling at backfill time; afterwards the first spelling a new topic is created with wins and later spellings do not rename it. There is no rename path yet.
5. Run these off-peak: 1b, 3a and 3c take ACCESS EXCLUSIVE locks on `questions`; the user_stats backfill and `rebuild_user_stats()` lock `quiz_results` (blocks answer inserts); the integrity VALIDATE scans inside the transaction; the indexes are not CONCURRENT. The migrations set `lock_timeout = '5s'`, so a blocked push fails and can be retried off-peak.
6. Apply to the preview/branch database first, then production.

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
