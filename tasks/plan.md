# Implementation Plan: Production Answer Persistence

## Overview
In production, a signed-in player's answers, streak, history and scoreboard do not survive a page reload. Goal: every answer from a signed-in wallet is saved, and score, streak, history and leaderboard show it after reload. When an answer is not saved, the player is told why instead of seeing "+1 Score point".

Confirmed intent: signed-in players only, keep the security hardening from v0.3.0 (server writes with the secret key, wallet proven by Sign-In with Ethereum), security and reliability first. Out of scope: backend rewrite, new features, saving guest answers.

## Findings (from reading origin/main)
1. **History is never persisted.** `hooks/quiz/use-quiz-logic.ts` keeps history in `useState([])` and never loads it, so it is empty after every reload regardless of anything else.
2. **Likely write failure: missing `users` row.** `quiz_results.wallet_address` references `users(wallet_address)`. The `users` row is created by `getOrCreateUser` with the public key; if that insert fails (no public insert policy on the production database, or any error), it only logs a warning. `submitAnswer` then fails the foreign key, returns `recorded: false`, and nothing is saved.
3. **Failures are silent.** `handleAnswerSubmit` ignores the result of `ensureSession()`, and `AnswerBack` always says "+1 Score point & tokens earned" for a correct answer, even when `recorded` is false.
4. **Production leaderboard is empty** (`initialLeaderboard: []` in the served page), so either no row was ever saved or the stats functions fail in production. Not yet confirmed which; see Task 4.

## Architecture Decisions
- **The server creates the `users` row, only for a proven wallet.** A new server-only helper `ensureUserRow(wallet)` in `lib/users.ts` upserts with `supabaseAdmin`. It is called right after a successful sign-in and from `getOrCreateUser` when the session wallet matches (covers wallets already signed in). It is not a server action, so it cannot be called with an arbitrary address.
- **`getOrCreateUser` stops inserting with the public key.** Guests no longer get rows; nothing uses guest rows. Dropping the now-unneeded "Allow public insert for users" policy is an RLS change and is left to the user (see Open Questions).
- **`submitAnswer` says why an answer was not saved.** `AnswerSubmissionResult` keeps `recorded` and gains `notSavedReason: 'signed-out' | 'already-answered' | 'own-question' | 'error'`. The UI shows the matching message.
- **History reads go through the session wallet.** New server action `getAnswerHistory(address)` returns the latest 20 answers (question prompt + correct/incorrect) only when `address` matches the session wallet, read with `supabaseAdmin`. It never returns `answer_index`. Loaded answers also seed `answeredIds`, so a reload does not re-serve the same questions.

## Task List

### Phase 1: Saving works
- [ ] Task 1: Server creates the users row for a signed-in wallet
- [ ] Task 2: Answer result says why it wasn't saved, and the UI shows it

### Checkpoint: Saving
- [ ] Tests, lint, type-check pass

### Phase 2: Survives reload
- [ ] Task 3: Load answer history from the database

### Checkpoint: Code complete
- [ ] Tests, lint, type-check, build pass
- [ ] Draft PR into `preview` opened

### Phase 3: Production
- [ ] Task 4: Verify production configuration and run the end-to-end check

### Checkpoint: Complete
- [ ] Sign in, answer 3 questions, reload: score, streak, history, leaderboard all still show them
- [ ] Human review before merging to main

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Real production cause is config (missing `SUPABASE_SECRET_KEY` in Production env, SQL not run on the production database), not the users row | High | Task 4 checks both before declaring done; the new error message makes the failure visible either way |
| Extra upsert on every sign-in | Low | One query per sign-in, `ignoreDuplicates` |
| History read exposes answers | Med | Session-bound, own wallet only, returns prompt + correct/incorrect, never `answer_index` |
| Preview carries unreviewed escrow commits (up to deb31b1) | Med | This fix targets `preview`; main still needs the pending escrow security review |

## Open Questions
- Production logs: do Vercel runtime logs show `submitAnswer insert error` (code 23503 confirms the users-row cause), `SUPABASE_SECRET_KEY is not set`, or `getUserStats rpc error`?
- Were the `lib/sql/*.sql` scripts run on the Supabase project that the **Production** environment points at (it may differ from Preview)?
- Drop the "Allow public insert for users" policy after this ships? (RLS change, your call.)
