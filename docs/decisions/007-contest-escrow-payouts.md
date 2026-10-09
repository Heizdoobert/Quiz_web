# ADR-007: Contest Payouts Through ContestEscrow Vouchers

> **Superseded by [ADR-013](013-web2-only.md)**: the wallet, token and contract code this record describes was removed. Kept for history.

## Status
Accepted. Supersedes decision 2 of [ADR-003](003-question-lists-and-contest-voucher-safeguards.md) ("pause contest payouts").

## Date
2026-10-08 (verified against the code on this date)

## Context
ADR-003 paused `claimListReward` because a creator who knows every answer could play their own contest with Sybil accounts and drain tokens they never deposited. It named an on-chain escrow as the way to unpause. That escrow now exists (`contracts/contracts/ContestEscrow.sol`) and `claimListReward` is live (`lib/actions/question-list-actions.ts`). No "paused" response remains in `lib/` or `app/`.

## Decision
Contest rewards are paid from tokens the creator has already locked on-chain, and the backend only signs vouchers against that locked balance.

1. **Escrow before live.** `startContest` moves a list to `live` only if `ContestEscrow.contests(contestId)` is active, its `creator` equals the caller's session wallet, and `totalPool` covers the requested pool. `contestId` is derived from the list id and the creator wallet (`getContestId`). `startListAttempt` only accepts lists in `live`, `completed` or `expired`, so no one can enter an unfunded contest.
2. **Bounded amounts.** The per-entry reward is `reward_pool_tokens / max_participants / question count * correct answers`, and entries are capped at `max_participants`. `claimListReward` also refuses when the contest cannot be read, or when the on-chain `remainingPool` is below the amount or the contest is inactive or expired.
3. **Contract is the final check.** `ContestEscrow.claimReward` requires an active contest, `amount <= remainingPool`, an unused `(contestId, recipient, nonce)`, an unexpired deadline and an EIP-712 signature from `authorizedSigner`. It pays with `safeTransfer` out of deposited funds; nothing is minted. A bug in the server cannot pay out more than the creator deposited for that contest, and one contest's pool cannot pay another's vouchers because `contestId` is part of the signed struct.
4. **One open voucher per entry.** The partial unique index `reward_claims_one_open_contest_per_account` (`supabase/migrations/accounts.sql`) makes concurrent claims collapse to one stored voucher; the loser of the insert race returns the stored one. Vouchers live at most one hour (`VOUCHER_TTL_SECONDS`) and never past the contest expiry.

## Consequences
- **Positive**: Creator self-drain no longer loses anyone money. A Sybil ring can only move the creator's own deposit back to the creator.
- **Residual**: Sybil accounts can still consume a pool before honest players do. This is a fairness issue, not a loss of funds, and is bounded by `max_participants`.
- **Residual**: `authorizedSigner` is the single trust root. Whoever holds that key can sign vouchers up to `remainingPool` for any active contest. The key is server-side (`getSignerAccount`) and rotatable by the contract owner through `setAuthorizedSigner`.
- **Closed**: `claimListReward` refuses with "Could not verify the contest pool" when `getContestOnChain` returns `null` (RPC failure or unset escrow address), so it never signs a voucher it cannot back. Covered by `tests/answer-and-list-guards.test.ts`.
- **Residual**: `ContestEscrow.sol` has not been externally audited (tracked in the production-health plan).
