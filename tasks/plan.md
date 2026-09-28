# Implementation Plan: On-Chain Contest Escrow Smart Contract

## Overview
Deploy and integrate an on-chain **`ContestEscrow`** smart contract on Base Sepolia. This contract holds creator-deposited `$QUIZ` tokens in escrow for peer-reviewed question list contests. Winners redeem EIP-712 typed vouchers against the escrow contract. This replaces paused backend voucher minting with a trustless, anti-inflationary, and anti-drain mechanism.

## Architecture Decisions
- **Escrow-Custodied Pools:** Contest creators approve and transfer tokens to `ContestEscrow` upfront. Unearned tokens can only be reclaimed by the creator after the contest expires.
- **EIP-712 Structured Claims:** Payout vouchers are signed by the backend `authorizedSigner` using the `ClaimContestReward(bytes32 contestId,address recipient,uint256 amount,uint256 nonce,uint256 deadline)` schema.
- **Strict Nonce Isolation:** Used nonces are tracked per `(contestId, recipient, nonce)` preventing double-claims across different contests.
- **Reentrancy & Safe Transfers:** OpenZeppelin's `ReentrancyGuard` and `SafeERC20` are applied to all token-moving functions.

## Implementation Phases

### Phase 1: Smart Contract Foundation
- Task 1: Implement `ContestEscrow.sol` contract with creation, claim, refund, and EIP-712 verification.
- Task 2: Write complete Hardhat unit test suite in `contracts/test/ContestEscrow.test.ts`.

### Phase 2: Frontend Contract Synchronization
- Task 3: Export typed ABI and address configuration into `lib/contracts/`.

### Phase 3: Server Action Unpausing
- Task 4: Unpause `claimListReward` in `lib/actions/question-list-actions.ts` with SIWE session check and EIP-712 voucher signing.

### Phase 4: UI Integration & Verification
- Task 5: Connect `ContestPlay.tsx` claim flow to `ContestEscrow.claimReward`.
- Task 6: Connect `MyListsDashboard.tsx` contest funding flow to approve & create contest.
- Task 7: End-to-end verification (Hardhat tests, Next.js tests, lint, type-check, build).
