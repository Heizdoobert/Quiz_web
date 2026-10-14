# Test Infrastructure & Verification Architecture

## 1. Overview & Test Architecture

This project implements an end-to-end, requirement-driven verification architecture for the user authentication and session management subsystem specified in `PROJECT.md` and `ORIGINAL_REQUEST.md`.

The test infrastructure is constructed on **Vitest 5.0.3** running in the Node.js runtime with TypeScript 5 path aliases (`@/*`).

### 1.1 Dual Session & Auth Scope
- **Web Auth & Session**: Next.js App Router server actions and API handlers backed by Supabase Auth with HMAC-SHA256 signed HTTP-only secure cookies (`quiz_session`), 7-day TTL, and constant-time signature verification (`crypto.timingSafeEqual`).
- **Mobile Auth & Session**: 30-day HMAC-SHA256 Bearer tokens, hardware secure storage simulation (`FlutterSecureStorage`), and local SQLite database adapter (`sqflite`) managing offline answer queues with 401 session expiration handling and account-switching queue isolation.
- **Email Verification**: Strictly numeric 6-digit OTP code dispatched via email with **STRICT NO LINK** constraint (no confirmation URLs, callback redirects, or magic links).
- **Password Reset**: 3-step recovery flow (Request 6-digit OTP -> Verify OTP & issue recovery token -> Set new password & revoke prior sessions).
- **Route Protection**: Next.js Edge Middleware and layout route guards intercepting `/profile` and `/admin/*`, redirecting unauthenticated visitors to `/signin?redirect=${path}`, while preserving RBAC 403 Forbidden for authenticated non-admin players accessing `/admin/*`.

---

## 2. Test Execution & Runner Commands

### 2.1 Standard Test Runner
To run all authentication test suites:
```bash
npx vitest run tests/auth-*.test.ts
```
Or run the full project test suite:
```bash
npm test
```

### 2.2 Thread Pool Execution (Recommended for High Concurrency / CI)
Under high system memory pressure or multi-agent execution where process forks may experience IPC startup timeouts, Vitest supports thread pool execution:
```bash
npx vitest run --pool=threads tests/auth-*.test.ts
```

### 2.3 Individual Test Matrix Commands
Each test matrix can be executed independently in isolation:
```bash
# Matrix 1: Sign-Up Flow
npx vitest run --pool=threads tests/auth-signup.test.ts

# Matrix 2: Sign-In Flow
npx vitest run --pool=threads tests/auth-signin.test.ts

# Matrix 3: 6-Digit Email Verification (Strict NO LINK)
npx vitest run --pool=threads tests/auth-email-verification.test.ts

# Matrix 4: 3-Step Password Reset Flow
npx vitest run --pool=threads tests/auth-password-reset.test.ts

# Matrix 5: Web HTTP-Only Cookie Session
npx vitest run --pool=threads tests/auth-session-web.test.ts

# Matrix 6: Mobile Session & Local SQLite Adapter
npx vitest run --pool=threads tests/auth-session-mobile.test.ts

# Matrix 7: Route Protection & Redirection
npx vitest run --pool=threads tests/auth-routing-protection.test.ts
```

### 2.4 Coverage Ratchet Verification
To verify project test coverage meets or exceeds established quality thresholds:
```bash
npm run test:coverage
```
Thresholds enforced per `CONSTRAINTS.md` and `vitest.config.ts`:
- **Lines**: $\ge 53.8\%$
- **Functions**: $\ge 50.7\%$
- **Branches**: $\ge 49.4\%$
- **Changed Lines**: $\ge 80.0\%$

---

## 3. Feature Inventory & Test Matrices Mapping

The 7 comprehensive test suites map directly to project requirements and features:

