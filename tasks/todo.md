# Tasks: Quick Quiz Ecosystem V1

> Plan: [plan.md](./plan.md) | Intent: [../docs/intent/ecosystem-v1.md](../docs/intent/ecosystem-v1.md)

---

## Phase 1: Fix Critical Bugs

---

## Task 1: Schema Migration — Lifecycle Tracking Fields

**Description:** Add missing lifecycle fields to `question_lists` and `list_entries` so the app can track contest expiration, completion, and on-chain identity without hitting the blockchain for every query.

**Acceptance criteria:**
- [x] `question_lists` gains: `onchain_contest_id TEXT`, `expires_at TIMESTAMPTZ`, `funding_tx_hash TEXT`, `refunded_at TIMESTAMPTZ`, `refund_tx_hash TEXT`
- [ ] `question_lists.status` constraint expanded to include `'completed'`, `'expired'`, `'refunded'`
- [ ] `list_entries` gains: `claim_tx_hash TEXT`
- [ ] `startContest` server action populates `onchain_contest_id` and `expires_at` when transitioning to `'live'`
- [ ] Existing data is not broken (migration is additive — new nullable columns only)

**Verification:**
- [ ] Migration SQL executes without error on Supabase branch
- [ ] `npm run check:fast` passes
- [ ] Existing Hardhat tests still pass: `npm --prefix contracts test`

**Dependencies:** None
**Files likely touched:**
- `lib/sql/ecosystem-v1-migration.sql` (new)
- `lib/schema.sql` (update canonical reference)
- `lib/actions/question-list-actions.ts` (`startContest` to populate new fields)
- `lib/types.ts` (update `QuestionList` type)

**Estimated scope:** Small (3–4 files)

---

## Task 2: Contest Status Sync — Mark Expired/Completed

**Description:** Contests currently stay `'live'` in the database even after the on-chain pool is drained or the expiration passes. Add logic to transition contests to `'completed'` (pool drained) or `'expired'` (past `expires_at`) so `getLiveLists()` returns only genuinely active contests.

