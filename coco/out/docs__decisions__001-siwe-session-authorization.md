# docs/decisions/001-siwe-session-authorization.md
lines:47 exports:
---
# ADR-001: Sign-In with Ethereum (SIWE) & Server Action Session Authorization

## Status
Accepted

## Date
2026-09-28

## Context
In the initial architecture of Quick Quiz, client components passed the active Web3 wallet address directly as arguments to Server Actions (e.g., `submitAnswer({ questionId, answerIndex, walletAddress })`). 

This model had a critical vulnerability (IDOR / Spoofing):
1. Any client could submit answers on behalf of another wallet address to farm score or deplete dispute quotas.
2. Any client could request data exports (`exportUserData`) for arbitrary wallet addresses.
3. Anyone could simulate list actions or contest attempts attributed to another user.

Because users connect via Web3 wallets (Wagmi / RainbowKit) rather than traditional email/password, there was no native Supabase Auth user session (`auth.uid()`).

## Decision
We implemented **EIP-4361: Sign-In with Ethereum (SIWE)** with server-side HMAC session cookies:
1. **Challenge Generation (`requestSignIn`)**: The server issues a cryptographically random, timestamped nonce bound to the requested address and chain ID.
2. **Signature Verification (`signInWithWallet`)**: The client signs the standard EIP-4361 message using their private key. The server verifies the signature using `viem/verifyMessage` against the address.
3. **Session Cookie (`setSessionCookie`)**: Upon verification, a signed, tamper-resistant HTTP-only cookie (`quiz_session`) containing `{ walletAddress, issuedAt, expiresAt }` and an HMAC-SHA256 signature is set.
4. **Server Action Enforcement (`getSessionWallet`)**: State-changing Server Actions (`submitAnswer`, `createQuestion`, `createList`, `exportUserData`, etc.) read and verify the cookie directly rather than trusting client-supplied wallet parameters.

## Alternatives Considered

### Direct Supabase Custom JWTs
- **Pros**: Direct integration with Supabase RLS (`auth.uid()`).
- **Cons**: Requires configuring custom Supabase JWT signing keys, syncing token lifecycles with client Wagmi reconnections, and adds token refresh complexity.
- **Decision**: Deferred to a future release; HTTP-only session cookies provide equivalent server action isolation with zero client-side JWT token storage risks (XSS immunity).

### Client Signature per Server Action Call
- **Pros**: Stateless; no session cookies required.
- **Cons**: Unacceptable UX friction — users would be forced to sign a wallet prompt on every single trivia answer and UI interaction.
- **Decision**: Rejected for core gameplay.

### Trusting Client-Passed Address (Previous State)
- **Pros**: Simplest implementation.
- **Cons**: Trivial to spoof; unacceptable for any competitive leaderboard, rewards, or data export.
