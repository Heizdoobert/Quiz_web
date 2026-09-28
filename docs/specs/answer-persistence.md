# Spec: Answer Persistence for Signed-In Players

Module: `trivia` (consumes `identity`) — see `CAPABILITY-MAP.md`.
Status: Draft, awaiting approval. Implemented in PR #9 (`fix/prod-answer-persistence` → `preview`); plan in `tasks/plan.md`, tasks in `tasks/todo.md`.

## Objective
In production, a signed-in player's answers, streak, history and scoreboard disappear on reload. Every answer from a wallet proven by Sign-In with Ethereum must be saved, and must still show after a reload. When an answer is not saved, the player is told why instead of seeing "+1 Score point".

Users: players who connected a wallet and signed the SIWE message. Guests can still play and see results; their answers are never saved.

Out of scope: backend rewrite, new features, saving guest answers, the escrow/contest flow.

## Tech Stack
Next.js 16.3 App Router with server actions, React 19.2, Supabase (`@supabase/supabase-js` 2.116, publishable key + server-only secret key), wagmi 2 / viem 2 SIWE, Vitest 5 + Testing Library.

## Commands
- Fast gate (every edit): `npm run check:fast` (type-check + lint)
- Task gate (before commit): `npm run check:task` (fast + `vitest run tests/ --coverage`)
- Focused test: `npx vitest run tests/user-persistence.test.ts`
- Build: `npm run build`
- Deps: `npm run check:deps`
- Dev: `npm run dev`

## Project Structure
- `lib/users.ts` — `ensureUserRow(wallet)`, server-only (not a server action), upserts `users` with the secret key
- `lib/actions/auth-actions.ts` — `signInWithWallet` calls `ensureUserRow` after a verified signature
- `lib/wallet-session.ts` — signed `wallet_session` cookie; `shouldUseSecureCookies()` sets `Secure` from the request scheme
- `lib/actions/user-actions.ts` — `getOrCreateUser` reads with the public key; creates a row only for the session wallet
- `lib/actions/quiz-actions.ts` — `submitAnswer` (returns `recorded` + `notSavedReason`), `getAnswerHistory`, `getUserStats`
- `lib/types.ts` — `AnswerSubmissionResult.notSavedReason`, `HistoryItem`
- `hooks/quiz/use-quiz-logic.ts` — loads stats and history on connect; local stats move only when `res.recorded`
- `components/quiz/AnswerBack.tsx` — reason-specific "not saved" message
- `lib/sql/*.sql` — stats functions and RLS; must be run on each Supabase project
- `tests/` — unit and component tests (flat, `*.test.ts(x)`)

## Code Style
Every server action that touches a wallet's data proves the wallet from the session, never from the argument:

```ts
export async function getAnswerHistory(walletAddress: string): Promise<HistoryItem[]> {
  try {
    if (!supabaseAdmin) return [];
    const wallet = await getSessionWallet();
    if (!wallet || wallet !== walletAddress.toLowerCase()) return [];
    // ...read with supabaseAdmin, map to HistoryItem, never answer_index
  } catch (err) {
    console.error('getAnswerHistory exception:', err);
    return [];
  }
}
```

- Wallet addresses stored and compared lowercase.
- Server actions return safe values on failure (`[]`, `recorded: false`) and `console.error` with the function name; they do not throw to the client.
- Writes use `supabaseAdmin` only; public-key client is read-only.

## Testing Strategy
- Vitest unit tests for server actions, with Supabase and `wallet-session` mocked at the module boundary (`tests/user-persistence.test.ts`, `tests/answer-and-list-guards.test.ts`, `tests/*-no-admin.test.ts` for a missing secret key).
- Testing Library for UI and hook behavior (`tests/AnswerBack.test.tsx`, `tests/use-quiz-logic-history.test.tsx`).
- Coverage per `CONSTRAINTS.md`: changed lines ≥ 80%, project lines must not fall below the ratchet.
- Manual end-to-end check on the preview deployment, then production (no automated wallet E2E exists).

## Boundaries
- **Always:** prove the wallet with `getSessionWallet()` before any read or write of its data; write with `supabaseAdmin` on the server only; run `npm run check:task` before committing; follow `CONSTRAINTS.md`.
- **Ask first:** RLS or schema changes (including dropping the "Allow public insert for users" policy); running SQL on a production database; changing cookie or session semantics; adding dependencies; merging into `preview` or `main`.
- **Never:** trust a client-supplied wallet address as proof; return `correct_index` or `answer_index` before an answer is submitted; save guest answers; weaken `CONSTRAINTS.md` to pass; push to `main`.

## Success Criteria
1. After a verified SIWE signature, a `users` row exists for that wallet, created with the secret key. `getOrCreateUser` never inserts with the public key, and a guest gets no row.
2. A signed-in wallet's first answer to a verified question returns `recorded: true` and inserts one `quiz_results` row.
3. When not saved, `recorded` is `false` and `notSavedReason` is one of `signed-out`, `already-answered`, `own-question`, `error`; `AnswerBack` shows the matching message and never "+1 Score point"; local stats do not change.
4. After reload, the hook loads score, streak, best streak and accuracy from `getUserStats`, and the latest 20 answers (newest first) from `getAnswerHistory`; loaded question ids are excluded from the next random question.
5. `getAnswerHistory` returns `[]` for any address other than the session wallet, and never returns `answer_index` or `correct_index`.
6. The `wallet_session` cookie is `Secure` only when the request is HTTPS (`x-forwarded-proto`, else a non-private host), so a session set on the deployment is sent back on the next request.
7. `npm run check:task` and `npm run build` pass; changed-line coverage ≥ 80%.
8. Production (Task 4): the Production environment has `SUPABASE_SECRET_KEY` and the intended Supabase URL/key; `lib/sql/*.sql` has been run on that database; sign in, answer 3 questions, reload, and score, streak, history and leaderboard all still show them, with no `submitAnswer insert error`, `ensureUserRow error` or `getUserStats rpc error` in the logs.

## Known Gaps
- Criterion 6 has no unit test yet (`shouldUseSecureCookies` landed on `preview` without one).
- Criterion 3's "local stats do not change" and criterion 4's stats load are hook behavior with no test; `tests/use-quiz-logic-history.test.tsx` covers history and `answeredIds` only.
- Two `submitAnswer` guards (question not verified, contest entry not in progress) report `notSavedReason: 'error'` although nothing went wrong; the player sees "something went wrong, try again".
- `ensureUserRow` only logs a failed upsert; the later foreign-key failure surfaces as `notSavedReason: 'error'`.

## Open Questions
- Which cause was live in production: the `Secure` cookie dropped (fixed by `shouldUseSecureCookies`, already on `preview`), the missing `users` row, or configuration (secret key / SQL not run)? Vercel runtime logs answer this.
- Should not-eligible answers get their own `notSavedReason` (e.g. `not-eligible`) instead of `error`?
- Drop the "Allow public insert for users" RLS policy once this ships?
