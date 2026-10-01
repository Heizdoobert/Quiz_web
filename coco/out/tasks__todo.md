# tasks/todo.md
lines:226 exports:
---
# Tasks: On-Chain Contest Escrow Smart Contract

## Task 1: Implement `ContestEscrow.sol`
**Description:** Implement the `ContestEscrow` Solidity contract inheriting OpenZeppelin's `Ownable`, `ReentrancyGuard`, and `EIP712`. Allows creators to lock `$QUIZ` tokens in escrow, players to claim rewards with EIP-712 vouchers, and creators to refund remaining tokens post-expiry.

**Acceptance criteria:**
- [x] Contract compiles with Solidity ^0.8.24
- [x] `createContest` locks ERC-20 tokens via `SafeERC20.safeTransferFrom`
- [x] `claimReward` verifies EIP-712 signature from `authorizedSigner`, prevents replay, and transfers tokens
- [x] `refundRemaining` returns unearned tokens to creator after `expiresAt`

**Verification:**
- [x] `npm --prefix contracts run compile` succeeds with 0 errors

**Dependencies:** None
**Files likely touched:**
- `contracts/contracts/ContestEscrow.sol`
**Estimated scope:** Medium

---

## Task 2: Hardhat Test Suite for `ContestEscrow.sol`
**Description:** Write unit and scenario tests covering all execution paths and failure modes of `ContestEscrow.sol`.

**Acceptance criteria:**
- [x] Tests contest creation, deposit balance, and event emission
- [x] Tests valid EIP-712 reward claim and recipient token receipt
- [x] Tests replay protection (reverting on reused nonce)
- [x] Tests deadline enforcement (reverting on expired voucher)
- [x] Tests signature verification (reverting on tampered contestId, recipient, amount, or nonce)
- [x] Tests pool bounds (reverting if claim exceeds remaining pool)
- [x] Tests refund authorization and timing (reverts before `expiresAt`, succeeds after `expiresAt`)

**Verification:**
- [x] `npm --prefix contracts test` passes 100%

**Dependencies:** Task 1
**Files likely touched:**
- `contracts/test/ContestEscrow.test.ts`
**Estimated scope:** Medium
