# CHANGELOG.md
lines:105 exports:
---
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
- **Automatic SIWE Authentication**: Integrated RainbowKit native authentication provider to automatically prompt Sign-In with Ethereum (SIWE) on wallet connect and synchronize session cookies.
- **Answer Persistence & Session Gameplay**: Enabled automatic persistence of question results, streaks, answer history, and stats across page reloads for authenticated accounts, with explicit reason reporting (`notSavedReason`).
- **Discovery Module**: Introduced question search powered by PostgreSQL trigram indexing (`pg_trgm`) via header search bar and `/search`, plus topic browsing pages at `/topics/[topic]`.
- **Community Engagement**: Added question ratings (helpful/unhelpful), comments, and improvement suggestions on the question card back, with author feedback review on `/profile`.
- **Hardhat Smart Contract Test Suite**: Added automated contract tests for `ContestEscrow.sol` (`contracts/test/ContestEscrow.test.ts`) integrated into CI.
- **Multi-Stage CI/CD Pipeline**: GitHub Actions quality gates enforcing type checks, linting, Gitleaks secrets detection, architecture boundary checks (`depcruise`), contract testing, coverage ratchets, and container publishing to GHCR.

### Changed
- **Database Schema Migration**: Refactored all domain tables (`quiz_results`, `questions`, `question_lists`, `groups`) to reference account UUIDs (`users.id`).
- **Contest Access Requirements**: Gated contest participation on an active linked Web3 wallet while retaining guest read-only question browsing.
- **Affiliate Integration**: Updated sidebar and banner ad units to affiliate monetization links.
- **Variable Font Optimization**: Switched JetBrains Mono font configuration in `app/layout.tsx` to variable font definition without static weight arrays, streamlining Turbopack build optimization.

