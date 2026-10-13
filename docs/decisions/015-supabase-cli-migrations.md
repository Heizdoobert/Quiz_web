# ADR-015: Supabase CLI migrations and a production-derived baseline

## Status
Accepted (owner approval of the database redesign design, 2026-10-13). Replaces the manual-process decision in `docs/migrations.md` of 2026-10-09.

## Context
The schema lived in 24 topic-named SQL files applied by hand in the Supabase SQL editor, in an order kept in the README. `schema.sql` could not be re-run, two files shared the number 17, wallet and reward columns were added and then dropped across `accounts.sql` and `20-drop-web3-schema.sql`, and the only check was `scripts/verify-migrations.sh` with a hard-coded file list. Production now holds real players, so rebuilding is no longer an option.

## Decision
- Migrations are timestamped files in `supabase/migrations/`, created with `supabase migration new` and applied with `supabase db push`.
- The first file, `20261013000000_baseline.sql`, is meant to be the production schema (`supabase db dump`), checked against a replay of the old scripts. Production is the source of truth (D3 in the design spec). The file in the repository is provisional until the production dump is verified: it came from a replay, and the schema diff against the real dump must be empty before production records it as applied with `supabase migration repair` (no DDL runs).
- The old files move to `supabase/legacy/` as history and are never run.
- CI replays the migrations on a local Supabase stack, runs the pgTAP tests in `supabase/tests/database/` and lints (`npm run check:db`).
- The owner applies migrations to production by hand after `preview` is green (D4). CI never pushes to production.
- Changes that remove or rename anything follow expand/contract: code stops using the old thing and ships, then a later migration removes it.

## Consequences
- A new contributor can build the database with `supabase start`; there is no order to remember.
- A destructive migration cannot ride along with the code that still needs the old object, because a contract migration is applied (`db push`) only after that code is live in production; until then it stays out of the release, though the repository may carry it committed.
- `supabase` is a devDependency, pinned exactly.
- Revisit D4 (manual production pushes) when a second person applies migrations.
