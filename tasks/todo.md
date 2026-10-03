# Tasks: Fix Critical Bugs and Logic Flaws in lib/

> Plan: [plan.md](./plan.md)

---

## Phase 1: On-Chain Contest & Voucher Settlement Fixes

---

## Task 1: Fix Contest ID Derivation and Owner Wallet Sync

**Description:** Fix contest ID derivation during reward claims and confirmations. When a user creates a contest list before connecting a wallet, `question_lists.owner_wallet` is stored as `NULL`. When `startContest` is invoked, `auth.wallet` funds the on-chain escrow, but `owner_wallet` was never updated. Consequently, `claimListReward` and `confirmRewardClaim` re-hashed with `null`, generating mismatched contest IDs that reverted on-chain. This task ensures `startContest` syncs `owner_wallet`, and `claimListReward` and `confirmRewardClaim` utilize the saved `onchain_contest_id` as the primary identifier. Additionally, `confirmRewardClaim` must persist `claim_tx_hash` to `list_entries`.

**Acceptance criteria:**
- [x] `startContest` updates `owner_wallet: auth.wallet` on `question_lists` when taking a contest live.
- [x] `claimListReward` reads and uses `list.onchain_contest_id` (fallback to `getContestId(listId, list.owner_wallet)` only if missing).
- [x] `confirmRewardClaim` selects and uses `qList.onchain_contest_id` for contest claim verification on `ContestEscrow`.
- [x] `confirmRewardClaim` updates `list_entries` with `{ status: 'claimed', claim_tx_hash: txHash }`.
- [x] Unit tests verify contest claims succeed when `owner_wallet` was originally null.

**Verification:**
- [x] Tests pass: `npx vitest run tests/reward-actions.test.ts tests/ecosystem-contest-actions.test.ts`
- [x] Build succeeds: `npm run check:fast`
- [x] Manual check: Verify `claimListReward` passes the correct `contestId` into `toContestVoucher`.

**Dependencies:** None

**Files likely touched:**
- `lib/actions/question-list-actions.ts`
- `lib/actions/reward-actions.ts`
- `tests/reward-actions.test.ts`
- `tests/ecosystem-contest-actions.test.ts`

**Estimated scope:** Medium (3–4 files)

---

## Task 2: Fix Inverted Voucher Expiry Locking (Token & Contest)

**Description:** Fix the inverted expiry window in voucher settlement. In both `settlePendingTokenClaims` (`lib/actions/reward-actions.ts`) and `claimListReward` (`lib/actions/question-list-actions.ts`), pending claims were only marked `'expired'` when `claim.deadline + 300 < now`. Because smart contracts immediately reject transactions after `deadline`, this created a 5-minute lockout where users were continuously handed back expired vouchers that the blockchain rejected. This task changes the expiry check to mark claims `'expired'` immediately once `deadline <= now`.

**Acceptance criteria:**
- [x] `settlePendingTokenClaims` marks claims as `'expired'` when `!claim.deadline || Number(claim.deadline) <= now`.
- [x] `claimListReward` marks pending contest vouchers as `'expired'` when `!claim.deadline || Number(claim.deadline) <= now`.
- [x] Expired vouchers are never returned as open/active vouchers.
- [x] If a user calls `generateTokenVoucher` or `claimListReward` with an expired voucher in DB, it settles as expired and generates a fresh, valid voucher with new deadline and nonce.
- [x] Unit tests assert that vouchers past deadline are marked expired and not served to callers.

**Verification:**
- [x] Tests pass: `npx vitest run tests/reward-actions.test.ts tests/ecosystem-contest-actions.test.ts`
- [x] Build succeeds: `npm run check:fast`

**Dependencies:** None

**Files likely touched:**
- `lib/actions/reward-actions.ts`
- `lib/actions/question-list-actions.ts`
- `tests/reward-actions.test.ts`

**Estimated scope:** Small (2–3 files)

---

## Checkpoint: Phase 1
- [x] All contest vouchers use verified on-chain contest IDs regardless of creator wallet linking timing
- [x] Expired vouchers do not lock the user out from generating fresh vouchers
- [x] `npm run check:fast` passes
- [x] Focused tests pass

---

## Phase 2: Query Safety, Database Permissions & Economics Alignment

---

## Task 3: Add `created_by_user` Grant & Guard Empty `.in()` Queries

**Description:** Fix permission failures in anonymous discovery queries and prevent PostgREST syntax errors on empty contest attempts. `accounts.sql` added `created_by_user` foreign key on `questions` referencing `users(id)`, but forgot to grant `SELECT (created_by_user)` to `anon, authenticated`, causing PostgREST join queries in `getTopicQuestions` to fail. Additionally, `startListAttempt` executes `.in('question_id', questions.map(q => q.id))` without checking if `questions` is empty, generating invalid `question_id=in.()` query syntax.

