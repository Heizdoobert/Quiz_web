# Tasks: Accounts, Discovery and Community

Plan: `tasks/accounts-discovery-community/plan.md`.

Every task's verification includes `npm run check:task`: type-check, lint, tests and coverage, with changed lines ≥ 80% (`CONSTRAINTS.md`). SQL scripts are written in the task but run only with your go-ahead, on a Supabase branch first; there is no local database.

## Phase 1: Identity — spec `docs/specs/identity-accounts.md`

Tasks 3-9 each move one path from wallet to account id. The old wallet columns stay filled for wallet accounts until Task 25, so the paths not yet moved keep working.

### Task 1: Accounts schema migration script
- Acceptance:
  - `users` gains `id UUID PK`, `auth_user_id UUID UNIQUE` and `wallet_linked_at`; `wallet_address` becomes nullable and unique
  - the 9 player-referencing tables gain a backfilled account column (FK to `users(id)`), and the old wallet columns become nullable. The column is `user_id` in `quiz_results`, `group_members`, `list_entries` and `reward_claims`; role-named elsewhere: `questions.created_by_user`, `question_disputes.reporter_user`, `groups.owner_user`, `question_lists.owner_user`, `question_list_confirmations.confirmer_user`. Unique constraints are mirrored on the new columns
  - the "Allow public insert for users" policy is dropped
- Verify: on a Supabase branch, row counts per table and `get_user_stats` per player are equal before and after, and a second run changes nothing (you run it).
- Files: `lib/sql/accounts.sql`, `lib/schema.sql`
- Depends: none. Size: M

### Task 2: Account session, and wallet sign-in creates an account
- Acceptance:
  - new `lib/session.ts`: `getSessionAccount()` and `setSessionAccount()`, with a `quiz_session` cookie (`accountId.exp.hmac`); tampered or expired cookies are rejected
  - `signInWithWallet` finds or creates the account for that wallet (`ensureAccountForWallet`, replacing `ensureUserRow`) and sets the cookie
  - `getSessionWallet()` in `lib/wallet-session.ts` temporarily returns `account.wallet`, so unmoved callers keep working
- Verify: `npx vitest run tests/identity-accounts.test.ts`
- Files: `lib/session.ts`, `lib/wallet-session.ts`, `lib/users.ts`, `lib/actions/auth-actions.ts`, `tests/identity-accounts.test.ts`
- Depends: 1. Size: M

### Task 3: Answers, history and personal stats on `user_id`
Answer, reload, and see your own stats, on account ids.
- Acceptance:
  - `submitAnswer` writes `user_id` (plus the wallet while that column exists)
  - `getAnswerHistory()` and `getUserStats()` take no address; a server-only `statsForAccount(id)` backs both and `reward-actions`; `get_user_stats` is re-keyed to `user_id`
  - `getOrCreateUser` and its call in `use-quiz-logic` are deleted: sign-in creates the account now
- Verify: `npx vitest run tests/answer-and-list-guards.test.ts tests/user-persistence.test.ts tests/use-quiz-logic-history.test.tsx tests/submit-answer-no-admin.test.ts`
- Files: `lib/actions/quiz-actions.ts`, `lib/actions/user-actions.ts`, `lib/sql/stats-functions.sql`, `hooks/quiz/use-quiz-logic.ts`, `lib/actions/reward-actions.ts` (import only), tests
- Depends: 2. Size: M

### Task 4: Leaderboards on `user_id`
- Acceptance:
  - `get_global_leaderboard` and `get_group_leaderboard` group by `user_id` and return `user_id, display_name, wallet_address, score, accuracy`
  - email accounts appear on leaderboards
  - rows are keyed by `user_id` in the UI
- Verify: an existing leaderboard test is extended if present, else a new `tests/leaderboard-actions.test.ts`
- Files: `lib/sql/stats-functions.sql`, `lib/actions/leaderboard-actions.ts`, `lib/types.ts`, `components/leaderboard/GlobalLeaderboard.tsx`, `GroupLeaderboard.tsx`
- Depends: 3. Size: S

### Task 5: Question creation and disputes on `user_id`
- Acceptance: `createQuestion` and `disputeQuestion` use `getSessionAccount()`, write `created_by_user` / `reporter_user`, and check the recorded answer by `user_id`; the 5-per-day and 3-dispute rules are unchanged.
- Verify: `npx vitest run tests/answer-and-list-guards.test.ts`
- Files: `lib/actions/question-actions.ts`, tests
- Depends: 2. Size: S

