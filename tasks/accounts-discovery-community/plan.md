# Implementation Plan: Accounts, Discovery and Community

## Overview
Build the five approved specs in capability-map order. Players sign in with an email code or a wallet, with the wallet optional, and `$QUIZ` follows the account (old coins go to the player once a wallet is added; the treasury only sweeps coins over 180 days old from accounts that still have no wallet). The sample questions are retired, only signed-in players create, and guests are read-only but can still play. Anyone can search questions and browse topics newest first. Players who answered can rate, comment and send suggestions to authors.

Specs:
- `docs/specs/identity-accounts.md`
- `docs/specs/trivia-guest-access.md`
- `docs/specs/discovery.md`
- `docs/specs/community.md`
- `docs/specs/rewards-no-wallet-payee.md`

Tasks: `tasks/accounts-discovery-community/todo.md`. This lives beside `tasks/plan.md`, which still holds PR #9's open production task.

Base: branch `spec/accounts-discovery-community`, stacked on PR #9 (`fix/prod-answer-persistence`). #9 merges first.

## What the code check found (2026-09-28)
- `getSessionWallet()` has 13 call sites in 8 action files; nothing else on the server reads the session.
- Browser-supplied wallet arguments in 10 actions:
  - these 8 take one, with their browser callers in 7 files: `getUserStats`, `getAnswerHistory`, `getClaimableRewards`, `getUserGroups`, `getMyLists`, `getListsPendingReview`, `exportUserData`, `getOrCreateUser`
  - `confirmRewardClaim` also takes one; its caller is `ContestPlay`
  - so does `requestSignIn` (fine: it is the sign-in challenge)
- On the client, `useWalletSession` has 8 callers and wagmi `useAccount` decides "signed in" in 5 files. Both must move to a server-fed session, or email accounts can't be signed in anywhere.
- `reward-actions` calls `getUserStats(address)` directly, so stats need a server-only helper.
- `getOrCreateUser` is no longer needed once sign-in creates the account, so it is deleted rather than migrated.
- Guest write controls live in `QuizLayout`, `AnswerBack` (dispute), `LeaderboardPanel` (groups), `ListsNav` (My Lists, Review) and `ContestBrowser` (join).
- There is no local database (`docker-compose.yml` runs only the web app), so every SQL check runs on a Supabase branch.

## Dependency graph
```
1 schema ─ 2 session ─┬─ 3 answers/stats ─ 4 leaderboards ─┐
                      ├─ 5 questions/disputes ─────────────┤
                      ├─ 6 lists/contests ─────────────────┼─ 9 rewards, delete wallet-session ─ 10 client session ─┬─ 11 page gating
                      ├─ 7 groups ─────────────────────────┤                                                      └─ 12 email ─ 13 add wallet
                      └─ 8 profile export ─────────────────┘
Phase 1 ─ 14 public rule ─┬─ 15 topics ─┬─ 16 guests read-only ─┐
                          │             └─ 17 search ─ 18 topic pages
                          └─ 19 community data ─┬───────────────┴─ 20 card-back UI
                                                └─ 21 profile suggestions
9 ─ 22 payee/sweep ─ (13, 22) ─ 23 disclosure/contest ─ 24 rollout ─ 25 drop old columns
```

## Architecture Decisions
- **Account id is the identity.** The migration is additive first: new account columns are added and backfilled, and old wallet columns become nullable but stay filled for wallet accounts. Every task leaves the app working. The old columns go in Task 25.
- **One session mechanism.** The HMAC cookie carries the account id. Supabase Auth only verifies email codes, and its tokens never reach the browser (ADR-001 posture kept).
- **Temporary bridge, removed in Task 9.** `getSessionWallet()` becomes a thin wrapper over `getSessionAccount()` in Task 2, so Tasks 3-8 move one path each; Task 9 deletes it and `lib/wallet-session.ts`.
- **Server actions stop taking wallet arguments.** Each action moves in the task that owns its module, together with its browser callers, which is the vertical slice.
- **Client "signed in" comes from the server** (`getSessionInfo()` into `SessionProvider`). `requireSignIn()` replaces `useWalletSession()` with the same call-site shape, so its 7 other callers are a mechanical rename. Wagmi stays only for on-chain transactions.
- **Trivia owns the public-question rule and the topic list.** Discovery and community consume them.
- **Search is Postgres `pg_trgm`** in one SECURITY DEFINER function.
- **The treasury is an ordinary account** signed in with `TREASURY_WALLET_ADDRESS`, with a 180-day grace-period sweep.

## Task List

