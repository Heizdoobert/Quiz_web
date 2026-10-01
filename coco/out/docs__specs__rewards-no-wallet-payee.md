# docs/specs/rewards-no-wallet-payee.md
lines:115 exports:generateTokenVoucher
---
# Spec: Who Receives $QUIZ for Accounts Without a Wallet

Module: `rewards` (consumes `identity`, `lists`) — see `CAPABILITY-MAP.md`.
Status: Approved 2026-09-28 (old coins go to the player once a wallet is added). Depends on `docs/specs/identity-accounts.md` (`users.id`, `wallet_linked_at`, wallet cannot be changed once linked).

## Objective
Players choose whether to add a wallet.
- The $QUIZ an account earns belongs to that account.
- When the player adds a wallet, they can claim everything they earned, including from before they added it.
- If an account still has no wallet 180 days after earning, those coins go to the operator's treasury wallet.

Players are told this plainly before they choose, and on every rewards screen.

Out of scope: moving tokens that were already minted, on-chain transfers per answer, changing the 10 QUIZ per correct answer rate, changing contracts.

## Tech Stack
Next.js 16.3 server actions, viem 2 EIP-712 vouchers signed by `REWARD_SIGNER_PRIVATE_KEY` (`lib/chain.ts`), existing `QuizToken.claimTokens` (mints to the voucher's recipient), Supabase Postgres, Vitest 5.

## Commands
- Fast gate: `npm run check:fast`
- Task gate: `npm run check:task`
- Focused test: `npx vitest run tests/rewards-payee.test.ts`
- Contract tests (unchanged, should still pass): `cd contracts && npx hardhat test`
- Build: `npm run build`

## Design
**Payee rule.** Each recorded correct answer earns 10 QUIZ for its account.
- An account's claimable amount = 10 × (its correct answers − `users.treasury_swept_count`) − what the account has already claimed.
- It is claimable only once the account has a wallet. The voucher recipient is always the account's wallet.

**Treasury sweep.** The treasury receives the rewards for correct answers that:
- were answered more than 180 days ago (`TREASURY_GRACE_DAYS`, fixed at 180), and
- belong to an account that still has no wallet at sweep time.

The sweep is one SQL function, `sweep_to_treasury()`:
- In one transaction, for each account without a wallet, it sets `treasury_swept_count` to that account's count of correct answers older than the grace period. This only ever grows, because the cutoff only moves forward.
- It returns nothing to the caller. Its effect is visible as a larger treasury entitlement.
- An account that adds a wallet after a sweep keeps everything not yet swept.
- Treasury entitlement = 10 × Σ `treasury_swept_count`; treasury claimable = entitlement − the treasury account's claims.

