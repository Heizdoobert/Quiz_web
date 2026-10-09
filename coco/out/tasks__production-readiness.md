# tasks/production-readiness.md
lines:23 exports:
---
# Production Readiness Plan

To transition this project from development to a real, public-facing production app, we need to implement several infrastructure and code changes.

## Phase 1: CI/CD & Automation (Automated Quality Gates)
- [ ] Create `.github/workflows/ci.yml` to run tests, linting, and type-checks automatically on every push to `preview` and `main`.
- [ ] Create `.github/workflows/security.yml` to run automated dependency audits and static code analysis.

## Phase 2: Observability (Monitoring & Analytics)
- [ ] Install and configure **Sentry** (`@sentry/nextjs`) to automatically catch and report React crashes, API errors, and performance bottlenecks.
- [ ] Install and configure **PostHog** (`posthog-js`) for user analytics, session recording, and feature flags.
- [ ] Add global Error Boundaries to gracefully handle crashes without white-screening the user.

## Phase 3: Web3 & Database Security (Hardening)
- [ ] Audit all Supabase Row Level Security (RLS) policies to ensure no table allows unauthorized public writes.
- [ ] Ensure all environment variables are properly typed and validated at runtime (e.g., using `zod` for `process.env`).

## Phase 4: Production Environment Setup (Manual User Steps)
- [ ] Create a new Vercel project for production.
- [ ] Create a new Supabase project for production (do not use the dev database).
- [ ] Safely migrate the database schema to the new production database.
- [ ] Input all production secrets (Supabase keys, WalletConnect IDs, etc.) into Vercel.

