# Tasks: Stats & Leaderboard Aggregation in Postgres

Plan: `tasks/plan.md`

## Task 1: Per-wallet stats in Postgres (stats + rewards)

**Description:** Add `get_user_stats(p_wallet text)` to a new `lib/sql/stats-functions.sql`. It returns one row: `total_answered`, `correct_count`, `streak` (consecutive correct from the most recent answer), and `best_streak` (longest run of correct answers, chronological, gaps-and-islands). `getUserStats` calls it via `supabase.rpc()` and keeps its return shape and accuracy rounding. `getClaimableRewards` takes `totalCorrect` from the same RPC instead of downloading rows. Add `scripts/check-stats-parity.ts` (paginated raw fetch → old JS logic vs RPC, per wallet).

**Acceptance criteria:**
- [x] `getUserStats` and `getClaimableRewards` no longer select raw `quiz_results` rows
- [x] For every wallet in the DB, the RPC result equals the old JS computation (score, streak, bestStreak, accuracy, totalAnswered) — live DB had 0 `quiz_results` rows on 2026-09-28, so this is vacuous; the local fixture run is the real proof
- [x] A wallet with more than 1000 answers gets its full correct count (verified in a throwaway local Postgres 16 container instead of `--seed`: 1,500-row wallet plus 8 edge cases, 0 mismatches against the old JS logic)

**Verification:**
- [x] SQL applied in Supabase SQL Editor without errors, and re-running it is a no-op (re-run verified locally); `rpc/get_user_stats` returns 200 on live
- [x] `node scripts/check-stats-parity.mts` reports 0 mismatches against live data (0 rows)
- [x] `npx tsc --noEmit`, `npx eslint` on touched files, and `npm run build` clean
- [ ] Manual: connect a wallet on `preview`; stats panel and View Rewards show the same numbers as before

**Dependencies:** None

**Files likely touched:**
- `lib/sql/stats-functions.sql` (new)
- `lib/actions/quiz-actions.ts`
- `lib/actions/reward-actions.ts`
- `scripts/check-stats-parity.ts` (new)
- `README.md` (one line under Database)

**Estimated scope:** M

## Checkpoint A: after Task 1
- [x] SQL applied on Supabase before the code deploys
- [x] Parity script: 0 mismatches
- [x] Lint + build clean
- [ ] Human review before continuing

## Task 2: Global leaderboard in Postgres

**Description:** Add `get_global_leaderboard(p_limit int)` to `lib/sql/stats-functions.sql`: `GROUP BY wallet_address`, `score = count(*) filter (where is_correct)`, `accuracy = round(score * 100.0 / count(*))`, `ORDER BY score desc, accuracy desc, wallet_address`, `LIMIT p_limit`. `getGlobalLeaderboard` calls it and keeps building `display_name` and `rank` in JavaScript, as it does today. Extend the parity script to compare the global top 50.

**Acceptance criteria:**
- [x] `getGlobalLeaderboard` no longer selects raw `quiz_results` rows
- [x] Top 50 matches the old JS computation (same wallets, same order, same score/accuracy)
- [x] Badge eligibility in `getClaimableRewards` (uses `getGlobalLeaderboard(3)`) is unchanged

**Verification:**
- [ ] Parity script: 0 mismatches for global
- [ ] `npm run lint` and `npm run build` clean
- [ ] Manual: leaderboard on `preview` shows the same top rows as before

**Dependencies:** Task 1 (shares the SQL file and parity script)

**Files likely touched:**
- `lib/sql/stats-functions.sql`
- `lib/actions/leaderboard-actions.ts`
- `scripts/check-stats-parity.ts`

**Estimated scope:** S

## Task 3: Group leaderboard in Postgres

**Description:** Add `get_group_leaderboard(p_group_id uuid, p_limit int)`: start from `group_members` and `LEFT JOIN` `quiz_results`, so members with no answers still appear with score 0 and accuracy 0 (matches today's behaviour). Same ordering as Task 2. `getGroupLeaderboard` calls it; the separate members query goes away. Extend the parity script to cover every group.

**Acceptance criteria:**
- [x] `getGroupLeaderboard` makes one RPC call instead of two raw queries
- [x] Members with zero answers still listed with score 0 and accuracy 0
- [x] Every group matches the old JS computation

**Verification:**
- [ ] Parity script: 0 mismatches for all groups
- [ ] `npm run lint` and `npm run build` clean
- [ ] Manual: Group Guild tab on `preview` shows the same rows as before

**Dependencies:** Task 2

**Files likely touched:**
- `lib/sql/stats-functions.sql`
- `lib/actions/leaderboard-actions.ts`
- `scripts/check-stats-parity.ts`

**Estimated scope:** S

Tasks 2–3 verified in a throwaway local Postgres 16 container: global top 50, a >50-member group, a 5-member group with a zero-answer member, a zero-answer-only group and an unknown group all match the old JS logic (0 mismatches), including ties, a 1,300-row wallet, and JS float rounding (57/200 → 28, 1/8 → 13). `tsc`, `eslint`, and `npm run build` clean.

## Checkpoint B: after Tasks 2–3
- [ ] Parity script: 0 mismatches for global and all groups
- [ ] Lint + build clean
- [ ] Leaderboards render correctly on `preview`
- [ ] Human review before merging to `main`

## Task 4 (optional): Next question doesn't wait behind leaderboard refresh

**Description:** Next.js runs server actions one at a time per client. In `handleAnswerSubmit`, the leaderboard and rewards refresh start right after an answer, so a "Next Question" click queues behind them. Prefetch the next question right after `submitAnswer` resolves, before the refreshes, and show it on "Next Question".

**Acceptance criteria:**
- [ ] After answering, the next question appears without waiting for the leaderboard refresh
- [ ] Answered questions are still excluded, and category selection still applies

**Verification:**
- [ ] Headless timing run (same method as `docs/intent/quiz-load-speed.md`): next-question wait no longer includes the leaderboard call
- [ ] `npm run lint` and `npm run build` clean

**Dependencies:** None (independent of Tasks 1–3). Only do this if Open Question 2 says yes.

**Files likely touched:**
- `hooks/quiz/use-quiz-logic.ts`

**Estimated scope:** S
