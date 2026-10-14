# Quick Quiz — Trivia Game & Leaderboards

A trivia app built with **Next.js 16 (App Router)**, **Tailwind CSS v4** and **Supabase**, plus a Flutter client in [`mobile/`](mobile/). Players answer questions, build streaks and climb global and group leaderboards. It is a plain web2 app: sign in with a username and password or an email code (Google on mobile), and your score is kept per account. There is no wallet, token or blockchain component.

## Features

- **Trivia Engine**: 3D flip-card quiz UI with countdown timer, 50:50 lifeline, skip, and instant educational explanations.
- **Creator Dashboard (`/profile`)**: Manage your authored questions and download portable JSON backups.
- **Score & Rankings**: One point per correct answer, streaks, and global and group leaderboards computed with PostgreSQL aggregation functions.
- **Groups & Community**: Create or join groups, add questions, and rate, comment on and report questions.
- **Hardened Security**: Signed session cookies, dual-key Supabase RLS lockdown, anti-cheat answer masking, rate limits and OWASP HTTP security headers.
- **TypeScript SDK & API Gateway (`@heizdoobert/quickquiz-sdk`)**: Zero-dependency client with timeout, cancellation (`AbortSignal`), and automatic retries for idempotent requests; integrated via [`lib/sdk.ts`](lib/sdk.ts).
- **REST API v1 (`/api/v1`)**: the public JSON API behind the SDK, with auth, questions, quiz, leaderboard, groups, community and profile endpoints.
- **Remote Config**: flags such as `maintenance_mode` live in a Supabase table and reach web and mobile through `GET /api/config`, with no deploy (see [`sdk/remote_config`](sdk/remote_config/README.md)).
- **SEO Ready**: Dynamic metadata, sitemap, robots.txt, JSON-LD structured data, and web manifest.

## Getting Started

You need Node 22 and a Supabase project.

```bash
npm install --legacy-peer-deps
cp .env.example .env.local   # then fill it in, see below
# apply the SQL in "Database Setup" to your Supabase project
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000). The app refuses to start when a required variable is missing (see `lib/sdk/supabase.ts`).

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

The schema is managed with the Supabase CLI (see [`docs/migrations.md`](docs/migrations.md) and ADR-015). With Docker running:

```bash
npx supabase start       # local Supabase: database, auth, API
npx supabase db reset    # applies supabase/migrations/ from the baseline on
npm run check:db         # replay + pgTAP tests + lint
```

To apply to a hosted project: `npx supabase link --project-ref <ref>`, then `npx supabase db push` (a Supabase branch first, then production). The old hand-applied scripts were removed; they live in git history (`git show d820619:supabase/legacy/`).

Email sign-in also needs the Supabase Auth email provider on, with an OTP template that shows `{{ .Token }}`.

### Deploying

Production runs on Vercel. Set every required variable above in the Vercel project's Production scope before the build, because `NEXT_PUBLIC_*` values are baked into the bundle. Promote by merging `preview` into `main` only after CI is green on `preview` (`CONSTRAINTS.md`). `/api/health` answers 200 when the database is reachable, for uptime checks. The `Dockerfile` and the CD workflow publish a container image to GHCR, but that image is built with placeholder public values and is not what production serves.

### Testing & Quality Gates

| Command | Purpose |
|---------|---------|
| `npm test` | Run Vitest unit & integration test suites |
| `npm run test:coverage` | Tests with the coverage ratchet from `CONSTRAINTS.md` |
| `npm run type-check` | Verify TypeScript compilation (`tsc --noEmit`) |
| `npm run lint` | Run ESLint check |
| `npm run check:architecture` | Module boundaries and circular imports (dependency-cruiser) |
| `npm run check:task` | Types, lint, secrets, architecture and coverage in one go |
| `npm run build` | Generate production build with static prerendering |

CI (`.github/workflows/ci.yml`) runs lint, types, architecture, tests with coverage, the production build and the dependency audit on every push and PR to `main` and `preview`.

## SDK & API Gateway

Quick Quiz includes an official TypeScript SDK (`@heizdoobert/quickquiz-sdk`) in [`sdk/`](sdk/) with full typings and zero external dependencies.

### App Gateway (`lib/sdk.ts`)

Inside the web application, use `getSdk` to obtain a pre-configured client pointed at the local API:

```ts
import { getSdk } from '@/lib/sdk';

// Default instance pointed to ${getSiteUrl()}/api
const sdk = getSdk();
const stats = await sdk.leaderboard.getStats();

// Authenticated instance with custom timeout and retries
const userSdk = getSdk({
  token: 'user-session-token',
  timeout: 5000,
  retries: 2,
});
```

See [`sdk/README.md`](sdk/README.md) for full SDK usage, error codes, and configuration options.

## Architecture & Decisions

Code boundaries, enforced by `eslint.config.mjs` and `npm run check:architecture`:
- [`lib/db/`](lib/db/) is the only caller of a Supabase client; everything else uses its domain functions.
- [`lib/sdk/`](lib/sdk/README.md) is the only importer of a vendor SDK (Supabase, Gemini, Sentry, PostHog).
- [`sdk/tracking-analytics/`](sdk/tracking-analytics/README.md) is optional; [`sdk/remote_config/`](sdk/remote_config/README.md) is required.

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
