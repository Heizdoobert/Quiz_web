# Quick Quiz — Trivia Game & Leaderboards

A trivia app built with **Next.js 16 (App Router)**, **Tailwind CSS v4** and **Supabase**, plus a Flutter client in [`mobile/`](mobile/). Players answer questions, build streaks and climb global and group leaderboards. It is a plain web2 app: sign in with a username and password or an email code (Google on mobile), and your score is kept per account. There is no wallet, token or blockchain component.

## Features

- **Trivia Engine**: 3D flip-card quiz UI with countdown timer, 50:50 lifeline, skip, and instant educational explanations.
- **Creator Dashboard (`/profile`)**: Manage your authored questions and download portable JSON backups.
- **Score & Rankings**: One point per correct answer, streaks, and global and group leaderboards computed with PostgreSQL aggregation functions.
- **Groups & Community**: Create or join groups, add questions, and rate, comment on and report questions.
- **Hardened Security**: Signed session cookies, dual-key Supabase RLS lockdown, anti-cheat answer masking, rate limits and OWASP HTTP security headers.
- **SEO & PWA Ready**: Dynamic metadata, sitemap, robots.txt, JSON-LD structured data, and web manifest.

## Getting Started

You need Node 22 and a Supabase project.

```bash
npm install --legacy-peer-deps
cp .env.example .env.local   # then fill it in, see below
# apply the SQL in "Database Setup" to your Supabase project
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000). The app refuses to start when a required variable is missing (see `lib/supabase/supabase.ts`).

### Environment Variables

Copy `.env.example` to `.env.local` (or `.env` for Docker) and configure your credentials.

Required:
- `NEXT_PUBLIC_SUPABASE_URL` & `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Public Supabase client configuration.
- `SUPABASE_URL` & `SUPABASE_PUBLISHABLE_KEY`: The same project and publishable key, read by server code.
- `SUPABASE_SECRET_KEY`: Service-role access used only by Server Actions (answer grading, rate limits). The session cookie's HMAC key is derived from it, so rotating it signs everyone out.

Optional:
- `GEMINI_API_KEY`: Google Gemini key for AI question generation and content moderation. Read by `@google/genai`; without it those features fail.
- `NEXT_PUBLIC_APP_URL`: Public base URL for canonical links, sitemap and Open Graph tags. Falls back to Vercel's production domain, then `http://localhost:3000`.
- `NEXT_PUBLIC_SPONSOR_AD_URL`: sponsor link.
- `NEXT_PUBLIC_APP_ENV=preview`: Marks a non-Vercel deployment as preview (noindex).

Variables prefixed `NEXT_PUBLIC_` are compiled into the browser bundle at build time, so set them before building.

### Database Setup

Run these in the Supabase SQL Editor, in this order (a Supabase branch first, then production). Most scripts are idempotent; the exceptions are listed in [`docs/migrations.md`](docs/migrations.md), which is also the ledger of what has been applied and the forward-fix rule (there are no down scripts). `bash scripts/verify-migrations.sh` applies this whole order to a throwaway Postgres and reports errors.

All files are in [`supabase/migrations/`](supabase/migrations/):

