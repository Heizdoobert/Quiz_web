# Implementation Plan: Automatic Wallet Authentication & User Persistence

## Overview
Implement an automatic Sign-In with Ethereum (SIWE) authentication flow using RainbowKit's native authentication adapter (`RainbowKitAuthenticationProvider` / `createAuthenticationAdapter`). When a player connects their crypto wallet, they are prompted for a SIWE signature; upon verification, a secure HTTP-only session cookie is issued and basic user profile information (`wallet_address`, truncated `display_name`, `created_at`) is automatically registered in Supabase.

## Architecture Decisions
- **RainbowKit Native SIWE Adapter:** Integrate `RainbowKitAuthenticationProvider` with `createAuthenticationAdapter` in `components/Providers.tsx`. This automatically orchestrates the SIWE sign-in prompt upon wallet connection and handles sign-out when disconnected.
- **Server Action Synchronization:** `signInWithWallet` verifies the SIWE message via RPC node, sets the encrypted session cookie (`wallet_session`), and automatically calls `getOrCreateUser(address)` to ensure user persistence in Supabase.
- **Session Lifecycle & Disconnect:** Introduce `clearSessionWallet` / `signOutWallet` so disconnecting a wallet or switching accounts invalidates the server session cookie immediately.
- **Database Resilience:** `getOrCreateUser` leverages `supabaseAdmin || supabase` for reliable write capabilities under RLS without requiring schema changes or migrations.
- **Backward Compatibility:** Existing `useWalletSession`'s `ensureSession()` continues to act as a fallback guard for protected user actions.

## Task List

### Phase 1: Foundation
- [x] Task 1: Server-side Auth Session & User Auto-Creation
- [x] Task 2: RainbowKit SIWE Authentication Adapter & State Hook

### Checkpoint: Foundation
- [x] Unit tests for session management and adapter pass
- [x] Type check and lint are clean

### Phase 2: UI Integration
- [x] Task 3: Wire RainbowKitAuthenticationProvider into Providers & Header

### Phase 3: Verification & Quality Gates
- [x] Task 4: Full System Verification & Constraint Validation

### Checkpoint: Complete
- [x] All tests pass with >= 80% coverage on changed lines and project coverage >= 60%
- [x] Zero TypeScript and ESLint errors
- [x] Production build succeeds and bundle size stays within limits

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| User rejects signature request | Medium | Status remains `unauthenticated`; user can still browse read-only and retry sign-in via `ConnectButton` or contextual action guards. |
| Account switching in wallet | Low | Auth adapter tracks account changes and resets status to prompt verification for the new address. |
| Supabase write failure during connect | Low | `getOrCreateUser` fails open with an in-memory fallback user object so app remains functional even if database is temporarily unreachable. |
