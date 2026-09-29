# Tasks: Automatic Wallet Authentication & User Persistence

## Task 1: Server-side Auth Session & User Auto-Creation
**Description:** Add session clearing functionality and update `signInWithWallet` to automatically register/fetch the user profile in Supabase upon successful SIWE verification. Update `getOrCreateUser` to use `supabaseAdmin || supabase`.

**Acceptance criteria:**
- [x] `lib/wallet-session.ts` exports `clearSessionWallet(): Promise<void>` which deletes `SESSION_COOKIE`
- [x] `lib/actions/auth-actions.ts` exports `signOutWallet(): Promise<void>`
- [x] `lib/actions/auth-actions.ts` `signInWithWallet` calls `getOrCreateUser(address)` on successful signature verification
- [x] `lib/actions/user-actions.ts` `getOrCreateUser` uses `supabaseAdmin || supabase`
- [x] Unit tests in `tests/auth-actions.test.ts` verify session creation, clearing, and user persistence trigger

**Verification:**
- [x] Tests pass: `npx vitest run tests/auth-actions.test.ts`
- [x] Types pass: `npm run type-check`

**Dependencies:** None
**Files likely touched:**
- `lib/wallet-session.ts`
- `lib/actions/auth-actions.ts`
- `lib/actions/user-actions.ts`
- `tests/auth-actions.test.ts`
**Estimated scope:** Medium (3-4 files)

---

## Task 2: RainbowKit SIWE Authentication Adapter & State Hook
**Description:** Implement the RainbowKit v2 `AuthenticationAdapter` and a React hook or state manager for authentication status (`'loading' | 'unauthenticated' | 'authenticated'`) that synchronizes with wallet address and server session state.

**Acceptance criteria:**
- [x] `lib/auth-adapter.ts` exports `createQuizAuthAdapter` implementing `getNonce`, `createMessage`, `verify`, and `signOut`
- [x] React hook / helper manages `AuthenticationStatus` tracking wallet connect/disconnect/account changes
- [x] Server action `getNonce` endpoint/action provides challenges for `createSiweMessage`
- [x] Unit tests in `tests/auth-adapter.test.ts` test adapter methods and status transitions

**Verification:**
- [x] Tests pass: `npx vitest run tests/auth-adapter.test.ts`
- [x] Types pass: `npm run type-check`

**Dependencies:** Task 1
**Files likely touched:**
- `lib/actions/auth-actions.ts`
- `lib/auth-adapter.ts`
- `tests/auth-adapter.test.ts`
**Estimated scope:** Medium (2-3 files)

---

## Checkpoint: Foundation
- [x] Server auth actions and RainbowKit adapter unit tests pass
- [x] `npm run type-check` and `npm run lint` clean
- [x] Review foundation before UI wiring

---

## Task 3: Wire RainbowKitAuthenticationProvider into Providers & Header
**Description:** Wrap `RainbowKitAuthenticationProvider` around `RainbowKitProvider` in `components/Providers.tsx` and ensure `useWalletSession` seamlessly works with the newly authenticated session.

**Acceptance criteria:**
- [x] `components/Providers.tsx` includes `RainbowKitAuthenticationProvider` with adapter and dynamic status
- [x] Connecting wallet prompts SIWE signature dialog automatically
- [x] When signed in, `ConnectButton` displays account info; when signed out, session is cleared
- [x] `useWalletSession` in `hooks/shared/use-wallet-session.ts` leverages existing session without duplicate prompts
- [x] Component integration tests in `tests/Providers.test.tsx` or `tests/auth-integration.test.tsx` pass

**Verification:**
- [x] Tests pass: `npm test`
- [x] Build succeeds: `npm run build`

**Dependencies:** Task 1, Task 2
**Files likely touched:**
- `components/Providers.tsx`
- `hooks/shared/use-wallet-session.ts`
- `tests/auth-integration.test.tsx`
**Estimated scope:** Small (2-3 files)

---

## Checkpoint: UI Integration
- [x] Connecting wallet triggers SIWE sign-in prompt
- [x] Disconnecting wallet calls `signOutWallet` and clears session cookie
- [x] End-to-end flow connects, signs in, and persists user in Supabase

---

## Task 4: Full System Verification & Constraint Validation
**Description:** Run the full test suite with coverage checks, verify changed lines coverage >= 80%, project coverage ratchet >= 54%, and ensure lint, type-check, and bundle budget constraints are met.

**Acceptance criteria:**
- [x] `npx vitest run tests/ --coverage` passes with changed lines >= 80% and total lines >= 54%
- [x] `npm run type-check` passes with 0 errors
- [x] `npm run lint` passes with 0 errors
- [x] `npm run build` succeeds with route bundle <= 150 kB gzip
- [x] Zero new `@ts-ignore` or `eslint-disable` comments added

**Verification:**
- [x] `npm run check:task` and `npm run check:fast` exit with code 0

**Dependencies:** Tasks 1-3
**Files likely touched:**
- None (verification only)
**Estimated scope:** Small
