# CHANGELOG.md
lines:148 exports:
---
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Auth rate limits**: Email-code, username and answer submissions are limited per identifier and per IP through a Postgres counter (`supabase/migrations/17-auth-rate-limit.sql`, ADR-008). Apply the migration; until then the limiter fails open.
- **CSP report-only policy** and `/api/csp-report` (ADR-009).
- **`/api/health`**: answers 200 only when the database does, 503 otherwise.
- **`npm run check:bundle`**: measures gzip first-load JS per prerendered route (about 460 kB today against a 150 kB target, tracked as exception X-1).
- **Decision records** ADR-008 to ADR-012 for the rate limiter, CSP, leaderboard polling, the no-wallet payee rule and optional-wallet accounts.

### Changed
- **Coverage is measured over every source file** (`coverage.include`); the lines ratchet is now 51.7% (it was 65.5% over imported files only), with functions and branches gated too.
- **`npm test` also runs the component tests** under `components/`.
- **Global leaderboard** is cached for 15 seconds on the server (ADR-010). `/topics` renders on demand.
- **CD waits for CI**: container publishing now needs the CI workflow to pass on the same commit; a single "CI gate" check is available for the branch ruleset.
- **Next.js 16.4.0** (fixes the image optimizer SSRF and ISR cache-poisoning advisory in 16.3.6).

### Security
- `isContestVoucherUsed` fails closed when the nonce cannot be read, so a voucher is not re-signed after an RPC failure.
- `get5050EliminatedIndices` returns nothing for pending, quarantined or contest questions.
- `submitAnswer` validates the question id and is limited to 120 answers per IP per hour.
- Empty `catch` blocks are now a lint error.

### Fixed
- The email step shows the send-code rate-limit message.
- Toasts no longer re-run effects that depend on the toast handle (the contest start request could repeat after a failure).
- Modals move focus in, keep Tab inside and restore focus on close; toasts, form errors and the answer result are announced and form controls have accessible names.
- Two stale `RewardsTokensTab` tests.

### Removed
- Unused `lodash.debounce`, `@types/lodash.debounce` and `@types/jest`.

## [0.5.0] - 2026-10-08

