# docs/security-trade-offs.md
lines:97 exports:
---
# Security Posture & Threat Model: Quick Quiz

As of 2026-10-08. Every claim below names the file or command that confirms it. Items marked **pending** are not yet true in production.

## 1. Threat Model & STRIDE Analysis

| Threat | Risk Analysis | Mitigations Implemented |
|---|---|---|
| **S**poofing | A client claims to own a wallet, an email address or a username without proof. | Wallet: SIWE (EIP-4361) challenge bound to the request host and a one-time nonce, verified with `verifySiweMessage` (`lib/actions/auth-actions.ts`). Email: one-time code via Supabase Auth (`requestEmailCode`, `verifyEmailCode`). Username: password via Supabase Auth (`signInWithUsername`). All three end in the same signed `quiz_session` cookie (`lib/services/session.ts`). |
| **S**poofing (brute force, enumeration, replay) | Guessing a 6-digit email code or a password; learning which emails or usernames are registered; replaying a SIWE signature. | Per-identifier and per-IP attempt limits in Postgres (section 2). `requestEmailCode` answers `{ sent: true }` for known and unknown emails alike and applies the same limit to both. The SIWE nonce lives in an HTTP-only cookie, is deleted on first use and expires in 10 minutes (`CHALLENGE_COOKIE`). Known gap: `signUpWithUsername` reports "Username is already taken", so usernames can be enumerated (rate-limited, not hidden). |
| **T**ampering | Client manipulates query parameters or sends malicious payloads to Server Actions. | Bounded limits (`MAX_LIMIT = 500`); parameterized queries through Supabase PostgREST; input validation in `lib/utils/validation.ts`. |
| **R**epudiation | State-changing operations performed without attribution. | Writes require a session account (`getSessionAccount`) and are keyed by account id; database timestamps on `questions`, `quiz_results` and `reward_claims`. Rate-limit hits are logged server-side as `auth_rate_limited`. |
| **I**nformation Disclosure | Reading `correct_index` and `explanation` before answering. | `getUserQuizzes` selects only display fields (`id, category, prompt, options, status, created_at, created_by`; `lib/actions/profile-actions.ts`). Raw database errors are logged server-side and replaced with generic messages. `get5050EliminatedIndices` returns nothing for pending, quarantined or contest questions. Known gap: `submitAnswer` shows the key to guests by design (`docs/specs/trivia-guest-access.md`); it is limited to 120 answers per IP per hour, which slows but does not stop a script using many addresses. |
| **D**enial of Service | Large queries, floods of writes, or abuse of expensive paths. | Query caps (`MAX_LIMIT 500`, export capped at `MAX_EXPORT_QUIZZES 1000` and `MAX_EXPORT_STATS 5000`). Daily cap on new questions (`QUESTIONS_PER_DAY` in `lib/actions/question-actions.ts`). Auth attempt limits (section 2). Known gap: the 10-per-15-minute username limit lets an attacker lock one victim out of password sign-in for 15 minutes; email and wallet sign-in still work. |
| **E**levation of Privilege | A standard user acts as admin or as another user. | All writes go through server actions using `supabaseAdmin`; the public key cannot write (section 4.B). Ownership is checked on the session account id, for example `list.owner_user !== auth.account.id` in `startContest`. |

---

## 2. Hardening Controls Implemented

### HTTP Security Headers
Configured globally in `next.config.mjs` (verified by `tests/security-headers.test.ts`):
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Content-Security-Policy: frame-ancestors 'none'` (**enforcing**; the only enforced CSP directive today)
- `Content-Security-Policy-Report-Only: default-src 'self'; ...` (**pending enforcement**): constrains `connect-src` (Supabase, WalletConnect/Reown, Coinbase, MetaMask, default RPCs), `frame-src`, `object-src 'none'`, `base-uri`, `form-action`. `script-src` still allows `'unsafe-inline'` because Next's hydration scripts need it until nonces are rolled out. Violations ar
