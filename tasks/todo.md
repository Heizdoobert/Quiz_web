# Tasks: Integrated Accounts, Persistence & Authentication

## Task 1: Accounts Migration & Identity Foundation
- [x] Schema migration `lib/sql/accounts.sql` adds account ids and wallet linking
- [x] `lib/session.ts` implements HMAC signed account session cookies (`quiz_session`)
- [x] `lib/users.ts` exports `ensureAccountForWallet` and `accountIdForWallet`
- [x] Unit tests in `tests/identity-accounts.test.ts` and `tests/account-id-for-wallet.test.ts` pass

## Task 2: Quiz & Leaderboard Re-keyed to Account IDs
- [x] `lib/actions/quiz-actions.ts` keys answers, history and stats to session account id
- [x] `lib/stats.ts` computes stats for accounts
- [x] `lib/actions/leaderboard-actions.ts` ranks by account id
- [x] Unit tests in `tests/stats.test.ts`, `tests/leaderboard-actions.test.ts`, and `tests/answer-and-list-guards.test.ts` pass

## Task 3: Automatic SIWE Authentication & Session Integration
- [x] `lib/actions/auth-actions.ts` implements `signInWithWallet` calling `ensureAccountForWallet`
- [x] `lib/actions/auth-actions.ts` exports `signOutWallet`, `getAuthNonce`, and `requestSignIn`
- [x] `lib/auth-adapter.ts` provides RainbowKit authentication adapter
- [x] `hooks/shared/use-quiz-auth.ts` manages auth state and wallet synchronisation
- [x] Tests in `tests/auth-actions.test.ts` and `tests/auth-adapter.test.ts` pass

## Task 4: UI & Mobile CWV Optimization
- [x] `components/Providers.tsx` wraps `RainbowKitAuthenticationProvider`
- [x] Modals (`ProfileModal`, `CreateQuizModal`, `SubmitQuizModal`, `AuthModal`) lazy-loaded via `next/dynamic`
- [x] `canvas-confetti` imported on-demand for correct answers
- [x] Mobile Lighthouse performance score reaches 84+

## Task 5: Quality Gates & Verification
- [x] Zero TypeScript errors (`npm run type-check`)
- [x] Zero ESLint errors (`npm run lint`)
- [x] Zero architecture violations (`npm run check:architecture`)
- [x] Zero secrets in diff (`gitleaks`)
- [x] Production build succeeds (`npm run build`)
