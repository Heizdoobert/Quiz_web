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
- [x] Written finding: `docs/decisions/007-contest-escrow-payouts.md` (escrow gate in `startContest`, bounded amounts, contract-level checks, unique-index voucher dedupe). Flow is safe. Residuals: signer key trust root, Sybil dilution, `claimListReward` signs when the on-chain read returns null (fail-closed follow-up, not done here), contract unaudited.
- [x] ADR-003 annotated as superseded in part; new ADR-007; §4.C and ADR list in `SECURITY-TRADE-OFFS.md` and `docs/specs/contest-escrow.md` updated
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
**Description:** F4. Add `Content-Security-Policy-Report-Only` in `next.config.mjs` covering `default-src 'self'`, script/style (Next inline needs), `connect-src` for Supabase, RPC, WalletConnect/Reown relays, `img-src`, `frame-src` for wallet modals, `frame-ancestors 'none'` kept. Collect violations on preview.
**Acceptance criteria:**
- [x] `Content-Security-Policy-Report-Only` on `/:path*`; existing headers (including enforcing `frame-ancestors 'none'`) unchanged. Policy: `next.config.mjs`. `script-src` keeps `'unsafe-inline'` for Next's hydration scripts (nonces are a later upgrade); `connect-src` lists Supabase (from `NEXT_PUBLIC_SUPABASE_URL` at build), WalletConnect/Reown/Coinbase/MetaMask hosts and viem's default RPCs.
- [x] Violations POST to `app/api/csp-report/route.ts` (204, 8 kB cap) and appear in the server log as `csp_violation`; also visible in the browser console
**Verification:**
- [x] `npm run build` passes; `curl -I` against a local `next start` shows both headers; report endpoint answers 204. `tests/security-headers.test.ts` (5 tests)
- [ ] `curl -I` on the preview deploy
- [ ] Wallet, email and username sign-in exercised on preview; list of `csp_violation` log lines triaged and the policy adjusted (needs a deploy; not possible from this session)
**Dependencies:** Task 1
**Files:** `next.config.mjs`, possibly `app/` report route
**Scope:** S

### Task 6: Enforce CSP
**Description:** Promote the tuned policy from report-only to enforcing after clean preview run.
**Acceptance criteria:**
- [ ] `Content-Security-Policy` carries the full policy; no first-party breakage
**Verification:**
- [ ] `npm run check:a11y` and `check:perf` on preview; e2e sign-in flow passes
**Dependencies:** Task 5 + a clean preview observation period
**Files:** `next.config.mjs`
**Scope:** XS
**Status:** BLOCKED, not started. Needs the preview deploy plus an observation period with real wallet, email and username sign-ins, then a read of the `csp_violation` log lines. Enforcing a guessed policy risks breaking wallet connect in production.

### Checkpoint: Phase 2
- [ ] Preview full sign-in paths work; no CSP violations from first-party code
- [ ] Review with human before Phase 3

---

## Phase 3: Rewrite the doc

### Task 7: Update `SECURITY-TRADE-OFFS.md`
**Description:** Bring all sections to the post-Phase-2 truth: STRIDE rows for email/username auth (brute force, enumeration, code replay) and contest escrow; §2 add CSP and rate limits; §3 replace with Task 2 audit numbers and decision; §4 status per Task 3; refresh ADR list (add ADR-005, any new ADR).
**Acceptance criteria:**
- [x] Each claim cites a file or command that confirms it (every cited path and identifier grep-checked)
- [x] Date stamp "as of" updated (2026-10-08); CSP and the rate-limit migration are marked pending where they are
**Verification:**
- [x] `npm audit --omit=dev`: 21 moderate, 0 high, matches section 3
- [x] every cited path exists
**Dependencies:** Tasks 2, 3, 4, 6
**Note:** written with CSP still report-only (Task 6 blocked); update section 2 when it is enforced.
**Files:** `SECURITY-TRADE-OFFS.md`
**Scope:** XS

### Checkpoint: Complete
- [ ] `npm run check:full` green; CI green on `preview`
- [ ] Human review before any merge toward `main`

---

# Part 2: Audit backlog (2026-10-08)