**Acceptance criteria:**
- [x] Schema/migration SQL grants `SELECT (created_by_user)` on `questions` to `anon, authenticated`.
- [x] `startListAttempt` in `lib/actions/question-list-actions.ts` checks `if (questions.length === 0)` before running `.in('question_id', ...)` and returns empty answers cleanly.
- [x] `getTopicQuestions` in `lib/actions/discovery-actions.ts` runs cleanly with anonymous client permissions.
- [x] Unit tests verify `startListAttempt` handles zero-question contests without throwing.

**Verification:**
- [x] Tests pass: `npx vitest run tests/discovery.test.ts tests/ecosystem-contest-actions.test.ts`
- [x] Build succeeds: `npm run check:fast`

**Dependencies:** None

**Files likely touched:**
- `lib/schema.sql`
- `lib/sql/accounts.sql`
- `lib/actions/question-list-actions.ts`
- `tests/ecosystem-contest-actions.test.ts`

**Estimated scope:** Small (3 files)

---

## Task 4: Align Contest Reward Display Calculation with Settlement Math

**Description:** Align `perQuestionReward` calculation in `attachListMeta` with the actual contract and settlement math in `completeListAttempt`. `completeListAttempt` calculates reward per question as `(reward_pool / max_participants) / question_count`, but `attachListMeta` omitted dividing by `max_participants`, showing an inflated 10x reward on contest cards.

**Acceptance criteria:**
- [x] `attachListMeta` in `lib/actions/question-list-actions.ts` calculates `perQuestionReward` by dividing pool by `max_participants` (defaulting to 10) and then by `questionCount`.
- [x] If `max_participants` is not set on list, it uses safe default of 10.
- [x] If `questionCount` or `maxParticipants` is 0, safely returns `'0'`.
- [x] Unit tests verify `perQuestionReward` in `attachListMeta` equals the reward awarded for 1 correct question in `completeListAttempt`.

**Verification:**
- [x] Tests pass: `npx vitest run tests/ecosystem-contest-actions.test.ts`
- [x] Build succeeds: `npm run check:fast`

**Dependencies:** None

**Files likely touched:**
- `lib/actions/question-list-actions.ts`
- `tests/ecosystem-contest-actions.test.ts`

**Estimated scope:** Small (2 files)

---

## Checkpoint: Phase 2
- [x] Anonymous topic discovery loads without Postgres column permission errors
- [x] Empty contests do not trigger PostgREST 400 Bad Request exceptions
- [x] Displayed contest rewards match actual completed attempt payouts
- [x] `npm run check:fast` passes

---

## Phase 3: Lifeline Polish & Full Constraints Verification

---

## Task 5: Fix 50:50 Lifeline Fallback

**Description:** Fix the fallback behavior in `get5050EliminatedIndices` (`lib/actions/question-actions.ts`). Currently, when `supabaseAdmin` or query data is null, it returns hardcoded `[0, 1]`. If option 0 or 1 is the actual correct answer, returning `[0, 1]` would eliminate the correct choice for the player. This task ensures the fallback never eliminates a known option or fails gracefully without corrupting the question state.

**Acceptance criteria:**
- [x] `get5050EliminatedIndices` returns an empty array `[]` (or safe non-conflicting options) on error rather than hardcoded `[0, 1]`.
- [x] The client component handling 50:50 handles a failed or empty elimination gracefully.
- [x] Unit tests cover 50:50 deterministic hashing and error fallback.

**Verification:**
- [x] Tests pass: `npx vitest run tests/answer-and-list-guards.test.ts`
- [x] Build succeeds: `npm run check:fast`

**Dependencies:** None

**Files likely touched:**
- `lib/actions/question-actions.ts`
- `tests/answer-and-list-guards.test.ts`

**Estimated scope:** Small (2 files)

---

## Task 6: Full Regression Verification & Constraints Check

**Description:** Run all test suites, type-check, linter, and architectural boundary checks against the constraints defined in `CONSTRAINTS.md`. Ensure coverage thresholds and strict type-safety rules are fully satisfied before submitting changes for preview branch merge.

**Acceptance criteria:**
- [x] `npm run type-check` reports zero type errors.
- [x] `npm run lint` reports zero lint errors.
- [x] All Vitest test suites pass.
- [x] Code coverage complies with changed lines >= 80% and ratchet >= 62.5%.
- [x] No suppression comments (`@ts-ignore`, `eslint-disable`) added.

**Verification:**
- [x] `npm run check:fast` succeeds
- [x] `npm run check:task` succeeds

**Dependencies:** Tasks 1, 2, 3, 4, 5

**Files likely touched:**
- None (verification task)

**Estimated scope:** Small (0-1 files)

---

## Checkpoint: Complete
- [x] All 5 bug remediation tasks implemented and verified
- [x] Full regression suite passing
- [x] Ready for preview branch commit and CI verification