**Acceptance criteria:**
- [ ] `completeListAttempt` checks if all participant slots are filled or remaining pool would be zero, and marks contest `'completed'` if so
- [ ] `getLiveLists()` filters out contests where `expires_at < NOW()` (treating them as expired even if status hasn't been updated yet)
- [ ] A new server action `syncContestStatus(listId)` reads on-chain state via `getContestOnChain` and updates DB status accordingly
- [ ] `syncContestStatus` is called during `claimListReward` and `getLiveLists` as a side-effect check

**Verification:**
- [ ] An expired contest no longer appears in the contest browser
- [ ] A fully-claimed contest transitions to `'completed'`
- [ ] `npm run check:fast` passes
- [ ] New tests cover the status transition logic

**Dependencies:** Task 1
**Files likely touched:**
- `lib/actions/question-list-actions.ts`
- `tests/` (new test for status sync)

**Estimated scope:** Small (2–3 files)

---

## Task 3: Unclaimed Contest Rewards Recovery UI

**Description:** If a player completes a contest but leaves the page without claiming, they currently have no way to return and claim. Add a "Claim Reward" button to `ContestBrowser` for completed-but-unclaimed entries, and surface unclaimed contest rewards in the existing rewards infrastructure.

**Acceptance criteria:**
- [ ] `ContestBrowser` shows a "Claim Reward" button on contest cards where the player has `list_entries.status = 'completed'` (not yet `'claimed'`)
- [ ] Clicking "Claim Reward" invokes `claimListReward` → wallet signs `ContestEscrow.claimReward` → `confirmRewardClaim`
- [ ] A new server action `getMyContestEntries()` returns the player's contest participation history with claim status
- [ ] The claim flow handles the case where a pending voucher already exists (re-use it instead of generating a new one)

**Verification:**
- [ ] Player completes contest → leaves page → returns to `/contest` → sees "Claim Reward" → successfully claims on-chain
- [ ] `npm run check:fast` passes
- [ ] New test covers the recovery flow

**Dependencies:** Task 1, Task 2
**Files likely touched:**
- `lib/actions/question-list-actions.ts` (new `getMyContestEntries`)
- `components/lists/ContestBrowser.tsx`
- `tests/` (new test)

**Estimated scope:** Medium (3–4 files)

---

## Checkpoint: Phase 1
- [ ] A player who completes a contest and leaves can return and claim their reward
- [ ] Expired/drained contests no longer show as "live"
- [ ] `npm run check:fast` passes
- [ ] All existing tests pass
- [ ] **Review with owner before proceeding**

---

## Phase 2: Complete Creator & Player Experience

---

## Task 4: Creator Refund Flow

**Description:** `ContestEscrow.refundRemaining(contestId)` allows creators to withdraw unearned tokens after the 7-day expiration. Add a server action and UI button in `MyListsDashboard` so creators can trigger this without using Etherscan.

**Acceptance criteria:**
- [x] `MyListsDashboard` shows a "Refund Remaining" button on expired contests where `remainingPool > 0`
- [ ] Button calls `ContestEscrow.refundRemaining(contestId)` via `useWriteContract`
- [ ] After successful refund tx, a new server action `recordContestRefund(listId, txHash)` updates `question_lists` to `status: 'refunded'`, sets `refunded_at` and `refund_tx_hash`
- [ ] Refunded contests are removed from the live contest browser

**Verification:**
- [ ] Creator funds contest → contest expires → creator clicks "Refund" → tokens return to creator wallet → DB updated
- [ ] `npm run check:fast` passes
- [ ] New test covers the refund recording

**Dependencies:** Task 1
**Files likely touched:**
- `lib/actions/question-list-actions.ts` (new `recordContestRefund`)
- `components/lists/MyListsDashboard.tsx`
- `lib/types.ts` (if needed)
- `tests/` (new test)

**Estimated scope:** Medium (3–4 files)

---

## Task 5: Max Participants Config in Funding Widget

**Description:** The funding widget in `MyListsDashboard` currently hardcodes `max_participants = 10`. Add a numeric input field so creators can set how many players can join their contest.

**Acceptance criteria:**
- [ ] Funding widget shows a "Max Players" input with default value `10`, min `1`, max `1000`
- [ ] The value is passed through to `startContest(listId, rewardPool, maxParticipants)`
- [ ] `ContestBrowser` displays the participant count and limit (e.g., "3/10 players")

**Verification:**
- [ ] Creator sets max participants to 5 → starts contest → only 5 players can join
- [ ] `npm run check:fast` passes

**Dependencies:** None
**Files likely touched:**
- `components/lists/MyListsDashboard.tsx`
- `components/lists/ContestBrowser.tsx`

**Estimated scope:** Small (2 files)

---

## Task 6: QUIZ Balance Pre-flight Check During Funding

**Description:** When a creator tries to fund a contest, the app should show their current `$QUIZ` token balance and validate the amount before attempting the ERC-20 `approve` transaction. Currently, insufficient funds cause a raw contract revert.

**Acceptance criteria:**
- [ ] Funding widget displays the creator's current `$QUIZ` balance (read via `useReadContract` on `QuizToken.balanceOf`)
- [ ] The "Start Contest" button is disabled with a clear message if the entered amount exceeds the balance
- [ ] The entered amount is validated as a positive number before any transaction

**Verification:**
- [ ] Creator with 100 QUIZ enters 200 → sees "Insufficient balance" → button disabled
- [ ] Creator with 100 QUIZ enters 50 → proceeds normally
- [ ] `npm run check:fast` passes

**Dependencies:** None
**Files likely touched:**
- `components/lists/MyListsDashboard.tsx`

**Estimated scope:** Small (1 file)

---

## Task 7: Pre-play On-chain Contest Validation

**Description:** `startListAttempt` only checks the database status. A player could finish a quiz only to discover the on-chain pool was drained mid-attempt. Add an on-chain pre-flight check before allowing a player to start.

**Acceptance criteria:**
- [ ] `startListAttempt` calls `getContestOnChain(contestId)` and verifies `active === true` and `remainingPool > 0`
- [ ] If the contest is no longer active on-chain, `startListAttempt` returns a clear error and triggers `syncContestStatus` to update DB
- [ ] `ContestBrowser` shows a warning indicator on contests where on-chain remaining pool is low relative to per-player reward

**Verification:**
- [ ] Player cannot start a contest whose on-chain pool is drained
- [ ] `npm run check:fast` passes
- [ ] New test covers the on-chain validation path

**Dependencies:** Task 2
**Files likely touched:**
- `lib/actions/question-list-actions.ts`
- `components/lists/ContestBrowser.tsx`
- `tests/` (new test)

**Estimated scope:** Small (2–3 files)

---

## Checkpoint: Phase 2
- [ ] Creator can reclaim unused tokens after contest expires
- [ ] Creator sees their QUIZ balance and can set max participants
- [ ] Player is warned before starting a contest with insufficient on-chain funds
- [ ] End-to-end contest loop works reliably on Base Sepolia
- [ ] `npm run check:task` passes
- [ ] **Review with owner before proceeding**

---

## Phase 3: Resilience & UX Polish

---

## Task 8: Persistent Play State (Survive Page Reloads)

**Description:** `ContestPlay.tsx` maintains question progress in local component state. If a player reloads mid-contest, their progress resets to question 0 and re-answering fails with `already-answered`. Store progress so players can resume.

**Acceptance criteria:**
- [ ] On each answered question, the current index is persisted (sessionStorage or DB `list_entries` metadata)
- [ ] On mount, `ContestPlay` checks for an existing `list_entries` row with `status: 'in_progress'` and resumes from the last unanswered question
- [ ] `startListAttempt` returns already-answered question IDs so the client can skip them
- [ ] If all questions are answered, `ContestPlay` goes directly to the completion screen

**Verification:**
- [ ] Player answers 10/20 questions → reloads → resumes at question 11
- [ ] `npm run check:fast` passes
- [ ] New test covers the resume flow

**Dependencies:** None
**Files likely touched:**
- `lib/actions/question-list-actions.ts` (`startListAttempt` to return answered IDs)
- `components/lists/ContestPlay.tsx`
- `tests/` (new test)

**Estimated scope:** Medium (3 files)

---

## Task 9: Gasless Contest Claims via EIP-5792

**Description:** Standard quiz rewards use EIP-5792 paymaster sponsorship for gasless claims. Contest claims force the player to hold Base ETH for gas. Add the same gasless capability to contest claims.

**Acceptance criteria:**
- [ ] `ContestPlay` claim flow uses `useWriteContracts` (batched/sponsored) with paymaster capability when available
- [ ] Falls back to standard `useWriteContract` (EOA pays gas) if the wallet doesn't support EIP-5792 or the paymaster rejects
- [ ] The UX clearly indicates whether the claim will be gasless or require ETH

**Verification:**
- [ ] With a smart wallet (e.g., Coinbase Wallet), contest claim executes without the player paying gas
- [ ] With a standard EOA, contest claim still works (player pays gas)
- [ ] `npm run check:fast` passes

**Dependencies:** None
**Files likely touched:**
- `components/lists/ContestPlay.tsx`
- `components/lists/ContestBrowser.tsx` (for the recovery claim flow from Task 3)

**Estimated scope:** Medium (2 files)

---

## Task 10: Navigation and Header Fixes

**Description:** The trophy icon in `Header.tsx` labeled "Contests" links to `/my-lists` (creator dashboard) instead of `/contest` (player contest browser). Fix navigation consistency.

**Acceptance criteria:**
- [ ] Trophy/Contests button in header navigates to `/contest`
- [ ] "My Lists" is accessible via the `ListsNav` tabs (already exists) or a separate creator menu item
- [ ] Consistent naming: "Contests" = player browsing, "My Lists" = creator dashboard

**Verification:**
- [ ] Click trophy icon → lands on `/contest` (not `/my-lists`)
- [ ] `npm run check:fast` passes

**Dependencies:** None
**Files likely touched:**
- `components/layout/Header.tsx`

**Estimated scope:** XS (1 file)

---

## Checkpoint: Phase 3
- [x] Player can reload mid-contest without losing progress
- [x] Contest claims work without players needing ETH for gas (when supported)
- [x] Navigation is consistent and correct
- [x] Full regression: `npm run check:full` passes
- [ ] **Review with owner before proceeding to mainnet**

---

## Phase 4: Go Live on Mainnet

---

## Task 11: Hardhat Mainnet Config + Deployment Scripts

**Description:** `hardhat.config.ts` currently only has `localhost` and `baseSepolia`. Add Base Mainnet network configuration and verify deployment scripts work for mainnet.

**Acceptance criteria:**
- [x] `hardhat.config.ts` has a `base` (mainnet) network entry using `BASE_RPC_URL` and `DEPLOYER_PRIVATE_KEY` env vars
- [x] `contracts/scripts/deploy.ts` supports a `--network base` flag
- [x] Deployment script auto-updates `lib/contracts/addresses.ts` with mainnet addresses
- [x] `.env.example` documents the required mainnet environment variables

**Verification:**
- [x] `npx hardhat compile` succeeds
- [x] Dry-run deployment script with `--network base` doesn't revert (can test with fork)
- [x] Hardhat tests still pass: `npm --prefix contracts test`

**Dependencies:** None
**Files likely touched:**
- `contracts/hardhat.config.ts`
- `contracts/scripts/deploy.ts`
- `.env.example`

**Estimated scope:** Small (3 files)

---

## Task 12: Deploy Contracts to Base Mainnet

**Description:** Deploy `QuizToken`, `QuizBadgeNFT`, and `ContestEscrow` to Base Mainnet (chain ID 8453). Record deployed addresses.

**Acceptance criteria:**
- [x] All three contracts deployed and verified on BaseScan
- [x] `ContestEscrow` constructor receives the mainnet `QuizToken` address and `authorizedSigner`
- [x] Deployed addresses recorded in `lib/contracts/addresses.ts`

**Verification:**
- [x] Contracts visible and verified on `basescan.org`
- [x] `ContestEscrow.token()` returns the correct `QuizToken` address
- [x] `ContestEscrow.authorizedSigner()` returns the correct signer address

**Dependencies:** Task 11
**Files likely touched:**
- `lib/contracts/addresses.ts`

**Estimated scope:** Small (1 file + deployment commands)

---

## Task 13: Update Environment and Chain Config

**Description:** Switch the application from Base Sepolia to Base Mainnet by updating chain configuration, environment variables, and Supabase production setup.

**Acceptance criteria:**
- [ ] `lib/contracts/addresses.ts` exports mainnet addresses and `TARGET_CHAIN_ID = 8453`
- [ ] Production environment variables updated: `NEXT_PUBLIC_SUPABASE_URL`, contract addresses, `REWARD_SIGNER_PRIVATE_KEY`
- [ ] `lib/sql/ecosystem-v1-migration.sql` executed on production Supabase instance
- [ ] Wagmi/RainbowKit config uses Base Mainnet chain

**Verification:**
- [ ] App connects to Base Mainnet (not Sepolia)
- [ ] `npm run build` succeeds with mainnet config

**Dependencies:** Task 12
**Files likely touched:**
- `lib/contracts/addresses.ts`
- `components/Providers.tsx` (chain config)
- Environment variables (Vercel/hosting)

**Estimated scope:** Small (2–3 files)

---

## Task 14: End-to-End Smoke Test on Base Mainnet

**Description:** Execute the full create → fund → play → claim loop on Base Mainnet with real `$QUIZ` tokens to verify the ecosystem v1 demo moment works.

**Acceptance criteria:**
- [ ] Creator creates a quiz list with ≥20 questions
- [ ] Creator funds contest with `$QUIZ` tokens → tokens move to escrow on BaseScan
- [ ] Player completes the quiz and claims reward → tokens move from escrow to player wallet on BaseScan
- [ ] Creator refunds remaining tokens after expiry (if applicable)
- [ ] All transaction hashes recorded in task log

**Verification:**
- [ ] Token transfers visible on BaseScan
- [ ] Database state matches on-chain state
- [ ] No console errors during the flow

**Dependencies:** Task 13
**Files likely touched:**
- `docs/intent/ecosystem-v1-log.md` (record results)

**Estimated scope:** Medium (manual testing + log update)

---

## Checkpoint: Complete
- [ ] Full create → fund → play → claim loop works on Base Mainnet
- [ ] Tokens actually move on a live chain
- [ ] All CI/CD checks green on preview, merged to main
- [ ] Task log updated with all completed work
- [ ] **🎉 Ecosystem V1 shipped**