### Task 6: Lists and contests on `user_id`
- Acceptance:
  - list, review, contest and list-reward actions use `getSessionAccount()` and account ids
  - `getMyLists()` and `getListsPendingReview()` take no address, and their callers are updated
  - on-chain steps still use `account.wallet`
- Verify: `npx vitest run tests/answer-and-list-guards.test.ts`
- Files: `lib/actions/question-list-actions.ts`, `components/lists/MyListsDashboard.tsx`, `components/lists/ReviewQueue.tsx`, tests
- Depends: 2. Size: M

### Task 7: Groups on `user_id`
- Acceptance: group actions use `getSessionAccount()` and `user_id`; `getUserGroups()` takes no address.
- Verify: a new `tests/group-actions.test.ts` (create, join, list own)
- Files: `lib/actions/group-actions.ts`, `hooks/modals/use-group-modal.ts`, tests
- Depends: 2. Size: S

### Task 8: Profile export on `user_id`
- Acceptance: `exportUserData()` takes no address and exports only the session account's data; the `/profile` page is updated.
- Verify: `npx vitest run tests/profile-actions.test.ts tests/profile-page.test.tsx`
- Files: `lib/actions/profile-actions.ts`, `app/profile/page.tsx`, tests
- Depends: 2. Size: S

### Task 9: Rewards on `user_id`; delete `lib/wallet-session.ts`
- Acceptance:
  - `getClaimableRewards()`, the vouchers and `confirmRewardClaim()` take no wallet argument; the recipient is `account.wallet`, and `WALLET_REQUIRED` is returned without one
  - `lib/wallet-session.ts` is deleted, and grep finds `getSessionWallet` 0 times
- Verify: `npx vitest run tests/` plus grep
- Files: `lib/actions/reward-actions.ts`, `hooks/modals/use-rewards-modal.ts`, `hooks/quiz/use-quiz-logic.ts`, `components/lists/ContestPlay.tsx`, `lib/wallet-session.ts` (deleted)
- Depends: 3-8. Size: M

### Task 10: Client session provider and sign-in modal (wallet)
- Acceptance:
  - `getSessionInfo()` feeds a `SessionProvider` exposing `{ account, refresh, requireSignIn }`
  - `requireSignIn()` replaces `useWalletSession()`: it resolves `true` when signed in, otherwise opens `SignInModal` (wallet connect and SIWE for now) and resolves when done
  - the header shows "Sign in" or the account menu with sign-out, and `use-quiz-logic` gates on `account` instead of wagmi `isConnected`
- Verify: `npx vitest run tests/use-quiz-logic-history.test.tsx`, plus manual wallet sign-in, reload, sign-out
- Files: `hooks/shared/use-session.ts` (replaces `use-wallet-session.ts`), `components/auth/SignInModal.tsx`, `components/Providers.tsx`, `components/layout/Header.tsx`, `hooks/quiz/use-quiz-logic.ts`; the other 7 `useWalletSession` call sites get a mechanical rename
- Depends: 9. Size: M

### Task 11: Session-based gating on list, contest and profile pages
- Acceptance:
  - `/profile`, `/my-lists`, `/review` and the contest browser decide "signed in" from `useSession()`, not wagmi `useAccount`
  - on-chain actions check that the connected wallet equals `account.wallet`, otherwise they ask the player to switch wallets
- Verify: `npx vitest run tests/profile-page.test.tsx`, plus a manual check of each page signed out, as a wallet account and as an email account
- Files: `app/profile/page.tsx`, `components/lists/ContestBrowser.tsx`, `components/lists/MyListsDashboard.tsx`, `components/lists/ReviewQueue.tsx`, `components/lists/ContestPlay.tsx`
- Depends: 10. Size: M

### Task 12: Email code sign-in
- Acceptance:
  - `requestEmailCode` returns the same result for known and unknown emails
  - `verifyEmailCode` creates the account by `auth_user_id` and sets the session; a wrong or expired code does not
  - `SignInModal` adds "Continue with email" (email, then a 6-digit code) with the disclosure from `lib/rewards-copy.ts`
- Verify: `npx vitest run tests/identity-accounts.test.ts`, plus manual sign-in with a real email on a Supabase branch
- Files: `lib/actions/auth-actions.ts`, `lib/users.ts`, `components/auth/SignInModal.tsx`, `lib/rewards-copy.ts`, tests
- Depends: 10. Size: M

