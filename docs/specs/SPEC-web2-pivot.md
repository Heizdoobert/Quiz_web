# Spec: Web2 Pivot & Crypto Removal

## Objective
Convert Quick Quiz into a pure Web2 application by completely removing all Web3, blockchain, and crypto-reward elements. This reduces friction for the average user and dramatically simplifies the architecture.

## Tech Stack
- **Frontend (Mobile):** Flutter (Dart) - *removing `reown_walletkit` and `url_launcher` used for deep linking*
- **Frontend (Web):** Next.js (React) - *removing WalletConnect, Wagmi, viem, SIWE components*
- **Backend/DB:** Supabase (PostgreSQL) - *dropping wallet auth and coin/rewards tables*

## Commands
- Mobile Build: `flutter build apk`
- Web Dev: `npm run dev`
- Mobile Setup: `flutter pub get`
- Web Setup: `npm install`

## Project Structure
- `mobile/lib/features/auth/` -> Replace wallet auth with standard Supabase email/password login.
- `mobile/lib/services/` -> Delete `wallet_service.dart`.
- `app/api/mobile/v1/auth/` -> Remove SIWE specific routes.
- `supabase/migrations/` -> Create migration to drop coin-related tables and remove wallet dependencies.

## Code Style
Standard Supabase Auth implementations should be used across Flutter and Next.js, relying entirely on email/password sessions.

## Testing Strategy
- Verify that standard email registration and login work flawlessly on both Web and Mobile.
- Confirm no app crashes occur when visiting pages that previously fetched coin/reward balances.

## Boundaries
- **Always:** Verify database migrations don't accidentally drop the primary `users` table or delete existing user quiz progress.
- **Ask first:** Before deleting entire pages (if they can be repurposed for standard features instead).
- **Never:** Leave dead code or unused Web3 dependencies in `package.json` or `pubspec.yaml`.

## Success Criteria
- [ ] `pubspec.yaml` contains no `reown_walletkit` or `walletconnect` libraries.
- [ ] `package.json` contains no `viem`, `siwe`, `wagmi`, or `@web3modal` libraries.
- [ ] Users log into both platforms using Email and Password only.
- [ ] All references to "Coins" and "Rewards" are completely removed from the UI and Database.
