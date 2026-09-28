# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
