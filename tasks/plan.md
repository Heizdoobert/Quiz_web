# On-Chain Contest Escrow (complete)
Implemented and merged: `ContestEscrow.sol` (creation, claim, refund, EIP-712 verification), Hardhat suite in `contracts/test/ContestEscrow.test.ts`, typed ABI/address config in `lib/contracts/`, `claimListReward` unpaused with on-chain funded/expiry checks, `ContestPlay.tsx`/`MyListsDashboard.tsx` wired to the contract.

# Implementation Plan: Accounts, Discovery, Answer Persistence & SIWE Authentication

## Overview
This integrated plan consolidates:
1. **Accounts, Discovery & Community Architecture**: Introducing explicit account identities (`users.id` UUID) with wallet linking, session account resolution, and account-keyed trivia/leaderboard models.
2. **Production Answer Persistence**: Ensuring every answer from a signed-in player is reliably persisted to Supabase, with Streak, History, and Leaderboard surviving page reloads, and clear reasons displayed when an answer cannot be saved.
3. **Automatic SIWE Authentication & Profile Persistence**: Automatically orchestrating Sign-In with Ethereum (SIWE) on wallet connect using RainbowKit's native authentication adapter (`RainbowKitAuthenticationProvider` / `createAuthenticationAdapter`), maintaining session cookies and syncing identity.

## Architecture Decisions
- **Account-Centric Data Model:** All domain records (`quiz_results`, `questions`, `question_lists`, `groups`) are keyed by account UUID (`users.id`), decoupling identity from single wallet addresses.
- **Server creates account for proven wallet:** Server-only helper `ensureAccountForWallet(wallet)` in `lib/users.ts` upserts via `supabaseAdmin` upon verified SIWE signature, linking the wallet and creating the account.
- **Session Tokens:** Signed HMAC session cookie (`quiz_session`) stores `{ id: accountId, wallet }`, verifiable server-side without database round-trips.
- **RainbowKit Native SIWE Adapter:** Integrated `createAuthenticationAdapter` in `components/Providers.tsx`, prompting signature verification on connect and clearing session on disconnect.
- **Answer result explanation:** `AnswerSubmissionResult` returns `notSavedReason: 'signed-out' | 'already-answered' | 'own-question' | 'error'` whenever `recorded` is false.
- **History reads bound to session:** Server action `getAnswerHistory()` returns the last 20 answers via `supabaseAdmin` for the authenticated session account, seeding `answeredIds` to prevent duplicate questions after reload.

## Status & Tracking
See `tasks/accounts-discovery-community/plan.md` and `tasks/accounts-discovery-community/todo.md` for in-depth per-task specifications and historical notes.