> Source: [`audit-report.md`](./audit-report.md); evidence rows in [`tasks/audit/`](./audit/). Finding ids (S2-01 and so on) point at those rows.
> Same rules as Part 1: one task per commit on `company/update-code`, verify in the ext4 scratch copy, never touch `main`. Fix bugs test-first (write the failing test, then the fix).
> Most findings were not re-checked by the main thread. The first step of each task is to re-read the cited code and stop if the finding is wrong.

## Phase A: Fail closed and keep answers secret (P0)

### Task A1: Fail closed in `isContestVoucherUsed`
**Description:** S3-01, S4-03. A bare `catch` returns `false`, so an RPC blip lets `claimListReward` expire an already-redeemed voucher and sign a second one.
**Acceptance criteria:**
- [x] `isContestVoucherUsed` throws on RPC error (keep the zero-address escape hatch)
- [x] `claimListReward` returns a retryable error instead of expiring or re-signing when the check throws (it already sits in a `try/catch`, so it answers "Failed to claim contest reward."; `confirmRewardClaim` also catches and returns `{ success: false }`)
**Verification:**
- [x] `tests/chain-utils.test.ts`: the old test asserted that a failed read counts as "unused"; it now asserts the call rejects (failed before the fix: `promise resolved "false" instead of rejecting`)
- [x] `tests/answer-and-list-guards.test.ts`: voucher check throws, deadline passed, no new insert and no update. This one passes with or without the fix because `claimListReward` never caught that call; it pins the contract for callers.
- [x] type-check, lint, architecture pass; `test:coverage`: 347 tests, lines 66.34% (ratchet 65.5%)
**Dependencies:** None
**Files:** `lib/utils/chain.ts`, `lib/actions/question-list-actions.ts`, `tests/answer-and-list-guards.test.ts`
**Scope:** S

### Task A2: Gate `get5050EliminatedIndices`
**Description:** S2-01. The action has no session, status or contest check, so any caller learns two wrong options for any question, including contest ones.
**Acceptance criteria:**
- [x] Only `verified` questions without a `list_id` are served; everything else returns `[]`. Changed from the draft ("contest questions need an `in_progress` entry"): the only caller is the main quiz (`use-quiz-logic.ts`), the contest player has no 50/50, so no entry gate was built.
- [x] A malformed question id is answered with `[]` before any database read (`isUuid`)
- [ ] Guests still get the 50/50 on verified questions. That leaks nothing new while `submitAnswer` shows guests the answer (Task A3 decides that policy).
**Verification:**
- [x] Tests in `tests/answer-and-list-guards.test.ts`: pending, quarantined and contest questions, and a malformed id, failed before the fix (`expected [ +0, 2 ] to deeply equal []`); verified question still returns two wrong options
- [x] type-check, lint, architecture pass; `test:coverage`: 351 tests, lines 66.35% (ratchet 65.5%)
**Dependencies:** None
**Files:** `lib/actions/question-actions.ts`, `tests/question-actions.test.ts`
**Scope:** S

### Task A3: Limit guest answer harvesting
**Description:** S2-02, S4-01. `submitAnswer` shows the correct answer to guests with no rate limit, so a script can read the whole key. **Needs your decision first:** the guest reveal is intended (`docs/specs/trivia-guest-access.md`). Default: keep the guest reveal, add a per-IP limit through `rate_limit_hit`, and reveal nothing for questions the account has not yet answered when signed in.
**Acceptance criteria:**
- [x] Decision recorded (reveal policy and limit values) in the spec and `SECURITY-TRADE-OFFS.md` (default taken: keep guest reveal, 120 answers per IP per hour; the line "reveal nothing for unanswered questions when signed in" was dropped, it describes no real flow)
- [x] Per-IP limit on `submitAnswer`, `'rate-limited'` result (not `RATE_LIMITED`: the result type has `notSavedReason`, not error codes), `isUuid` check on the id
**Verification:**
- [x] Tests for the limit and the unchanged signed-in scoring path
**Dependencies:** A2 (shared limiter pattern), your decision
**Files:** `lib/actions/quiz-actions.ts`, `lib/services/rate-limit.ts`, a migration only if the limiter needs a new action key, `tests/`
**Scope:** M