### Phase 1: Identity
- [x] Task 1: Accounts schema migration script (your Supabase-branch run still pending)
- [x] Task 2: Account session, and wallet sign-in creates an account
- [x] Task 3: Answers, history and personal stats on account ids
- [x] Task 4: Leaderboards on account ids
- [x] Task 5: Question creation and disputes on account ids
- [x] Task 6: Lists and contests on account ids
- [x] Task 7: Groups on account ids
- [x] Task 8: Profile export on account ids
- [x] Task 9: Rewards on account ids; delete `lib/wallet-session.ts`
- [x] Task 10: Client session provider and sign-in modal (wallet)
- [x] Task 11: Session-based gating on list, contest and profile pages
- [x] Task 12: Email code sign-in
- [x] Task 13: Add a wallet to an email account

### Checkpoint: Identity
- [ ] Gates and build pass; grep finds 0 uses of `getSessionWallet` and `useWalletSession`
- [ ] `accounts.sql` and `stats-functions.sql` on a Supabase branch: counts and scores unchanged (you)
- [ ] Manual: wallet sign-in, email sign-in, add wallet, sign out, reload
- [ ] Review before Phase 2

### Phase 2: Trivia
- [x] Task 14: Public-question rule and retire sample questions (your Supabase-branch run still pending)
- [x] Task 15: Topics from the database (your Supabase-branch run of `lib/sql/topics.sql` still pending)
- [x] Task 16: Signed-in creation and read-only guests

### Checkpoint: Trivia
- [ ] Gates pass; guests see no write controls; database topics in `CategoryBar`; no sample prompt served

### Phase 3: Discovery
- [x] Task 17: Question search (your Supabase-branch run of `lib/sql/search.sql` still pending)
- [x] Task 18: Topic pages and single-question play

### Phase 4: Community
- [ ] Task 19: Community tables and server actions
- [ ] Task 20: Ratings, comments and suggestions on the card back
- [ ] Task 21: Suggestions for authors on `/profile`

### Checkpoint: Discovery and Community
- [ ] Gates pass; first-load JS ≤ 150 kB per route (Discovery's 3 new routes not yet measured — you)
- [ ] Manual: search signed out, topics, rate, comment and suggest after answering

### Phase 5: Rewards
- [ ] Task 22: Payee rule and treasury sweep
- [ ] Task 23: Disclosure, held balance and contest wallet requirement

### Checkpoint: Code complete
- [ ] Gates, contract tests and build pass
- [ ] Draft PR into `preview` (after PR #9 merges)

### Phase 6: Rollout and cleanup
- [ ] Task 24: Production rollout (needs you)
- [ ] Task 25: Drop the old wallet columns

### Checkpoint: Complete
- [ ] Every success criterion in the five specs checked
- [ ] Human review before merging to `main`

## Parallelization
- Tasks 5, 6, 7 and 8 depend only on Task 2 and touch different action files, so they can run in parallel. Tasks 3, 5 and 6 share `tests/answer-and-list-guards.test.ts`; running them one after another avoids conflicts in that file.
- After Task 15, Discovery (17-18) and Community data (19) can run in parallel. Task 20 waits for Task 16, since both edit `AnswerBack.tsx`.
- Task 22 needs only Task 9, but Task 23 shares `SignInModal` and `Header` with Tasks 12-13, so it goes last.

## SQL run order (Supabase branch first, then production; each needs your go-ahead)
1. `lib/sql/accounts.sql`
2. `lib/sql/stats-functions.sql` (re-keyed)
3. `lib/sql/retire-sample-questions.sql`
4. `lib/sql/topics.sql`
5. `lib/sql/search.sql`
6. `lib/sql/community.sql`
7. `lib/sql/reward-payee.sql`
8. About a week after rollout: `lib/sql/accounts-drop-wallet-columns.sql`

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Account migration touches every table and action | High | Additive migration; old columns kept until Task 25; branch dry run compares counts and scores; one path per task |
| Rows written between running `accounts.sql` and deploying miss the new columns | High | `bridge_wallet_account` insert trigger fills the account from the wallet (and back) until Task 25; tested in Task 1 |
| Email accounts have no wagmi connection, so any leftover `useAccount` gating locks them out | High | Task 10 moves gating to `useSession`; Task 11 covers the remaining pages; checkpoint grep and manual test as an email account |
| Connected wallet differs from the account's wallet during on-chain claims | Med | Task 11: on-chain actions check the wallet matches and ask the player to switch |
| Session cookie change signs everyone out | Low | Expected once |
| Supabase built-in email sender rate-limits codes | High | Custom SMTP before launch (Task 24) |
| New pages and modal push first-load JS past 150 kB | Med | Measure at each checkpoint; lazy-load `SignInModal` and community components |
| Comment spam | Med | Answer-first gate, 20 per day, owner delete |
| Treasury forfeiture wording | Med | One disclosure source shown before the first saved answer; terms review is yours |

## Open Questions
- Treasury wallet address (needed before Task 24).
- SMTP provider for email codes (needed before Task 24).
- Google sign-in and comment moderation are not in this plan.
