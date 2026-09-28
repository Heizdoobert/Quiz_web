# Tasks: Production Answer Persistence

## Task 1: Server creates the users row for a signed-in wallet
**Description:** `quiz_results`, `groups` and `questions` reference `users`, but the row is only created with the public key and failures are swallowed. Add a server-only `ensureUserRow(wallet)` that upserts with `supabaseAdmin`, call it after a successful Sign-In with Ethereum, and have `getOrCreateUser` use it (instead of a public insert) when the address matches the session wallet.

**Acceptance criteria:**
- [x] After `signInWithWallet` succeeds, a `users` row exists for that wallet (lowercase)
- [x] `getOrCreateUser(address)` creates the row only when `address` matches the session wallet; it never inserts with the public key
- [x] `ensureUserRow` is not exported from a `'use server'` file

**Verification:**
- [x] Tests pass: `npm test` (`tests/user-persistence.test.ts`: sign-in creates the row, `getOrCreateUser` gated to the session wallet, no row on a failed signature; confirmed RED beforehand — the test file can't even load against the pre-fix code, since `lib/users.ts` doesn't exist)
- [x] `npm run type-check` and `npm run lint` clean

**Dependencies:** None
**Files likely touched:**
- `lib/users.ts` (new)
- `lib/actions/auth-actions.ts`
- `lib/actions/user-actions.ts`
- `tests/answer-and-list-guards.test.ts`
**Estimated scope:** Small

---

## Task 2: Answer result says why it wasn't saved, and the UI shows it
**Description:** Add `notSavedReason` to `AnswerSubmissionResult`, set by `submitAnswer`: `signed-out` (no session), `own-question`, `already-answered` (insert 23505), `error` (any other failure). `AnswerBack` shows "+1 Score point" only when `recorded` is true, and otherwise a short message for the reason.

**Acceptance criteria:**
- [x] Each not-saved path returns the matching reason; a saved answer returns `recorded: true` with no reason
- [x] A correct but unsaved answer no longer shows "+1 Score point & tokens earned"
- [x] A signed-out or failed sign-in answer tells the player to sign in with the wallet

**Verification:**
- [x] Tests pass: `npm test` (reason per path in `submitAnswer guards`)
- [ ] Manual check: `npm run dev`, answer without signing: the not-saved message appears (not run — no live env in this sandbox)

**Dependencies:** None
**Files likely touched:**
- `lib/types.ts`
- `lib/actions/quiz-actions.ts`
- `components/quiz/AnswerBack.tsx`
- `tests/answer-and-list-guards.test.ts`
**Estimated scope:** Small

---

## Checkpoint: Saving
- [x] `npm test`, `npm run lint`, `npm run type-check` pass

---

## Task 3: Load answer history from the database
**Description:** Add server action `getAnswerHistory(address)` that returns the latest 20 answers (question id, prompt, correct/incorrect) for the session wallet, read with `supabaseAdmin`, and `[]` when `address` doesn't match the session. The quiz hook loads it when the wallet connects, and adds the ids to `answeredIds`.

**Acceptance criteria:**
- [x] After reload, the history panel shows the signed-in wallet's previous answers, newest first
- [x] Another wallet's address, or no session, returns `[]` without querying `quiz_results`
- [x] The response never contains `answer_index` or `correct_index`
- [x] Questions in the loaded history are not served again right after reload

**Verification:**
- [x] Tests pass: `npm test` (session match, mismatch, no session)
- [ ] Manual check: sign in, answer, reload: history still listed (not run — no live env in this sandbox)

**Dependencies:** Task 1
**Files likely touched:**
- `lib/actions/quiz-actions.ts`
- `hooks/quiz/use-quiz-logic.ts`
- `tests/answer-and-list-guards.test.ts`
**Estimated scope:** Small

---

## Checkpoint: Code complete
- [x] `npm test`, `npm run lint`, `npm run type-check`, `npm run build` pass
- [x] Signed commit on `fix/prod-answer-persistence`, draft PR into `preview` (PR #9)
- [x] Checked against `CONSTRAINTS.md`: changed-line coverage was 73% (and 0% on `AnswerBack.tsx`/`use-quiz-logic.ts`, below the 80% gate) — added `tests/AnswerBack.test.tsx`, `tests/use-quiz-logic-history.test.tsx`, `tests/ensure-user-row-no-admin.test.ts`, `tests/submit-answer-no-admin.test.ts`, and extra cases in `tests/answer-and-list-guards.test.ts`; changed-line coverage now 100%. Project line ratchet 56.11% (was 54.12%, must not fall). 64/64 tests pass. Deps: one high finding (`ws`), matches exception W1, not expired.
- [x] Independent review (`agent-skills:code-reviewer`): Request changes → one Required gap (`getOrCreateUser`'s fetch-error and catch branches untested, 69% file coverage). Fixed with two tests (d8dfbaa); `user-actions.ts` now 100% line coverage. 66/66 tests pass. No Critical/security findings. Remaining items were Optional/Nit/FYI (posted to PR #9, not required for merge).

---

## Task 4: Verify production configuration and run the end-to-end check
**Description:** Confirm the production-only causes are ruled out, then test the real flow. Needs the user: Vercel dashboard and Supabase SQL Editor access.

**Acceptance criteria:**
- [ ] Vercel Production environment has `SUPABASE_SECRET_KEY` and the Supabase URL/key for the intended project (names only, no values shared)
- [ ] `lib/sql/stats-functions.sql` and the other `lib/sql/*.sql` scripts have been run on that production database
- [ ] Vercel runtime logs show no `submitAnswer insert error`, `ensureUserRow error` or `getUserStats rpc error` after the test
- [ ] Sign in, answer 3 questions, reload: score, streak, history and leaderboard all show them

**Verification:**
- [ ] Manual end-to-end check on the preview deployment, then on production after merge

**Dependencies:** Tasks 1-3
**Files likely touched:** None
**Estimated scope:** Small

---

## Checkpoint: Complete
- [ ] All acceptance criteria met
- [ ] Human review before merging to main
