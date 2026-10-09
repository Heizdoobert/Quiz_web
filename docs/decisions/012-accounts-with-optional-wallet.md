# ADR-012: Accounts With an Optional Wallet

## Status
Accepted (approved 2026-09-28). Full design in `docs/specs/identity-accounts.md`. Supersedes the wallet-only identity of ADR-001; the signed session cookie approach stays.

## Date
2026-10-09 (summarised from the spec and `lib/actions/auth-actions.ts`)

## Context
Requiring a wallet to play kept casual players out. Sign-up needed to be easy while rewards stay on-chain.

## Decision
The player's identity is an account (`users.id`, a UUID), not a wallet. A player can sign in with an email and a one-time code (Supabase Auth OTP, verified with a non-persisting client), with a username and password, or with a wallet (SIWE), and can add a wallet later; a linked wallet cannot be changed. The session is the `quiz_session` cookie, `<accountId>.<wallet or ->.<expiresAt>.<HMAC>`, httpOnly, `sameSite: 'lax'`, seven days; Supabase Auth tokens are never kept in the browser. Email addresses stay in `auth.users` and are not copied into `users`, which has a public read policy. Every table that referenced a wallet references `users.id`.

## Consequences
- **Positive**: low-friction sign-up; rewards are tied to something the player controls.
- **Trade-off**: three sign-in paths each need rate limiting (ADR-008) and their own abuse handling; accounts are not merged, so a player with an email account and a separate wallet account has two identities.
- **Residual**: the signed cookie carries the wallet so actions need no lookup; changing the linked wallet is out of scope by design.