### Task A4: Gate CD on CI
**Description:** S8-01, S2-13. `cd.yml` runs on push and does not wait for CI. The ruleset has no required status checks (S8-02); adding them is **yours** to do in GitHub.
**Acceptance criteria:**
- [x] `ci.yml` exposes `workflow_call`; `cd.yml` runs it first and every deploy job `needs` it (or CD triggers from a successful `workflow_run` on the same sha). Done with `workflow_call`; a manual rollback (`rollback_sha` set) skips the gate
- [x] One aggregate "CI gate" job, so the ruleset needs a single required check
**Verification:**
- [ ] (not run: needs a push, left to you) Push a deliberately red commit to a scratch branch: CD does not run. Revert.
**Dependencies:** None
**Files:** `.github/workflows/ci.yml`, `.github/workflows/cd.yml`
**Scope:** M

### Task A5: Real `NEXT_PUBLIC_*` in the production image
**Dropped 2026-10-09:** production runs on Vercel (answer to D1), not the GHCR image, so the placeholders in `Dockerfile` never reach users. Vercel builds with the values set in its own Production environment. What is left is a check that only you can make: see "A5 replacement" below. The GHCR image still ships placeholders and `cd.yml` tags it `latest` on `main`; that is for you to decide (keep, relabel or remove the container job).
**Description (original):** S3-02, S8-03. Placeholder addresses and chain 84532 are baked into the client bundle. **Only matters if production runs the GHCR image** (open question D1).
**Acceptance criteria:**
- [ ] `ARG NEXT_PUBLIC_*` in the builder stage, passed as `build-args` from the GitHub Environment in `cd.yml`
- [ ] A check that `.next/static` contains none of `0x1111`, `0x2222`, `0x3333`, `84532` unless the target is a testnet
**Verification:**
- [ ] Build with real values and grep the static output
**Dependencies:** your answer to D1
**Files:** `Dockerfile`, `.github/workflows/cd.yml`
**Scope:** M

