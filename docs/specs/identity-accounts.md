# Spec: Accounts with Optional Wallet

Module: `identity` — see `CAPABILITY-MAP.md`. Supersedes the wallet-only identity in ADR-001 (the session-cookie approach stays).
Status: Draft, awaiting approval.

## Objective
Signing up and signing in must be easy, and a wallet must be optional. A player can:
- sign in with an email and a one-time code (no password), or
- sign in with a wallet (existing SIWE flow), and
- add a wallet to an email account later.

Registration is the first sign-in; there is no separate register form. The account, not the wallet, is the player's identity. Whether an account has a wallet decides who receives its $QUIZ (see `docs/specs/rewards-no-wallet-payee.md`).

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
- Every table that references a player gets a `user_id UUID REFERENCES users(id)` column, backfilled by joining on the old wallet column: `questions.created_by`, `quiz_results`, `groups.owner_wallet`, `group_members`, `question_lists.owner_wallet`, `list_entries`, `question_list_confirmations`, `question_disputes`, `reward_claims`. Unique constraints move to `user_id`.
- The old wallet columns are dropped in a later script (`lib/sql/accounts-drop-wallet-columns.sql`), only after all code reads `user_id`.
- Email addresses are never copied into `users`: that table has a public read policy. Email stays in `auth.users`.
- Drop the "Allow public insert for users" policy. The server creates accounts with the secret key.

**Session.**
- Cookie `quiz_session` = `<accountId>.<expiresAt>.<HMAC>`, replacing `wallet_session`: same HMAC key, 7-day TTL, httpOnly, `sameSite: 'lax'`, `Secure` from `shouldUseSecureCookies()`.
- Existing `wallet_session` cookies stop working at release; players sign in once more.
- Supabase Auth tokens are never stored in the browser. The server verifies the code with a non-persisting client, then issues `quiz_session`.

**Server contract** (provider for every module):
```ts
// lib/wallet-session.ts (renamed lib/session.ts)
export async function getSessionAccount(): Promise<{ id: string; wallet: string | null } | null>;
```
`getSessionWallet()` is removed; every caller moves to `getSessionAccount()`.

**Server actions** (`lib/actions/auth-actions.ts`):
- `requestEmailCode(email)`: validates the format and calls `signInWithOtp({ email, options: { shouldCreateUser: true } })`. It returns the same `{ sent: true }` whether or not the email is known.
- `verifyEmailCode(email, code)`: `verifyOtp({ email, token: code, type: 'email' })`. It upserts `users` by `auth_user_id` (default display name `Player-<first 4 of id>`), sets `quiz_session`, and returns `{ ok: boolean }`.
- `signInWithWallet(message, signature)`: existing SIWE verification. It finds or creates the account with that wallet, then sets `quiz_session`.
- `linkWallet(message, signature)`: requires a session whose account has no wallet, plus a SIWE signature for the new address. It sets `wallet_address` and `wallet_linked_at = now()`, and returns `{ ok: false, code: 'WALLET_IN_USE' }` if another account already has that wallet.
- `signOut()`: deletes `quiz_session`.

**UI.**
- One "Sign in" button opens a modal with two choices: "Continue with email" (email field, then a 6-digit code field) and "Connect wallet" (RainbowKit, then sign).
- An account without a wallet sees "Add wallet" in the header menu, with the disclosure text from the rewards spec.

## Project Structure
- `lib/session.ts` — cookie, `getSessionAccount` (from `lib/wallet-session.ts`)
- `lib/users.ts` — `ensureAccountForWallet`, `ensureAccountForAuthUser` (server-only, replaces `ensureUserRow`)
- `lib/actions/auth-actions.ts` — actions above
- `components/auth/SignInModal.tsx`, `hooks/shared/use-session.ts` — UI and client session state
- `lib/sql/accounts.sql`, `lib/sql/accounts-drop-wallet-columns.sql`
- `tests/identity-accounts.test.ts`

## Code Style
Every server action gets the account from the session, never from its arguments:
```ts
export async function createQuestion(input: QuestionInput) {
  const account = await getSessionAccount();
  if (!account) return { success: false, code: 'UNAUTHORIZED' as const };
  // write with supabaseAdmin, attributed to account.id
}
```
Wallet addresses are stored and compared lowercase. Failures are logged with the function name and returned as fixed codes, never raw database errors (ADR-002).

## Testing Strategy
- Vitest, with `supabase.auth` and `supabaseAdmin` mocked at the module boundary:
  - the code request response is the same for known and unknown emails
  - a valid code sets the cookie; an invalid or expired code does not
  - wallet sign-in creates exactly one account
  - `linkWallet` rejects a wallet already on another account and rejects an account that already has a wallet
  - `getSessionAccount` rejects tampered and expired cookies
- Migration: run `accounts.sql` on a Supabase branch or a copy of production, then check that row counts per table and per-player scores are unchanged.
- Manual: email sign-in, wallet sign-in, add wallet, sign out, reload.

## Boundaries
- **Always:** resolve the player with `getSessionAccount()` on the server; issue the session only after Supabase verifies the code or viem verifies the SIWE signature; keep the email in `auth.users` only; follow `CONSTRAINTS.md`.
- **Ask first:** running `accounts.sql` or the drop script on any shared database; changing Supabase Auth settings (OTP expiry, rate limits, SMTP); adding a social login provider; adding a dependency (e.g. `@supabase/ssr`).
- **Never:** accept an account id or wallet from the client as proof; put email or Supabase tokens in `users`, `localStorage` or a readable cookie; let one wallet belong to two accounts; drop the old wallet columns before every reader has moved.

## Success Criteria
1. A new player can go from "Sign in" to signed in with only an email and a 6-digit code, and a returning player the same way; no password exists.
2. A wallet player signs in with one connect and one signature, as today, and gets an account.
3. An email account can add a wallet with one signature; afterwards `getSessionAccount()` returns that wallet, and `wallet_linked_at` is set.
4. Adding a wallet already linked to another account fails with `WALLET_IN_USE` and changes nothing.
5. `requestEmailCode` gives the same response for known and unknown emails.
6. No server action reads a wallet or account id from its arguments as identity (checked by grep for `getSessionWallet` = 0 results and by review).
7. After `accounts.sql`, every existing player's score, streak, history, groups, lists and claims are unchanged.
8. `npm run check:task` and `npm run build` pass; changed-line coverage ≥ 80%.

## Open Questions
- Add Google sign-in as well (Supabase OAuth, needs a Google client and a callback route)? It is faster for players than an email code.
- Production email: Supabase's built-in email sender has a low hourly limit and is meant for testing. Which SMTP provider should send codes?
- Should a wallet player be able to add an email, and should two accounts ever be mergeable?
