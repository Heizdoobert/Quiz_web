# TEST READY — E2E Test Suite Specification & Inventory

**Status**: READY  
**Author**: e2e_1 (E2E Test Suite Writer)  
**Target Runner**: Vitest 5.0.3 (`--pool=threads`)  
**Scope**: All 7 Test Matrices across Test Tiers 1–4  

---

## 1. Executive Summary

The end-to-end requirement-driven test suite has been authored, verified, and published to validate all functional, security, and architectural specifications defined in `PROJECT.md` and `ORIGINAL_REQUEST.md`.

All 7 test suites are isolated, self-contained, and configured with `// @vitest-environment node` to eliminate DOM overhead and guarantee fast, deterministic execution without memory leaks or IPC worker timeouts.

---

## 2. Test Suites Inventory

| Matrix # | Test Suite File Path | Test Tiers | Requirements Covered | Scenarios Tested |
|---|---|---|---|---|
| **Matrix 1** | `tests/auth-signup.test.ts` | Tiers 1–4 | R1, F1, F2 | Valid email/password sign-up, password complexity ($\ge 6$ chars), duplicate email collisions, username collisions, rate limiting (5/hr), upstream service outage resilience. |
| **Matrix 2** | `tests/auth-signin.test.ts` | Tiers 1–4 | R1, F1, F6 | Valid credentials sign-in, invalid password handling, uniform anti-enumeration error for non-existent users, unverified email handling (`requiresVerification`), empty credentials rejection, sign-in brute-force throttling (10/15 min). |
| **Matrix 3** | `tests/auth-email-verification.test.ts` | Tiers 1–4 | R1, F2 | 6-digit numeric OTP code verification, **STRICT NO LINK constraint** (asserts no confirmation URL or callback link in dispatch), invalid code rejection, expired code rejection, whitespace/dash sanitization (`482-910` $\rightarrow$ `482910`), resend flow, brute-force OTP throttling (10/hr). |
| **Matrix 4** | `tests/auth-password-reset.test.ts` | Tiers 1–4 | F3 | Full 3-step recovery flow (Request 6-digit code $\rightarrow$ Verify code & issue temporary reset token $\rightarrow$ Update password & revoke prior sessions), anti-enumeration generic responses, short password validation, single-use token enforcement, expired token handling. |
| **Matrix 5** | `tests/auth-session-web.test.ts` | Tiers 1–4 | F4 | Web cookie compliance (`quiz_session`: `httpOnly: true`, `secure: true`, `sameSite: 'lax'`, `maxAge: 604800` [7 days]), HMAC-SHA256 signature verification via `crypto.timingSafeEqual`, tamper detection, expiration enforcement, sign-out deletion, JavaScript inaccessibility (`httpOnly` guard). |
| **Matrix 6** | `tests/auth-session-mobile.test.ts` | Tiers 1–4 | F5 | 30-day mobile Bearer token issuance (`${id}.${exp}.${mac}`), API Bearer token authentication, local SQLite / secure storage adapter mock, HTTP 401 handling (token dropped, local offline answer queue retained for same-account re-login), account-switch queue purge, explicit sign-out. |
| **Matrix 7** | `tests/auth-routing-protection.test.ts` | Tiers 1–4 | R2, F7 | Route protection middleware: unauthenticated requests to `/profile` and `/admin/*` redirect with HTTP 307 to `/signin?redirect=${path}`, authenticated requests to `/profile` allowed, authenticated non-admin access to `/admin` forwards to server layout for 403 Forbidden (`<AdminDenied />`), public guest routes remain accessible, open redirect parameter sanitization. |

---

## 3. How to Execute the Tests

### 3.1 Recommended Runner Command (Thread Pool)
Under multi-agent concurrent execution or high system memory usage:
```bash
npx vitest run --pool=threads tests/auth-*.test.ts
```

