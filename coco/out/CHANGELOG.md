# CHANGELOG.md
lines:118 exports:
---
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.0] - 2026-10-08

### Added
- **Toast Notifications**: Interactive application notifications via a custom ToastProvider.
- **Offline PWA Support**: Implemented progressive web app capabilities, ensuring offline access to previously loaded app shells and assets.
- **Social Sharing**: Expanded virality with one-click intent sharing to X (Twitter) and Farcaster directly from result screens.
- **AI Question Generator**: Empowered users to dynamically generate crypto trivia questions using `@google/genai` through a Next.js Server Action.
- **Vercel Analytics**: Out-of-the-box performance and usage metrics integrated globally via `<Analytics />`.
- **Test Coverage Improvements**: Added unit tests for question actions (e.g., `generateQuestion`) bringing the total to 311 tests.

### Fixed
- **Next.js Turbopack Module Resolutions**: Restored required dynamic dependencies (`@x402/core`, `@x402/evm`, `@x402/svm`) needed by the Coinbase CDP SDK, resolving build failures on preview environments.

## [0.4.0] - 2026-10-05

### Added
- **AI Content Moderation**: Integrated `@google/genai` (Gemini) into the question creation flow to automatically reject toxic, harmful, or malicious submissions.
- **Server-Side Leaderboard Pagination**: Refactored leaderboard queries (`get_global_leaderboard`) to support `LIMIT` and `OFFSET` in SQL, and upgraded the frontend components with an infinite scroll / "Load More" implementation for better performance on large datasets.
- **Playwright E2E Tests**: Initialized Playwright testing framework and added automated UI rendering tests (`e2e/home.spec.ts`).

### Changed
- **Clean Architecture Refactoring**: Reorganized the `/lib` directory into `/lib/supabase`, `/lib/services`, `/lib/utils`, and `/lib/constants`, with all import paths safely refactored across the project.
- **Database Migrations Structure**: Moved raw SQL files from `lib/sql` to a standardized `supabase/migrations` directory.

### Security
- **Service Role Key Hardening**: Removed insecure usage of Supabase Service Role key (`SUPABASE_SECRET_KEY`) from public server actions (`ads-actions.ts`) to prevent privilege escalation.

## [0.3.1] - 2026-10-01

### Added
- **On-Chain Contest Escrow (`ContestEscrow.sol`)**: Deployed smart contract locking creator reward pools upfront on Base Sepolia, eliminating unbacked token inflation and creator self-drain exploits.
- **EIP-712 Reward Claim Vouchers**: Unpaused contest reward claims (`claimListReward`) backed by cryptographic voucher verification against the on-chain escrow contract.
- **Account Identity & Multi-Method Auth**: Decoupled user identity from raw wallet addresses to universal `users.id` UUIDs; added email code authentication and wallet linking.
