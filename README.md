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

Copy `.env.example` to `.env.local` and configure your credentials:
- `NEXT_PUBLIC_SUPABASE_URL` & `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Public Supabase client configuration.
- `SUPABASE_SECRET_KEY`: Service role secret key used strictly by Server Actions for answer grading and claim recording.
- `SESSION_SECRET`: Secret key for signing SIWE session cookies.
- `REWARD_SIGNER_PRIVATE_KEY`: Private key authorized to sign EIP-712 voucher mints.
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`: Reown/WalletConnect project ID for RainbowKit.

### Database Setup

1. Run [`lib/schema.sql`](lib/schema.sql) in the Supabase SQL Editor to initialize tables, constraints, and initial seed questions.
2. Run [`lib/sql/stats-functions.sql`](lib/sql/stats-functions.sql) to install server-side leaderboard and stats aggregations.
3. Run [`lib/sql/lock-down-public-writes.sql`](lib/sql/lock-down-public-writes.sql) and [`lib/sql/question-lists.sql`](lib/sql/question-lists.sql) to apply the strict Row-Level Security lockdowns.
4. Run [`lib/sql/accounts.sql`](lib/sql/accounts.sql) to key every table by account id (`users.id`) so a wallet is optional. It is safe to re-run.

### Testing & Quality Gates

| Command | Purpose |
|---------|---------|
| `npm test` | Run Vitest unit & integration test suites |
| `npm run type-check` | Verify TypeScript compilation (`tsc --noEmit`) |
| `npm run lint` | Run ESLint check |
| `npm run build` | Generate production build with static prerendering |

### Smart Contracts

```bash
cd contracts
npm install
npm run compile
npm run test
```

Contract addresses on Base Sepolia:
- **QuizToken (ERC-20)**: See [`lib/contracts/addresses.ts`](lib/contracts/addresses.ts)
- **QuizBadgeNFT (ERC-721)**: See [`lib/contracts/addresses.ts`](lib/contracts/addresses.ts)

## Architecture & Decisions

For technical architecture decisions and design trade-offs, consult:
- [Architecture Decision Records (ADRs)](docs/decisions/):
  - [ADR-001: Sign-In with Ethereum & Session Authorization](docs/decisions/001-siwe-session-authorization.md)
  - [ADR-002: Dual-Key Supabase Architecture & RLS Lockdown](docs/decisions/002-dual-key-supabase-rls-lockdown.md)
  - [ADR-003: Peer-Reviewed Question Lists & Voucher Safeguards](docs/decisions/003-question-lists-and-contest-voucher-safeguards.md)
  - [ADR-004: Next.js Server Action Bundling & Module Separation](docs/decisions/004-server-action-module-separation.md)
- [Security Threat Model & STRIDE Analysis](SECURITY-TRADE-OFFS.md)

## Branches

- `main` — Production release branch (protected; requires PR and verified signatures).
- `preview` — Staging and pre-release integration branch.

## License

MIT
