# Tasks: Accounts, Discovery and Community

Plan: `tasks/accounts-discovery-community/plan.md`.

Every task's verification includes `npm run check:task`: type-check, lint, tests and coverage, with changed lines ≥ 80% (`CONSTRAINTS.md`). SQL scripts are written in the task but run only with your go-ahead.

## Phase 1: Identity — spec `docs/specs/identity-accounts.md`

### Task 1: Accounts schema migration script
Write the additive migration that makes the account id the key.
- Acceptance:
  - `users` gains `id UUID PK`, `auth_user_id UUID UNIQUE` and `wallet_linked_at`; `wallet_address` becomes nullable and stays unique
  - the 9 player-referencing tables gain a backfilled `user_id` (FK to `users(id)`) with unique constraints mirrored, and old wallet columns become nullable
  - the "Allow public insert for users" policy is dropped
  - the script is idempotent (running it twice changes nothing)
- Verify: dry run on a Supabase branch or copy, with row counts per table and `get_user_stats` per player equal before and after (you run it).
- Files: `lib/sql/accounts.sql`, `lib/schema.sql`
- Depends: none. Size: M

### Task 2: Account session, and wallet sign-in creates an account
- Acceptance:
  - `getSessionAccount()` reads a `quiz_session` cookie (`accountId.exp.hmac`) and rejects tampered or expired values
  - `signInWithWallet` finds or creates the account with that wallet and sets the cookie
  - `getSessionWallet()` is kept temporarily, returning `account.wallet`
- Verify: `npx vitest run tests/identity-accounts.test.ts`
- Files: `lib/wallet-session.ts`, `lib/users.ts`, `lib/actions/auth-actions.ts`, `tests/identity-accounts.test.ts`, `tests/user-persistence.test.ts`
- Depends: 1. Size: M

### Task 3: Trivia actions and stats on `user_id`
- Acceptance:
  - `submitAnswer`, `getAnswerHistory`, `createQuestion`, `disputeQuestion` and `getOrCreateUser` use `getSessionAccount()` and write and read `user_id` (plus the wallet column while it exists)
  - `stats-functions.sql` is keyed by `user_id` and leaderboards return display name and wallet
  - existing PR #9 tests still pass
- Verify: `npx vitest run tests/answer-and-list-guards.test.ts tests/user-persistence.test.ts`
- Files: `lib/actions/quiz-actions.ts`, `lib/actions/question-actions.ts`, `lib/actions/user-actions.ts`, `lib/sql/stats-functions.sql`, tests
- Depends: 2. Size: M

### Task 4: Lists and groups on `user_id`
- Acceptance: every list, contest, review and group action resolves the player with `getSessionAccount()` and uses `user_id`; ownership checks compare account ids.
- Verify: `npx vitest run tests/answer-and-list-guards.test.ts`
- Files: `lib/actions/question-list-actions.ts`, `lib/actions/group-actions.ts`, tests
- Depends: 3. Size: M

### Task 5: Profile, rewards and leaderboards on `user_id`; remove `getSessionWallet`
- Acceptance:
  - profile, reward and leaderboard actions use `getSessionAccount()` and `user_id`
  - `getSessionWallet` is deleted (grep = 0) and `lib/wallet-session.ts` is renamed `lib/session.ts`, with all importers updated
  - the voucher recipient is `account.wallet`
- Verify: `npx vitest run tests/profile-actions.test.ts`, then grep `getSessionWallet` returns nothing.
- Files: `lib/actions/profile-actions.ts`, `lib/actions/reward-actions.ts`, `lib/actions/leaderboard-actions.ts`, `lib/session.ts`, importers (mechanical rename)
- Depends: 4. Size: M

### Task 6: Client session state from the server
- Acceptance:
  - `getSessionInfo()` returns `{ account: { displayName, wallet } | null }`
  - `useSession()` exposes it app-wide and refreshes after sign-in and sign-out
  - `use-quiz-logic` and the header gate on the session, not wagmi `isConnected`, and actions no longer take an `address` argument
- Verify: `npx vitest run tests/use-quiz-logic-history.test.tsx`, plus manual wallet sign-in, reload, sign-out
- Files: `hooks/shared/use-session.ts`, `components/Providers.tsx`, `hooks/quiz/use-quiz-logic.ts`, `components/layout/Header.tsx`, `lib/actions/auth-actions.ts`
- Depends: 5. Size: M

### Task 7: Email code sign-in
- Acceptance:
  - `requestEmailCode` returns the same result for known and unknown emails
  - `verifyEmailCode` creates the account by `auth_user_id` and sets the session; a wrong or expired code does not
  - `SignInModal` offers "Continue with email" (email field, then code field, with the disclosure from `lib/rewards-copy.ts`) and "Connect wallet"
