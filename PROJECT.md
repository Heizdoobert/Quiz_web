# Project: Production-Ready Auth Improvement

## Architecture
The application is built on Next.js 16.4.0 (App Router primary) with React 19.3.0 and TypeScript 5.
Authentication is powered by Supabase Auth (`@supabase/supabase-js`, `@supabase/ssr`), with dual session architectures:
- **Web**: HTTP-only secure cookie (`quiz_session`) with HMAC-SHA256 signature (`crypto.timingSafeEqual`), 7-day TTL.
- **Mobile**: 30-day HMAC Bearer token (`lib/services/mobile-auth.ts`), stored in hardware secure storage (`flutter_secure_storage`), with offline answer queue in local SQLite database (`sqflite`). 401 response invalidates token while preserving local queue for same-account re-login.
- **Routing & Protection**: Edge middleware (`middleware.ts`) and layout guards inspect session cookies to protect `/profile` and `/admin/*`. Unauthenticated users are redirected to `/signin?redirect=${pathname}`. Authenticated users with insufficient permissions on `/admin` receive HTTP 403 (`<AdminDenied />`).
- **Email Verification**: Strictly numeric 6-digit OTP code delivered via email (NO magic links or confirmation URLs). Verified via Supabase `verifyOtp`.
- **Password Reset**: 3-step recovery flow (Request 6-digit code -> Verify code -> Set new password).

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F1 | Email/Password Sign-Up & Sign-In | Support real email/password sign-up and sign-in via Supabase Auth, bcrypt password hashing. | M1 | ORIGINAL_REQUEST.md (R1) |
| F2 | 6-Digit Email Verification Code | Plain 6-digit numeric OTP verification via email with NO confirmation links. Rate limited against brute-force (10 tries/hr). | M1 | ORIGINAL_REQUEST.md |
| F3 | 3-Step Password Reset Flow | Request 6-digit recovery code, verify code, and update password with session revocation. Anti-enumeration protection. | M1 | ORIGINAL_REQUEST.md |
| F4 | Web HTTP-Only Cookie Session | HMAC-SHA256 signed `quiz_session` cookie (`httpOnly: true`, `secure: true`, `sameSite: 'lax'`, 7-day TTL). | M1 | ORIGINAL_REQUEST.md |
| F5 | Mobile Session & Local DB Handling | 30-day Bearer token via `/api/mobile/v1/auth/*`, verified in `api-auth`, local SQLite queue retention on 401, account switch drop logic. | M1 | ORIGINAL_REQUEST.md, SPEC-flutter-mobile.md |
| F6 | Dedicated Sign-In Route | Standalone `/signin` page supporting email/password, OTP, password reset tab/modal, and return URL redirect. | M2 | ORIGINAL_REQUEST.md (R2) |
| F7 | Protected Page Redirection (R2) | Middleware route protection redirecting unauthenticated users accessing `/profile` and `/admin/*` to `/signin?redirect=${path}`. | M2 | ORIGINAL_REQUEST.md (R2) |
| F8 | Comprehensive Test Suite (Tiers 1-4) | Opaque-box Vitest & Playwright test suites covering all 7 test matrices and 4 test tiers. | E2E Testing Track | ORIGINAL_REQUEST.md (Verification) |
| F9 | Final E2E Pass & Adversarial Hardening | Pass 100% of Tiers 1-4 E2E tests, followed by Tier 5 white-box adversarial coverage hardening. | M3 (Final) | Dual Track Protocol |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| E2E | E2E Testing Suite Track | Design test runner and Vitest suites for Tiers 1-4 covering all 7 matrices; publish `TEST_READY.md`. | none (parallel) | DONE |
| M1 | Backend Auth Engine & Password Reset | Supabase email/password auth, 6-digit OTP verification (no link), 3-step password reset, rate limits, session tokens. | none | DONE |
| M2 | Sign-In Route & Protected Page Redirection | Standalone `/signin` page, middleware protection for `/profile` and `/admin/*`, redirect preservation, R2 compliance. | M1 interface contracts | PLANNED |
| M3 | Final Verification & Hardening | Phase 1: Pass 100% of E2E test suite (Tiers 1-4). Phase 2: Tier 5 adversarial coverage hardening. | E2E (`TEST_READY.md`), M1, M2 | PLANNED |

## Interface Contracts

### M1: Auth Service Functions & Actions
```ts
// lib/services/credentials.ts & lib/actions/auth-actions.ts
export type AuthResult = { ok: true; account?: { id: string } } | { ok: false; error: string };

// Sign up / sign in with email & password
export async function signUpWithEmail(email: string, password: string, displayName?: string): Promise<AuthResult & { requiresVerification?: boolean }>;
export async function signInWithEmail(email: string, password: string): Promise<AuthResult>;

// 6-digit verification code (strictly NO link)
export async function requestVerificationCode(email: string): Promise<{ sent: boolean; error?: string }>;
export async function verifyVerificationCode(email: string, code: string): Promise<AuthResult>;

// 3-step password reset
export async function requestPasswordReset(email: string): Promise<{ sent: boolean; error?: string }>;
export async function verifyPasswordResetCode(email: string, code: string): Promise<{ ok: boolean; resetToken?: string; error?: string }>;
export async function updatePasswordWithReset(email: string, resetToken: string, newPassword: string): Promise<AuthResult>;
```

### M1 ↔ M2: Session & Route Protection Contract
```ts
// lib/services/session.ts
export async function getSessionAccount(): Promise<SessionAccount | null>;
export async function setSessionAccount(account: SessionAccount): Promise<void>;
export async function clearSessionAccount(): Promise<void>;

// middleware.ts
// Protected route matcher: ['/profile/:path*', '/admin/:path*']
// If getSessionAccount() or valid 'quiz_session' cookie is absent:
// Redirect with HTTP 307 to: /signin?redirect=${encodeURIComponent(pathname + search)}
// For /admin/*, if authenticated but user lacks admin role:
// Continue to server component, where authorize() renders HTTP 403 <AdminDenied />
```

## Code Layout
- Backend Auth Services: `lib/services/credentials.ts`, `lib/services/session.ts`, `lib/services/password-reset.ts`, `lib/services/rate-limit.ts`
- Server Actions: `lib/actions/auth-actions.ts`
- API Handlers: `app/api/v1/auth/*`, `app/api/mobile/v1/auth/*`
- Middleware: `middleware.ts`
- Web UI Routes & Components: `app/signin/page.tsx`, `components/auth/*`, `app/profile/page.tsx`, `app/admin/*`
- Test Suites: `tests/auth-*.test.ts`, `e2e/auth.spec.ts`
- Constraints: Line count <= 200 per UI component, zero type errors, zero lint errors, no secrets, coverage ratchets maintained per `CONSTRAINTS.md`.
