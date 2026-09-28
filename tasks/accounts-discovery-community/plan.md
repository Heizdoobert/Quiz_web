# Implementation Plan: Accounts, Discovery and Community

## Overview
Build the five approved specs in capability-map order. Players sign in with an email code or a wallet, with the wallet optional, and `$QUIZ` follows the account. The sample questions are retired, only signed-in players create, and guests are read-only but can still play. Anyone can search questions and browse topics newest first. Players who answered can rate, comment and send suggestions to authors.

Specs:
- `docs/specs/identity-accounts.md`
- `docs/specs/trivia-guest-access.md`
- `docs/specs/discovery.md`
- `docs/specs/community.md`
- `docs/specs/rewards-no-wallet-payee.md`

Tasks: `tasks/accounts-discovery-community/todo.md`.

Base: branch `spec/accounts-discovery-community`, stacked on PR #9 (`fix/prod-answer-persistence`). This plan builds on #9's `ensureUserRow`, `getAnswerHistory` and `notSavedReason`, so #9 merges first.

## Architecture Decisions
- **Account id is the identity.** `users.id` (UUID) replaces `wallet_address` as the key every table references.
  - The migration is additive first: `user_id` columns are added and backfilled, and old wallet columns become nullable but stay.
  - The old columns are dropped only in the last task, after production has run on `user_id`.
  - Every task in between leaves the app working.
- **One session mechanism.** The existing HMAC cookie carries the account id. Supabase Auth only verifies email codes, and its tokens never reach the browser (ADR-001 posture kept).
- **`getSessionWallet()` survives until Task 5** as a thin wrapper over `getSessionAccount()`, so callers can move one module at a time; Task 5 deletes it.
- **Client session state comes from the server** (`getSessionInfo()`), not from wagmi. A connected wallet no longer means signed in, since email accounts have no wallet.
- **Trivia owns the public-question rule and the topic list.** Discovery and community consume them, so the dependency direction stays one-way.
- **Search is Postgres `pg_trgm`** in one SECURITY DEFINER function, with no new service or dependency.
- **The treasury is an ordinary account** signed in with `TREASURY_WALLET_ADDRESS`. A 180-day grace-period sweep keeps players' earnings claimable once they add a wallet.

## Task List

### Phase 1: Identity (accounts, sessions, email sign-in, optional wallet)
- [ ] Task 1: Accounts schema migration script
- [ ] Task 2: Account session, and wallet sign-in creates an account
- [ ] Task 3: Trivia actions and stats on `user_id`
- [ ] Task 4: Lists and groups on `user_id`
- [ ] Task 5: Profile, rewards and leaderboards on `user_id`; remove `getSessionWallet`
- [ ] Task 6: Client session state from the server
- [ ] Task 7: Email code sign-in
- [ ] Task 8: Add a wallet to an email account

### Checkpoint: Identity
- [ ] `npm run check:task` and `npm run build` pass
- [ ] `accounts.sql` and the updated `stats-functions.sql` dry-run on a Supabase branch or a copy of production; row counts and scores unchanged (needs you)
- [ ] Manual: wallet sign-in, email sign-in, add wallet, sign out, reload
- [ ] Review before Phase 2

### Phase 2: Trivia (sample questions, topics, signed-in creation, read-only guests)
- [ ] Task 9: Public-question rule and retire sample questions
- [ ] Task 10: Topics from the database
- [ ] Task 11: Signed-in creation and read-only guests

### Checkpoint: Trivia
- [ ] Gates pass; a guest sees no write controls; `CategoryBar` shows database topics

### Phase 3: Discovery
- [ ] Task 12: Question search
- [ ] Task 13: Topic pages and single-question play

### Phase 4: Community
- [ ] Task 14: Community tables and server actions
- [ ] Task 15: Ratings, comments and suggestions on the card back
- [ ] Task 16: Suggestions for authors on `/profile`

### Checkpoint: Discovery and Community
- [ ] Gates pass; bundle per route still ≤ 150 kB (`CONSTRAINTS.md`)
- [ ] Manual: search signed out, browse topics, rate, comment and suggest after answering

### Phase 5: Rewards
- [ ] Task 17: Payee rule and treasury sweep
- [ ] Task 18: Disclosure, held balance and contest wallet requirement

### Checkpoint: Code complete
- [ ] Gates and contract tests pass
- [ ] Draft PR into `preview` (after PR #9 merges)

### Phase 6: Rollout and cleanup
- [ ] Task 19: Production rollout (needs you)
- [ ] Task 20: Drop the old wallet columns

### Checkpoint: Complete
- [ ] Every success criterion in the five specs checked
- [ ] Human review before merging to `main`

## Parallelization
- Phase 1 is sequential.
- After Phase 2, Phase 3 (Tasks 12-13) and Phase 4 (Tasks 14-16) touch different files and can run in parallel. Task 15 edits `AnswerBack.tsx`, which Task 11 also edits, so Task 11 must land first.
- Phase 5 needs Phase 1 only, but it shares `SignInModal` and `Header` with Tasks 7-8, so it goes last.

## SQL run order (each on a branch or copy first, then production; each needs your go-ahead)
1. `lib/sql/accounts.sql`
2. `lib/sql/stats-functions.sql` (re-keyed to `user_id`)
3. `lib/sql/retire-sample-questions.sql`
4. `lib/sql/topics.sql`
5. `lib/sql/search.sql`
6. `lib/sql/community.sql`
7. `lib/sql/reward-payee.sql`
8. After production has run on `user_id` for about a week: `lib/sql/accounts-drop-wallet-columns.sql`

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Account migration touches every table and action | High | Additive migration; old columns kept until Task 20; the dry run compares row counts and scores; one module per task |
| Rows written between running `accounts.sql` and deploying new code miss `user_id` | High | The backfill in `accounts.sql` is idempotent; re-run it right after deploy (Task 19) |
| Session cookie change signs everyone out | Low | Expected once; players sign in again |
| Supabase built-in email sender rate-limits codes in production | High | Custom SMTP before launch (Task 19) |
| New pages and modal push first-load JS past 150 kB | Med | Measure at each checkpoint; lazy-load `SignInModal` and community components |
| Comment spam or abuse | Med | Answer-first gate, 20 per day cap, owner delete; moderation is an open question |
| Treasury forfeiture wording | Med | One disclosure source, shown before the first saved answer; terms review is yours |

## Open Questions
- Treasury wallet address (needed before Task 19).
- SMTP provider for email codes (needed before Task 19).
- Add Google sign-in later? Not in this plan.
- Comment moderation beyond owner delete? Not in this plan.
