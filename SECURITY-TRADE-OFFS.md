# Security Posture & Threat Model: Quick Quiz

As of 2026-10-08. Every claim below names the file or command that confirms it. Items marked **pending** are not yet true in production.

## 1. Threat Model & STRIDE Analysis

| Threat | Risk Analysis | Mitigations Implemented |
|---|---|---|
| **S**poofing | A client claims to own a wallet, an email address or a username without proof. | Wallet: SIWE (EIP-4361) challenge bound to the request host and a one-time nonce, verified with `verifySiweMessage` (`lib/actions/auth-actions.ts`). Email: one-time code via Supabase Auth (`requestEmailCode`, `verifyEmailCode`). Username: password via Supabase Auth (`signInWithUsername`). All three end in the same signed `quiz_session` cookie (`lib/services/session.ts`). |
| **S**poofing (brute force, enumeration, replay) | Guessing a 6-digit email code or a password; learning which emails or usernames are registered; replaying a SIWE signature. | Per-identifier and per-IP attempt limits in Postgres (section 2). `requestEmailCode` answers `{ sent: true }` for known and unknown emails alike and applies the same limit to both. The SIWE nonce lives in an HTTP-only cookie, is deleted on first use and expires in 10 minutes (`CHALLENGE_COOKIE`). Known gap: `signUpWithUsername` reports "Username is already taken", so usernames can be enumerated (rate-limited, not hidden). |
| **T**ampering | Client manipulates query parameters or sends malicious payloads to Server Actions. | Bounded limits (`MAX_LIMIT = 500`); parameterized queries through Supabase PostgREST; input validation in `lib/utils/validation.ts`. |
| **R**epudiation | State-changing operations performed without attribution. | Writes require a session account (`getSessionAccount`) and are keyed by account id; database timestamps on `questions`, `quiz_results` and `reward_claims`. Rate-limit hits are logged server-side as `auth_rate_limited`. |
| **I**nformation Disclosure | Reading `correct_index` and `explanation` before answering. | `getUserQuizzes` selects only display fields (`id, category, prompt, options, status, created_at, created_by`; `lib/actions/profile-actions.ts`). Raw database errors are logged server-side and replaced with generic messages. |
| **D**enial of Service | Large queries, floods of writes, or abuse of expensive paths. | Query caps (`MAX_LIMIT 500`, export capped at `MAX_EXPORT_QUIZZES 1000` and `MAX_EXPORT_STATS 5000`). Daily cap on new questions (`QUESTIONS_PER_DAY` in `lib/actions/question-actions.ts`). Auth attempt limits (section 2). Known gap: the 10-per-15-minute username limit lets an attacker lock one victim out of password sign-in for 15 minutes; email and wallet sign-in still work. |
| **E**levation of Privilege | A standard user acts as admin or as another user. | All writes go through server actions using `supabaseAdmin`; the public key cannot write (section 4.B). Ownership is checked on the session account id, for example `list.owner_user !== auth.account.id` in `startContest`. |

---

## 2. Hardening Controls Implemented

### HTTP Security Headers
Configured globally in `next.config.js` (verified by `tests/security-headers.test.ts`):
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Content-Security-Policy: frame-ancestors 'none'` (**enforcing**; the only enforced CSP directive today)
- `Content-Security-Policy-Report-Only: default-src 'self'; ...` (**pending enforcement**): constrains `connect-src` (Supabase, WalletConnect/Reown, Coinbase, MetaMask, default RPCs), `frame-src`, `object-src 'none'`, `base-uri`, `form-action`. `script-src` still allows `'unsafe-inline'` because Next's hydration scripts need it until nonces are rolled out. Violations are posted to `app/api/csp-report/route.ts` and logged as `csp_violation`. It will be enforced after a clean observation on preview (Task 6 in `tasks/todo.md`).
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`

### Authentication Rate Limits
Implemented in `lib/services/rate-limit.ts` over the `auth_attempts` table and the atomic `rate_limit_hit` function (`supabase/migrations/17-auth-rate-limit.sql`). Identifiers are SHA-256 hashed before storage; a blocked attempt is not recorded, so it cannot extend its own lockout.

| Action | Limit |
|---|---|
| `requestEmailCode` | 5 per address per hour; 20 per IP per hour |
| `verifyEmailCode` | 10 per address per hour |
| `signInWithUsername` | 10 per username per 15 minutes |
| `signUpWithUsername` | 5 per username and 10 per IP per hour |
| `signInWithWallet`, `linkWallet` | 30 per IP per 10 minutes (the SIWE check can cost an on-chain call) |

Trade-offs: the limiter **fails open** if the counter is unreachable or the migration has not been applied (it logs `rate_limit_check_failed`); Supabase Auth's own limits remain behind it. Per-IP limits use the first `x-forwarded-for` hop set by the hosting proxy and are skipped when it is absent. **Deploy step pending**: run `17-auth-rate-limit.sql` in Supabase.

