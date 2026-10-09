## Phase 1: Database & Backend Cleanup
- [ ] Task 1: Create Supabase migration to drop coin, reward, and wallet-related tables/columns.
  - Acceptance: `wallet_address`, `coins`, and related tables are gone from the schema.
  - Verify: Run `supabase db push` or test migrations locally.
  - Files: `supabase/migrations/*`
- [ ] Task 2: Remove SIWE and Next.js Web3 API routes.
  - Acceptance: SIWE endpoints like `/nonce` and `/verify` are deleted.
  - Verify: Next.js builds without referencing these routes.
  - Files: `app/api/mobile/v1/auth/*`
- [ ] Task 3: Remove Web3 and wallet dependencies from Next.js.
  - Acceptance: `viem`, `siwe`, `wagmi`, WalletConnect are removed.
  - Verify: `npm run build` succeeds.
  - Files: `package.json`, `package-lock.json`

## Checkpoint: Backend Clean
- [ ] Database migrations apply cleanly.
- [ ] Next.js app builds successfully without Web3 packages.

## Phase 2: Next.js Frontend Cleanup
- [ ] Task 4: Remove WalletConnect/Web3Modal providers.
  - Acceptance: No Web3 providers wrap the React tree.
  - Verify: App loads without context errors.
  - Files: `components/Providers.tsx`, `app/layout.tsx`
- [ ] Task 5: Remove all coin/reward displays and pages.
  - Acceptance: Coin balances and reward pages are deleted or hidden.
  - Verify: Navigate the web app manually to confirm absence of crypto UI.
  - Files: `app/dashboard/*`, `components/ui/*`

## Checkpoint: Web App Clean
- [ ] Web app runs and allows standard email login without throwing missing dependency errors.

## Phase 3: Flutter Mobile Cleanup
- [ ] Task 6: Remove `reown_walletkit` from Flutter.
  - Acceptance: `pubspec.yaml` has no Reown/WalletConnect dependencies.
  - Verify: `flutter pub get` succeeds.
  - Files: `mobile/pubspec.yaml`
- [ ] Task 7: Delete `wallet_service.dart` and SIWE logic.
  - Acceptance: WalletService is completely removed.
  - Verify: Code compiles (after next task).
  - Files: `mobile/lib/services/wallet_service.dart`, `mobile/lib/features/auth/auth_provider.dart`
- [ ] Task 8: Refactor Flutter auth to standard email/password.
  - Acceptance: Users can log in using their email via `supabase_flutter`.
  - Verify: Manual login works on emulator.
  - Files: `mobile/lib/features/auth/auth_provider.dart`, `mobile/lib/features/auth/login_screen.dart`
- [ ] Task 9: Remove coin/reward UI from Flutter.
  - Acceptance: No references to coins or tokens in the mobile UI.
  - Verify: Run app and inspect header/profile screens.
  - Files: `mobile/lib/features/profile/*`, `mobile/lib/features/quiz/*`

## Checkpoint: Complete
- [ ] All Web3 logic is completely excised.
- [ ] Both Web and Mobile apps allow standard login and playing quizzes.