1. [`schema.sql`](supabase/migrations/schema.sql) — tables and constraints (run it twice on a fresh database: `reward_claims` references `question_lists` before the file creates it).
2. [`lock-down-public-writes.sql`](supabase/migrations/lock-down-public-writes.sql) — server-only writes, no public read of answers.
3. [`question-lists.sql`](supabase/migrations/question-lists.sql) — peer-reviewed lists and contests.
4. [`secure-rewards-and-answers.sql`](supabase/migrations/secure-rewards-and-answers.sql) — one open voucher per account.
5. [`restrict-quiz-results-insert.sql`](supabase/migrations/restrict-quiz-results-insert.sql) — only the server records answers.
6. [`contest-escrow.sql`](supabase/migrations/contest-escrow.sql) — contest claims in `reward_claims`.
7. [`widen-reward-claims-amount.sql`](supabase/migrations/widen-reward-claims-amount.sql) — wei amounts as `NUMERIC(78,0)`.
8. [`accounts.sql`](supabase/migrations/accounts.sql) — key every table by account id (`users.id`).
9. [`stats-functions.sql`](supabase/migrations/stats-functions.sql) — stats and leaderboard functions (needs step 8).
10. [`retire-sample-questions.sql`](supabase/migrations/retire-sample-questions.sql) — marks the old seed questions `rejected` (deletes nothing) Skip it on a fresh database: it asserts the old seed questions exist.
11. [`topics.sql`](supabase/migrations/topics.sql) — `get_topics()`.
12. [`search.sql`](supabase/migrations/search.sql) — `pg_trgm` search.
13. [`community.sql`](supabase/migrations/community.sql) — ratings, comments, suggestions.
14. [`reward-payee.sql`](supabase/migrations/reward-payee.sql) — treasury sweep for wallet-less accounts.
15. [`15-sponsors.sql`](supabase/migrations/15-sponsors.sql) — ad sponsors.
16. [`16-leaderboard-pagination.sql`](supabase/migrations/16-leaderboard-pagination.sql) — paginated `get_global_leaderboard`.
17. [`17-analytics.sql`](supabase/migrations/17-analytics.sql) — question and contest analytics functions.
18. [`17-auth-rate-limit.sql`](supabase/migrations/17-auth-rate-limit.sql) — attempt counter behind the auth and answer rate limits. Until it is applied the limiter fails open (ADR-008).
19. [`18-ai-usage.sql`](supabase/migrations/18-ai-usage.sql) — daily AI generation usage.
20. [`19-secure-ai-usage.sql`](supabase/migrations/19-secure-ai-usage.sql) — closes `user_ai_usage` to the public key (RLS on, no policies).
21. [`20-drop-web3-schema.sql`](supabase/migrations/20-drop-web3-schema.sql) — drops the wallet, reward and escrow schema (ADR-013). Destructive: take a backup first, and on an existing database apply it only once production runs code that reads `questions.created_by_user`.

[`ecosystem-v1-migration.sql`](supabase/migrations/ecosystem-v1-migration.sql) is only for databases created before `schema.sql` held the contest columns; skip it on a fresh database.

The older scripts still create the reward, escrow, voucher and payee schema; step 21 removes it again. `bash supabase/tests/run-drop-web3-schema.sh` checks that step against a copy of production's history.

Email sign-in also needs the Supabase Auth email provider on, with an OTP template that shows `{{ .Token }}`.

### Deploying

Production runs on Vercel. Set every required variable above in the Vercel project's Production scope before the build, because `NEXT_PUBLIC_*` values are baked into the bundle. Promote by merging `preview` into `main` only after CI is green on `preview` (`AGENTS.md`). `/api/health` answers 200 when the database is reachable, for uptime checks. The `Dockerfile` and the CD workflow publish a container image to GHCR, but that image is built with placeholder public values and is not what production serves.

### Testing & Quality Gates

| Command | Purpose |
|---------|---------|
| `npm test` | Run Vitest unit & integration test suites |
| `npm run test:coverage` | Tests with the coverage ratchet from `CONSTRAINTS.md` |
| `npm run type-check` | Verify TypeScript compilation (`tsc --noEmit`) |
| `npm run lint` | Run ESLint check |
| `npm run check:task` | Types, lint, secrets, architecture and coverage in one go |
| `npm run build` | Generate production build with static prerendering |

CI (`.github/workflows/ci.yml`) runs lint, types, architecture, tests with coverage, the production build and the dependency audit on every push and PR to `main` and `preview`.

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
  - [ADR-013: Web2 Only: Remove Wallet, Token and Contract Code](docs/decisions/013-web2-only.md)
- [Security Threat Model & STRIDE Analysis](docs/security-trade-offs.md)

## Branches

- `main` — Production release branch (protected; requires PR and verified signatures).
- `preview` — Staging and pre-release integration branch.

## License

MIT