- Verify: `npx vitest run tests/identity-accounts.test.ts`, plus manual sign-in with a real email on a Supabase branch
- Files: `lib/actions/auth-actions.ts`, `lib/users.ts`, `components/auth/SignInModal.tsx`, `lib/rewards-copy.ts`, tests
- Depends: 6. Size: M

### Task 8: Add a wallet to an email account
- Acceptance:
  - `linkWallet` sets the wallet and `wallet_linked_at` after a valid SIWE signature for an account with no wallet
  - it returns `WALLET_IN_USE` for a wallet on another account
  - the header shows "Add wallet" only for accounts without a wallet
- Verify: `npx vitest run tests/identity-accounts.test.ts`
- Files: `lib/actions/auth-actions.ts`, `components/auth/SignInModal.tsx`, `components/layout/Header.tsx`, tests
- Depends: 7. Size: S

### Checkpoint: Identity
- [ ] Gates and build pass
- [ ] `accounts.sql` and `stats-functions.sql` dry run on a branch or copy: counts and scores unchanged (you)
- [ ] Manual: wallet sign-in, email sign-in, add wallet, sign out, reload

## Phase 2: Trivia — spec `docs/specs/trivia-guest-access.md`

### Task 9: Public-question rule and retire sample questions
- Acceptance:
  - play serves only `status = 'verified' AND list_id IS NULL` (a rejected question is never served)
  - the seed block is removed from `lib/schema.sql`
  - `retire-sample-questions.sql` marks the 14 seed prompts `rejected` (matched by prompt and `created_by IS NULL`) without deleting them
- Verify: `npx vitest run tests/trivia-guest-access.test.tsx`
- Files: `lib/actions/question-actions.ts`, `lib/schema.sql`, `lib/sql/retire-sample-questions.sql`, tests
- Depends: Phase 1. Size: S

### Task 10: Topics from the database
- Acceptance:
  - `get_topics()` and `getTopics()` return public topics grouped case-insensitively, newest first, with counts
  - `getPublicQuestion(id)` returns only public questions and no answer fields
  - `createQuestion` normalizes the category (trimmed, single spaces, 2-40 characters), and `CategoryBar` shows "All" plus the database topics
- Verify: `npx vitest run tests/trivia-guest-access.test.tsx`
- Files: `lib/sql/topics.sql`, `lib/actions/question-actions.ts`, `components/quiz/CategoryBar.tsx`, tests
- Depends: 9. Size: M

### Task 11: Signed-in creation and read-only guests
- Acceptance:
  - `QuestionForm` renders only for a session account
  - the empty state asks a guest to sign in
  - every write control (dispute, contest join, group and list create, claim) is hidden for guests, and guests can still play
- Verify: Testing Library cases for guest and signed-in, plus a manual check signed out
- Files: `components/quiz/QuizLayout.tsx`, `components/quiz/QuizCard.tsx`, `components/quiz/AnswerBack.tsx`, `components/layout/Sidebar.tsx`, tests
- Depends: 10. Size: M

## Phase 3: Discovery — spec `docs/specs/discovery.md`

### Task 12: Question search
- Acceptance:
  - `search.sql` enables `pg_trgm`, adds trigram indexes and `search_questions()` (public questions only, `%` and `_` escaped)
  - `searchQuestions` bounds the query to 2-100 characters and pages of 20
  - the header search box opens `/search?q=` (noindex) with result cards
- Verify: `npx vitest run tests/discovery.test.ts`, plus manual checks on a copy: "block" finds "blockchain", "etherum" finds "Ethereum"
- Files: `lib/sql/search.sql`, `lib/actions/discovery-actions.ts`, `components/discovery/SearchBox.tsx`, `app/search/page.tsx`, tests
- Depends: 10. Size: M

### Task 13: Topic pages and single-question play
- Acceptance:
  - `/topics` lists topics newest first with counts
  - `/topics/[topic]` lists questions newest first with "Play this topic"
  - `/q/[id]` plays one public question through `QuizCard`
- Verify: `npx vitest run tests/discovery.test.ts`, plus manual checks signed out
- Files: `app/topics/page.tsx`, `app/topics/[topic]/page.tsx`, `app/q/[id]/page.tsx`, `components/discovery/TopicList.tsx`, `lib/actions/discovery-actions.ts`
- Depends: 12. Size: M

## Phase 4: Community — spec `docs/specs/community.md`

