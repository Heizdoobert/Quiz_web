# Tasks: Production Answer Persistence & Automatic SIWE Authentication

## Task 1: Server creates users row for signed-in wallet
**Description:** Add server-only `ensureUserRow(wallet)` in `lib/users.ts` that upserts with `supabaseAdmin`. Call it after successful SIWE verification, and have `getOrCreateUser` use it when the address matches the session wallet.
- [x] After `signInWithWallet` succeeds, a `users` row exists for that wallet (lowercase)
- [x] `getOrCreateUser(address)` creates the row only when `address` matches the session wallet
- [x] `ensureUserRow` is server-only (not exported from `'use server'`)
- [x] Tests pass in `tests/user-persistence.test.ts` and `tests/ensure-user-row-no-admin.test.ts`

---

## Task 2: Answer result says why it wasn't saved, and UI shows it
**Description:** Add `notSavedReason` to `AnswerSubmissionResult`, set by `submitAnswer`. `AnswerBack` displays score point only when `recorded` is true.
- [x] Each not-saved path returns matching reason (`signed-out`, `already-answered`, `own-question`, `error`)
- [x] Correct but unsaved answer no longer claims "+1 Score point"
- [x] Tests pass in `tests/AnswerBack.test.tsx` and `tests/answer-and-list-guards.test.ts`

---

## Task 3: Load answer history from the database
**Description:** Server action `getAnswerHistory(address)` returns the latest 20 answers for the session wallet. The quiz hook loads it on wallet connect and seeds `answeredIds`.
- [x] History panel displays previous answers after reload
- [x] Unauthenticated or mismatched address returns `[]`
- [x] Response never returns `answer_index` or `correct_index`
- [x] Tests pass in `tests/use-quiz-logic-history.test.tsx`

---

## Task 4: RainbowKit SIWE Authentication Adapter & Session Hook
**Description:** Implement RainbowKit v2 `AuthenticationAdapter` and status management synchronizing wallet connect/disconnect with HTTP-only session cookies.
- [x] `lib/wallet-session.ts` exports `clearSessionWallet()`
- [x] `lib/actions/auth-actions.ts` exports `signOutWallet()` and `getAuthNonce()`
- [x] `lib/auth-adapter.ts` implements RainbowKit adapter
- [x] `hooks/shared/use-quiz-auth.ts` manages auth status transitions
- [x] Tests pass in `tests/auth-adapter.test.ts` and `tests/auth-integration.test.tsx`

---

## Task 5: Wire RainbowKitAuthenticationProvider into Providers
**Description:** Wrap `RainbowKitAuthenticationProvider` in `components/Providers.tsx`.
- [x] Connecting wallet prompts SIWE signature dialog automatically
- [x] Disconnecting wallet clears session cookie
- [x] Tests pass in `tests/auth-integration.test.tsx`

---

## Task 6: Full System Verification & Constraint Validation
**Description:** Ensure full test suite passes with zero lint, type, or secret errors.
- [x] `npm run check:fast` exits 0
- [x] `npm run check:architecture` exits 0
- [x] All vitest test suites pass
- [x] Production build succeeds
