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
| 1 | `schema.sql` (twice) | base tables | 2026-10-12 (rebuilt) |
| 2 | `lock-down-public-writes.sql` | server-only writes | 2026-10-12 (rebuilt) |
| 3 | `question-lists.sql` | lists and contests | 2026-10-12 (rebuilt) |
| 4 | `secure-rewards-and-answers.sql` | one open voucher per account | 2026-10-12 (rebuilt) |
| 5 | `restrict-quiz-results-insert.sql` | server-only answer recording | 2026-10-12 (rebuilt) |
| 6 | `contest-escrow.sql` | contest claims | 2026-10-12 (rebuilt) |
| 7 | `widen-reward-claims-amount.sql` | wei amounts | 2026-10-12 (rebuilt) |
| 8 | `accounts.sql` | account identity | 2026-10-12 (rebuilt) |
| 9 | `stats-functions.sql` | stats and leaderboards | 2026-10-12 (rebuilt) |
| 10 | `retire-sample-questions.sql` | retire old seed questions (existing databases only) | skipped on the rebuild: the old seed questions were gone with the database |
| 11 | `topics.sql` | `get_topics()` | 2026-10-12 (rebuilt) |
| 12 | `search.sql` | search | 2026-10-12 (rebuilt) |
| 13 | `community.sql` | ratings, comments, suggestions | 2026-10-12 (rebuilt) |
| 14 | `reward-payee.sql` | treasury sweep | 2026-10-12 (rebuilt) |
| 15 | `15-sponsors.sql` | ads | 2026-10-12 (rebuilt) |
| 16 | `16-leaderboard-pagination.sql` | paginated leaderboard | 2026-10-12 (rebuilt) |
| 17 | `17-analytics.sql` | analytics functions | 2026-10-12 (rebuilt) |
| 18 | `17-auth-rate-limit.sql` | auth and answer rate limits (fails open until applied, ADR-008) | 2026-10-12 (rebuilt); closes owner task A6 |
| 19 | `18-ai-usage.sql` | daily AI usage | 2026-10-12 (rebuilt) |
| 20 | `19-secure-ai-usage.sql` | closes `user_ai_usage` to the public key | 2026-10-12 (rebuilt) |
| 21 | `20-drop-web3-schema.sql` | drop the wallet, reward and escrow schema (ADR-013); destructive, so back up first and apply only once production reads `questions.created_by_user`; test with `bash supabase/tests/run-drop-web3-schema.sh` | 2026-10-12 (rebuilt) |
| 22 | `remote-config.sql` | `remote_config` table read by `GET /api/config` | applied by the owner, 2026-10-12; applied again in the rebuild |
| 23 | `21-rbac.sql` | roles (`users.role`), dispute resolution columns and `resolve_quarantined_question`, closes `question_disputes` to the public key (ADR-014); needs `accounts.sql` (order 8) applied first and stops with a message if not; idempotent; test with `bash scripts/verify-migrations.sh`; then run the first-admin statement below | 2026-10-12 (rebuilt); first admin: see below |

On 2026-10-12 the owner's Supabase database was wiped and rebuilt by applying scripts 1 to 23 in this order (`retire-sample-questions.sql` skipped). It held no users, results or groups, only seed rows, and its tables came from a schema older than `schema.sql` (`users` had only `wallet_address`), so no earlier "unknown" or "not applied" entry for it still holds. Rebuilding needs the database to be empty of data; do not repeat it on one that has players.

## First admin (run once, never commit the real address)

`21-rbac.sql` creates no admin: this repository is public and the owner's email must not be in it. After applying the migration, sign in once with your email code so your account exists, then run this in the Supabase SQL editor, replacing the placeholder with your own address:

```sql
UPDATE users
   SET role = 'admin'
 WHERE auth_user_id = (SELECT id FROM auth.users WHERE email = 'YOUR-EMAIL@example.com')
RETURNING id, role;
```

It must return one row. No rows means the address does not match an account yet (sign in by email code first, or check the spelling); running it again is harmless. After that, an admin grants and revokes every other role through `PUT /api/v1/admin/roles`. Do the same on the Supabase branch first if you test there.
