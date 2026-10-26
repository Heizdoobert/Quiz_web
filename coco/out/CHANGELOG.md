# CHANGELOG.md
lines:183 exports:
---
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.6.1] - 2026-10-22

### Added
- Fix Modal component (accessible close button, conditional rendering, single Escape handler).
- Switch Vitest pool to `forks` and remove `poolOptions`.
- Update tsconfig to exclude `.next`.

## [Unreleased]

### Fixed
- CI/CD workflow: update Node.js to 20 LTS, restore .gitmodules for SDK submodule, and refine CI gate.

### Added
- **Admin area** at `/admin` (see `docs/admin-area.md`): switch remote config (`maintenance_mode`), grant roles, resolve quarantined questions, and read the top unresolved Sentry issues. Each page checks its own permission; moderators see only the quarantine page. New permission `errors.read` (admin only). The error list needs `SENTRY_AUTH_TOKEN`, `SENTRY_ORG` and `SENTRY_PROJECT` on the server and shows "not configured" without them.
- **SDK**: `StorageManager` in `@heizdoobert/quickquiz-sdk/client` keeps JSON values in `sessionStorage`, gzip-compressed then AES-GCM encrypted. The key is a non-extractable `CryptoKey` in IndexedDB, and each entry is bound to its name.
- **Mobile**: `StorageManager` (`mobile/lib/services/storage/storage_manager.dart`) keeps small JSON values gzip-compressed in `flutter_secure_storage`, so the OS keystore encrypts them.

## [0.6.0] - 2026-10-12

### Removed
- **Web3**: wallet sign-in (SIWE), wallet linking, RainbowKit/wagmi/viem, the `contracts/` Hardhat project and its CI job, reward vouchers and claims, NFT badges, contest escrow and question-list contests (`/contest`, `/my-lists`, `/review`). The app is web2 only (ADR-013). Existing wallet-only accounts can no longer sign in; the database schema is untouched.
- **Mobile**: WalletConnect and the `auth/nonce`, `auth/verify`, `auth/wallet` routes. Mobile and web session tokens no longer carry a wallet, so everyone signs in once more.
- **Web3 schema** (`supabase/migrations/20-drop-web3-schema.sql`, not applied yet): drops `reward_claims`, every wallet column, the reward and escrow columns, the wallet bridge triggers and the treasury functions; the leaderboard functions no longer return `wallet_address`. Destructive: apply after a backup, once production runs the code that reads `questions.created_by_user`. Tested by `bash supabase/tests/run-drop-web3-schema.sh`.
- **PWA plugin**: `@ducanh2912/next-pwa` and the `webpack` dependency it needed. The plugin only runs under webpack and `next build` uses Turbopack, so it never produced a service worker: production `/sw.js` returned 404 and the offline support listed under 0.5.0 never shipped. The web manifest stays.

### Added
- **REST API v1** under `/api/v1`: auth, questions, quiz, leaderboard, groups, community and profile endpoints behind one response envelope and Bearer token check.
- **TypeScript SDK** `@heizdoobert/quickquiz-sdk` in `sdk/` (an npm workspace): a client with timeout, `AbortSignal` cancellation and retries for idempotent requests, plus an auth middleware for Next.js route handlers and Express under `@heizdoobert/quickquiz-sdk/server`. The web app reaches it through `getSdk` in `lib/sdk.ts`.
- **Remote config**: the `remote_config` table (`supabase/migrations/remote-config.sql`, applied by hand), the required `sdk/remote_config` module and `GET /api/config`, which serves `maintenance_mode` to web and mobile with `s-maxage=60`. Unregistered keys and wrong-typed values never leave the server; a database failure answers 503 and the clients keep their defaults. The Flutter app reads it with built-in defaults.
- **Optional `sdk/tracking-analytics`**: Sentry and PostHog load only when that folder exists; otherwise `lib/sdk/sentry.ts` and `lib/sdk/posthog.ts` are no-ops.
- **Mobile**: a profile screen with stats and the player's own questions (`GET /api/mobile/v1/profile/quizzes`)