### Task 13: Add a wallet to an email account
- Acceptance:
  - `linkWallet` sets the wallet and `wallet_linked_at` after a valid SIWE signature for an account without a wallet
  - it returns `WALLET_IN_USE` for a wallet on another account
  - the header shows "Add wallet" only for accounts without one
- Verify: `npx vitest run tests/identity-accounts.test.ts`
- Files: `lib/actions/auth-actions.ts`, `components/auth/SignInModal.tsx`, `components/layout/Header.tsx`, tests
- Depends: 12. Size: S

### Checkpoint: Identity
- [ ] Gates and build pass; grep finds 0 uses of `getSessionWallet` and `useWalletSession`
- [ ] `accounts.sql` and `stats-functions.sql` on a Supabase branch: counts and scores unchanged (you)
- [ ] Manual: wallet sign-in, email sign-in, add wallet, sign out, reload; leaderboard shows both account kinds

## Phase 2: Trivia — spec `docs/specs/trivia-guest-access.md`

### Task 14: Public-question rule and retire sample questions
- Acceptance:
  - play serves only `status = 'verified' AND list_id IS NULL` (a rejected question is never served)
  - the seed block is removed from `lib/schema.sql`
  - `retire-sample-questions.sql` marks the 14 seed prompts `rejected` (matched by prompt and `created_by IS NULL`), deleting nothing
- Verify: `npx vitest run tests/trivia-guest-access.test.tsx`
- Files: `lib/actions/question-actions.ts`, `lib/schema.sql`, `lib/sql/retire-sample-questions.sql`, tests
- Depends: Phase 1. Size: S

### Task 15: Topics from the database
- Acceptance:
  - `get_topics()` and `getTopics()` return public topics grouped case-insensitively, newest first, with counts
  - `getPublicQuestion(id)` returns public questions only and no answer fields
  - `createQuestion` normalizes the category (trimmed, single spaces, 2-40 characters), and `CategoryBar` shows "All" plus the database topics
- Verify: `npx vitest run tests/trivia-guest-access.test.tsx`
- Files: `lib/sql/topics.sql`, `lib/actions/question-actions.ts`, `components/quiz/CategoryBar.tsx`, tests
- Depends: 14. Size: M

### Task 16: Signed-in creation and read-only guests
- Acceptance:
  - `QuestionForm` renders only for a session account, and the empty state asks guests to sign in
  - guests see no dispute button (`AnswerBack`), no "Create or Join Groups" (`LeaderboardPanel`), no My Lists or Review links (`ListsNav`), and no contest join (`ContestBrowser`)
  - guests can still play
- Verify: Testing Library cases for guest and signed-in, plus a manual check signed out
- Files: `components/quiz/QuizLayout.tsx`, `components/quiz/AnswerBack.tsx`, `components/leaderboard/LeaderboardPanel.tsx`, `components/lists/ListsNav.tsx`, `components/lists/ContestBrowser.tsx`
- Depends: 15. Size: M

### Checkpoint: Trivia
- [ ] Gates pass; a guest sees no write controls; `CategoryBar` shows database topics; no sample prompt is served

## Phase 3: Discovery — spec `docs/specs/discovery.md`

### Task 17: Question search
- Acceptance:
  - `search.sql` adds `pg_trgm`, trigram indexes and `search_questions()` (public only, `%` and `_` escaped)
  - `searchQuestions` bounds the query to 2-100 characters, with pages of 20
  - the header search box opens `/search?q=` (noindex)
- Verify: `npx vitest run tests/discovery.test.ts`, plus manual checks on a branch: "block" finds "blockchain", "etherum" finds "Ethereum"
- Files: `lib/sql/search.sql`, `lib/actions/discovery-actions.ts`, `components/discovery/SearchBox.tsx`, `app/search/page.tsx`, tests
- Depends: 15. Size: M

### Task 18: Topic pages and single-question play
- Acceptance:
  - `/topics` lists topics newest first with counts
  - `/topics/[topic]` lists questions newest first with "Play this topic"
  - `/q/[id]` plays one public question through `QuizCard`
- Verify: `npx vitest run tests/discovery.test.ts`, plus a manual check signed out
- Files: `app/topics/page.tsx`, `app/topics/[topic]/page.tsx`, `app/q/[id]/page.tsx`, `components/discovery/TopicList.tsx`, `lib/actions/discovery-actions.ts`
- Depends: 17. Size: M

## Phase 4: Community — spec `docs/specs/community.md`

### Task 19: Community tables and server actions
- Acceptance:
  - `community.sql` creates `question_ratings` and `question_comments` with RLS on and no public policies
  - every action enforces signed in, public question, recorded answer, not-author (for ratings and suggestions), and 20 per day, returning fixed codes
  - suggestions are returned only to their sender and the question's author
