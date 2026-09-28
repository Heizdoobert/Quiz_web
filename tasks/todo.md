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

---

## Task 3: Export ABI and Contract Addresses
**Description:** Generate typed ABI and address constants for `ContestEscrow` in the web application codebase.

**Acceptance criteria:**
- [x] `lib/contracts/ContestEscrowABI.ts` contains the generated ABI
- [x] `lib/contracts/addresses.ts` exports `CONTEST_ESCROW_ADDRESS`
- [x] `contracts/scripts/sync-abi.ts` updated to include `ContestEscrow`

**Verification:**
- [x] TypeScript compiles cleanly: `npm run type-check`

**Dependencies:** Task 1
**Files likely touched:**
- `contracts/scripts/sync-abi.ts`
- `lib/contracts/ContestEscrowABI.ts`
- `lib/contracts/addresses.ts`
**Estimated scope:** Small

---

## Task 4: Unpause & Implement `claimListReward` Server Action
**Description:** Unpause the `claimListReward` Server Action in `lib/actions/question-list-actions.ts`, signing EIP-712 `ClaimContestReward` vouchers for `ContestEscrow`.

**Acceptance criteria:**
- [x] Requires signed-in wallet via `getSessionWallet()`
- [x] Verifies contest completion in `list_entries`
- [x] Calculates earned tokens and issues valid EIP-712 voucher targeting `ContestEscrow`
- [x] Records pending claim in `reward_claims`
- [x] Unit tests updated in `tests/answer-and-list-guards.test.ts`

**Verification:**
- [x] `npm test` passes all tests

**Dependencies:** Task 3
**Files likely touched:**
- `lib/actions/question-list-actions.ts`
- `lib/types.ts`
- `tests/answer-and-list-guards.test.ts`
**Estimated scope:** Medium

---

## Task 5: Connect Contest Play & Claim UI
**Description:** Update `components/lists/ContestPlay.tsx` to execute `claimReward` on `ContestEscrow` instead of `QuizToken`.

**Acceptance criteria:**
- [x] Calls `claimReward` on `CONTEST_ESCROW_ADDRESS` using `ContestEscrowABI`
- [x] Handles transaction submission, receipt waiting, and state transitions
- [x] Calls `markListRewardClaimed` upon receipt confirmation

**Verification:**
- [x] `npm run type-check` and `npm run build` succeed

**Dependencies:** Task 3, Task 4
**Files likely touched:**
- `components/lists/ContestPlay.tsx`
**Estimated scope:** Small

---

## Task 6: Connect Creator Contest Funding UI
**Description:** Update `components/lists/MyListsDashboard.tsx` to handle ERC-20 approval and `createContest` call when a creator launches a contest.

**Acceptance criteria:**
- [x] Prompt creator to approve token spend and create contest on-chain if pool > 0
- [x] Updates list state on successful transaction

**Verification:**
- [x] `npm run type-check` and `npm run build` succeed

**Dependencies:** Task 3, Task 5
**Files likely touched:**
- `components/lists/MyListsDashboard.tsx`
**Estimated scope:** Medium

---

## Task 7: Full System Verification & Quality Gates
**Description:** Run the complete suite of tests and checks across both the smart contract and web application environments.

**Acceptance criteria:**
- [x] Hardhat tests pass 100% (`npm --prefix contracts test`)
- [x] Web application unit tests pass 100% (`npm test`)
- [x] `npm run lint` clean
- [x] `npm run type-check` clean
- [x] `npm run build` production build succeeds

**Verification:**
- [x] All check commands exit with code 0

**Dependencies:** Tasks 1-6
**Estimated scope:** Small
