# Tasks: Accounts, Discovery and Community

Plan: `tasks/accounts-discovery-community/plan.md`.

Every task's verification includes `npm run check:task`: type-check, lint, tests and coverage, with changed lines ≥ 80% (`CONSTRAINTS.md`). SQL scripts are written in the task but run only with your go-ahead, on a Supabase branch first; there is no local database.

## Phase 1: Identity — spec `docs/specs/identity-accounts.md`

Tasks 3-9 each move one path from wallet to account id. The old wallet columns stay filled for wallet accounts until Task 25, so the paths not yet moved keep working.

### Task 1: Accounts schema migration script — done
Result:
- `lib/sql/accounts.sql` also adds the `bridge_wallet_account` insert trigger, so old and new code can write side by side and no backfill re-run is needed after deploy.
- Verified with `bash tests/sql/run-accounts-migration.sh` (Docker, throwaway `postgres:16-alpine`, every existing script plus test data):
  - row counts, `get_user_stats` and both leaderboards are identical before and after
  - a second run changes nothing
  - trigger, unique and upsert checks pass
- Still to do: your run on a Supabase branch.

- Acceptance:
  - `users` gains `id UUID PK`, `auth_user_id UUID UNIQUE` and `wallet_linked_at`; `wallet_address` becomes nullable and unique
  - the 9 player-referencing tables gain a backfilled account column (FK to `users(id)`), and the old wallet columns become nullable. The column is `user_id` in `quiz_results`, `group_members`, `list_entries` and `reward_claims`; role-named elsewhere: `questions.created_by_user`, `question_disputes.reporter_user`, `groups.owner_user`, `question_lists.owner_user`, `question_list_confirmations.confirmer_user`. Unique constraints are mirrored on the new columns
  - the "Allow public insert for users" policy is dropped
- Verify: on a Supabase branch, row counts per table and `get_user_stats` per player are equal before and after, and a second run changes nothing (you run it).
- Files: `lib/sql/accounts.sql`, `lib/schema.sql` (public insert policy removed), `README.md` (setup step). `schema.sql` itself is folded to the final shape in Task 25.
- Depends: none. Size: M

### Task 2: Account session, and wallet sign-in creates an account — done
Result:
- The cookie carries `accountId.wallet-or-dash.exp.hmac`, so actions read the wallet without a lookup.
- Sign-in now fails, instead of setting a session, when the account can't be created.
- `tests/identity-accounts.test.ts` has 16 tests; its tamper tests fail when the HMAC check is removed.
- 79/79 tests pass; `lib/session.ts` has 100% line coverage.

- Acceptance:
  - new `lib/session.ts`: `getSessionAccount()` and `setSessionAccount()`, with a `quiz_session` cookie (`accountId.exp.hmac`); tampered or expired cookies are rejected
  - `signInWithWallet` finds or creates the account for that wallet (`ensureAccountForWallet`, replacing `ensureUserRow`) and sets the cookie
  - `getSessionWallet()` in `lib/wallet-session.ts` temporarily returns `account.wallet`, so unmoved callers keep working
- Verify: `npx vitest run tests/identity-accounts.test.ts`
- Files: `lib/session.ts`, `lib/wallet-session.ts`, `lib/users.ts`, `lib/actions/auth-actions.ts`, `tests/identity-accounts.test.ts`
- Depends: 1. Size: M