### Task 14: Community tables and server actions
- Acceptance:
  - `community.sql` creates `question_ratings` and `question_comments` with RLS on and no public policies
  - every action enforces signed in, public question, recorded answer, not-author (for ratings and suggestions), and 20 per day, with fixed codes
  - suggestions are returned only to their sender and the question's author
- Verify: `npx vitest run tests/community.test.ts` (one test per gate)
- Files: `lib/sql/community.sql`, `lib/actions/community-actions.ts`, `tests/community.test.ts`
- Depends: Phase 1, 9. Size: M

### Task 15: Ratings, comments and suggestions on the card back
- Acceptance:
  - after answering, `AnswerBack` shows the average and count, a tap-to-rate star row, comments newest first with a 500-character box, and "Suggest a fix to the author"
  - guests see the average and comments without inputs
  - user text renders as plain text
- Verify: `npx vitest run tests/community-ui.test.tsx`
- Files: `components/community/RatingStars.tsx`, `CommentList.tsx`, `SuggestionForm.tsx`, `components/quiz/AnswerBack.tsx`, tests
- Depends: 11, 14. Size: M

### Task 16: Suggestions for authors on `/profile`
- Acceptance: `/profile` lists suggestions on the player's own questions (prompt, suggestion, sender, date) with "Mark done", and never shows another author's suggestions.
- Verify: `npx vitest run tests/community-ui.test.tsx tests/profile-page.test.tsx`
- Files: `components/community/AuthorSuggestions.tsx`, `app/profile/page.tsx`, tests
- Depends: 14. Size: S

## Phase 5: Rewards — spec `docs/specs/rewards-no-wallet-payee.md`

### Task 17: Payee rule and treasury sweep
- Acceptance:
  - claimable = 10 × (correct − `treasury_swept_count`) − claimed, for accounts with a wallet only
  - `sweep_to_treasury()` takes only answers older than 180 days from accounts without a wallet, is idempotent, and never lowers counts
  - the treasury account (`TREASURY_WALLET_ADDRESS`) sees its own amount plus the pool, and nothing is swept when the variable is unset
- Verify: `npx vitest run tests/rewards-payee.test.ts`, plus an SQL sum check on a copy (player claimable + claimed + treasury = 10 × correct)
- Files: `lib/sql/reward-payee.sql`, `lib/actions/reward-actions.ts`, `tests/rewards-payee.test.ts`
- Depends: 5. Size: M

### Task 18: Disclosure, held balance and contest wallet requirement
- Acceptance:
  - the disclosure from `lib/rewards-copy.ts` shows in the email step, `RewardsModal` and the header for accounts without a wallet, with the held amount
  - `startContest` returns `WALLET_REQUIRED` without a wallet, and the join button says "Add a wallet to join contests"
  - badges earned before adding a wallet can be claimed after
- Verify: `npx vitest run tests/rewards-payee.test.ts`, plus Testing Library for the disclosure placements
- Files: `components/modals/RewardsModal.tsx`, `components/layout/Header.tsx`, `lib/actions/question-list-actions.ts`, `components/lists/ContestBrowser.tsx`, tests
- Depends: 8, 17. Size: M

### Checkpoint: Code complete
- [ ] Gates, contract tests (`cd contracts && npx hardhat test`) and build pass; bundle ≤ 150 kB per route
- [ ] Draft PR into `preview` once PR #9 has merged

## Phase 6: Rollout and cleanup

### Task 19: Production rollout (needs you)
- Acceptance:
  - Supabase Auth email provider on, with the OTP email template showing `{{ .Token }}`
  - custom SMTP set, and `TREASURY_WALLET_ADDRESS` set in Production
  - SQL scripts 1-7 run in the plan's order, then deploy, then re-run the `accounts.sql` backfill
- Verify: on production, sign up with email, answer 3 questions, reload (still there), add a wallet, claim; search, topics, rate and comment work signed out and signed in. Logs show no `submitAnswer insert error` or `ensureAccount` errors.
- Files: none. Depends: 18. Size: S

### Task 20: Drop the old wallet columns
- Acceptance:
  - no code reads or writes the old wallet columns (grep)
  - `accounts-drop-wallet-columns.sql` drops them and their constraints
  - `lib/schema.sql` matches
- Verify: gates pass; dry run on a copy, then you run it on production about a week after Task 19
- Files: `lib/sql/accounts-drop-wallet-columns.sql`, `lib/schema.sql`
- Depends: 19. Size: S

## Checkpoint: Complete
- [ ] Every success criterion in the five specs checked
- [ ] Human review before merging to `main`
