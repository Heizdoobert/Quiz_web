# Database migrations: ledger and policy

The SQL in `supabase/migrations/` is applied by hand in the Supabase SQL editor. This file is the record of what exists and the rules for changing it. The order is in the README ("Database Setup").

## Decision (2026-10-09)

Keep the manual process and record it here, rather than adopting `supabase db push`. The Supabase CLI expects timestamped file names and a `supabase_migrations` table; the files here are named by topic (`schema.sql`, `accounts.sql`) with a few numbered ones (`15-` to `18-`, and two share the number 17). Adopting the CLI means renaming them and baselining production, which needs an owner decision. Revisit when a second person applies migrations.

## Rules

- **Forward-fix only.** There are no down scripts. A bad migration is corrected by a new script, never edited after it has been applied anywhere shared.
- **New scripts are idempotent** (`IF NOT EXISTS`, `CREATE OR REPLACE`, `DROP ... IF EXISTS`) and take the next free number, `21-` and up (unused numbers on `preview` count, so merge before numbering).
- **Apply to a Supabase branch first, then production**, and write the date in the ledger below.
- **Take a backup or confirm point-in-time recovery is on** before applying anything that rewrites data (`accounts.sql`, `reward-payee.sql`, `widen-reward-claims-amount.sql`, `20-drop-web3-schema.sql`).
- **Check on a fresh database:** `bash scripts/verify-migrations.sh` applies the whole order to a throwaway Postgres in Docker and lists the errors per script.

## Known quirks (found 2026-10-09)

- `schema.sql` is not re-runnable: `CREATE POLICY` has no `IF NOT EXISTS`, so a second pass reports "already exists". It runs twice on a fresh database on purpose because it references tables it creates later; the first pass errors are expected.
- `retire-sample-questions.sql` asserts that the 14 old seed questions exist, so it fails on a fresh database. Skip it there.
- `stats-functions.sql` creates `get_global_leaderboard(INT)`. Running it after `16-leaderboard-pagination.sql` leaves two overloads and a one-argument call becomes ambiguous. If it is ever re-run, run `16-leaderboard-pagination.sql` again straight after.
- Two files are numbered 17 (`17-analytics.sql`, `17-auth-rate-limit.sql`). They do not depend on each other; the README order lists analytics first.
- `ecosystem-v1-migration.sql` only matters for databases created before `schema.sql` carried the contest columns.

## Ledger

Fill in the date each script was applied to production. "Unknown" means no record exists; check `information_schema` or ask whoever ran it.

| Order | Script | Needed for | Applied to production |
|---|---|---|---|
| 1 | `schema.sql` (twice) | base tables | unknown |
| 2 | `lock-down-public-writes.sql` | server-only writes | unknown |
| 3 | `question-lists.sql` | lists and contests | unknown |
| 4 | `secure-rewards-and-answers.sql` | one open voucher per account | unknown |
| 5 | `restrict-quiz-results-insert.sql` | server-only answer recording | unknown |
| 6 | `contest-escrow.sql` | contest claims | unknown |
| 7 | `widen-reward-claims-amount.sql` | wei amounts | unknown |
| 8 | `accounts.sql` | account identity | unknown |
| 9 | `stats-functions.sql` | stats and leaderboards | unknown |
| 10 | `retire-sample-questions.sql` | retire old seed questions (existing databases only) | unknown |
| 11 | `topics.sql` | `get_topics()` | unknown |
| 12 | `search.sql` | search | unknown |
| 13 | `community.sql` | ratings, comments, suggestions | unknown |
| 14 | `reward-payee.sql` | treasury sweep | unknown |
| 15 | `15-sponsors.sql` | ads | unknown |
| 16 | `16-leaderboard-pagination.sql` | paginated leaderboard | unknown |
| 17 | `17-analytics.sql` | analytics functions | unknown |
| 18 | `17-auth-rate-limit.sql` | auth and answer rate limits (fails open until applied, ADR-008) | **not applied as of 2026-10-09 (owner task A6)** |
| 19 | `18-ai-usage.sql` | daily AI usage | unknown |
| 20 | `19-secure-ai-usage.sql` | on `preview` only; merge first | not applied |
| 21 | `20-drop-web3-schema.sql` | drop the wallet, reward and escrow schema (ADR-013); destructive, so back up first and apply only once production reads `questions.created_by_user`; test with `bash supabase/tests/run-drop-web3-schema.sh` | not applied |