### Task 3: Answers, history and personal stats on `user_id` — done
Result:
- `getAnswerHistory()` and `getUserStats()` take no argument now; both read `getSessionAccount()`. `submitAnswer` writes `user_id` and `wallet_address` (the trigger would fill the wallet in anyway; writing it directly keeps old readers correct until it's dropped).
- New `lib/stats.ts`: `statsForAccount(accountId)`, backing `getUserStats()` directly. `reward-actions.getClaimableRewards` still takes a wallet (unmoved until Task 9), so it resolves the account with a new `accountIdForWallet(wallet)` in `lib/users.ts` (public key, read-only) before calling `statsForAccount` — one extra lookup beyond the plan's "import only" note, kept because stats have one source of truth now instead of a second wallet-keyed aggregation path.
- `get_user_stats` is re-keyed to `p_user UUID`; the old `p_wallet TEXT` overload from prior deploys is untouched dead weight until Task 25 drops it. `lib/sql/accounts.sql` also now hides `auth_user_id` from the public key (`GRANT SELECT (id, wallet_address, display_name, created_at)`).
- `lib/actions/user-actions.ts` (`getOrCreateUser`) is deleted, and its call in `use-quiz-logic` is gone; sign-in creates the account.
- `tests/sql/run-accounts-migration.sh` now loads a frozen wallet-keyed `get_user_stats` fixture first (mirroring a real upgrade) and checks stats parity between the two overloads, plus the anon column grant; both checks fail under mutation.
- 4 new test files (`stats.test.ts`, `account-id-for-wallet.test.ts`, `get-claimable-rewards.test.ts` plus updates to `answer-and-list-guards.test.ts`); 84/84 tests pass, `npm run check:task` clean, changed lines in `quiz-actions.ts`/`lib/stats.ts`/`lib/users.ts` covered, `reward-actions.ts`'s two changed lines covered including both ternary branches.

Acceptance:
- `submitAnswer` writes `user_id` (plus the wallet while that column exists)
- `getAnswerHistory()` and `getUserStats()` take no address; a server-only `statsForAccount(id)` backs both and `reward-actions`; `get_user_stats` is re-keyed to `user_id`
- `getOrCreateUser` and its call in `use-quiz-logic` are deleted: sign-in creates the account now. With that `select('*')` gone, the public key's `SELECT` on `users` is limited to `id, wallet_address, display_name, created_at`, so `auth_user_id` is hidden
- Verify: `npx vitest run tests/answer-and-list-guards.test.ts tests/use-quiz-logic-history.test.tsx tests/submit-answer-no-admin.test.ts`
- Files: `lib/actions/quiz-actions.ts`, `lib/actions/user-actions.ts` (deleted), `lib/stats.ts` (new), `lib/users.ts`, `lib/sql/accounts.sql`, `lib/sql/stats-functions.sql`, `hooks/quiz/use-quiz-logic.ts`, `lib/actions/reward-actions.ts`, tests
- Depends: 2. Size: M

### Task 4: Leaderboards on `user_id` — done
Result: `get_global_leaderboard(p_limit)` and `get_group_leaderboard(p_group_id, p_limit)` are re-keyed
to `user_id`, joined against `users` for `display_name`/`wallet_address`, returning
`user_id, display_name, wallet_address, score, accuracy`. Unlike `get_user_stats` (Task 3), the
argument list here is unchanged (`p_limit INT`), so `CREATE OR REPLACE` can't add columns to an
existing return type — both functions are `DROP FUNCTION IF EXISTS` + `CREATE FUNCTION`. This is a
one-shot breaking change to the RPC contract (no old/new overload can coexist), so `lib/actions/leaderboard-actions.ts`
moves in lockstep. `LeaderboardEntry` gains `user_id`, and `wallet_address` becomes nullable (an
email account with no wallet still appears, keyed by account and showing its `display_name`).
`GlobalLeaderboard.tsx`/`GroupLeaderboard.tsx` key their row by `user_id` and fall back to
`display_name` -> wallet slice -> `'Player'` (wallet can be null now). `reward-actions.ts`'s top-3
badge check (still wallet-based until Task 9) now compares `leaderboard.some(e => e.user_id === accountId)`
using the `accountId` already resolved in Task 3, instead of comparing wallet strings — more
correct (matches by identity, not by string) and was going to break anyway once `wallet_address`
could be null.

`tests/sql/20-snapshot.sql`'s leaderboard rows previously did `row_to_json(l)`, which would make the
before/after migration diff fail solely because the shape gained columns — not because data changed.
Narrowed to project `wallet_address, score, accuracy` (the columns present in both the old and new
shape) so the diff still checks the real invariant. `tests/sql/30-checks.sql` adds explicit
`user_id`-keyed assertions, including that the email test account (Task 3's `email_id`, no wallet)
appears on the global leaderboard with `wallet_address IS NULL`.

New `tests/leaderboard-actions.test.ts` (previously no test file existed for this module at all)
covers `toEntries` mapping, rpc argument passing, limit clamping, and the `isUuid` guard. Extended
`tests/get-claimable-rewards.test.ts` with two cases for the `isTop3` account-id match. Mutation-tested:
broke the SQL join (`u.wallet_address = u.wallet_address` instead of `u.id = t.user_id`) — caught by
both the snapshot diff and a 30-checks assertion; broke `toEntries`' field mapping — caught; inverted
the `isTop3` comparison — caught by both new reward-action test cases.

91/91 tests pass. `npm run check:fast` clean. `npm run test:coverage`: 56.38% overall (above the 54%
floor); `leaderboard-actions.ts`'s changed lines (the `toEntries` body) fully covered — the file's
77.77%-lines figure reflects pre-existing untested catch/validation branches this task didn't touch,
not a gap in the diff; `reward-actions.ts`'s changed `isTop3` line hit on both branches.

- Acceptance:
  - `get_global_leaderboard` and `get_group_leaderboard` group by `user_id` and return `user_id, display_name, wallet_address, score, accuracy`
  - email accounts appear on leaderboards
  - rows are keyed by `user_id` in the UI
- Verify: an existing leaderboard test is extended if present, else a new `tests/leaderboard-actions.test.ts`
- Files: `lib/sql/stats-functions.sql`, `lib/actions/leaderboard-actions.ts`, `lib/types.ts`, `components/leaderboard/GlobalLeaderboard.tsx`, `GroupLeaderboard.tsx`, `lib/actions/reward-actions.ts`, `tests/sql/20-snapshot.sql`, `tests/sql/30-checks.sql`, `tests/leaderboard-actions.test.ts` (new), `tests/get-claimable-rewards.test.ts`
- Depends: 3. Size: S

### Task 5: Question creation and disputes on `user_id` — done
- Result: `createQuestion`/`disputeQuestion` now read `getSessionAccount()` instead of `getSessionWallet()` — any signed-in account, wallet or email, can create and dispute. The daily-cap count and the answered-before-reporting check moved from `.eq('created_by'|'wallet_address', wallet)` to `.eq('created_by_user'|'user_id', account.id)`. Inserts write `created_by_user`/`reporter_user` plus `created_by`/`reporter_wallet: account.wallet` (`null` for an email account) — same explicit both-columns-written pattern `quiz-actions.ts` already uses for `quiz_results`, so old-column readers stay correct until Task 25; the bridge trigger from Task 1 would fill it in either way.
  - Also fixed `quiz-actions.ts`'s own-question guard in `submitAnswer`, which its comment flagged as blocked on this task: `account.wallet && qData.created_by === account.wallet` only ever fired for wallet accounts, so an email account could score on a question it wrote itself. Now compares `qData.created_by_user === account.id`, covering both.
  - 5-per-day and 3-dispute-quarantine thresholds unchanged.
  - Tests: added `createQuestion guards` and `disputeQuestion guards` to `tests/answer-and-list-guards.test.ts` (no session, email-account creation with `created_by: null`, 5-per-day cap, unanswered-question report rejection, quarantine at 3, duplicate-report `23505` handling); updated the existing own-question test to key on `created_by_user`. Extended the shared `mockTables` chain stub with `.gte` (createQuestion's day-window filter).
  - Mutation-tested both changed guards: inverted `qData.created_by_user === account.id` to `!==` (4 tests failed, as expected) and `disputeCount >= QUARANTINE_AT` to `>` (quarantine test failed), then restored both.
  - Gate: 98/98 tests pass, `tsc`/`eslint` clean, coverage 54.93% lines (floor 54%); every changed line in both files is covered per `coverage-final.json` (confirmed via `git diff` line numbers cross-referenced against `statementMap`) — the file-level low percentages shown in the terminal table are pre-existing untested code in `fetchRandomQuestion`/`get5050EliminatedIndices`, outside this task's diff.
- Acceptance: `createQuestion` and `disputeQuestion` use `getSessionAccount()`, write `created_by_user` / `reporter_user`, and check the recorded answer by `user_id`; the 5-per-day and 3-dispute rules are unchanged.
- Verify: `npx vitest run tests/answer-and-list-guards.test.ts`
- Files: `lib/actions/question-actions.ts`, `lib/actions/quiz-actions.ts`, tests
- Depends: 2. Size: S

### Task 6: Lists and contests on `user_id` — done
- Result: `question-list-actions.ts` moved off `getSessionWallet()`. `signedIn()` now returns `{account, db}` from `getSessionAccount()` for plain list/question CRUD (create/update/delete list, add/update/delete list question, submit for review, confirm) — any signed-in account, wallet or email. A new `signedInWithWallet()` layers a wallet check on top for the on-chain-facing actions (`startContest`, `startListAttempt`, `completeListAttempt`, `claimListReward`), since those sign or check an on-chain address; an account with no wallet gets `'Add a wallet to your account to play contests.'` (Task 23 will front this with proper disclosure, per the plan's own note that the wallet requirement lands there).
  - Ownership/identity moved from `owner_wallet`/`wallet_address` comparisons to `owner_user`/`user_id` (schema columns from Task 1's `accounts.sql`): `getOwnedDraftList`, `getListDetail`'s `isOwner`, `confirmList`'s "not your own list", `startContest`'s "only the owner", `startListAttempt`'s "not your own contest". `list_entries`, `question_list_confirmations` and `reward_claims` reads/writes moved to `user_id`/`confirmer_user`, writing the old wallet column alongside (`wallet_address`/`confirmer_wallet: account.wallet`, null for email accounts) — same explicit-both-columns pattern as Tasks 3 and 5, so old-column readers stay correct until Task 25.
  - `getMyLists()` and `getListsPendingReview()` now take no argument, reading the session account internally; `attachListMeta`'s viewer parameter is the account id, matched against `confirmer_user`. Callers (`MyListsDashboard.tsx`, `ReviewQueue.tsx`) updated to call them with no args (client-side wallet/`useWalletSession` gating is untouched — that moves in Tasks 10-11).
  - Chain-facing calls (`getContestId`, `isContestFundedOnChain`, `signTypedData`, voucher `recipient`) still use `account.wallet`, per the plan.
  - `signedIn()`/`signedInWithWallet()` needed explicit return-type annotations — without them, TypeScript's `'error' in auth` narrowing didn't discriminate the two success shapes apart (an inference quirk on the `await`ed union, not a logic bug); annotating both functions' return types fixed it cleanly.
  - Tests: extended the shared `mockTables` stub (renamed its builder to `stubFrom`, reused for a new `mockPublicTables` covering `question-list-actions.ts`'s reads through the public `supabase` client) with `.upsert`; rewrote the `question list guards` block onto `getSessionAccount`/`ACCOUNT`; added ownership-rejection tests for `updateList`, `startContest`, `startListAttempt`; added a `confirmList` success/approval-threshold test and an own-list rejection test; added a `claimListReward`/`startContest` no-wallet rejection test; added a new `question list reads` block covering `getMyLists`, `getListsPendingReview`, `getListDetail` (all previously untested in any prior task, despite carrying the identity check this task changed).
  - Mutation-tested: inverted `owner_user !== account.id` to `===` in `startContest` (3 tests failed: the two `startContest` tests plus the new ownership-rejection test), and inverted the `signedInWithWallet` wallet-presence check (12 tests failed, across every wallet-required action) — both restored.
  - Gate: 110/110 tests pass, `tsc`/`eslint` clean, coverage 60.09% lines (floor 54%); of 85 changed statement lines in `question-list-actions.ts`, 83 are covered per `coverage-final.json` — the 2 gaps are the `!supabaseAdmin`/`!signer` "service unavailable" guards, same accepted category as Task 5's infra-guard gaps.
- Verify: `npx vitest run tests/answer-and-list-guards.test.ts`
- Files: `lib/actions/question-list-actions.ts`, `components/lists/MyListsDashboard.tsx`, `components/lists/ReviewQueue.tsx`, tests
- Depends: 2. Size: M

### Task 7: Groups on `user_id` — done
- Acceptance: group actions use `getSessionAccount()` and `user_id`; `getUserGroups()` takes no address.
- Verify: a new `tests/group-actions.test.ts` (create, join, list own)
- Files: `lib/actions/group-actions.ts`, `hooks/modals/use-group-modal.ts`, tests
- Depends: 2. Size: S
- Result: `signedIn()` (renamed from `signedInWriter()`) now built on `getSessionAccount()`, same shape as
  Task 6's helper. `groups.owner_user`/`group_members.user_id` written on every insert/query alongside
  the old wallet columns (`owner_wallet`/`wallet_address`, still populated for the bridge trigger and
  any remaining wallet-keyed reads). `leaveGroup` and `getUserGroups` filter by `user_id` instead of
  `wallet_address`. `getUserGroups()` takes no argument; its one caller (`use-group-modal.ts`) updated —
  the `walletAddress` client-side gate on the modal itself is untouched (client "signed in" state moves
  off wagmi in Task 10).
  New `tests/group-actions.test.ts`: 10 tests (not-signed-in guard, create, duplicate-name conflict,
  join, duplicate-join conflict, malformed-uuid guard, leave, and `getUserGroups` empty/own-groups).
  Mutation-tested the `signedIn()` gate (inverted the `if (!account)` check) — caught by 7/10 tests;
  restored via job-tmp backup, confirmed 10/10 green after.
  Gate: 129/129 tests pass, `tsc`/eslint clean, 60.66% line coverage (floor 54%), 16/16 changed
  statement lines in `group-actions.ts` covered (verified via `coverage-final.json` cross-referenced
  against `git diff` hunks).

### Task 8: Profile export on `user_id` — done
- Acceptance: `exportUserData()` takes no address and exports only the session account's data; the `/profile` page is updated.
- Verify: `npx vitest run tests/profile-actions.test.ts tests/profile-page.test.tsx`
- Files: `lib/actions/profile-actions.ts`, `app/profile/page.tsx`, tests
- Depends: 2. Size: S
- Result: `exportUserData()` now takes no argument; gated by `getSessionAccount()` (was `getSessionWallet()`
  equality check). Reads move to account-id columns: `questions.created_by_user` and
  `quiz_results.user_id`, both already present from Task 1's migration. Backup's `walletAddress` field
  now comes from `account.wallet` (empty string for wallet-less accounts) instead of the caller-supplied
  address. `getUserQuizzes()` is untouched — it's a public read keyed by an arbitrary wallet address, not
  session-gated, out of this task's scope (acceptance criteria named only `exportUserData`). `/profile`
  page's one call site updated (`exportUserData(address)` -> `exportUserData()`); its wagmi-based
  `address`/`isConnected` gating is untouched pending Task 10/11.
  `tests/profile-actions.test.ts`: rewrote the `exportUserData` suite for the new signature (9 tests:
  not-signed-in guard, stats-fetch-failure, success keyed by account id with `created_by_user`/`user_id`
  asserted, truncation flag); `getUserQuizzes` suite (6 tests) untouched. `tests/profile-page.test.tsx`
  (8 tests) needed no change — it only mocks `exportUserData`'s return value, not its call signature.
  Mutation-tested the `if (!account)` gate (inverted to `if (account)`) — caught by 4/9 `exportUserData`
  tests; restored via job-tmp backup, confirmed 17/17 green in both files after.
  Gate: 118/118 tests pass, `tsc`/eslint clean, 60.59% line coverage (floor 54%), every changed executable
  line in both files covered (verified via `coverage-final.json` cross-referenced against `git diff`
  hunks).

### Task 9: Rewards on `user_id`; delete `lib/wallet-session.ts` — done
- Acceptance:
  - `getClaimableRewards()`, the vouchers and `confirmRewardClaim()` take no wallet argument; the recipient is `account.wallet`, and `WALLET_REQUIRED` is returned without one
  - `lib/wallet-session.ts` is deleted, and grep finds `getSessionWallet` 0 times
- Verify: `npx vitest run tests/` plus grep
- Files: `lib/actions/reward-actions.ts`, `hooks/modals/use-rewards-modal.ts`, `hooks/quiz/use-quiz-logic.ts`, `components/lists/ContestPlay.tsx`, `lib/wallet-session.ts` (deleted)
- Depends: 3-8. Size: M
- Result: All four reward actions in `reward-actions.ts` are now session-gated via `getSessionAccount()`
  instead of a `getSessionWallet()` equality check, and no longer take a wallet argument:
  `getClaimableRewards()`, `generateTokenVoucher()`, `generateBadgeVoucher(badgeType)`,
  `confirmRewardClaim(nonce, txHash)`. Reads/writes moved to `reward_claims.user_id` (present since
  Task 1); on insert only `user_id` is written and the DB's `bridge_wallet_account` trigger backfills
  `wallet_address` when the account has one, so it's no longer set from application code. Voucher
  recipient is `account.wallet`; missing a wallet returns `{ error, code: 'WALLET_REQUIRED' }` from the
  two voucher functions (on-chain signing needs a real address). `getClaimableRewards()` no longer needs
  `accountIdForWallet()` at all — the session already carries the account id, so that lookup and its
  `lib/users` import are gone from this file. `confirmRewardClaim`'s `list_entries` update also moved to
  `user_id`. Deleted `lib/wallet-session.ts`; grep confirms 0 remaining uses of `getSessionWallet`
  (`hooks/shared/use-wallet-session.ts`'s client-side `useWalletSession` SIWE-signing hook is a different,
  unrelated module and is untouched, per Task 10's scope).
  Callers updated to the new signatures: `hooks/modals/use-rewards-modal.ts` (4 call sites),
  `hooks/quiz/use-quiz-logic.ts` (1), `components/lists/ContestPlay.tsx` (1). Their wagmi-based
  `walletAddress`/`address` client gating is untouched, pending Task 10/11. `ContestPlay`'s `wallet` prop
  became fully unused once its one caller (`confirmRewardClaim`) dropped the argument, so it and its
  passed-in value in `components/lists/ContestBrowser.tsx` were removed too (kept lint clean, no dead
  prop threading).
  Rewrote `tests/get-claimable-rewards.test.ts` for the session-based signature (5 tests, incl. a
  no-wallet-account case) and added `tests/reward-actions.test.ts` (13 tests: session/wallet guards,
  a signed voucher keyed by `user_id`, the open-voucher-reuse path, badge eligibility, and
  `confirmRewardClaim`'s token/contest branches) — these three functions had zero prior test coverage.
  Removed `tests/identity-accounts.test.ts`'s `getSessionWallet` describe block (module deleted).
  Mutation-tested the `if (!account.wallet)` guard in `generateTokenVoucher` (inverted) — caught by
  3/13 `reward-actions.test.ts` tests; restored via job-tmp backup, confirmed 18/18 green after.
  Gate: 130/130 tests pass, tsc/eslint clean, 62.45% line coverage (floor 54%); every changed executable
  line in `reward-actions.ts` covered (the two uncovered ranges the coverage report names, 307-308 and
  364-365, are unchanged catch-block lines, not part of this diff).

### Task 10: Client session provider and sign-in modal (wallet) — done
- Acceptance:
  - `getSessionInfo()` feeds a `SessionProvider` exposing `{ account, refresh, requireSignIn }`
  - `requireSignIn()` replaces `useWalletSession()`: it resolves `true` when signed in, otherwise opens `SignInModal` (wallet connect and SIWE for now) and resolves when done
  - the header shows "Sign in" or the account menu with sign-out, and `use-quiz-logic` gates on `account` instead of wagmi `isConnected`
- Verify: `npx vitest run tests/use-quiz-logic-history.test.tsx`, plus manual wallet sign-in, reload, sign-out
- Files: `hooks/shared/use-session.ts` (replaces `use-wallet-session.ts`), `components/auth/SignInModal.tsx`, `components/Providers.tsx`, `components/layout/Header.tsx`, `hooks/quiz/use-quiz-logic.ts`; the other 7 `useWalletSession` call sites get a mechanical rename
- Depends: 9. Size: M
- Result: Added `lib/actions/auth-actions.ts#getSessionInfo()`, a thin server-action wrapper over
  `getSessionAccount()` (client components can't import the `server-only` module directly). New
  `hooks/shared/use-session.tsx` (`.tsx`, not `.ts` — it renders JSX) exports `SessionProvider` and
  `useSession()`. `SessionProvider` fetches `getSessionInfo()` on mount into `account` state, and
  `requireSignIn()` re-checks it: returns `true` immediately if already signed in, otherwise opens
  `SignInModal` and returns a promise that a later `refresh()` call settles once an account appears
  (or `false` if the player cancels the modal). No polling: `refresh()` itself resolves the pending
  promise inline when it finds an account while one is waiting, so there's only one effect in the
  whole provider (the mount fetch).
  `components/auth/SignInModal.tsx` is deliberately thin: wraps the existing `Modal` shell around
  RainbowKit's own `<ConnectButton />`, reusing PR #11's already-shipped `RainbowKitAuthenticationProvider`
  + `useQuizAuth` auto-SIWE flow instead of re-implementing `signMessageAsync`/`requestSignIn`/
  `signInWithWallet` by hand (that's what the old `useWalletSession` did). `components/Providers.tsx`
  now wraps the tree in `SessionProvider` and calls `refresh()` whenever `useQuizAuth()`'s `status`
  changes, so the session catches up right after the wallet's auto sign-in/sign-out completes.
  `components/layout/Header.tsx` drops its `isConnected` prop and reads `account` from `useSession()`
  directly to gate the Profile/Rewards buttons; its existing RainbowKit `<ConnectButton />` already
  renders "Connect"/address+disconnect once wired to that auth provider, satisfying "Sign in or account
  menu with sign-out" without new UI. Both call sites (`QuizLayout.tsx`, `app/profile/page.tsx`) updated
  to drop the now-gone prop.
  `hooks/quiz/use-quiz-logic.ts`: `refreshStats`/`refreshRewards`/`refreshHistory` and the initial-fetch
  effect now gate on `account` (from `useSession()`) instead of wagmi `address`/`isConnected` — correct
  for a future email account, which has no wagmi connection at all. `handleAnswerSubmit`'s
  `if (isConnected) await ensureSession()` is untouched: that's a wallet-specific "connected but maybe
  not yet signed" check, distinct from the general signed-in concept, and out of this task's scope.
  `address`/`isConnected` are still returned from the hook for `QuizLayout`'s other wallet-address
  prop-threading (`QuestionForm`, `GroupModal`, `RewardsModal`, `ProfileModal`, `DisputeModal`), which
  Task 11 owns.
  Mechanical rename (`useWalletSession()` -> `const { requireSignIn: ensureSession } = useSession();`,
  call sites otherwise untouched) across the other 7 callers: `hooks/quiz/use-question-form.ts`,
  `hooks/modals/use-group-modal.ts`, `hooks/modals/use-dispute-modal.ts`,
  `components/lists/MyListsDashboard.tsx` (2 sites), `components/lists/ReviewQueue.tsx`,
  `components/lists/ContestPlay.tsx`, `app/profile/page.tsx`. Deleted `hooks/shared/use-wallet-session.ts`;
  grep confirms 0 remaining uses of `useWalletSession`/`use-wallet-session`.
  Tests: rewrote `tests/auth-integration.test.tsx` for the new `SessionProvider`/`useSession` contract
  (3 tests: resolves immediately when signed in, opens the modal and resolves true once a session
  appears, resolves false on cancel — `SignInModal` mocked out so no RainbowKit/wagmi context is
  needed); updated the `use-wallet-session` mocks in `tests/use-quiz-logic-history.test.tsx` and
  `tests/profile-page.test.tsx` to mock `use-session` instead; added a one-line `getSessionInfo` test
  to `tests/auth-actions.test.ts`. Mutation-tested `requireSignIn`'s `if (info) return true` guard
  (inverted to `if (!info)`) — caught by 3/3 `auth-integration.test.tsx` tests; restored via job-tmp
  backup, confirmed 13/13 green after.
  Gate: 153/153 tests pass, `tsc`/eslint/`gitleaks`/`depcruise` clean, 68.07% line coverage (floor 54%);
  `use-session.tsx` itself is 100% line-covered (only the "used outside a provider" throw guard, line 80,
  is statement-uncovered).

### Task 11: Session-based gating on list, contest and profile pages — done
- Acceptance:
  - `/profile`, `/my-lists`, `/review` and the contest browser decide "signed in" from `useSession()`, not wagmi `useAccount`
  - on-chain actions check that the connected wallet equals `account.wallet`, otherwise they ask the player to switch wallets
- Verify: `npx vitest run tests/profile-page.test.tsx`, plus a manual check of each page signed out, as a wallet account and as an email account
- Files: `app/profile/page.tsx`, `components/lists/ContestBrowser.tsx`, `components/lists/MyListsDashboard.tsx`, `components/lists/ReviewQueue.tsx`, `components/lists/ContestPlay.tsx`
- Depends: 10. Size: M
- Result: All five files dropped wagmi `useAccount` as the signed-in source, gating on `useSession()`'s
  `account` instead.
  `app/profile/page.tsx`: no longer imports wagmi at all. The created-quizzes fetch is still
  wallet-keyed (`getUserQuizzes(walletAddress)`, unchanged, out of scope per Task 8's note) but now
  reads `account.wallet` instead of the connected `address` — an email-only account (no wallet) skips
  the fetch and shows the empty state instead of spinning forever, rather than crashing or hanging.
  `handleExport`'s guard and backup filename moved from `address` to `account`/`account.wallet ||
  account.id`.
  `ContestBrowser.tsx` and `ReviewQueue.tsx`: mechanical swap, `!isConnected`/`wallet` gate ->
  `!account`, copy changed from "Connect your wallet" to "Sign in" since email accounts (Task 12) will
  reach these pages too.
  `MyListsDashboard.tsx`: same swap for the top-level "sign in to manage lists" gate and `refresh`'s
  guard. In `ListCard.handleStartContest` (the one on-chain write in this file, funding a contest):
  after `ensureSession()` succeeds, added an explicit check that `account.wallet` exists and that
  wagmi's connected `address` matches it (case-insensitive), asking the player to switch wallets
  otherwise, before computing `contestId` (now built from `account.wallet`, replacing the old
  `address || list.owner_wallet` fallback that could silently compute the wrong contest ID if a
  different wallet happened to be connected).
  `ContestPlay.tsx`: added the same connected-wallet-matches-`account.wallet` check in `handleClaim`,
  before the on-chain `claimReward` write (the voucher's `recipient` is `account.wallet`, signed
  server-side; submitting from a mismatched connected wallet is now blocked client-side with a
  "switch your connected wallet" message instead of silently proceeding).
  No component test files exist yet for `ContestBrowser`/`MyListsDashboard`/`ReviewQueue`/`ContestPlay`
  (consistent with every prior task touching them — Tasks 6 and 9 both noted their client gating was
  "untouched, moves in Tasks 10-11" with no component tests added); Task 11's own Verify line only
  names `tests/profile-page.test.tsx`, so no new component test files were added for the other four.
  Rewrote `tests/profile-page.test.tsx`: replaced the `wagmi`/`useAccount` mock with a controllable
  `useSession` mock (`vi.fn()`, was previously an un-configurable static return, which would have made
  every existing test render Access Denied once the page stopped reading wagmi); added a new test for
  the signed-in-with-no-wallet case (empty state shown, `getUserQuizzes` never called) and a
  `beforeEach(vi.clearAllMocks())` so that assertion isn't polluted by earlier tests' call counts.
  9 tests total (was 8), all passing.
  Mutation-tested the new `!account?.wallet` gate in the profile fetch effect (inverted to
  `account?.wallet`) — caught by 6/9 tests; restored via job-tmp backup, confirmed 9/9 green after.
  Gate: 154/154 tests pass, `tsc`/eslint/gitleaks/depcruise clean, 68.12% line coverage (floor 54%);
  `page.tsx`'s new lines are covered — the file's three uncovered ranges (53-56, 82-83, 95) are
  pre-existing catch blocks and an `ensureSession`-false branch this task didn't touch.

### Task 12: Email code sign-in — done
- Result: `lib/rewards-copy.ts` is new: one exported `NO_WALLET_DISCLOSURE` string, the exact
  copy from `docs/specs/rewards-no-wallet-payee.md` (single source; Task 23 wires it into
  `RewardsModal` and the header). `lib/supabase.ts`'s anon client now sets
  `auth: { persistSession: false, autoRefreshToken: false }` (the "non-persisting client" the
  spec asks for) — checked first that every importer is server-only or a server action, so this
  couldn't affect a browser session anywhere.
  `lib/users.ts` gained `ensureAccountForAuthUser(authUserId)`, same upsert-then-select shape as
  `ensureAccountForWallet` (`onConflict: 'auth_user_id'`, default display name `Player-<first 4
  of authUserId>`).
  `lib/actions/auth-actions.ts`: `requestEmailCode(email)` validates format locally and calls
  `supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } })` only for a
  well-formed address, always returning `{ sent: true }` either way (no enumeration signal).
  `verifyEmailCode(email, code)` calls `supabase.auth.verifyOtp({ email, token: code, type:
  'email' })`; on success it calls `ensureAccountForAuthUser` and sets `quiz_session` with
  `wallet: null` (a fresh email account never has one yet); a wrong/expired code, or the account
  failing to create, returns `{ ok: false }` without touching the session.
  `SignInModal.tsx` now has 3 steps (`choose` → `email` → `code`): the existing RainbowKit button
  stays, plus a new "Continue with email" button that shows the disclosure and an email field,
  then a 6-digit code field. On a verified code it calls `refresh()` and closes.
  `refresh` is passed into `SignInModal` as a prop from `SessionProvider`, not read via
  `useSession()` inside the modal — importing the hook there would close a cycle
  (`use-session.tsx` renders `SignInModal`, which would import back into `use-session.tsx`),
  caught by `check:architecture`'s `no-circular` rule on first run; fixed by having the one file
  that already renders `SignInModal` hand it the callback instead of the modal reaching up for it.
  Tests: added `requestEmailCode`/`verifyEmailCode` cases to `tests/identity-accounts.test.ts`
  (well-formed vs malformed email, valid code, wrong/expired code, account-creation failure) —
  19 tests total in that file (was 6), 159/159 across the suite.
  Mutation-tested `verifyEmailCode`'s final `accountId !== null && setSessionAccount(...)` guard
  (flipped to `===`) — caught by 2/19; restored via job-tmp backup, confirmed 19/19 green after.
  Gate: 159/159 tests, `tsc`/eslint/gitleaks clean, `check:architecture` clean (0 violations after
  the prop fix), 68.25% line coverage (floor 54%); the two new uncovered lines in
  `auth-actions.ts` (101-102) are `verifyEmailCode`'s catch block, matching the same
  never-exercised pattern as `signInWithWallet`'s own catch block (78-79) already in that file.
  Not done here (manual step, needs a Supabase branch with email OTP configured): signing in with
  a real email.
- Acceptance:
  - `requestEmailCode` returns the same result for known and unknown emails
  - `verifyEmailCode` creates the account by `auth_user_id` and sets the session; a wrong or expired code does not
  - `SignInModal` adds "Continue with email" (email, then a 6-digit code) with the disclosure from `lib/rewards-copy.ts`
- Verify: `npx vitest run tests/identity-accounts.test.ts`, plus manual sign-in with a real email on a Supabase branch
- Files: `lib/actions/auth-actions.ts`, `lib/users.ts`, `components/auth/SignInModal.tsx`, `lib/rewards-copy.ts`, tests
- Depends: 10. Size: M

### Task 13: Add a wallet to an email account — done
- Result:
  - `lib/users.ts`: new `linkWalletToAccount(accountId, walletAddress)` — looks up the wallet first (existing row on the same account is a no-op success, on another account is `'in_use'`), otherwise `UPDATE`s the account row with `wallet_address`/`wallet_linked_at`; a unique-violation from that update (two signatures racing for the same new wallet) is also mapped to `'in_use'`, not `'error'`.
  - `lib/actions/auth-actions.ts`: new `linkWallet(message, signature)` — same SIWE challenge/verify shape as `signInWithWallet`, gated on `getSessionAccount()` having no wallet yet; returns `{ ok: false, code: 'WALLET_IN_USE' }` on a taken wallet, `{ ok: true }` and re-sets `quiz_session` with the new wallet on success.
  - `lib/auth-adapter.ts`: `verify()` is now session-aware — one wallet-connect flow for the whole app, not two code paths. It calls `getSessionInfo()` first: a session with no wallet yet routes the signature to `linkWallet`; anyone else (no session, or already has a wallet) goes to `signInWithWallet` as before. Because every `ConnectButton` in the app (header, `SignInModal`) shares this one `RainbowKitAuthenticationProvider` adapter, this single change wires "Add wallet" everywhere without touching `SignInModal.tsx` — no duplicate modal or bespoke wallet-connect code needed there.
  - `components/layout/Header.tsx`: the header's `ConnectButton` label switches to "Add wallet" when `account && !account.wallet`, else "Connect" (unchanged for guests and wallet accounts). No new modal; clicking it runs the same RainbowKit connect+sign flow, which the adapter now resolves as a link.
  - Full disclosure text next to "Add wallet" is left to Task 23 (todo.md's acceptance for this task doesn't require it; the full spec's UI note about showing it is more naturally done once Task 23 revisits `SignInModal`/`Header` together, per `plan.md`'s parallelization note).
  - Tests: `tests/identity-accounts.test.ts` — 24 tests now (was 19), new `linkWallet` describe covers: sets wallet + re-signs session; `WALLET_IN_USE` for another account's wallet (no update call); refuses when the session's account already has a wallet; `WALLET_IN_USE` on the update-race unique-violation path; refuses on a bad signature. `tests/auth-adapter.test.ts` updated to mock the two new `auth-actions` exports (`getSessionInfo`, `linkWallet`) and gained one test asserting `verify` delegates to `linkWallet` when the session has no wallet.
  - Mutation-tested `linkWallet`'s `if (!account || account.wallet) return { ok: false };` guard (dropped the `account.wallet` half) — caught by 1/24 ("refuses an account that already has a wallet"). Restored, re-confirmed 24/24 green.
  - Gate: 165/165 tests, `tsc --noEmit` clean, eslint clean (same pre-existing unrelated `coverage/block-navigation.js` warning as prior tasks), `depcruise` clean (311 dependencies, no cycles), gitleaks clean.
  - Not done: manual add-wallet click-through on a real Supabase/wallet session (needs you, same as Task 12's manual email check).
- Acceptance:
  - `linkWallet` sets the wallet and `wallet_linked_at` after a valid SIWE signature for an account without a wallet
  - it returns `WALLET_IN_USE` for a wallet on another account
  - the header shows "Add wallet" only for accounts without one
- Verify: `npx vitest run tests/identity-accounts.test.ts`
- Files: `lib/actions/auth-actions.ts`, `lib/users.ts`, `lib/auth-adapter.ts`, `components/layout/Header.tsx`, tests
- Depends: 12. Size: S

### Checkpoint: Identity
- [ ] Gates and build pass; grep finds 0 uses of `getSessionWallet` and `useWalletSession`
- [ ] `accounts.sql` and `stats-functions.sql` on a Supabase branch: counts and scores unchanged (you)
- [ ] Manual: wallet sign-in, email sign-in, add wallet, sign out, reload; leaderboard shows both account kinds

## Phase 2: Trivia — spec `docs/specs/trivia-guest-access.md`

### Task 14: Public-question rule and retire sample questions — done
Result:
- `fetchRandomQuestion` (`lib/actions/question-actions.ts`) and both its fallback queries now filter `.eq('status', 'verified').is('list_id', null)` instead of `.neq('status', 'quarantined').neq('status', 'pending')` — a `rejected` question can no longer be served (the bug the old exclude-list left open).
- `lib/schema.sql`: the 14-row seed `INSERT` block is deleted outright (not commented out — it's history now, in git). `list_id` is filtered on by the anon-key client (`fetchRandomQuestion` uses `lib/supabase.ts`'s anon client, not `supabaseAdmin`), and Postgres gates column use in `WHERE`/`.is()` the same as `SELECT` output, so `list_id` needed adding to the anon/authenticated column grant — done right after the column's own `ALTER TABLE ADD COLUMN`, not at the original top-of-file grant (which runs before `list_id` exists).
- `lib/sql/retire-sample-questions.sql` (new): `UPDATE questions SET status = 'rejected' WHERE created_by IS NULL AND prompt IN (...)`, matched against the exact 14 seed prompts (pulled verbatim from the deleted seed block) in a temp table, wrapped in `BEGIN`/`COMMIT`, with a post-check that all 14 ended up `rejected`. Deletes nothing — `quiz_results.question_id` is `ON DELETE CASCADE`, so deleting a seed row a player answered would erase their score.
- Tests: new `tests/trivia-guest-access.test.tsx` (3 tests) — primary query uses the verified+no-list filter; an empty result (standing in for a rejected/quarantined row that the filter excluded) returns `null`; the category fallback query applies the same filter. Mutation-tested the `.is('list_id', null)` guard by dropping it — caught (1/3 failed). Full suite: 168/168 (was 165), tsc/eslint/gitleaks/depcruise clean, 311 dependencies (unchanged, no new cycle).
- Not done: running `retire-sample-questions.sql` on a Supabase branch (needs you — same as Task 1's `accounts.sql`/`stats-functions.sql`).
- Acceptance:
  - play serves only `status = 'verified' AND list_id IS NULL` (a rejected question is never served)
  - the seed block is removed from `lib/schema.sql`
  - `retire-sample-questions.sql` marks the 14 seed prompts `rejected` (matched by prompt and `created_by IS NULL`), deleting nothing
- Verify: `npx vitest run tests/trivia-guest-access.test.tsx`
- Files: `lib/actions/question-actions.ts`, `lib/schema.sql`, `lib/sql/retire-sample-questions.sql`, tests
- Depends: Phase 1. Size: S

### Task 15: Topics from the database — done
- Result:
  - `lib/sql/topics.sql`: `get_topics()` (SECURITY DEFINER, matches the same PostgREST-1000-row-cap reasoning as `stats-functions.sql`), groups `questions.category` by `lower(TRIM(category))`, public-question rule applied (`status = 'verified' AND list_id IS NULL`), returns the most recent spelling per group, count, and newest `created_at`, ordered newest first. Granted `EXECUTE` to `anon, authenticated`.
  - `question-actions.ts`: added `getTopics()` (calls the RPC, maps snake_case to camelCase) and `getPublicQuestion(id)` (public rule, `.single()`, same 5-column select as `fetchRandomQuestion` — never `correct_index`/`explanation`).
  - `validation.ts`: `validateQuestionInput`'s category handling now collapses inner whitespace and enforces 2-40 chars (was only a max); added `escapeLikePattern` for safe ILIKE matching.
  - Fixed a bug this task would otherwise have shipped broken: `fetchRandomQuestion`'s category filter was `eq('category', category)` (exact case match). Once `get_topics()` groups "DeFi"/"defi" as one topic with a combined count, selecting that topic in `CategoryBar` would only play rows matching whichever single casing it filtered on — undercounting silently. Changed both filter sites to `ilike('category', escapeLikePattern(category))` (escaped so a player-typed `%`/`_` in a category isn't read as a wildcard).
  - `CategoryBar.tsx`: dropped the hardcoded `CATEGORIES` array (icon set, fixed colors); now fetches `getTopics()` on mount and renders "All" plus each topic name. Only caller was `QuizLayout.tsx` (unchanged — same `selectedCategory`/`onSelectCategory` prop contract), so no other files touched.
  - Tests (`tests/trivia-guest-access.test.tsx`, extended): category-filter case-insensitivity + escaping, `getTopics` snake_case→camelCase mapping and its empty-on-error path, `getPublicQuestion`'s public-rule filters and malformed-id short-circuit, and `createQuestion`'s category trim/collapse/min-length/default via `validateQuestionInput`. 11/11 pass.
  - Mutation-tested `escapeLikePattern`: reverted to identity, exactly 1/11 failed (the escaping test), confirming it's enforced; restored.
  - Full gate: 179/179 tests, tsc/eslint/gitleaks clean, `check:architecture` clean (313 deps, +1 from `CategoryBar` → `question-actions` edge, no cycle).
  - Not done: running `lib/sql/topics.sql` on a Supabase branch (yours).
- Acceptance:
  - `get_topics()` and `getTopics()` return public topics grouped case-insensitively, newest first, with counts
  - `getPublicQuestion(id)` returns public questions only and no answer fields
  - `createQuestion` normalizes the category (trimmed, single spaces, 2-40 characters), and `CategoryBar` shows "All" plus the database topics
- Verify: `npx vitest run tests/trivia-guest-access.test.tsx`
- Files: `lib/sql/topics.sql`, `lib/actions/question-actions.ts`, `components/quiz/CategoryBar.tsx`, tests
- Depends: 14. Size: M

### Task 16: Signed-in creation and read-only guests — done
- Result: `QuizLayout` now calls `useSession()` and renders `QuestionForm` only when `account` is set; guests get the exact spec empty state ("No questions yet. Sign in to add the first one.") with a button calling `requireSignIn()`. The dispute button was already fully optional end-to-end (`AnswerBack` renders a placeholder `<div />` when `onOpenDispute` is undefined, `QuizCard` just forwards the prop) — so the guest gate is one line at the single call site: `onOpenDispute={account ? () => openModal('dispute') : undefined}`. `LeaderboardPanel` and `ListsNav` each call `useSession()` directly (same pattern already used by `ContestBrowser`/`MyListsDashboard`/`ReviewQueue`): the group-create/join button is hidden for guests, and `ListsNav` drops the "My Lists"/"Review Queue" links for guests while keeping "Contests" (whose own page already fully gates behind sign-in from Task 11). `createQuestion`'s server-side `getSessionAccount()` check and 5/day cap were already in place from earlier tasks — no change needed there. `ContestBrowser` was already gated end-to-end (whole page requires `account`) — no change needed.
  New test file `tests/quiz-layout-guest-access.test.tsx` (8 tests): `QuizLayout` guest vs signed-in (empty state / QuestionForm, dispute handler wired or not), `LeaderboardPanel` guest vs signed-in (group button), `ListsNav` guest vs signed-in (tab list). Mutation-tested the `account ?` gate in `QuizLayout` by forcing both branches to the truthy path — 2/8 tests caught it (the two `QuizLayout` guest-specific assertions), confirming the gate is enforced. Restored, 8/8 green.
  Full gate: 187/187 tests (was 179), tsc/eslint/gitleaks clean, `check:architecture` clean at 316 dependencies (+3, expected: `LeaderboardPanel`/`ListsNav`/`QuizLayout` each gained one `use-session` import edge).
  Not done this turn: the manual signed-out click-through check the spec also calls for (yours, same as every other manual browser check in this plan).
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

### Task 17: Question search — done
- Result: `lib/sql/search.sql` enables `pg_trgm`, adds GIN trigram indexes on `lower(prompt)`/`lower(category)`, and `search_questions(p_query, p_limit, p_offset)` (SECURITY DEFINER, same public-question rule as `get_topics()`/`getPublicQuestion`: `status = 'verified' AND list_id IS NULL`). It escapes `%`/`_` with a literal `replace()` chain for the `ILIKE ... ESCAPE '\'` match, but feeds the raw (unescaped) lowercased query to `word_similarity` so a typo like "etherum" still matches "Ethereum" — matching prompt or category by substring or `word_similarity > 0.3`, ordered by score desc then `created_at` desc. `author_name` comes from a `LEFT JOIN users` on `created_by_user` (same join pattern as `get_global_leaderboard`), falling back to `'Player'`.
  `lib/actions/discovery-actions.ts` adds `searchQuestions(query, page)`: trims the query, returns `{ results: [], hasMore: false }` with no database call outside 2-100 characters, pages at 20 with a `+1` over-fetch for `hasMore`, and maps snake_case RPC rows to camelCase `SearchResult` (`lib/types.ts`) — never touching `correct_index`/`explanation`/`options` since the SQL function never returns them.
  `components/discovery/SearchBox.tsx` is a plain (non-`'use client'`) native `<form action="/search" method="GET">` — no router/JS needed for a GET query-string submit. Wired into `Header.tsx` next to the logo. `components/discovery/SearchResultList.tsx` renders prompt/category/author/"added &lt;relative time&gt;" (new `formatRelativeTime` helper in `lib/utils.ts`, reused by Task 18's topic lists) with a "Play" link to `/q/[id]` (that route lands in Task 18 — the link is added now as the natural vertical slice, matching how `CategoryBar` already linked to topics before `get_topics()` landed). `app/search/page.tsx` is a server component reading `searchParams`, `noindex`'d per spec, with prev/next paging and the exact "No questions match "q"" empty-state text linking to `/topics`.
  New test file `tests/discovery.test.ts` (8 tests): query-length bounds (1 and 101 chars make no RPC call), trimming, offset math for page 2, `hasMore` on/off, snake_case→camelCase mapping never surfaces answer fields, and the error path. Mutation-tested the length-bound guard (forced to `if (false)`) — 2/8 caught it (exactly the two bound tests), confirming it's enforced; restored, 8/8 green.
  Full gate: 195/195 tests (was 187), tsc/eslint/gitleaks clean, `check:architecture` clean at 323 dependencies (+7, expected: new `discovery-actions`/`SearchBox`/`SearchResultList`/`search/page` module edges), no cycle.
  Not done this turn: running `lib/sql/search.sql` on a Supabase branch, and the spec's manual checks ("block" finds "blockchain", "etherum" finds "Ethereum", `EXPLAIN ANALYZE` at 1,000+ rows, search signed out) — all yours, same as every other SQL/manual-browser item in this plan.
- Acceptance:
  - `search.sql` adds `pg_trgm`, trigram indexes and `search_questions()` (public only, `%` and `_` escaped)
  - `searchQuestions` bounds the query to 2-100 characters, with pages of 20
  - the header search box opens `/search?q=` (noindex)
- Verify: `npx vitest run tests/discovery.test.ts`, plus manual checks on a branch: "block" finds "blockchain", "etherum" finds "Ethereum"
- Files: `lib/sql/search.sql`, `lib/actions/discovery-actions.ts`, `components/discovery/SearchBox.tsx`, `app/search/page.tsx`, tests
- Depends: 15. Size: M

### Task 18: Topic pages and single-question play — done
- Result: `getTopicQuestions(topic, page)` added to `discovery-actions.ts`, no new SQL — the FK `questions.created_by_user -> users(id)` (added in `accounts.sql`) is unique on that table, so PostgREST resolves a plain embed (`.select('id, prompt, category, created_at, users(display_name)')`) with no ambiguity. Same public-question filter and `escapeLikePattern`-guarded `ILIKE` as `fetchRandomQuestion`, ordered `created_at desc`, 20/page with the same `+1`-row `hasMore` convention as `searchQuestions`. Reuses the `SearchResult` type and `SearchResultList` component from Task 17 (`authorName` falls back to `'Player'` when `display_name` is null) — no new result-card component needed, only `TopicList.tsx` for the topic-name list itself.

  `/topics` reads `getTopics()` (already existed since Task 15, already ordered `latest_at desc` in `get_topics()` — no SQL change needed), rendering name/count/"last added <relative time>" via `formatRelativeTime`. `/topics/[topic]` reads `getTopicQuestions`, `noindex`'d (per the spec's own open question: player-typed topic names become public URLs, so kept out of search engines until that's decided) — "Play this topic" links straight to `/q/[id]` of that topic's newest question (`results[0].id`), which both starts the quiz filtered to the topic and needs zero changes to `app/page.tsx` or `use-quiz-logic.ts` (both stayed out of this task's file list on purpose).

  `/q/[id]` reads `getPublicQuestion(id)` (already existed since Task 14/16), 404s via `next/navigation`'s `notFound()` if null or not public, then renders the *existing* `QuizLayout` (which is what actually wires `QuizCard` to `submitAnswer`, the timer, the sponsor-unlock gate, and disputes) seeded with that question as `initialQuestion` — the identical pattern `app/page.tsx` already uses for a random question. Considered a bespoke lightweight wrapper around bare `QuizCard` first, but `useQuizLogic`'s sponsor-ad gate starts every fresh question **locked** (`isUnlocked` defaults `false`); a wrapper that skipped that plumbing would silently break answering rather than simplify anything, so reusing `QuizLayout` was the smaller, correct diff, not a lazier-looking one.

  Mutation-tested the `escapeLikePattern` call in `getTopicQuestions`: removing the escape wrapper failed exactly the dedicated ILIKE-args assertion, others stayed green.

  12/12 in `tests/discovery.test.ts` (was 8; +4 for `getTopicQuestions`: mapping/fallback, escaping+range math, `hasMore` trim, error path). Full gate: 199/199 tests (was 195), tsc/eslint/gitleaks clean, `check:architecture` 326 deps (+3 from Task 17's 323), no cycle.

  Not done: running any SQL on a Supabase branch (none needed this task — no new SQL file), the manual signed-out click-through (`/topics` → a topic → `/q/[id]` → answer), and first-load JS budget measurement for the 3 new routes (checkpoint item, still open).
- Acceptance:
  - `/topics` lists topics newest first with counts
  - `/topics/[topic]` lists questions newest first with "Play this topic"
  - `/q/[id]` plays one public question through `QuizCard`
- Verify: `npx vitest run tests/discovery.test.ts`, plus a manual check signed out
- Files: `app/topics/page.tsx`, `app/topics/[topic]/page.tsx`, `app/q/[id]/page.tsx`, `components/discovery/TopicList.tsx`, `lib/actions/discovery-actions.ts`
- Depends: 17. Size: M

## Phase 4: Community — spec `docs/specs/community.md`

### Task 19: Community tables and server actions — done
- Result:
  - `lib/sql/community.sql`: creates `question_ratings` (PK on `(question_id, user_id)`, rating 1-5, cascade deletes) and `question_comments` (PK on `id`, kind `comment`|`suggestion`, 1-500 chars body, created_at index), both with RLS enabled and zero public policies (reads and writes mediated by server actions using `supabaseAdmin`). Also defines `get_rating_summary(p_question_id)` SECURITY DEFINER RPC returning average and count.
  - `lib/actions/community-actions.ts`: implements `rateQuestion`, `addComment`, `deleteComment`, `resolveSuggestion`, `getQuestionDiscussion`, and `getSuggestionsForAuthor`. Each write enforces session authentication (`getSessionAccount()`), public question (`status = 'verified' AND list_id IS NULL`), recorded answer in `quiz_results`, not-author restriction for ratings and suggestions (authors can comment on own questions), and 20 comments/suggestions per account per 24 hours. Fixed result codes: `UNAUTHORIZED`, `NOT_ANSWERED`, `NOT_ALLOWED`, `INVALID`, `RATE_LIMITED`, `FAILED`. `getQuestionDiscussion` only returns `kind = 'comment'`; suggestions are strictly private to author and sender.
  - Tests (`tests/community.test.ts`): 19 comprehensive unit tests covering all gates, bound checks, rate limits, deletion, and author suggestions privacy.
  - Gate: 218/218 tests passing, tsc/eslint/gitleaks clean, `depcruise` clean with zero boundary or circular violations, line coverage at 71% (project ratchet ≥ 61.3%).
  - Not done: running `lib/sql/community.sql` on a Supabase branch (needs user).
- Acceptance:
  - `community.sql` creates `question_ratings` and `question_comments` with RLS on and no public policies
  - every action enforces signed in, public question, recorded answer, not-author (for ratings and suggestions), and 20 per day, returning fixed codes
  - suggestions are returned only to their sender and the question's author
- Verify: `npx vitest run tests/community.test.ts` (one test per gate)
- Files: `lib/sql/community.sql`, `lib/actions/community-actions.ts`, `tests/community.test.ts`
- Depends: 14. Size: M

### Task 20: Ratings, comments and suggestions on the card back — done
- Result:
  - `components/community/RatingStars.tsx`: Displays average rating and rating count. Signed-in players can hover and tap to rate 1-5 stars calling `rateQuestion(questionId, star)`. Guests see the average rating and count without interactive buttons.
  - `components/community/CommentList.tsx`: Renders comments newest first with author name, relative timestamp, and plain text comment body (React-escaped, safe from XSS/HTML execution). Own comments render a delete button calling `deleteComment(commentId)`. Signed-in players get a 500-char max textarea with live character counter; guests see "Sign in to rate and comment" linking to `requireSignIn()`.
  - `components/community/SuggestionForm.tsx`: Renders "Suggest a fix to the author" toggle that expands a private suggestion form (500 chars max, counter) calling `addComment(questionId, body, 'suggestion')`, displaying confirmation on submission.
  - `components/quiz/AnswerBack.tsx`: Integrated Community discussion box below the explanation, loading ratings and comments asynchronously with `getQuestionDiscussion(question.id)`. Handles real-time rating updates, comment additions, and comment deletions.
  - `vitest.config.ts`: Configured `maxWorkers: 2` to prevent memory contention and worker timeouts under heavy system load.
  - Tests (`tests/community-ui.test.tsx`): 9 tests covering rating tap-to-rate, guest read-only view, plain text XSS safety, 500-character counter, comment deletion, suggestion form toggle and submit, and AnswerBack integration for signed-in and guest users. Updated `tests/AnswerBack.test.tsx` with session mock.
  - Gate: 227/227 tests pass across 26 test files, `tsc`/eslint/gitleaks clean, `depcruise` clean (0 violations), total line coverage 70.71% (above 61.3% ratchet). Next.js production build succeeds with all routes valid.
- Acceptance:
  - after answering, `AnswerBack` shows the average and count, tap-to-rate stars, comments newest first with a 500-character box, and "Suggest a fix to the author"
  - guests see the average and comments without inputs
  - text renders as plain text
- Verify: `npx vitest run tests/community-ui.test.tsx`
- Files: `components/community/RatingStars.tsx`, `CommentList.tsx`, `SuggestionForm.tsx`, `components/quiz/AnswerBack.tsx`, tests
- Depends: 16, 19. Size: M

### Task 21: Suggestions for authors on `/profile` — done
- Result:
  - `components/community/AuthorSuggestions.tsx`: Displays "Suggestions for your questions" list on `/profile`. Each card displays the question's prompt, suggestion body, sender display name, and relative creation time. Provides a "Mark done" action button that calls `resolveSuggestion(commentId)` and removes resolved suggestions from the view in real-time. Shows empty state if the author has no open suggestions.
  - `app/profile/page.tsx`: Integrated `<AuthorSuggestions accountId={account.id} />` in the profile dashboard below the created questions section, rendered for all authenticated session accounts.
  - Tests: Added unit tests in `tests/community-ui.test.tsx` verifying suggestion rendering, mark-done resolution, and empty state. Added integration test in `tests/profile-page.test.tsx` verifying author suggestions display and interactive resolution on `/profile`.
  - Gate: 230/230 tests pass across 26 test files, `check:fast` clean, `check:architecture` clean (0 violations, 346 dependencies cruised), total line coverage 70.97% (above 61.3% ratchet).
- Acceptance:
  - `/profile` lists suggestions on your own questions (prompt, suggestion, sender, date) with "Mark done", and never shows another author's.
- Verify: `npx vitest run tests/community-ui.test.tsx tests/profile-page.test.tsx`
- Files: `components/community/AuthorSuggestions.tsx`, `app/profile/page.tsx`, tests
- Depends: 19. Size: S

### Checkpoint: Discovery and Community
- [ ] Gates pass; first-load JS ≤ 150 kB per route (`CONSTRAINTS.md`)
- [ ] Manual: search signed out, browse topics, rate, comment and suggest after answering

## Phase 5: Rewards — spec `docs/specs/rewards-no-wallet-payee.md`

### Task 22: Payee rule and treasury sweep — done
- Result:
  - `lib/sql/reward-payee.sql`: Added `treasury_swept_count` column to `users` with check constraint `>= 0`. Created `sweep_to_treasury()` SECURITY DEFINER function taking answers > 180 days old from accounts with `wallet IS NULL`, incrementing `treasury_swept_count` idempotently and never decreasing. Created `get_treasury_entitled_count()` SECURITY DEFINER function returning the total pool count. Both functions revoke public EXECUTE and grant to `service_role`.
  - `lib/types.ts`: Extended `ClaimableRewards` with optional `heldTokens?: string` and `sweepsAt?: string | null`.
  - `lib/actions/reward-actions.ts`: Updated `getClaimableRewards`, `generateTokenVoucher`, and `generateBadgeVoucher`. Enforces that accounts without a wallet return `claimableTokens: '0'`, populate `heldTokens` with pending tokens, and calculate `sweepsAt` for the oldest unswept answer. When `account.wallet === process.env.TREASURY_WALLET_ADDRESS`, triggers `sweep_to_treasury()` and adds `get_treasury_entitled_count()` pool to total earned. Vouchers fail early with `WALLET_REQUIRED` for accounts without a wallet.
  - Tests (`tests/rewards-payee.test.ts`, `tests/get-claimable-rewards.test.ts`): Unit tests covering wallet-less accounts (held tokens, sweepsAt, voucher blocking with WALLET_REQUIRED), wallet accounts with previous swept count deduction, treasury sweep trigger and entitlement pool aggregation, and unset TREASURY_WALLET_ADDRESS behavior.
  - Gate: 234/234 tests pass across 27 test files, `check:fast` clean, `check:architecture` clean (0 violations), total line coverage 71.63% (above 61.3% ratchet).
  - Not done: running `lib/sql/reward-payee.sql` on a Supabase branch (needs user).
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
  - SQL scripts 1-7 run in the plan's order, then deploy (the bridge trigger covers rows written while old code is still live)
- Verify: on production, sign up with email, answer 3 questions, reload, add a wallet, claim; search, topics, rate and comment work signed out and signed in; the logs are clean.
- Files: none. Depends: 23. Size: S

### Task 25: Drop the old wallet columns
- Acceptance:
  - grep finds no code that reads or writes the old wallet columns
  - `accounts-drop-wallet-columns.sql` drops them, their constraints, and the `bridge_wallet_account` trigger and function
  - `lib/schema.sql` is rewritten to the final account-keyed shape
- Verify: gates pass; dry run on a branch, then you run it on production about a week after Task 24
- Files: `lib/sql/accounts-drop-wallet-columns.sql`, `lib/schema.sql`
- Depends: 24. Size: S

## Checkpoint: Complete
- [ ] Every success criterion in the five specs checked
- [ ] Human review before merging to `main`
