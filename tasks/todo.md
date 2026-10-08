# Tasks: Security Posture Reconciliation

> Plan: [plan.md](./plan.md)
> Rules: one task per commit on `company/update-code`; verify in an ext4 scratch copy (`npm ci` hangs on NTFS); never touch `main`.

---

## Phase 1: Make the record true

### Task 1: Bump `next` to 16.4.0
**Description:** Fix the high `next` advisory (image optimizer SSRF, ISR cache poisoning).
**Acceptance criteria:**
- [x] `next` and `eslint-config-next` at 16.4.0 in `package.json` + lockfile (`21ed567`)
- [x] `npm audit --omit=dev` shows no `next` finding
**Verification:**
- [x] `npm run type-check && npm run lint` pass; build passes on 16.4.0
- [x] Tests: see Task 1b (7 stale tests blocked `test:coverage`, unrelated to the bump)
- [x] First-load JS did not grow (459 kB vs 469 kB, same ad-hoc method). The 150 kB budget cannot be verified until the repo has a bundle check; absolute numbers do not match the 127 kB in `CONSTRAINTS.md`.
**Dependencies:** None
**Files:** `package.json`, `package-lock.json`
**Scope:** XS

### Task 1b: Repair stale tests so `test:coverage` is green
**Description:** 7 tests failed on `next` 16.3.6 and 16.4.0 alike because their expectations lagged the source: leaderboard actions now pass `p_offset` to the RPC, and `createQuestion`/`disputeQuestion` return a `{ success, error: { code, message } }` / `{ success, data }` envelope.
**Acceptance criteria:**
- [x] `tests/leaderboard-actions.test.ts` expects `p_offset: 0`
- [x] `tests/answer-and-list-guards.test.ts` expects the envelope shapes; source unchanged
**Verification:**
- [x] `npm run test:coverage`: 31 files, 302 tests pass; lines 62.63% (ratchet 62.5%)
**Dependencies:** Task 1
**Files:** `tests/leaderboard-actions.test.ts`, `tests/answer-and-list-guards.test.ts`
**Scope:** XS
**Known, not fixed:** `components/modals/__tests__/RewardsTokensTab.test.tsx` has 2 failing cases (duplicate "1000 TKN" text). It lives outside `npm test` (`tests/` only), so it is not gated; `npm run test` does not run it.

### Task 2: Verify `ws` fix path and re-triage W1
**Description:** F2/F6. Check whether patched `ws` (>8.20.1) exists and whether an `overrides` entry is compatible with `@reown/appkit*` / `@walletconnect/utils`. If yes, add override and delete W1; if no, refresh W1 reason text and expiry rationale. Never loosen `CONSTRAINTS.md` to pass.
**Acceptance criteria:**
- [x] Decision: override applied (`overrides.viem.ws = 8.21.0`); W1 removed. Root cause was `viem@2.23.2` (under `@walletconnect/utils`) pinning `ws` to exactly 8.18.0. Also cleared two unrelated highs the audit now shows: `sharp` 0.35.5, `source-map-js` 1.2.2 (lockfile bump, in range).
- [x] `npm run check:deps` passes (0 high, 21 moderate)
- [x] CI audit step no longer swallows failures (`|| echo ::warning::` removed from `ci.yml`)
**Verification:**
- [x] `npm audit --omit=dev` output matches the decision
- [x] `npm run build` and `npm run test:coverage` (302 pass) on the new tree
- [ ] Wallet connect smoke on preview (needs deploy; do before merging toward `main`)
**Dependencies:** Task 1
**Files:** `package.json`, `package-lock.json`, `CONSTRAINTS.md`, `.github/workflows/ci.yml`
**Scope:** S

### Task 3: Verify contest claim flow; correct §4.C and ADR-003
**Description:** F1. Read `claimListReward` end to end (`question-list-actions.ts:868` onward), `ContestEscrow.sol`, and `reward-actions.ts`. Confirm creator funds are escrowed before a voucher can be signed and the self-drain path from ADR-003 is closed. Then fix the doc/ADR status. If the flow is NOT safe, stop and report before editing docs.
**Acceptance criteria:**
- [x] Written finding: `docs/decisions/006-contest-escrow-payouts.md` (escrow gate in `startContest`, bounded amounts, contract-level checks, unique-index voucher dedupe). Flow is safe. Residuals: signer key trust root, Sybil dilution, `claimListReward` signs when the on-chain read returns null (fail-closed follow-up, not done here), contract unaudited.
- [x] ADR-003 annotated as superseded in part; new ADR-006; §4.C and ADR list in `SECURITY-TRADE-OFFS.md` and `docs/specs/contest-escrow.md` updated
**Verification:**
- [x] Existing `claimListReward` tests pass: `npx vitest run tests/answer-and-list-guards.test.ts -t claim` (7 pass)
- [x] Manual: no remaining "payouts are paused" text in docs unless true
**Dependencies:** None
**Files:** `SECURITY-TRADE-OFFS.md`, `docs/decisions/003-*.md`, possibly new `docs/decisions/006-*.md`
**Scope:** S

