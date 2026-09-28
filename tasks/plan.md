# Implementation Plan: Profile Dashboard & Quiz Export

## Overview
We are building a protected Profile Dashboard where authenticated (Web3 connected) quiz creators can view all the quizzes they've created and export them as a secure backup file. This involves creating server actions to fetch/export data and a new frontend page matching the existing Tailwind/App Router structure.

## Architecture Decisions
- **Authentication Check:** Since authentication uses Web3 wallets via Wagmi/RainbowKit (client-side) rather than standard Supabase session cookies, the profile page will be a Client Component that checks `useAccount()` and fetches data securely via Server Actions passing the address.
- **Security & RLS:** Server actions will explicitly filter database queries by the provided `walletAddress` to ensure a user only retrieves their own data.
- **Export Format:** The backup will be a JSON string combining data from `questions` and `quiz_results`.

## Task List

### Phase 1: Foundation (Server Actions)
- [x] Task 1: Create Profile Server Actions

### Checkpoint: Foundation
- [ ] Server actions compile without errors
- [ ] Export structure is verified

### Phase 2: Core Features (UI and Navigation)
- [x] Task 2: Build the Profile Page UI (`/profile`)
- [x] Task 3: Link to the Profile Page from the existing `ProfileModal`

### Checkpoint: Complete
- [ ] Application builds cleanly (`npm run build`)
- [ ] Profile page correctly shows "Access Denied" if disconnected
- [ ] Profile page lists quizzes when connected
- [ ] Backup JSON download works

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Wallet address mismatch | High | Ensure all database queries strictly check `created_by` or `wallet_address` against the requested address. |
| Missing RLS enforcement | Med | Even though RLS is set to public read for standard access, the server actions do strict filtering, acting as a secure boundary. |

## Open Questions
- None.
