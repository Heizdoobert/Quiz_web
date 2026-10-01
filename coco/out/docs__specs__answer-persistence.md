# docs/specs/answer-persistence.md
lines:87 exports:getAnswerHistory
---
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