### Checkpoint: Phase 1
- [ ] `npm run check:task` and `npm run check:deps` green
- [ ] Push to `preview` only if asked; CI green before anything else

---

## Phase 2: Close real gaps

### Task 4: Rate-limit auth actions
**Description:** F3. Add per-identifier attempt limits to `requestEmailCode`, `verifyEmailCode`, `signInWithUsername`, `signUpWithUsername`, and `getAuthNonce`/`signInWithWallet` using the existing windowed-count pattern (see `community-actions.ts:126`). Return a `RATE_LIMITED` result, no raw DB errors.
**Acceptance criteria:**
- [x] Email code request: 5 per email per hour plus 20 per IP per hour; verify: 10 per email per hour
- [x] Username sign-in: 10 attempts (not only failures, one counter) per username per 15 min; sign-up: 5 per username and 10 per IP per hour; wallet sign-in and link: 30 per IP per 10 min (nonce issuing is cookie-only and costs nothing, so it is not limited)
- [x] Stored via the admin client in `auth_attempts` with an atomic `rate_limit_hit` SQL function (`supabase/migrations/17-auth-rate-limit.sql`); no new dependency
- [x] Limit hits logged server-side (`auth_rate_limited`); generic message to client
**Verification:**
- [x] `tests/auth-rate-limit.test.ts` (13 tests). Window expiry and purge are SQL-side: verified against postgres:16 in Docker (allow, block at limit, blocked attempt not recorded, reset after window, day-old purge, `anon` denied, re-run idempotent)
- [x] type-check, lint, `test:coverage` pass (318 tests, 63.01%); `rate-limit.ts` 94%, `auth-actions.ts` 82%
- [ ] **Deploy step:** run `17-auth-rate-limit.sql` in the Supabase SQL editor before or with the deploy. Until then the limiter fails open (logs `rate_limit_check_failed`).
**Dependencies:** None
**Files:** `lib/actions/auth-actions.ts`, a shared helper in `lib/` (reuse existing if one exists), `supabase/` migration only if a table/index is required, `tests/`
**Scope:** M

### Task 5: CSP report-only
**Description:** F4. Add `Content-Security-Policy-Report-Only` in `next.config.js` covering `default-src 'self'`, script/style (Next inline needs), `connect-src` for Supabase, RPC, WalletConnect/Reown relays, `img-src`, `frame-src` for wallet modals, `frame-ancestors 'none'` kept. Collect violations on preview.
**Acceptance criteria:**
- [ ] Header present on all routes; existing headers unchanged
- [ ] Violation endpoint or browser-console review documented
**Verification:**
- [ ] `npm run build`; `curl -I` on preview shows header
- [ ] Wallet, email and username sign-in exercised on preview; list of violations triaged
**Dependencies:** Task 1
**Files:** `next.config.js`, possibly `app/` report route
**Scope:** S

### Task 6: Enforce CSP
**Description:** Promote the tuned policy from report-only to enforcing after clean preview run.
**Acceptance criteria:**
- [ ] `Content-Security-Policy` carries the full policy; no first-party breakage
**Verification:**
- [ ] `npm run check:a11y` and `check:perf` on preview; e2e sign-in flow passes
**Dependencies:** Task 5 + a clean preview observation period
**Files:** `next.config.js`
**Scope:** XS

### Checkpoint: Phase 2
- [ ] Preview full sign-in paths work; no CSP violations from first-party code
- [ ] Review with human before Phase 3

---

## Phase 3: Rewrite the doc

### Task 7: Update `SECURITY-TRADE-OFFS.md`
**Description:** Bring all sections to the post-Phase-2 truth: STRIDE rows for email/username auth (brute force, enumeration, code replay) and contest escrow; §2 add CSP and rate limits; §3 replace with Task 2 audit numbers and decision; §4 status per Task 3; refresh ADR list (add ADR-005, any new ADR).
**Acceptance criteria:**
- [ ] Each claim cites a file or command that confirms it
- [ ] Date stamp "as of" updated
**Verification:**
- [ ] Re-run `npm audit --omit=dev` and compare numbers
- [ ] grep every cited path exists
**Dependencies:** Tasks 2, 3, 4, 6
**Files:** `SECURITY-TRADE-OFFS.md`
**Scope:** XS

### Checkpoint: Complete
- [ ] `npm run check:full` green; CI green on `preview`
- [ ] Human review before any merge toward `main`

---

## Out of scope (tracked in prod-health plan)
Dockerfile build args, CD gating on CI, Node 24, PWA/service worker, `/api/health`, CI hygiene, contracts hardening and audit (T10), upstream-blocked majors (T11).
