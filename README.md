# Quick Quiz — Web3 Trivia & On-Chain Rewards

A Web3 trivia app built with **Next.js 16 (App Router)**, **Tailwind CSS v4**, **Supabase**, and **Wagmi / RainbowKit**. Players answer crypto trivia questions, climb global & group leaderboards, and earn **$QUIZ (ERC-20)** tokens and **Achievement Badge NFTs (ERC-721)** on Base Sepolia.

## Features

- **Trivia Engine**: 3D flip-card quiz UI with countdown timer, 50:50 lifeline, skip, and instant educational explanations.
- **Creator Dashboard (`/profile`)**: Manage your authored questions and download portable JSON backups with GDPR-compliant data portability.
- **Peer-Reviewed Question Lists (`/my-lists`, `/review`, `/contest`)**: Author custom question lists, submit them for peer-review consensus, and host community crypto contests.
- **On-Chain Rewards**: Earn **$QUIZ (ERC-20)** tokens and **Achievement Badge NFTs (ERC-721)** on Base Sepolia signed via EIP-712 typed vouchers.
- **Rankings & Groups**: Global & custom group leaderboards computed with PostgreSQL aggregation functions.
- **Hardened Security**: Cryptographic SIWE session authentication, dual-key Supabase RLS lockdown, anti-cheat answer masking, and OWASP HTTP security headers.
- **SEO & PWA Ready**: Dynamic metadata, sitemap, robots.txt, JSON-LD structured data, and web manifest.

## Getting Started

```bash
npm install
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000).

### Environment Variables

Copy `.env.example` to `.env.local` (or `.env` for Docker) and configure your credentials:
- `NEXT_PUBLIC_SUPABASE_URL` & `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Public Supabase client configuration.
- `SUPABASE_URL` & `SUPABASE_SECRET_KEY`: Service-role access used only by Server Actions (answer grading, claim recording). The session cookie's HMAC key is derived from `SUPABASE_SECRET_KEY`, so rotating it signs everyone out.
- `REWARD_SIGNER_PRIVATE_KEY`: Private key authorized to sign EIP-712 reward vouchers.
- `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID`: Reown/WalletConnect project ID for RainbowKit.
- `NEXT_PUBLIC_QUIZ_TOKEN_ADDRESS`, `NEXT_PUBLIC_QUIZ_BADGE_ADDRESS`, `NEXT_PUBLIC_CONTEST_ESCROW_ADDRESS`, `NEXT_PUBLIC_CHAIN_ID`: Deployed contracts and chain (defaults in `lib/contracts/addresses.ts`).
- `NEXT_PUBLIC_APP_URL`: Public base URL for canonical links, sitemap and Open Graph tags. Falls back to Vercel's production domain, then `http://localhost:3000`.
- `TREASURY_WALLET_ADDRESS` (optional): Wallet that receives $QUIZ swept from wallet-less accounts after 180 days. Unset means no sweep.
- `NEXT_PUBLIC_PAYMASTER_URL` (optional): Paymaster for gasless claims. `NEXT_PUBLIC_SPONSOR_AD_URL` (optional): sponsor link.
- `NEXT_PUBLIC_APP_ENV=preview` (optional): Marks a non-Vercel deployment as preview (noindex).

### Database Setup

Run these in the Supabase SQL Editor, in this order (a Supabase branch first, then production). Every script is idempotent and safe to re-run. This is the order `tests/sql/run-accounts-migration.sh` verifies.

