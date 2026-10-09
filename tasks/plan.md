# Implementation Plan: Web2 Pivot

## Overview
We are ripping out all Web3, crypto, and coin/reward elements from Quick Quiz to pivot to a pure Web2 architecture. This involves changes across the Supabase database, the Next.js web frontend, and the Flutter mobile app.

## Architecture Decisions
- **Auth Reversion:** Supabase standard email/password authentication will be the sole login method.
- **Database Simplification:** Reward, coin, and wallet tables will be dropped via a new migration.
- **Dependency Cleanup:** All Web3 libraries will be aggressively pruned to reduce bundle size and security surface area.

## Task List

### Phase 1: Database & Backend Cleanup
- [ ] Task 1: Create Supabase migration to drop coin, reward, and wallet-related tables/columns.
- [ ] Task 2: Remove SIWE and Next.js Web3 API routes (`/api/mobile/v1/auth/nonce`, etc.).
- [ ] Task 3: Remove Web3 and wallet dependencies from Next.js `package.json`.

### Checkpoint: Backend Clean
- [ ] Database migrations apply cleanly.
- [ ] Next.js app builds successfully without Web3 packages.

### Phase 2: Next.js Frontend Cleanup
- [ ] Task 4: Remove WalletConnect/Web3Modal providers from `app/layout.tsx` and UI.
- [ ] Task 5: Remove all coin/reward displays and pages from the Web dashboard.

### Checkpoint: Web App Clean
- [ ] Web app runs and allows standard email login without throwing missing dependency errors.

### Phase 3: Flutter Mobile Cleanup
- [ ] Task 6: Remove `reown_walletkit` from `mobile/pubspec.yaml`.
- [ ] Task 7: Delete `wallet_service.dart` and remove SIWE logic from `auth_provider.dart`.
- [ ] Task 8: Refactor `auth_provider.dart` to use `supabase_flutter` for standard email/password auth.
- [ ] Task 9: Remove all coin/reward UI references in the Flutter app.

### Checkpoint: Complete
- [ ] All Web3 logic is completely excised.
- [ ] Both Web and Mobile apps allow standard login and playing quizzes.
