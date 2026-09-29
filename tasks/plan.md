# Implementation Plan: Production Answer Persistence & Automatic Wallet Authentication

## Overview
This initiative integrates two complementary systems:
1. **Production Answer Persistence**: Ensuring every answer from a signed-in player is reliably persisted to Supabase, with Streak, History, and Leaderboard surviving page reloads, and clear reasons displayed when an answer cannot be saved.
2. **Automatic SIWE Authentication & Profile Persistence**: Automatically orchestrating Sign-In with Ethereum (SIWE) on wallet connect using RainbowKit's native authentication adapter (`RainbowKitAuthenticationProvider` / `createAuthenticationAdapter`), maintaining session cookies and syncing identity.

## Architecture Decisions
- **The server creates the users row for a proven wallet:** Server-only helper `ensureUserRow(wallet)` in `lib/users.ts` upserts via `supabaseAdmin`. Called directly upon successful SIWE signature verification and in `getOrCreateUser` when the session wallet matches.
- **RainbowKit Native SIWE Adapter:** Integrated `createAuthenticationAdapter` in `components/Providers.tsx`, prompting signature verification on connect and clearing session on disconnect.
- **Answer result explanation:** `AnswerSubmissionResult` returns `notSavedReason: 'signed-out' | 'already-answered' | 'own-question' | 'error'` whenever `recorded` is false.
- **History reads bound to session:** Server action `getAnswerHistory(address)` returns the last 20 answers via `supabaseAdmin` for the authenticated session wallet, seeding `answeredIds` to prevent duplicate questions after reload.
- **Session Lifecycle:** `clearSessionWallet` / `signOutWallet` invalidates the server session cookie on wallet disconnect or account change.

## Task List

### Phase 1: Answer Persistence & User Row Creation
- [x] Task 1: Server creates users row for signed-in wallet via `ensureUserRow`
- [x] Task 2: Answer result provides `notSavedReason`, UI communicates save status
- [x] Task 3: Load answer history from database on wallet connect

### Phase 2: Automatic SIWE Authentication Integration
- [x] Task 4: Server-side Auth Session & User Auto-Creation
- [x] Task 5: RainbowKit SIWE Authentication Adapter & State Hook
- [x] Task 6: Wire `RainbowKitAuthenticationProvider` into Providers

### Phase 3: Verification & Quality Gates
- [x] Task 7: Full System Verification & Constraint Validation (64/64 tests pass, type-check, lint, bundle ≤ 150 kB)

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Missing `SUPABASE_SECRET_KEY` in environment | High | Gracefully falls back and logs server-side warning without crashing |
| User rejects signature request | Medium | Status remains unauthenticated; read-only features remain accessible |
| Extra upsert on sign-in | Low | One query per sign-in with `ignoreDuplicates: true` |
| History read exposes answers | Medium | Session-bound, own wallet only, returns prompt and correct/incorrect flag without answer indices |
