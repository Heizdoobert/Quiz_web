# Implementation Plan: Stats & Leaderboard Aggregation in Postgres

## Overview

Every read of `quiz_results` downloads raw rows and counts them in JavaScript. Supabase (PostgREST) returns at most 1000 rows per request by default, so once the data grows past that, the numbers silently go wrong:

| Function | File | Reads | Breaks when |
| --- | --- | --- | --- |
| `getGlobalLeaderboard` | `lib/actions/leaderboard-actions.ts` | whole table | total results > 1000 |
| `getGroupLeaderboard` | `lib/actions/leaderboard-actions.ts` | all rows for group members | group's results > 1000 |
| `getUserStats` | `lib/actions/quiz-actions.ts` | all rows for one wallet | one player answers > 1000 |
| `getClaimableRewards` | `lib/actions/reward-actions.ts` | all rows for one wallet | one player answers > 1000 → **$QUIZ under-counted** |

Fix: move the counting into SQL functions and call them with `supabase.rpc()`. Each function returns only the aggregated result (at most `p_limit` rows, or one row), so the row cap no longer applies, and the time stops growing with the table.

Source: measurements and risk notes in `docs/intent/quiz-load-speed.md`.

## Architecture Decisions

- **Postgres functions, not views or materialised tables.** One function per question the app asks. `STABLE`, `SECURITY INVOKER` (the default), so the existing public-read RLS on `quiz_results` still applies. No new tables, no triggers, no cache to invalidate.
- **Results must match today's output exactly.** Same fields, same ranking order (`score desc, accuracy desc`), same accuracy rounding (`round(correct * 100.0 / total)`, which matches `Math.round` for non-negative numbers), same streak rules. The UI and types stay untouched.
- **New SQL lives in its own idempotent file, `lib/sql/stats-functions.sql`** (`CREATE OR REPLACE FUNCTION` only). `lib/schema.sql` can't be re-run on a live database (its `CREATE POLICY` statements and seed `INSERT`s would fail or duplicate), so the new file is run separately in the Supabase SQL Editor. The README "Database" step gets one extra line.
- **SQL ships before code.** The code calls functions that must already exist. Order: run the SQL on Supabase, then merge/deploy the code. If an RPC fails, the action returns its existing empty fallback (`[]` / zero stats / `empty`), same as today on a DB error. There's no silent fallback to the old path, because the old path is the bug.
- **One parity check script, `scripts/check-stats-parity.ts`**, fetches raw rows with pagination (`.range()`, so it's not capped), computes the old JavaScript result, and compares it with the RPC result for every wallet and every group. It's the single runnable proof for all tasks. The repo has no test runner, and adding one isn't warranted for this.

## Task List

Tasks are tracked in `tasks/todo.md`.

### Phase 1: Player stats & rewards (money path first)
- [ ] Task 1: Per-wallet stats function + `getUserStats` + `getClaimableRewards` + parity script

### Checkpoint A
- [ ] SQL applied on Supabase; parity script passes for every wallet; `npm run lint` + `npm run build` clean; human review

### Phase 2: Leaderboards
- [ ] Task 2: Global leaderboard function + `getGlobalLeaderboard`
- [ ] Task 3: Group leaderboard function + `getGroupLeaderboard`

### Checkpoint B
- [ ] Parity script passes for global + every group; leaderboard renders on `preview`; human review before merging to `main`

### Phase 3: Optional
- [ ] Task 4: Next question doesn't wait behind the leaderboard refresh (only if wanted — see Open Questions)

## Risks and Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Code deployed before SQL is applied → every stats/leaderboard call returns empty | High | Checkpoint A/B require the SQL to be applied first; the deploy note is in the PR description |
| SQL ranking or rounding differs subtly from the JS version (ties, rounding at .5) | Med | Parity script compares every wallet/group field-by-field, including rank order |
| Streak logic in SQL differs from the JS loop (ties in `answered_at`) | Med | Order by `answered_at, id` in both parity script and SQL; parity check covers every wallet |
| `preview` and `main` share one Supabase project, so the SQL change hits production immediately | Med | Functions are additive (`CREATE OR REPLACE`, nothing dropped); old code keeps working until the new code deploys |
| Parity script can't prove the >1000 case if live data is small | Med | Script also seeds 1,200 rows for a throwaway test wallet when run with `--seed`, then deletes them — only against a non-production project (Open Question 1) |

## Open Questions

1. Do `preview` and `main` use the same Supabase project, and is there a non-production project where the `--seed` run (writes 1,200 test rows) is allowed?
2. Task 4: should "Next Question" skip waiting for the leaderboard refresh? It changes the order of network calls after answering (fetch the next question first, refresh the leaderboard after). Today's wait is ~1–2s, which is within target, so it's optional.
