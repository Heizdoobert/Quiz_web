# ADR-011: $QUIZ Belongs to the Account; Unclaimed Rewards Sweep to the Treasury After 180 Days

> **Superseded by [ADR-013](013-web2-only.md)**: the wallet, token and contract code this record describes was removed. Kept for history.

## Status
Accepted (approved 2026-09-28). Full design in `docs/specs/rewards-no-wallet-payee.md`.

## Date
2026-10-09 (summarised from the spec and `lib/actions/reward-actions.ts`)

## Context
Players can sign in with email and no wallet (ADR-012), but $QUIZ is an ERC-20 minted to a wallet. Rewards for wallet-less players had to be held somewhere without minting to an address nobody controls.

## Decision
Each recorded correct answer earns 10 $QUIZ for its **account**, claimable only once the account has a wallet; the voucher recipient is always the account's wallet. Rewards for correct answers more than 180 days old, on an account that still has no wallet, are swept to the operator's treasury account through `sweep_to_treasury()`, which only raises `users.treasury_swept_count`. The treasury is an ordinary account that signs in with `TREASURY_WALLET_ADDRESS`; if that variable is unset, no sweep runs. Contest pools are funded by the list creator, so `startContest` requires a wallet. Every rewards screen shows the same disclosure from `lib/constants/rewards-copy.ts`.

## Consequences
- **Positive**: players can start without a wallet; no tokens go to unowned addresses.
- **Trade-off**: players who never add a wallet lose their coins to the operator after 180 days. This is disclosed before sign-in and on every rewards screen.
- **Residual**: the sweep and treasury claim are a single point of operator trust; the signer key is the contract-level trust root (ADR-007).