### Task A5 replacement (yours): Vercel Production environment
- [ ] In Vercel, Production scope has real `NEXT_PUBLIC_CHAIN_ID`, `NEXT_PUBLIC_QUIZ_TOKEN_ADDRESS`, `NEXT_PUBLIC_QUIZ_BADGE_ADDRESS`, `NEXT_PUBLIC_CONTEST_ESCROW_ADDRESS`, `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `REWARD_SIGNER_PRIVATE_KEY` is not a `NEXT_PUBLIC_` variable
- [ ] The deployed site's JS has none of `0x1111`, `0x2222`, `0x3333`, `placeholder` (view source or `curl` a chunk and grep)

### Task A6 (yours): Apply migrations in Supabase
- [ ] `supabase/migrations/17-auth-rate-limit.sql` (until then the limiter fails open)
- [ ] `19-secure-ai-usage.sql` once `preview` is merged (Task D1)
- [ ] Confirm backups or point-in-time recovery are on (S8-11)

### Checkpoint: Phase A
- [ ] `npm run check:task` green; CI green on `preview`
- [ ] Review with human before Phase B

---

## Phase B: Correctness, tests, accessibility (P1)

### Task B1: Confirm and fix the toast re-render loop
**Description:** S4-02. `ToastProvider` builds a new context value each render (confirmed, `Toast.tsx:44`); whether `ContestPlay` loops on it is not confirmed.
**Acceptance criteria:**
- [x] A test that renders `ContestPlay` with a failing `startListAttempt` shows it is called once; fails before the fix if the loop is real
- [x] `ToastProvider` value memoized; effect deps stable
**Verification:**
- [x] `npm run test:coverage`
**Dependencies:** None
**Files:** `components/ui/Toast.tsx`, `components/lists/ContestPlay.tsx`, `tests/`
**Scope:** S

### Task B2: Show the send-code error in `EmailTab`
**Description:** S7-08 (confirmed). The `RATE_LIMITED` error is set but only rendered in step 2.
**Acceptance criteria:**
- [x] The step-1 form renders `error` with `role="alert"`
**Verification:**
- [x] Test: send-code returns `RATE_LIMITED`, the message is visible
**Dependencies:** None
**Files:** `components/auth/tabs/EmailTab.tsx`, `tests/`
**Scope:** XS

### Task B3: Modal focus management
**Description:** S7-01 (confirmed). Move focus in on open, trap Tab, restore focus on close; prefer native `<dialog>`/`inert` over a library.
**Acceptance criteria:**
- [x] Focus lands inside the dialog, Tab cycles within it, focus returns to the trigger on close
**Verification:**
- [x] Test for all three behaviours; keyboard pass on the Auth modal
**Dependencies:** None
**Files:** `components/Modal.tsx`, `tests/`
**Scope:** M

### Task B4: Labels, live regions and form errors
**Description:** S7-02, S7-04, S7-05, S7-09, S7-10. Toast live region and close-button name; `htmlFor` on labels; labels for placeholder-only inputs; `aria-invalid` and `aria-describedby` on forms; announce the answer result.
**Acceptance criteria:**
- [ ] Each listed control has an accessible name; toasts are in a live region; auth form errors are announced
**Verification:**
- [ ] Testing-library `getByLabelText` and `getByRole('alert')` tests; axe run when a URL exists
**Dependencies:** B2
**Files:** `components/ui/Toast.tsx`, `components/quiz/*`, `components/auth/tabs/*`, `components/community/*`
**Scope:** M (split by folder if it grows past 5 files)

### Task B5: Run the component tests in CI
**Description:** S5-01, S5-02, S1-02. Five component test files never run. Move them into `tests/` (move group L1-M1) or widen the script, and fix the two stale `RewardsTokensTab` cases (duplicate "1000 TKN" text; button now reads "Claim … $QUIZ").
**Acceptance criteria:**
- [x] `npm test` runs all 5 files, all pass
**Verification:**
- [x] `npm run test:coverage`; coverage ratchet not lower
**Dependencies:** None
**Files:** `package.json`, the five test files
**Scope:** S

### Task B6: Honest coverage
**Description:** S5-03, S5-04, S5-22. Add `coverage.include`, re-baseline, add `functions` and `branches` thresholds, refresh the numbers in `CONSTRAINTS.md`. The ratchet number will fall; record the real one and explain why in the commit.
**Acceptance criteria:**
- [x] `coverage.include` covers `app`, `lib`, `hooks`, `components`; thresholds set at the new baseline
**Verification:**
- [x] `npm run test:coverage` passes at the new thresholds
**Dependencies:** B5
**Files:** `vitest.config.ts`, `CONSTRAINTS.md`
**Scope:** S

### Task B7: Enforce the Floor rules that nothing enforces
**Description:** S4-11. Remove the empty `catch {}` in `lib/services/audio.ts` (log or comment why ignoring is safe) and add a lint rule so it cannot return.
**Acceptance criteria:**
- [ ] `no-empty` (with `allowEmptyCatch: false`) enabled; `npm run lint` passes
**Verification:**
- [ ] Reintroduce one empty catch locally: lint fails; remove it
**Dependencies:** None
**Files:** `lib/services/audio.ts`, `eslint.config.mjs`
**Scope:** S

### Task B8: Contest reward tests
**Description:** S5-05, S5-06, S5-07. `getContestId` is never tested; `claimListReward` has only the happy path; voucher signatures are asserted by interaction only.
**Acceptance criteria:**
- [ ] Known-vector test for `getContestId`; five `claimListReward` branch tests; `verifyTypedData` against a fixed test key
**Verification:**
- [ ] `npx vitest run tests/answer-and-list-guards.test.ts`
**Dependencies:** A1
**Files:** `tests/`
**Scope:** M

### Checkpoint: Phase B
- [ ] `npm run check:full` green; review with human

---

## Phase C: Performance (P1)

### Task C1: Make the bundle budget measurable
**Description:** S6-01, S6-02. Turbopack prints no size table, so the 150 kB gate is unmeasured and about 450 kB gzip today. Add a script that sums gzip of the scripts in each prerendered page and fails over the budget.
**Acceptance criteria:**
- [ ] `npm run check:bundle` prints per-route gzip and fails over the budget; in CI after the build
- [ ] `CONSTRAINTS.md` states the measured number and the method
**Verification:**
- [ ] The script reports about 450 kB for `/contest` today
**Dependencies:** None
**Files:** `scripts/`, `package.json`, `.github/workflows/ci.yml`, `CONSTRAINTS.md`
**Scope:** S
**Note:** the budget will fail at once. Land it as measured-only (warn) with a ratchet, and record the exception in `CONSTRAINTS.md`, until C2 lands.

### Task C2: Keep the wallet stack off non-wallet routes
**Description:** S6-03. `components/Providers.tsx` loads wagmi and RainbowKit on every route including the 404.
**Acceptance criteria:**
- [ ] Content-only routes do not load the wallet chunks; `ConnectButton` loads through `next/dynamic`
**Verification:**
- [ ] `npm run check:bundle` shows the drop; sign-in still works
**Dependencies:** C1
**Files:** `components/Providers.tsx`, `app/` layouts
**Scope:** M

### Task C3: `/topics` is frozen at build time
**Description:** S6-04. The page prerenders with empty data and never revalidates.
**Acceptance criteria:**
- [ ] `force-dynamic`, or `revalidate = 300` with a build that does not bake empty data
**Verification:**
- [ ] Build output shows the route as dynamic or revalidating
**Dependencies:** None
**Files:** `app/topics/page.tsx`
**Scope:** XS

### Task C4: Cache or index the global leaderboard
**Description:** S6-05. `get_global_leaderboard` aggregates all of `quiz_results` per call, on each home render, every 15 s per viewer, and after each answer.
**Acceptance criteria:**
- [ ] Short server-side cache (`unstable_cache` or a materialized view) with a stated staleness
**Verification:**
- [ ] `EXPLAIN` before and after on a seeded table
**Dependencies:** None
**Files:** `lib/actions/leaderboard-actions.ts`, a new migration if a view is used
**Scope:** M

### Checkpoint: Phase C
- [ ] Bundle number reported honestly; review with human

---

## Phase D: Delivery and operations (P1)

### Task D1: Merge `origin/preview` into this branch
**Description:** Section 5 of the report. Brings Sentry, PostHog and migration 19. Conflicts with the uncommitted `coco/out` edits, so commit or set those aside first, or merge in a throwaway worktree.
**Acceptance criteria:**
- [ ] Merge done, type-check, lint, tests and build green
**Verification:**
- [ ] `npm run check:task`
**Dependencies:** your `coco/out` edits dealt with
**Files:** merge
**Scope:** S

### Task D2: Migration ledger and rollback policy
**Description:** S8-08, S8-09. Migrations are pasted by hand with no record of what production has applied.
**Acceptance criteria:**
- [ ] Decision on Supabase CLI (`supabase db push`) or a documented manual ledger; forward-fix policy written down
**Verification:**
- [ ] A fresh database reaches the current schema from the documented steps
**Dependencies:** your decision on tooling
**Files:** `supabase/`, `README.md`
**Scope:** M

### Task D3: `/api/health`
**Description:** S8-06. Prod-health T8.
**Acceptance criteria:**
- [ ] Returns 200 only when Supabase is reachable; no secrets in the body
**Verification:**
- [ ] Test with a failing Supabase mock returns 503
**Dependencies:** None
**Files:** `app/api/health/route.ts`, `tests/`
**Scope:** S

### Checkpoint: Phase D
- [ ] CI green on `preview`; review with human

---

## Phase E: Docs, structure, dependencies (P2)

### Task E1: README and environment docs
**Description:** S9-01, S9-02, S9-05, S9-06, S8-17. Point setup at `supabase/migrations` in order (15 to 19), document every env var including `GEMINI_API_KEY`, remove the false "defaults" claim, add a deploy section.
**Acceptance criteria:**
- [ ] A new contributor can set up from the README; `.env.example` lists every var the code reads
**Verification:**
- [ ] Follow the README on a clean checkout
**Dependencies:** D1
**Files:** `README.md`, `.env.example`
**Scope:** S

### Task E2: Truth in `SECURITY-TRADE-OFFS.md` and `CHANGELOG.md`
**Description:** Section 4 of the report: fix 4.A, 4.B and the "writes require a session" row after A2 and A3 decide the behaviour; remove the pointer to `tasks/todo.md` (not on `main`); version 0.4.0 vs 0.5.0; add the 2026-10-08 entries; drop the Vercel Analytics claim.
**Acceptance criteria:**
- [ ] Every claim cites a file or command; changelog and `package.json` versions agree
**Verification:**
- [ ] grep every cited path
**Dependencies:** A2, A3
**Files:** `SECURITY-TRADE-OFFS.md`, `CHANGELOG.md`, `package.json`
**Scope:** S

### Task E3: ADRs for decisions never recorded
**Description:** S9-13. Postgres rate limiter and its fail-open choice, report-only CSP, polling leaderboard, no-wallet payee, accounts model.
**Acceptance criteria:**
- [ ] One ADR per decision in `docs/decisions/`, linked from `SECURITY-TRADE-OFFS.md` and the README
**Verification:**
- [ ] Links resolve
**Dependencies:** None
**Files:** `docs/decisions/008-*.md` onward
**Scope:** M

### Task E4: Fix the promotion list and AI-file maps
**Description:** S9-17, S9-18, S9-25. `tasks/production-exclusions.md` says `main` tracks files it no longer tracks; `AGENT_MAP.md` and `CAPABILITY-MAP.md` name moved paths; `AGENTS.md` names a skill path missing in this worktree. Dev-only files only; none of this lands on `main`.
**Acceptance criteria:**
- [ ] The three files match the tree; the promotion procedure notes it was done once in `5221f49`
**Verification:**
- [ ] grep every path
**Dependencies:** None
**Files:** `tasks/production-exclusions.md`, `AGENT_MAP.md`, `CAPABILITY-MAP.md`
**Scope:** S

### Task E5: Move groups L1-M1 to M8
**Description:** Report section 8. **Each group is its own commit, with your approval first.** M1 may already be done by B5.
**Acceptance criteria:**
- [ ] Per group: moves done with `git mv`, imports fixed, tests and lint green
**Verification:**
- [ ] `npm run check:task` after every group
**Dependencies:** your approval per group
**Files:** see `tasks/audit/L1-structure.md`
**Scope:** S each

### Task E6: Remove dead dependencies
**Description:** `lodash.debounce`, `@types/lodash.debounce`, `webpack`, `@types/jest` have no imports (confirmed). Add `@axe-core/cli` as a devDependency so `check:a11y` runs (S9-14). Re-run `npm audit` and the build; the `webpack` removal also affects the PWA decision (prod-health T6).
**Acceptance criteria:**
- [ ] Removed; `npm run build` and `npm run check:deps` green
**Verification:**
- [ ] Full `npm run check:task`
**Dependencies:** None
**Files:** `package.json`, `package-lock.json`
**Scope:** XS

### Checkpoint: Phase E
- [ ] `npm run check:full` green; review with human before any merge toward `main`

---

## Needs your decision (not tasks yet)
- **Contest integrity (S2-03, S2-04):** a second account can read contest answers as a reviewer, and self-dealing accounts can farm tokens. Fixes change contest rules, so design first.
- **Splitting `question-list-actions.ts`** (S1-03, 1070 lines): worth its own plan after Phase A, because it holds the money path.
- **D1:** answered 2026-10-09: production runs on Vercel. A5 is dropped; the GHCR image is not production.
- **D4:** whether a multisig and an external contract auditor exist (decides prod-health T10).
- **PWA / service worker (S6-12):** no `sw.js` is emitted under Turbopack; keep, replace or drop (prod-health T6).

---

## Out of scope (tracked in prod-health plan)
Node 24, PWA/service worker, CI hygiene (pinned actions, Gitleaks checksum, token permissions), contracts hardening and audit (T10), upstream-blocked majors (T11). The Dockerfile build args, CD gating on CI and `/api/health` items that were listed here moved into Part 2 (A4, A5, D3).
