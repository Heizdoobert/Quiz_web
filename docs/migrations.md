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

`db push` applies every pending file in name order, so never leave a LATER-release migration pending when pushing an earlier release: keep those files out of the branch you push (they stay on the redesign branch for now).

| Migration | Needs | Code relation | Release |
|---|---|---|---|
| 20261013000000 baseline | plan Task 0.4 redone from the prod dump | `migration repair` only, no DDL | owner |
| 20261013000100 retire_contest_questions (1a) | baseline | apply BEFORE the code that stops reading list_id (commit 8987d1d) | release A |
| 20261013000200 drop_contest_schema (1b, contract) | 1a | 1.2 code must be live first | LATER release |
| 20261013000300 user_stats | none | none | release B (off-peak: locks quiz_results during backfill) |
| 20261013000400 stats_readers | user_stats; reconcile gate aborts on drift | none | release B |
| 20261013000500 integrity_and_indexes | owner preflight (answer_index not between -1 and 3, option shape, lengths) | the answer-index guard code (854651e, 5f5f04d) live first | release B (code first) |
| 20261013000600 dispute_count | none | 2.4 code after | release B |
| 20261013000700 function_privileges | none | the admin()-client code for questionAnalytics (lib/db/rpc.ts in a4e0dd0) must be live FIRST or AI generation and profile analytics fail | LATER than its code |
| 20261013000800 topics (3a) | none | 3.2 code after | release B (off-peak; takes ACCESS EXCLUSIVE on questions during the backfill) |
| 20261013000900 topics_contract (3c) | 3a | 3.2 code AND the code half of 9b93d5a (insertQuestion stops writing category) live first | LATER release |
| 20261013001000 daily_challenge | none | 4.2 code after | release C |
| 20261013001100 achievements | user_stats, daily_attempts | 5.2 code after (award failures are logged only) | release C |

Minimum sequence:

- **A** = Phase 0 + 1a + the 1.2 code, plus the code-only halves of a4e0dd0 (`lib/db/rpc.ts`, `tests/question-analytics.test.ts`) and of 854651e/5f5f04d (quiz-actions guard + tests).
- **B** = user_stats through dispute_count, topics 3a, and the 3.2 code (4116595). 1b is NOT in B.
- **C** = the code half of 9b93d5a, then the 3c migration, then daily_challenge and achievements.

Commits a4e0dd0 and 9b93d5a mix a migration with code and must be split: cherry-pick the code halves into the earlier release.

### Owner checklist

1. Redo Task 0.2, 0.4 and 0.8 first (audit, real dump, branch proof), then `migration repair` for the baseline.
2. Before integrity_and_indexes (2.3 preflight): `answer_index not between -1 and 3` finds bad rows (the web timer's -1 is the timeout sentinel, so -1 is valid); also run the option-shape and length preflight lines from the task.
3. Take a backup or confirm point-in-time recovery before 1b and 3c.
4. Before topics (3a):
   - `select extnamespace::regnamespace from pg_extension where extname='unaccent'`. The migration creates it in `public`; if it already lives in `extensions`, `slugify_topic`'s search_path cannot resolve `unaccent`.
   - Slug collisions: `select slugify_topic(category), array_agg(distinct category) from questions group by 1 having count(distinct lower(trim(category))) > 1`.
   - The topic display name is the first spelling seen after the backfill; there is no rename path yet.
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
