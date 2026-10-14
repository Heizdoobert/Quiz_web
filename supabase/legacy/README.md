# Legacy SQL (history only)

These files were applied by hand in the Supabase SQL editor until 2026-10-13. They are kept so
the history is readable. **Nothing runs them any more.** The current schema is
`supabase/migrations/20261013000000_baseline.sql` plus the migrations after it.

`docs/decisions/015-supabase-cli-migrations.md` records the switch. `migrations/` here is the
order the production database was rebuilt in on 2026-10-12 (scripts 1 to 23 in the old README,
`retire-sample-questions.sql` skipped). `tests/` holds the fixtures for the old
accounts and drop-web3 migration checks.