### Server Action Boundaries & Sanitization
- **Strict address format**: `^0x[0-9a-fA-F]{40}$` (`isValidEthAddress`, `lib/actions/profile-actions.ts`); addresses are lower-cased before storage.
- **Error sanitization**: database errors are logged internally and not reflected to clients.
- **Session cookie**: `quiz_session` is HTTP-only, `SameSite=Lax`, HMAC-signed, valid 7 days (`lib/services/session.ts`).

### Privacy & Data Portability (GDPR Article 20)
- **Export**: `exportUserData` returns structured JSON (`quizzes`, `stats`) for the signed-in account (`lib/actions/profile-actions.ts`).
- **Data minimization**: only an account's own questions and results are exported or retained for it.

---

## 3. Dependency Audit Triage (`npm audit --omit=dev`)

As of 2026-10-08 the command reports **21 moderate, 0 high, 0 critical**. `CONSTRAINTS.md` lists no exceptions, and CI fails on any high finding (`npm run check:deps`, `.github/workflows/ci.yml`).

- **Cleared**: the high `ws` advisories came from `viem@2.23.2` (under `@walletconnect/utils`) pinning `ws` to exactly 8.18.0. `package.json` now overrides `viem`'s `ws` to 8.21.0, with no `wagmi@3` upgrade. The `sharp` and `source-map-js` highs were cleared by in-range lockfile bumps, and `next` moved to 16.4.0 for its high advisory.
- **Remaining moderates** all trace to the wallet stack: `uuid@9.0.1` (buffer bounds check, only reachable when a caller passes a `buf` argument) via `@metamask/utils`, and `decode-uri-component@0.2.2` (denial of service on crafted input) via `query-string` in `@walletconnect/utils`. Both run client-side inside wallet libraries and do not parse untrusted server input. `npm audit fix --force` would jump to `wagmi@3`, a breaking change for RainbowKit 2.x.
- **Action**: deferred until the wallet libraries publish releases that update these packages; re-run `npm audit --omit=dev` on every dependency change.

---

## 4. Resolved Security Milestones & Current Architecture

### A. Cryptographic Session Authentication (SIWE) — RESOLVED
- **Implementation**: EIP-4361 Sign-In with Ethereum (`lib/actions/auth-actions.ts`, `lib/services/session.ts`).
- **Enforcement**: state-changing Server Actions (`createQuestion`, `submitAnswer`, `createList`, `exportUserData`) authenticate the caller through the signed `quiz_session` cookie, issued only after a verified signature, email code or password.
- **Impact**: eliminates wallet spoofing and IDOR across data export and submission.

### B. Supabase RLS Write Lock-Down — RESOLVED
- **Implementation**: `supabase/migrations/lock-down-public-writes.sql` and `supabase/migrations/question-lists.sql`.
- **Enforcement**: public write access (`INSERT`, `UPDATE`, `DELETE`) is disabled for the anonymous client. All writes go through `supabaseAdmin` with the server-side secret key (`SUPABASE_SECRET_KEY`). `auth_attempts` has RLS enabled with no policies, so only the service role can read or write it.
- **Impact**: prevents direct database manipulation and unauthenticated result injection.

### C. Contest Payout Escrow & Anti-Drain — RESOLVED (residual risks noted)
- **Constraint**: list creators define contest reward pools and know all correct answers.
- **Enforcement**: public arbitrary voucher signing (`buildTokenClaimVoucher`) no longer exists in `lib/` or `app/`. `startContest` sets a list `live` only after confirming the creator's pool is locked in `ContestEscrow` on-chain. `claimListReward` signs EIP-712 vouchers against that pool, and `ContestEscrow.claimReward` pays only from deposited funds, bounded by the contest's `remainingPool`, with single-use nonces. One open voucher per entry is enforced by the `reward_claims_one_open_contest_per_account` unique index.
- **Impact**: a creator farming their own contest only recycles their own deposit; nothing is minted. Evidence: [ADR-006](docs/decisions/006-contest-escrow-payouts.md).
- **Residual risks**: the voucher signer key is a single trust root (rotatable with `setAuthorizedSigner`); Sybil accounts can dilute honest winners within `max_participants`; `claimListReward` still signs when the on-chain read returns nothing (the contract rejects it); `ContestEscrow.sol` is not externally audited.

---

## 5. Architectural Decision Records (ADRs)
For detailed design decisions and trade-offs, consult:
- [ADR-001: Sign-In with Ethereum & Session Authorization](docs/decisions/001-siwe-session-authorization.md)
- [ADR-002: Dual-Key Supabase Architecture & RLS Lockdown](docs/decisions/002-dual-key-supabase-rls-lockdown.md)
- [ADR-003: Peer-Reviewed Question Lists & Voucher Safeguards](docs/decisions/003-question-lists-and-contest-voucher-safeguards.md) (decision 2 superseded by ADR-006)
- [ADR-004: Next.js Server Action Bundling & Module Separation](docs/decisions/004-server-action-module-separation.md)
- [ADR-005: Component Manager Pattern](docs/decisions/005-component-manager-pattern.md)
- [ADR-006: Contest Payouts Through ContestEscrow Vouchers](docs/decisions/006-contest-escrow-payouts.md)