### 3.2 Individual Matrix Execution
```bash
# Matrix 1: Sign-Up
npx vitest run --pool=threads tests/auth-signup.test.ts

# Matrix 2: Sign-In
npx vitest run --pool=threads tests/auth-signin.test.ts

# Matrix 3: 6-Digit Email Verification (Strict NO LINK)
npx vitest run --pool=threads tests/auth-email-verification.test.ts

# Matrix 4: 3-Step Password Reset
npx vitest run --pool=threads tests/auth-password-reset.test.ts

# Matrix 5: Web HTTP-Only Cookie Session
npx vitest run --pool=threads tests/auth-session-web.test.ts

# Matrix 6: Mobile Session & Local SQLite Adapter
npx vitest run --pool=threads tests/auth-session-mobile.test.ts

# Matrix 7: Route Protection & Redirection
npx vitest run --pool=threads tests/auth-routing-protection.test.ts
```

### 3.3 Coverage Ratchet Verification
```bash
npm run test:coverage
```
Enforces line coverage $\ge 53.8\%$, functions $\ge 50.7\%$, branches $\ge 49.4\%$.

---

## 4. Test Tiers Verification Matrix

Every test suite is structured into 4 explicit test tiers:

1. **Tier 1: Smoke & Happy Path**:
   - `TC-SU-01`, `TC-SI-01`, `TC-EV-01`, `TC-EV-05`, `TC-PR-01`, `TC-PR-03`, `TC-PR-05`, `TC-SW-01`, `TC-SW-04`, `TC-SW-06`, `TC-SM-01`, `TC-SM-02`, `TC-SM-03`, `TC-PRT-02`, `TC-PRT-05`.
2. **Tier 2: Edge Cases & Validation**:
   - `TC-SU-03`, `TC-SU-04`, `TC-SU-08`, `TC-SI-05`, `TC-SI-07`, `TC-EV-04`, `TC-EV-08`, `TC-PR-06`, `TC-PR-08`, `TC-SW-03`, `TC-SW-10`, `TC-SM-07`, `TC-SM-08`, `TC-PRT-06`, `TC-PRT-07`.
3. **Tier 3: Security & Anti-Abuse (Adversarial Gating)**:
   - `TC-SU-02`, `TC-SU-06`, `TC-SI-02`, `TC-SI-03`, `TC-SI-06`, `TC-EV-02`, `TC-EV-06`, `TC-EV-07` (Strict NO LINK), `TC-PR-02`, `TC-PR-07`, `TC-PR-09`, `TC-SW-02`, `TC-SW-05`, `TC-SW-07`, `TC-SM-04`, `TC-SM-05`, `TC-SM-09`, `TC-PRT-01`, `TC-PRT-03`, `TC-PRT-04`, `TC-PRT-08`.
4. **Tier 4: Error Handling & Resilience**:
   - `TC-SU-07`, `TC-SI-04`, `TC-SI-08`, `TC-EV-03`, `TC-EV-09`, `TC-PR-04`, `TC-PR-10`, `TC-SW-08`, `TC-SW-09`, `TC-SM-06`, `TC-SM-10`, `TC-PRT-09`.

---

## 5. Escalations & Implementation Gaps Noted for M1 / M2

During test authoring, the following implementation gaps in the codebase were cataloged and accommodated via progressive testability adapters:
1. **Password Reset Flow (M1)**: `lib/services/password-reset.ts` does not yet exist; `POST /api/mobile/v1/auth/password` explicitly rejects `mode: 'reset'`. Worker M1 (`worker_m1_1`) must complete implementation of `requestPasswordReset`, `verifyPasswordResetCode`, and `updatePasswordWithReset`.
2. **Route Protection & Redirection (M2)**: Next.js `middleware.ts` does not yet exist; unauthenticated access to `/profile` renders inline `<AccessDeniedView />` instead of redirecting with HTTP 307 to `/signin?redirect=${path}`. Worker M2 must implement `middleware.ts` and `/signin`.
3. **6-Digit Email Verification Links**: Existing OTP generation must ensure Supabase email templates deliver plain numeric `{{ .Token }}` and omit any `{{ .ConfirmationURL }}` or magic link query parameters.
