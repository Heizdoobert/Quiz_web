# docs/decisions/003-question-lists-and-contest-voucher-safeguards.md
lines:40 exports:
---
# ADR-003: Peer-Reviewed Question Lists & Contest Token Voucher Safeguards

## Status
Accepted

## Date
2026-09-28

## Context
Quick Quiz introduced community-curated question lists allowing creators to create specialized trivia contests with reward pools.

Two critical vulnerabilities were identified during design and adversarial auditing:
1. **Unbacked Arbitrary Token Minting via Public Action**: An export named `buildTokenClaimVoucher` was exported from a `'use server'` action file, allowing any browser to request an EIP-712 typed signature for arbitrary token amounts, effectively granting unlimited minting capability.
2. **Creator Self-Drain Exploit**: In a contest where the author defines the reward pool, the author knows every single correct answer upfront. If payouts were minted automatically from the backend signing key, a malicious creator could author a contest with a huge reward pool, play it with Sybil wallets, and drain tokens without depositing any funds.

## Decision
1. **Remove Arbitrary Voucher Generation**:
   - `buildTokenClaimVoucher` was completely removed from public Server Action exports.
   - Per-answer global reward claims remain governed strictly by `generateTokenVoucher` which verifies earned balance from settled results and enforces single-open-voucher deduplication via `settlePendingTokenClaims`.
2. **Pause Contest Payouts (`claimListReward`)**:
   - Direct contest reward claims currently return an explicit `{ error: 'Contest payouts are paused.' }` until an on-chain escrow/staking contract is deployed to lock the creator's tokens upon contest creation.
3. **Peer Review & Verification Threshold (`REQUIRED_CONFIRMATIONS = 3`)**:
   - Before a list can transition from `draft` / `submitted` to `live`, it must receive at least 3 distinct approvals from non-owner wallets (`question_list_confirmations`).
   - A list must contain a minimum of 20 questions (`MIN_LIST_QUESTIONS = 20`) to qualify for peer review.
4. **Isolation of List Questions**:
   - Questions belonging to a list are tagged with `list_id` and maintain `status = 'pending'`, preventing them from leaking into the global randomized trivia pool before the contest officially launches.
   - Reviewers who inspect questions are marked with `status: 'reviewer'` in `list_entries`, permanently barring them from playing the contest for score or rewards.

## Alternatives Considered

### Automatic Unconditional Contest Payouts
- **Rejected**: Minted tokens would be inflationary and vulnerable to Sybil self-drain.

### Manual Admin Approval
- **Rejected**: High operational bottleneck; doesn't scale to an open Web3 creator ecosystem. Peer-review consensus distributes moderation.

## Consequences
- **Positive**: Prevents unauthorized token hyperinflation and Sybil drain attacks.
- **Positive**: Maintains high question quality and community oversight through peer consensus.
- **Follow-up Roadmap**: Deploy a smart contract escrow mechanism (or staking vault) where list owners lock $QUIZ tokens up front when creating contests; contest winners will withdraw directly from the escrow contract.
