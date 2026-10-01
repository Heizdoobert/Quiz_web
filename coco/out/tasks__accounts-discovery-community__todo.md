# tasks/accounts-discovery-community/todo.md
lines:572 exports:
---
# Tasks: Accounts, Discovery and Community

Plan: `tasks/accounts-discovery-community/plan.md`.

Every task's verification includes `npm run check:task`: type-check, lint, tests and coverage, with changed lines ≥ 80% (`CONSTRAINTS.md`). SQL scripts are written in the task but run only with your go-ahead, on a Supabase branch first; there is no local database.

## Phase 1: Identity — spec `docs/specs/identity-accounts.md`

Tasks 3-9 each move one path from wallet to account id. The old wallet columns stay filled for wallet accounts until Task 25, so the paths not yet moved keep working.

### Task 1: Accounts schema migration script — done
Result:
- `lib/sql/accounts.sql` also adds the `bridge_wallet_account` insert trigger, so old and new code can write side by side and no backfill re-run is needed after deploy.
- Verified with `bash tests/sql/run-accounts-migration.sh` (Docker, throwaway `postgres:16-alpine`, every existing script plus test data):
  - row counts, `get_user_stats` and both leaderboards are identical before and after
  - a second run changes nothing
  - trigger, unique and upsert checks pass
- Still to do: your run on a Supabase branch.

- Acceptance:
  - `users` gains `id UUID PK`, `auth_user_id UUID UNIQUE` and `wallet_linked_at`; `wallet_address` becomes nullable and unique
  - the 9 player-referencing tables gain a backfilled account column (FK to `users(id)`), and the old wallet columns become nullable. The column is `user_id` in `quiz_results`, `group_members`, `list_entries` and `reward_claims`; role-named elsewhere: `questions.created_by_user`, `question_disputes.reporter_user`, `groups.owner_user`, `question_lists.owner_user`, `question_list_confirmations.confirmer_user`. Unique constraints are mirrored on the new columns
  - the "Allow public insert for users" policy is dropped
- Verify: on a Supabase branch, row counts per table and `get_user_stats` per player are equal before and after, and a second run changes nothing (you run it).
- Files: `lib/sql/accounts.sql`, `lib/schema.sql` (public insert policy removed), `README.md` (setup step). `schema.sql` itself is folded to the final shape in Task 25.
- Depends: none. Size: M

### Task 2: Account session, and wallet sign-in creates an account — done
Result:
- The cookie carries `accountId.wallet-or-dash.exp.hmac`, so actions read the wallet without a lookup.
- Sign-in now fails, instead of setting a session, when the account can't be created.
- `tests/identity-accounts.test.ts` has 16 tests; its tamper tests fail when the HMAC check is removed.
- 79/79 tests pass; `lib/session.ts` has 100% line coverage.

- Acceptance:
  - new `lib/session.ts`: `getSessionAccount()` and `setSessionAccount()`, with a `quiz_session` cookie (`accountId.exp.hmac`); tampered or expired cookies are rejected
  - `signInWithWallet` finds or creates the account for that wallet (`ensureAccountForWallet`, replacing `ensureUserRow`) and sets the cookie
  - `getSessionWallet()` in `lib/wallet-session.ts` temporarily returns `account.wallet`, so unmoved callers keep working
- Verify: `npx vitest run tests/identity-accounts.test.ts`
- Files: `lib/session.ts`, `lib/wallet-session.ts`, `lib/users.ts`, `lib/actions/auth-actions.ts`, `tests/identity-accounts.test.ts`