1. [`lib/schema.sql`](lib/schema.sql) — tables and constraints (run it twice on a fresh database: `reward_claims` references `question_lists` before the file creates it).
2. [`lib/sql/lock-down-public-writes.sql`](lib/sql/lock-down-public-writes.sql) — server-only writes, no public read of answers.
3. [`lib/sql/question-lists.sql`](lib/sql/question-lists.sql) — peer-reviewed lists and contests.
4. [`lib/sql/secure-rewards-and-answers.sql`](lib/sql/secure-rewards-and-answers.sql) — one open voucher per account.
5. [`lib/sql/restrict-quiz-results-insert.sql`](lib/sql/restrict-quiz-results-insert.sql) — only the server records answers.
6. [`lib/sql/contest-escrow.sql`](lib/sql/contest-escrow.sql) — contest claims in `reward_claims`.
7. [`lib/sql/widen-reward-claims-amount.sql`](lib/sql/widen-reward-claims-amount.sql) — wei amounts as `NUMERIC(78,0)`.
8. [`lib/sql/accounts.sql`](lib/sql/accounts.sql) — key every table by account id (`users.id`), so a wallet is optional.
9. [`lib/sql/stats-functions.sql`](lib/sql/stats-functions.sql) — stats and leaderboard functions (needs step 8).
10. [`lib/sql/retire-sample-questions.sql`](lib/sql/retire-sample-questions.sql) — marks the old seed questions `rejected` (deletes nothing).
11. [`lib/sql/topics.sql`](lib/sql/topics.sql) — `get_topics()`.
12. [`lib/sql/search.sql`](lib/sql/search.sql) — `pg_trgm` search.
13. [`lib/sql/community.sql`](lib/sql/community.sql) — ratings, comments, suggestions.
14. [`lib/sql/reward-payee.sql`](lib/sql/reward-payee.sql) — treasury sweep for wallet-less accounts.

Email sign-in also needs the Supabase Auth email provider on, with an OTP template that shows `{{ .Token }}`.

### Testing & Quality Gates

| Command | Purpose |
|---------|---------|
| `npm test` | Run Vitest unit & integration test suites |
| `npm run test:coverage` | Tests with the coverage ratchet from `CONSTRAINTS.md` |
| `npm run type-check` | Verify TypeScript compilation (`tsc --noEmit`) |
| `npm run lint` | Run ESLint check |
| `npm run check:task` | Types, lint, secrets, architecture and coverage in one go |
| `npm run build` | Generate production build with static prerendering |

CI (`.github/workflows/ci.yml`) runs lint, types, architecture, tests with coverage, the Hardhat contract tests, the production build and the dependency audit on every push and PR to `main` and `preview`.

### Smart Contracts

```bash
cd contracts
npm install
npm run compile
npm run test
```

Contract addresses on Base Sepolia:
- **QuizToken (ERC-20)**, **QuizBadgeNFT (ERC-721)**, **ContestEscrow**: See [`lib/contracts/addresses.ts`](lib/contracts/addresses.ts)

## Architecture & Decisions

For technical architecture decisions and design trade-offs, consult:
- [Architecture Decision Records (ADRs)](docs/decisions/):
  - [ADR-001: Sign-In with Ethereum & Session Authorization](docs/decisions/001-siwe-session-authorization.md)
  - [ADR-002: Dual-Key Supabase Architecture & RLS Lockdown](docs/decisions/002-dual-key-supabase-rls-lockdown.md)
  - [ADR-003: Peer-Reviewed Question Lists & Voucher Safeguards](docs/decisions/003-question-lists-and-contest-voucher-safeguards.md)
  - [ADR-004: Next.js Server Action Bundling & Module Separation](docs/decisions/004-server-action-module-separation.md)
  - [ADR-005: Adopt Component Manager Pattern for UI Code Splitting](docs/decisions/005-component-manager-pattern.md)
  - [ADR-006: Resolving High-Severity NPM Vulnerabilities via PWA Fork and Dependency Overrides](docs/decisions/006-npm-vulnerabilities-and-pwa-fork.md)
  - [ADR-007: Contest Payouts Through ContestEscrow Vouchers](docs/decisions/007-contest-escrow-payouts.md)
  - [ADR-008: Postgres Rate Limiter That Fails Open](docs/decisions/008-postgres-auth-rate-limiter-fails-open.md)
  - [ADR-009: Content-Security-Policy Ships Report-Only First](docs/decisions/009-report-only-content-security-policy.md)
  - [ADR-010: Leaderboard Updates by Polling and a Short Server Cache](docs/decisions/010-polling-leaderboard-with-short-cache.md)
  - [ADR-011: $QUIZ Belongs to the Account; Unclaimed Rewards Sweep to the Treasury After 180 Days](docs/decisions/011-rewards-belong-to-the-account-no-wallet-payee.md)
  - [ADR-012: Accounts With an Optional Wallet](docs/decisions/012-accounts-with-optional-wallet.md)
- [Security Threat Model & STRIDE Analysis](SECURITY-TRADE-OFFS.md)

## Branches

- `main` — Production release branch (protected; requires PR and verified signatures).
- `preview` — Staging and pre-release integration branch.

## License

MIT