| Matrix # | Test Suite File | Feature IDs | Focus Area | Description |
|---|---|---|---|---|
| **Matrix 1** | `tests/auth-signup.test.ts` | F1, F2 | Sign-Up Flow | Valid email/password registration, password complexity ($\ge 6$ chars), duplicate email collisions, username collisions, rate limiting (5/hr), upstream provider outage handling. |
| **Matrix 2** | `tests/auth-signin.test.ts` | F1, F6 | Sign-In Flow | Valid credentials sign-in, invalid password handling, anti-enumeration identical error for non-existent users, unverified email handling, empty field validation, sign-in brute-force throttling (10/15min). |
| **Matrix 3** | `tests/auth-email-verification.test.ts` | F2 | 6-Digit Verification Code | Plain 6-digit numeric OTP verification, **strict NO LINK constraint** (ensures no confirmation URLs or magic links), invalid OTP, expired OTP, non-numeric formatting, resend flow, rate limiting (10 tries/hr). |
| **Matrix 4** | `tests/auth-password-reset.test.ts` | F3 | 3-Step Password Reset | Step 1 (Request code with anti-enumeration), Step 2 (Verify code & issue reset token), Step 3 (Set new password $\ge 6$ chars & revoke old sessions), expired/invalid codes, unauthorized update attempts. |
| **Matrix 5** | `tests/auth-session-web.test.ts` | F4 | Web Cookie Session | `quiz_session` cookie attributes (`httpOnly: true`, `secure: true`, `sameSite: 'lax'`, `maxAge: 604800` [7 days]), HMAC-SHA256 signature verification via `timingSafeEqual`, tamper detection, expiration enforcement, sign-out deletion, JavaScript inaccessibility (`httpOnly` guard). |
| **Matrix 6** | `tests/auth-session-mobile.test.ts` | F5 | Mobile Session & DB | 30-day Bearer token generation (`${id}.${exp}.${mac}`), API Bearer authorization, local SQLite storage adapter mock, HTTP 401 handling (token dropped, local offline queue retained), queue drop on account switch, explicit sign-out. |
| **Matrix 7** | `tests/auth-routing-protection.test.ts` | F7 | Route Protection & Redirection | Unauthenticated access to `/profile` and `/admin/*` redirects to `/signin?redirect=${path}`, authenticated access granted to `/profile`, authenticated non-admin access to `/admin` returns HTTP 403 (`<AdminDenied />`), public guest routes remain open, post-login redirect preservation. |

---

## 4. Test Tiers Structure (Tiers 1–4)

Each test suite organizes scenarios into 4 distinct verification tiers:

### 4.1 Tier 1: Smoke & Happy Path
Validates foundational end-to-end user journeys under normal, valid operational conditions:
- User registers account with email and password.
- User signs in with valid credentials and establishes session.
- User verifies valid 6-digit OTP code and activates account.
- User completes 3-step password recovery and signs in with new password.
- Web browser receives signed `quiz_session` cookie and authenticates requests.
- Mobile client receives 30-day Bearer token and authenticates API requests.
- Protected routes allow authenticated requests through.

### 4.2 Tier 2: Edge Cases & Input Validation
Validates input sanitization, boundaries, and formatting anomalies:
- Passwords shorter than 6 characters rejected before upstream dispatch.
- Malformed email strings (missing `@`, spaces, invalid domains) rejected immediately.
- Codes with whitespace or hyphens (`123-456`) sanitized to clean 6 digits.
- Codes containing non-numeric characters (`ABC123`) or wrong length (`123`, `1234567`) rejected.
- Case-insensitivity in email addresses (`User@Test.Co` vs `user@test.co`) normalized.
- Expired tokens and session timestamps correctly treated as invalid.

### 4.3 Tier 3: Security & Anti-Abuse (Adversarial Gating)
Validates system defenses against enumeration, brute force, tampering, and information leaks:
- **Anti-Enumeration**: Sign-in, OTP request, and password reset requests return identical generic responses for both registered and non-existent emails, preventing user harvesting.
- **HMAC Tamper Resistance**: Modifying any part of the cookie or mobile token (`id`, `exp`, `mac`) fails verification via `crypto.timingSafeEqual`.
- **Timing Side-Channel Defense**: Signature verification uses constant-time comparison buffers.
- **Strict NO LINK Gating**: Assertion guarantees email dispatch contains plain text 6-digit OTP code and NO confirmation link, URL token, or callback redirect.
- **Brute-Force Throttling**: Rate limiting blocks OTP guessing (> 10 attempts/hr) and sign-in brute force (> 10 attempts/15 min).
- **XSS Mitigation**: Web session cookies enforce `httpOnly: true` preventing DOM script access.
- **Mobile Cross-Account Isolation**: Switching accounts in mobile storage purges prior account's offline SQLite answer queue.

### 4.4 Tier 4: Error Handling & Resilience
Validates behavior during service degradations and unexpected failures:
- Upstream Supabase outages return clean error objects without uncaught exceptions or stack trace leaks.
- Missing server secret keys (`SUPABASE_SECRET_KEY`) fail gracefully with 500 error without exposing secrets.
- Malformed HTTP bodies or non-JSON payloads handled gracefully.
- Rate limiter fails open gracefully during transient database connectivity failures to prevent widespread user lockout.
- Unauthenticated vs. Unauthorized distinction: 401 unauthenticated redirects to `/signin`; 403 unauthorized renders `<AdminDenied />`.

---

## 5. Pass / Fail Semantics

1. **Exit Code**: Test suites must exit with code 0. Any assertion failure, unhandled rejection, or unhandled exception results in test failure.
2. **Determinism**: All network boundaries, external APIs, and Supabase client calls are fully mocked in unit/integration test suites to guarantee 100% deterministic, offline execution.
3. **Isolation**: Every test block (`it`) executes in an isolated scope. `beforeEach` hooks clear mocks, reset timers, and wipe in-memory cookie/database stores.
4. **Coverage Ratchet**: Newly added code must satisfy project test coverage requirements ($\ge 80\%$ on changed lines).