- Verify: `npx vitest run tests/community.test.ts` (one test per gate)
- Files: `lib/sql/community.sql`, `lib/actions/community-actions.ts`, `tests/community.test.ts`
- Depends: 14. Size: M

### Task 20: Ratings, comments and suggestions on the card back
- Acceptance:
  - after answering, `AnswerBack` shows the average and count, tap-to-rate stars, comments newest first with a 500-character box, and "Suggest a fix to the author"
  - guests see the average and comments without inputs
  - text renders as plain text
- Verify: `npx vitest run tests/community-ui.test.tsx`
- Files: `components/community/RatingStars.tsx`, `CommentList.tsx`, `SuggestionForm.tsx`, `components/quiz/AnswerBack.tsx`, tests
- Depends: 16, 19. Size: M

### Task 21: Suggestions for authors on `/profile`
- Acceptance: `/profile` lists suggestions on your own questions (prompt, suggestion, sender, date) with "Mark done", and never shows another author's.
- Verify: `npx vitest run tests/community-ui.test.tsx tests/profile-page.test.tsx`
- Files: `components/community/AuthorSuggestions.tsx`, `app/profile/page.tsx`, tests
- Depends: 19. Size: S

### Checkpoint: Discovery and Community
- [ ] Gates pass; first-load JS ≤ 150 kB per route (`CONSTRAINTS.md`)
- [ ] Manual: search signed out, browse topics, rate, comment and suggest after answering

## Phase 5: Rewards — spec `docs/specs/rewards-no-wallet-payee.md`

### Task 22: Payee rule and treasury sweep
- Acceptance:
  - claimable = 10 × (correct − `treasury_swept_count`) − claimed, for accounts with a wallet only
  - `sweep_to_treasury()` takes only answers over 180 days old from accounts without a wallet, is idempotent, and never lowers counts
  - the treasury account (`TREASURY_WALLET_ADDRESS`) sees its own amount plus the pool; nothing is swept when the variable is unset
- Verify: `npx vitest run tests/rewards-payee.test.ts`, plus an SQL sum check on a branch (player claimable + claimed + treasury = 10 × correct)
- Files: `lib/sql/reward-payee.sql`, `lib/actions/reward-actions.ts`, `tests/rewards-payee.test.ts`
- Depends: 9. Size: M

### Task 23: Disclosure, held balance and contest wallet requirement
- Acceptance:
  - the disclosure from `lib/rewards-copy.ts` shows in the email step, `RewardsModal` and the header for accounts without a wallet, with the held amount
  - `startContest` returns `WALLET_REQUIRED` without a wallet, and the join button says "Add a wallet to join contests"
  - badges earned before adding a wallet can be claimed after
- Verify: `npx vitest run tests/rewards-payee.test.ts`, plus Testing Library for the disclosure placements
- Files: `components/modals/RewardsModal.tsx`, `components/layout/Header.tsx`, `lib/actions/question-list-actions.ts`, `components/lists/ContestBrowser.tsx`, tests
- Depends: 13, 22. Size: M

### Checkpoint: Code complete
- [ ] Gates, contract tests (`cd contracts && npx hardhat test`) and build pass; bundle ≤ 150 kB per route
- [ ] Draft PR into `preview` once PR #9 has merged

## Phase 6: Rollout and cleanup

### Task 24: Production rollout (needs you)
- Acceptance:
  - Supabase Auth email provider on, with the OTP template showing `{{ .Token }}`
  - custom SMTP set, and `TREASURY_WALLET_ADDRESS` set in Production
  - SQL scripts 1-7 run in the plan's order, then deploy, then re-run the `accounts.sql` backfill
- Verify: on production, sign up with email, answer 3 questions, reload, add a wallet, claim; search, topics, rate and comment work signed out and signed in; the logs are clean.
- Files: none. Depends: 23. Size: S

### Task 25: Drop the old wallet columns
- Acceptance:
  - grep finds no code that reads or writes the old wallet columns
  - `accounts-drop-wallet-columns.sql` drops them and their constraints
  - `lib/schema.sql` matches
- Verify: gates pass; dry run on a branch, then you run it on production about a week after Task 24
- Files: `lib/sql/accounts-drop-wallet-columns.sql`, `lib/schema.sql`
- Depends: 24. Size: S

## Checkpoint: Complete
- [ ] Every success criterion in the five specs checked
- [ ] Human review before merging to `main`
