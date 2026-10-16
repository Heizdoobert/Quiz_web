# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
- **Mobile**: a profile screen with stats and the player's own questions (`GET /api/mobile/v1/profile/quizzes`), Sentry crash reports when built with a DSN, release builds signed from repository secrets, and an app bundle published with the APK.
- **Roles (RBAC)**: one role per account (`user`, `moderator`, `admin`) in `users.role`, permissions mapped in `lib/services/rbac.ts`, and one `authorize()` check that reads the role from the database on every gated call (ADR-014). `PUT /api/v1/admin/roles` lets an admin grant or revoke a role. `GET /api/v1/moderation/questions` and `POST /api/v1/moderation/questions/[id]/resolve` let a moderator or admin list quarantined questions and restore or retire them. API only, no UI. Migration `supabase/migrations/21-rbac.sql` (not applied yet); the first admin is a one-off statement in `docs/migrations.md`.
- **Auth rate limits**: Email-code, username and answer submissions are limited per identifier and per IP through a Postgres counter (`supabase/migrations/17-auth-rate-limit.sql`, ADR-008). Apply the migration; until then the limiter fails open.
- **CSP report-only policy** and `/api/csp-report` (ADR-009).
- **`/api/health`**: answers 200 only when the database does, 503 otherwise.
- **`npm run check:bundle`**: measures gzip first-load JS per prerendered route (about 460 kB today against a 150 kB target, tracked as exception X-1).
- **Decision records** ADR-008 to ADR-012 for the rate limiter, CSP, leaderboard polling, the no-wallet payee rule and optional-wallet accounts.

### Changed
- **`lib/db` owns database access**: every Supabase query moved there behind `DbError` and `unwrap`, and lint rejects a Supabase client anywhere else. `lib/sdk/` is the only place that imports a vendor SDK (Supabase, Gemini, Sentry, PostHog).
- **Sentry starts from `instrumentation`**, and PostHog loads after hydration, which keeps about 100 kB gzip out of the first-load scripts.
- **`npm test` builds the SDK first** and also runs the `sdk/tracking-analytics` and `sdk/remote_config` tests; `check:architecture` covers `sdk/remote_config`.
- **Mobile app** is named Quick Quiz, uses the web icon and a dark splash, and moved to `sentry_flutter` 9.
- **Coverage is measured over every source file** (`coverage.include`); the lines ratchet is now 51.7% (it was 65.5% over imported files only), with functions and branches gated too.
- **`npm test` also runs the component tests** under `components/`.
- **Global leaderboard** is cached for 15 seconds on the server (ADR-010). `/topics` renders on demand.
- **CD waits for CI**: container publishing now needs the CI workflow to pass on the same commit; a single "CI gate" check is available for the branch ruleset.
- **Next.js 16.4.0** (fixes the image optimizer SSRF and ISR cache-poisoning advisory in 16.3.6).

### Security
- `question_disputes` is no longer readable with the public key (`21-rbac.sql` drops its read policy); it exposed who reported a question and why.
- `isContestVoucherUsed` fails closed when the nonce cannot be read, so a voucher is not re-signed after an RPC failure.
- `get5050EliminatedIndices` returns nothing for pending, quarantined or contest questions.
- `submitAnswer` validates the question id and is limited to 120 answers per IP per hour.
- Empty `catch` blocks are now a lint error.

### Fixed
- Questions added by email accounts were badged "Verified" instead of "Community": the badge read the wallet column `questions.created_by`, which wallet-less accounts leave empty. It now reads `created_by_user`, and the mobile app shows a "Community" pill instead of the first characters of a wallet address.
- The email step shows the send-code rate-limit message.
- Toasts no longer re-run effects that depend on the toast handle (the contest start request could repeat after a failure).
- Modals move focus in, keep Tab inside and restore focus on close; toasts, form errors and the answer result are announced and form controls have accessible names.
- Two stale `RewardsTokensTab` tests.

### Removed
- Unused `lodash.debounce`, `@types/lodash.debounce` and `@types/jest`.

## [0.5.0] - 2026-10-08

### Added
- **Toast Notifications**: Interactive application notifications via a custom ToastProvider.
- **Offline PWA Support**: Implemented progressive web app capabilities, ensuring offline access to previously loaded app shells and assets.
- **Social Sharing**: Expanded virality with one-click intent sharing to X (Twitter) and Farcaster directly from result screens.
- **AI Question Generator**: Empowered users to dynamically generate crypto trivia questions using `@google/genai` through a Next.js Server Action.
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

### Security
- **Treasury Function Hardening**: Explicitly pinned PostgreSQL `search_path` on treasury and reward database functions to mitigate search-path hijack risks.
- **Dependabot Ecosystem Compatibility**: Configured semver-major ignores in `.github/dependabot.yml` for breaking ecosystems (`wagmi` v3, `typescript` v7, `hardhat` v3, `eslint` v10) to preserve project constraints and prevent broken builds.
- **Gitleaks Pre-commit & CI Gates**: Enforced zero secret leaks in commits and CI with curated `.gitleaksignore` patterns for mock contract addresses and referral tracking parameters.

### Fixed
- **Contracts Lockfile Graph**: Regenerated `contracts/package-lock.json` to properly retain peer dependency resolution during package upgrades.
- **Duplicate History Refreshes**: Removed redundant `refreshHistory` triggers preventing duplicate network requests during question answering.
- **Framer Motion Transition Conflicts**: Cleaned up leftover CSS transitions and neon glows that conflicted with Framer Motion layout animations.
- **Canonical Domain Fallback**: Corrected canonical URL resolution in `lib/site-url.ts` and `app/layout.tsx` to dynamically reference configured site URLs rather than unowned domains.

