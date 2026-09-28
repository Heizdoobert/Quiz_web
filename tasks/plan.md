# Implementation Plan: Profile Dashboard & Quiz Export (Complete)

## Overview
We built a protected Profile Dashboard where authenticated (Web3 connected) quiz creators can view all the quizzes they've created and export them as a secure backup file. This involved creating server actions to fetch/export data and a new frontend page matching the existing Tailwind/App Router structure.

## Architecture Decisions
- **Authentication Check:** Since authentication uses Web3 wallets via Wagmi/RainbowKit (client-side) rather than standard Supabase session cookies, the profile page is a Client Component that checks `useAccount()` and fetches data securely via Server Actions passing the address.
- **Security & RLS:** Server actions explicitly filter database queries by the provided `walletAddress` and only return public question fields to protect against answer leakage.
- **Export Format:** The backup is a JSON payload combining data from `questions` and `quiz_results`.

## Task List

### Phase 1: Foundation (Server Actions)
- [x] Task 1: Create Profile Server Actions

### Checkpoint: Foundation
- [x] Server actions compile without errors
- [x] Export structure is verified

### Phase 2: Core Features (UI and Navigation)
- [x] Task 2: Build the Profile Page UI (`/profile`)
- [x] Task 3: Link to the Profile Page from the existing `ProfileModal`

### Checkpoint: Complete
- [x] Application builds cleanly (`npm run build`)
- [x] Profile page correctly shows "Access Denied" if disconnected
- [x] Profile page lists quizzes when connected
- [x] Backup JSON download works

---

# Implementation Plan: Stats & Leaderboard Aggregation in Postgres (Complete)

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
- [x] Task 1: Per-wallet stats function + `getUserStats` + `getClaimableRewards` + parity script

### Checkpoint A
- [x] SQL applied on Supabase; parity script passes for every wallet; `npm run lint` + `npm run build` clean; human review

### Phase 2: Leaderboards
- [x] Task 2: Global leaderboard function + `getGlobalLeaderboard`
- [x] Task 3: Group leaderboard function + `getGroupLeaderboard`

### Checkpoint B
- [x] Parity script passes for global + every group; leaderboard renders on `preview`; human review before merging to `main`

### Phase 3: Optional
- [ ] Task 4: Next question doesn't wait behind the leaderboard refresh (only if wanted — see Open Questions)
