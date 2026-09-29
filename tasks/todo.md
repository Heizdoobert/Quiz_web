<<<<<<< HEAD
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

---

# Tasks: Integrated Accounts, Persistence & Authentication

## Task 1: Accounts Migration & Identity Foundation
- [x] Schema migration `lib/sql/accounts.sql` adds account ids and wallet linking
- [x] `lib/session.ts` implements HMAC signed account session cookies (`quiz_session`)
- [x] `lib/users.ts` exports `ensureAccountForWallet` and `accountIdForWallet`
- [x] Unit tests in `tests/identity-accounts.test.ts` and `tests/account-id-for-wallet.test.ts` pass

## Task 2: Quiz & Leaderboard Re-keyed to Account IDs
- [x] `lib/actions/quiz-actions.ts` keys answers, history and stats to session account id
- [x] `lib/stats.ts` computes stats for accounts
- [x] `lib/actions/leaderboard-actions.ts` ranks by account id
- [x] Unit tests in `tests/stats.test.ts`, `tests/leaderboard-actions.test.ts`, and `tests/answer-and-list-guards.test.ts` pass

## Task 3: Automatic SIWE Authentication & Session Integration
- [x] `lib/actions/auth-actions.ts` implements `signInWithWallet` calling `ensureAccountForWallet`
- [x] `lib/actions/auth-actions.ts` exports `signOutWallet`, `getAuthNonce`, and `requestSignIn`
- [x] `lib/auth-adapter.ts` provides RainbowKit authentication adapter
- [x] `hooks/shared/use-quiz-auth.ts` manages auth state and wallet synchronisation
- [x] Tests in `tests/auth-actions.test.ts` and `tests/auth-adapter.test.ts` pass

## Task 4: UI & Mobile CWV Optimization
- [x] `components/Providers.tsx` wraps `RainbowKitAuthenticationProvider`
- [x] Modals (`ProfileModal`, `CreateQuizModal`, `SubmitQuizModal`, `AuthModal`) lazy-loaded via `next/dynamic`
- [x] `canvas-confetti` imported on-demand for correct answers
- [x] Mobile Lighthouse performance score reaches 84+

## Task 5: Quality Gates & Verification
- [x] Zero TypeScript errors (`npm run type-check`)
- [x] Zero ESLint errors (`npm run lint`)
- [x] Zero architecture violations (`npm run check:architecture`)
- [x] Zero secrets in diff (`gitleaks`)
- [x] Production build succeeds (`npm run build`)

---

# Tasks: Production Answer Persistence & Automatic SIWE Authentication (superseded by the account-centric rewrite above; kept for history)

## Task 1: Server creates users row for signed-in wallet
**Description:** Add server-only `ensureUserRow(wallet)` in `lib/users.ts` that upserts with `supabaseAdmin`. Call it after successful SIWE verification, and have `getOrCreateUser` use it when the address matches the session wallet.
- [x] After `signInWithWallet` succeeds, a `users` row exists for that wallet (lowercase)
- [x] `getOrCreateUser(address)` creates the row only when `address` matches the session wallet
- [x] `ensureUserRow` is server-only (not exported from `'use server'`)
- [x] Tests pass in `tests/user-persistence.test.ts` and `tests/ensure-user-row-no-admin.test.ts`

---

## Task 2: Answer result says why it wasn't saved, and UI shows it
**Description:** Add `notSavedReason` to `AnswerSubmissionResult`, set by `submitAnswer`. `AnswerBack` displays score point only when `recorded` is true.
- [x] Each not-saved path returns matching reason (`signed-out`, `already-answered`, `own-question`, `error`)
- [x] Correct but unsaved answer no longer claims "+1 Score point"
- [x] Tests pass in `tests/AnswerBack.test.tsx` and `tests/answer-and-list-guards.test.ts`

---

## Task 3: Load answer history from the database
**Description:** Server action `getAnswerHistory(address)` returns the latest 20 answers for the session wallet. The quiz hook loads it on wallet connect and seeds `answeredIds`.
- [x] History panel displays previous answers after reload
- [x] Unauthenticated or mismatched address returns `[]`
- [x] Response never returns `answer_index` or `correct_index`
- [x] Tests pass in `tests/use-quiz-logic-history.test.tsx`

---

## Task 4: RainbowKit SIWE Authentication Adapter & Session Hook
**Description:** Implement RainbowKit v2 `AuthenticationAdapter` and status management synchronizing wallet connect/disconnect with HTTP-only session cookies.
- [x] `lib/wallet-session.ts` exports `clearSessionWallet()`
- [x] `lib/actions/auth-actions.ts` exports `signOutWallet()` and `getAuthNonce()`
- [x] `lib/auth-adapter.ts` implements RainbowKit adapter
- [x] `hooks/shared/use-quiz-auth.ts` manages auth status transitions
- [x] Tests pass in `tests/auth-adapter.test.ts` and `tests/auth-integration.test.tsx`

---

## Task 5: Wire RainbowKitAuthenticationProvider into Providers
**Description:** Wrap `RainbowKitAuthenticationProvider` in `components/Providers.tsx`.
- [x] Connecting wallet prompts SIWE signature dialog automatically
- [x] Disconnecting wallet clears session cookie
- [x] Tests pass in `tests/auth-integration.test.tsx`

---

## Task 6: Full System Verification & Constraint Validation
**Description:** Ensure full test suite passes with zero lint, type, or secret errors.
- [x] `npm run check:fast` exits 0
- [x] `npm run check:architecture` exits 0
- [x] All vitest test suites pass
- [x] Production build succeeds