## [0.3.0] - 2026-09-28

### Added
- **Peer-Reviewed Question Lists**: Community list authoring at `/my-lists` allowing users to curate sets of questions for community review.
- **Verification Queue**: Multi-party peer review at `/review` requiring 3 distinct confirmations from non-owner wallets before a list can go live.
- **Crypto Contests**: Live contests at `/contest` with dedicated reward pools and timed trivia gameplay.
- **Sign-In with Ethereum (SIWE)**: Cryptographic EIP-4361 authentication using HMAC-SHA256 HTTP-only session cookies (`quiz_session`) across all state-changing actions.
- **Architecture Decision Records (ADRs)**: Added `docs/decisions/` documenting SIWE session auth, dual-key Supabase architecture, contest voucher safeguards, and Server Action module bundling rules.
- **Expanded Test Coverage**: Added security and list guard integration tests (`tests/answer-and-list-guards.test.ts`), bringing total automated test count to 29.

### Security
- **Database RLS Write Lockdown**: Revoked all anonymous client write access (`INSERT`, `UPDATE`, `DELETE`) on questions, results, disputes, and lists in `lib/sql/lock-down-public-writes.sql` and `lib/sql/question-lists.sql`.
- **Public Voucher Signer Elimination**: Removed insecure `buildTokenClaimVoucher` action to prevent unbacked token minting.
- **Contest Payout Safeguard**: Paused contest reward claims until an on-chain staking/escrow contract is deployed, protecting reward pools from creator self-drain attacks.
- **Server-Side Session Resolution**: Refactored `submitAnswer`, `createQuestion`, `createList`, and `exportUserData` to resolve caller identity strictly via `getSessionWallet()`.

### Fixed & Changed
- **Server Action Bundling Compliance**: Extracted constants (`MIN_LIST_QUESTIONS`, `REQUIRED_CONFIRMATIONS`) into `lib/list-constants.ts` and synchronous validators into `lib/validation.ts`, resolving Next.js client RPC export bundling failures.
- **Vercel Build Peer Resolution**: Added `.npmrc` with `legacy-peer-deps=true` and aligned `@types/node` to `^22` to satisfy Vitest/Vite peer dependencies during CI deployments.

## [0.2.0] - 2026-09-28

### Added
- **Creator Profile Dashboard**: New route at `/profile` enabling Web3 creators to review their contributed community questions and manage submissions.
- **Data Backup Export**: Secure JSON data backup feature in `/profile` allowing creators to download their created questions and gameplay statistics with safe browser download handling.
- **Route Document Metadata**: Dynamic metadata and semantic document titles (`Creator Dashboard | Quick Quiz`) for the profile route.
- **Database Query Indexing**: Added PostgreSQL index on `questions(created_by)` in `lib/schema.sql` to optimize dashboard query performance and eliminate sequential table scans.
- **OWASP Security Headers**: Configured production security headers in `next.config.js` including `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Strict-Transport-Security`, and restrictive `Permissions-Policy`.
- **Comprehensive Test Suite**: Added 20 automated unit and integration tests across profile server actions, UI states, error recovery, and export utilities.

### Changed
- **Header Logo Navigation**: Updated header brand element from static `<h1>` to an accessible Next.js `<Link>` with single H1 semantics per route.
- **Error Handling & State Recovery**: Decomposed creator profile UI into focused components with accessible `CreatorErrorState` and retry flow.
- **Interface Contracts**: Standardized return types in `lib/types.ts` (`GetUserQuizzesResult`, `ExportUserDataResult`) with explicit error codes and schema versioning.

### Fixed
- **Anti-Cheat Answer Leakage**: Restricted `getUserQuizzes` database projection to public fields only (`id, category, prompt, options, status, created_at, created_by`), preventing unauthorized exposure of `correct_index` or `explanation`.
- **Copy Accuracy**: Corrected backup description copy from misleading "encrypted backups" to accurate "JSON data backups".
- **Pagination Alignment**: Implemented offset-based pagination in `getUserQuizzes` via Supabase `.range(offset, offset + limit - 1)`.
- **Download Revocation Bug**: Introduced delayed Object URL revocation in `lib/utils.ts` to prevent premature abort of file downloads in Safari and Firefox.

### Security
- **Input Validation**: Enforced strict Ethereum address regex (`/^0x[0-9a-fA-F]{40}$/`) and lowercase normalization in Server Actions.
- **Database Error Sanitization**: Logged internal PostgreSQL error messages to server console and returned sanitized, user-friendly error codes (`EXPORT_FAILED`, `FETCH_FAILED`) to prevent database schema enumeration.
- **STRIDE Threat Model**: Documented architectural boundaries, accepted trade-offs, and future SIWE roadmap in `SECURITY-TRADE-OFFS.md`.

## [0.1.0] - 2026-09-23

### Added
- Initial release of Quick Quiz Web3 platform.
- Interactive crypto trivia gameplay across DeFi, NFTs, and Layer 1 blockchains.
- RainbowKit and Wagmi Web3 wallet connectivity.
- On-chain ERC-20 ($QUIZ) reward vouchers and ERC-721 Achievement Badge NFTs on Base Sepolia via EIP-712 signatures.
- Global and group leaderboard rankings.
