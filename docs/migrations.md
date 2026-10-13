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
