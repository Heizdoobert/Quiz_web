# docs/specs/identity-accounts.md
lines:111 exports:getSessionAccount,createQuestion
---
# Spec: Accounts with Optional Wallet

Module: `identity` — see `CAPABILITY-MAP.md`. Supersedes the wallet-only identity in ADR-001 (the session-cookie approach stays).
Status: Approved 2026-09-28.

## Objective
Signing up and signing in must be easy, and a wallet must be optional. A player can:
- sign in with an email and a one-time code (no password), or
- sign in with a wallet (existing SIWE flow), and
- add a wallet to an email account later.

Registration is the first sign-in; there is no separate register form. The account, not the wallet, is the player's identity. $QUIZ belongs to the account and is claimable once it has a wallet (see `docs/specs/rewards-no-wallet-payee.md`).

Out of scope: passwords, social logins (see Open Questions), unlinking or changing a wallet, merging two accounts, adding an email to a wallet account.

## Tech Stack
Next.js 16.3 server actions; Supabase Auth email OTP through the installed `@supabase/supabase-js` 2.116 (`auth.signInWithOtp`, `auth.verifyOtp`); wagmi 2 / viem 2 / RainbowKit for SIWE; Vitest 5.

## Commands
- Fast gate: `npm run check:fast`
- Task gate: `npm run check:task`
- Focused test: `npx vitest run tests/identity-accounts.test.ts`
- Build: `npm run build`

## Design
**Schema** (new script `lib/sql/accounts.sql`; ask before running on any shared database):
- `users` gains:
  - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
  - `auth_user_id UUID UNIQUE` (Supabase `auth.users.id`, set for email accounts)
  - `wallet_linked_at TIMESTAMPTZ`
- `users.wallet_address` becomes nullable and stays `UNIQUE`. Existing rows keep their wallet and get `wallet_linked_at = created_at`.
- Every table that references a player gets a `UUID REFERENCES users(id)` column, backfilled by joining on the old wallet column. It is named `user_id` in `quiz_results`, `group_members`, `list_entries` and `reward_claims`, and named for the role elsewhere: `questions.created_by_user`, `question_disputes.reporter_user`, `groups.owner_user`, `question_lists.owner_user`, `question_list_confirmations.confirmer_user`. Unique constraints move to the new columns.
- Until then, a `BEFORE INSERT` trigger (`bridge_wallet_account`) keeps the two in sync, so old and new code can run side by side during the deploy window:
  - a row written with only a wallet gets its account (created if missing)
  - a row written with only an account gets that account's wallet
- The old wallet columns and the trigger are dropped in a later script (`lib/sql/accounts-drop-wallet-columns.sql`), only after all code reads the account columns.
- Email addresses are never copied into `users`: that table has a public read policy. Email stays in `auth.users`.
- Drop the "Allow public insert for users" policy. The server creates accounts with the secret key.

**Session.**
