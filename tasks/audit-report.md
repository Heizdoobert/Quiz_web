# Deep repository audit report

Audited 2026-10-08 on `company/update-code` at `e4562c1` (that is `preview` at `ee30036` plus the audit intent and spec). Spec: [`docs/specs/repo-audit.md`](../docs/specs/repo-audit.md). Intent: [`docs/intent/repo-audit.md`](../docs/intent/repo-audit.md).

Nothing in application code was changed. No file was moved, no migration run, nothing deployed or pushed.

## 1. Summary

The code is in better shape than the process around it. Every automated gate is green today, but several of those gates do not measure what they claim to, and the biggest risks sit in places the gates never look: answer secrecy in the quiz and contests, the reward-claim path, CI that does not block CD, and a client bundle about three times the stated budget.

Nine lanes read the repository file by file. They produced 273 findings. The main thread re-checked the most consequential ones against the real code or command output; the table in section 3 says which.

| Lane | Area | Findings |
|---|---|---|
| L1 | Structure | 27 (2 high, 7 medium, 13 low, 5 info) |
| L2 | Security | 30 (4 high, 12 medium, 10 low, 4 info) |
| L3 | Contracts | 19 (2 high, 8 medium, 7 low, 2 info) |
| L4 | Code quality | 59 (2 critical, 24 required, 30 optional, 3 nit) |
| L5 | Tests | 22 (7 high, 10 medium, 5 low) |
| L6 | Performance | 18 (4 high, 9 medium, 5 low) |
| L7 | Accessibility (code level) | 33 (9 high, 16 medium, 8 low) |
| L8 | Delivery and ops | 29 (7 high, 17 medium, 5 low) |
| L9 | Docs and AI-use files | 36 (11 high, 16 medium, 9 low) |

Severity scales differ slightly by lane: L4 uses critical, required, optional and nit; the others use critical, high, medium, low and info. The full rows, with evidence and a recommendation and size for each, are in [`tasks/audit/`](./audit/).

## 2. How to read this report

Each finding carries one of three states in section 3:

- **Verified:** the main thread read the code or ran the command and the claim held.
- **Partly verified:** one half of the claim was confirmed; the other half is named.
- **Lane report only:** a subagent read the code and cited `file:line`, but the main thread did not re-check it. Treat these as strong leads, not facts.

Runtime behaviour (Core Web Vitals, real screen-reader behaviour, production configuration, Supabase dashboard state) was not observed. No preview or production URL was available, so `check:a11y` and `check:perf` did not run, and the accessibility and performance lanes are code-level reviews.

## 3. Baseline: commands run in the ext4 scratch copy

| Gate | Result |
|---|---|
| `npm run type-check` | pass |
| `npm run lint` | pass |
| `npm run check:architecture` | pass |
| `npm run check:deps` (`npm audit --omit=dev --audit-level=high`) | 0 vulnerabilities |
| `npm run test:coverage` | 345 tests in 36 files pass; 63.82% statements, 59.07% branches, 66.66% functions, 66.17% lines |
| `npm run build` | pass, 13 routes |
| `npm run check:security` (Semgrep) | 0 findings on 145 files |
| gitleaks over the full git history | 375 commits scanned, no leaks |
| `cd contracts && npx hardhat test` | 38 passing |

Two first attempts failed because of how they were run, not because of the repository: gitleaks was given an invalid flag, and the contracts run had no `contracts/node_modules` in the scratch copy. Both were rerun correctly and the results above are the reruns. Raw output is not kept; `tasks/audit/baseline/summary.txt` has the exit codes of the first pass.

## 4. Findings the main thread checked

| ID | State | What was confirmed |
|---|---|---|
| S3-01, S4-03 | Verified | `lib/utils/chain.ts:65-67` returns `false` on any RPC error. `claimListReward` (`question-list-actions.ts:927-931`) then marks a past-deadline pending voucher `expired` and signs a new one, so an entry whose first voucher was already redeemed on-chain can be paid twice. Likelihood is low because the call at line 903 already refuses on RPC failure, but the window exists. |
| S3-02, S8-03 | Partly verified | `Dockerfile:21-31` bakes `NEXT_PUBLIC_CHAIN_ID=84532` and the `0x1111`, `0x2222`, `0x3333` addresses; `cd.yml:92-101` passes no build args. Update 2026-10-09: production runs on Vercel, so the image placeholders do not reach users; the Vercel Production env vars are still to be checked by the owner. |
| S2-01 | Verified | `get5050EliminatedIndices` (`question-actions.ts:301-328`) has no session, status or contest check. Any caller with a question id learns two wrong options, so the answer is one of the other two, including for contest questions. |
| S2-02, S4-01 | Verified | `submitAnswer` (`quiz-actions.ts:89-93`) returns `correctIndex` and `explanation` to guests for any verified question, with no rate limit. The comment at line 92 shows this is intended. The consequence is that a script can read the whole answer key as a guest and a signed-in account can then answer perfectly. |
| S6-01 | Verified (size) | Summing gzip of every `<script>` in the prerendered HTML gives 447 to 460 kB for `/contest`, `/profile` and `/_not-found` (the lane measured 423 kB). Either way it is about three times the 150 kB budget. An earlier note in `tasks/todo.md` (459 kB) agrees. |
| S6-02 | Lane report only | The Turbopack build prints no per-route size table, so the 127 kB figure in `CONSTRAINTS.md` cannot be reproduced and the bundle gate is not measured. |
| S7-01 | Verified | `components/Modal.tsx:35-47` handles Escape and scroll lock only. It has `role="dialog"` and `aria-modal` but does not move focus in, trap it, or restore it. One component, so one fix covers eight modals. |
| S7-08 | Verified | `EmailTab.tsx:27` sets a `RATE_LIMITED` error on send-code, but the step-1 form (lines 53-71) has no node that renders it; the only render is at line 92 in step 2. A rate-limited user sees a button that does nothing. |
| S4-11 | Verified | `lib/services/audio.ts:30,57,68` contain empty `catch {}`. `CONSTRAINTS.md` forbids that, yet lint passes: the Floor rules have no tool enforcing them. |
| S4-02 | Partly verified | `components/ui/Toast.tsx:44` passes a new `value` object on every render. Not confirmed: that `ContestPlay.tsx:29-61` lists `toast` in its effect dependencies and loops. |
| S4-05 | Partly verified | `recordContestRefund` (`question-list-actions.ts:659-682`) checks the owner but stores a client-supplied `txHash` without an on-chain check. The effect is a wrong status, not lost funds. |
| S5-01, S1-02 | Verified | Five component test files exist under `components/**/__tests__/`; `npm test` runs `vitest run tests/` only, so they never run in CI. |
| S5-03 | Partly verified | `vitest.config.ts:17-23` has no `coverage.include`, so only imported files are counted. The "60 of 139 files never loaded" count was not recounted. |
| S5-04 | Lane report only | The functions drop from 72.1% to 66.66% is a denominator effect (more files now loaded), not lost tests. |
| S1-01, S9-01, S9-03 | Verified | `lib/sql` and `lib/schema.sql` do not exist; `tests/sql/run-accounts-migration.sh` and the README still point at them. |
| S1-xx deps | Verified | `lodash.debounce`, `webpack` and `@types/jest` have no imports. |
| S8-01 | Verified | `cd.yml` runs on push to `main`, `preview` and tags, with no `needs:` or `workflow_run`, so CD does not wait for CI. |
| S8-02 | Partly verified | `gh api` returns 404 "Branch not protected" for `main`; one ruleset named `main` is active. Not re-checked here: that it has no required-status-check rule. |
| S9-xx | Verified | `package.json` is 0.4.0 while `CHANGELOG.md` has 0.5.0; `GEMINI_API_KEY` is in neither `README.md` nor `.env.example`; `check:a11y` calls `axe` but `@axe-core/cli` is not in `package.json`; `origin/main` tracks none of the dev-only paths, so `tasks/production-exclusions.md` describes a state that no longer exists. |

### Corrections `SECURITY-TRADE-OFFS.md` needs

The lane read every claim in that file against the code. Two were checked by the main thread and are wrong or overstated:

- **Section 4.A** says `submitAnswer` authenticates the caller through the signed cookie. Only the scoring path needs a session; a guest still receives the answer (S2-02).
- **"Writes require a session"** in the Repudiation row is overstated: `syncContestStatus` (`question-list-actions.ts:552-561`) writes without any session check.

The lane also flagged section 4.B ("the public key cannot write"), the SIWE replay wording, and the CI claims in `CONSTRAINTS.md`. Those three were not re-checked by the main thread; see S2 and S9 rows.

## 5. Branch is behind `preview`

`origin/preview` has six commits this branch lacks. They add Sentry and PostHog (`sentry.*.config.ts`, `app/global-error.tsx`, `components/providers/PostHogProvider.tsx`), migration `19-secure-ai-usage.sql`, and `tasks/release-checklist.md`. Consequences:

- **S8-04** (no error tracker) is true for this branch and false for `preview`.
- **S2-05** (`user_ai_usage` has no RLS) is very likely fixed by migration 19 on `preview`; not re-checked.
- A merge of `preview` into this branch will conflict with the uncommitted `coco/out` edits in the working tree, so the merge was not done. Do it after committing or setting aside those edits, or in a throwaway worktree.

Findings in `app/`, `lib/`, `components/` outside those files are unaffected.

## 6. Priorities

**P0: fix before relying on rewards or the next promotion**

1. Fail closed in `isContestVoucherUsed` (S3-01, S4-03). Size S.
2. Stop leaking answers: require a session and a reveal-after-record rule in `submitAnswer`, and gate `get5050EliminatedIndices` (S2-01, S2-02, S4-01). Size M. This changes the guest experience, so it needs a product decision.
3. Gate CD on CI and add required status checks to the ruleset (S8-01, S8-02). Editing the ruleset is yours.
4. Pass real `NEXT_PUBLIC_*` values as Docker build args, if production runs the image (S3-02, S8-03). Needs the D1 answer.
5. Apply `17-auth-rate-limit.sql` and, after merging `preview`, `19-secure-ai-usage.sql` in Supabase. Yours.

**P1: next**

6. Contest integrity: a second account can read answers as a reviewer (S2-03) and self-dealing farms tokens (S2-04). Both need design decisions.
7. Confirm and fix the toast re-render loop in `ContestPlay` (S4-02).
8. Make the five component tests run and fix the stale `RewardsTokensTab` tests (S5-01, S5-02); add `coverage.include` and re-baseline (S5-03).
9. Bundle: move the wallet stack off non-wallet routes and re-measure (S6-01, S6-03); make the budget measurable again (S6-02).
10. `/topics` is frozen with empty data (S6-04) and the global leaderboard aggregates the whole table per call (S6-05).
11. Accessibility basics: modal focus, toast live region, form labels and error announcement, and the EmailTab error (S7-01, S7-02, S7-04, S7-05, S7-08, S7-09).
12. Migrations: ledger, rollback policy, backups (S8-08, S8-09, S8-11).
13. Merge `preview` (Sentry, migration 19) into this branch (section 5).

**P2: hygiene**

14. Docs: README setup and migrations, `.env.example` (`GEMINI_API_KEY`), CHANGELOG 0.5.0 and the 2026-10-08 entries, ADRs for the rate limiter, CSP, polling leaderboard, no-wallet payee and accounts model (S9-xx).
15. Layout moves and dead-dependency removal (section 8).
16. Enforce the `CONSTRAINTS.md` Floor rules with a lint rule or grep gate (S4-11).

**P3:** the remaining medium, low and info rows in `tasks/audit/`.

## 7. What is missing for production

From L8, with the main-thread results folded in. "Unknown" means the repository cannot show it.

| Item | State |
|---|---|
| Unit and integration tests in CI | done, but five component test files and 60 production files are outside the gate |
| E2E in CI | missing; the only spec fails on stale assertions |
| CI gates CD | missing |
| Required status checks and branch protection | missing |
| Secrets scan, dependency audit, security headers | done |
| Semgrep, a11y, perf and bundle budget in CI | missing, although `CONSTRAINTS.md` lists them |
| Real `NEXT_PUBLIC_*` in production | not applicable to the GHCR image (production is Vercel); Vercel env vars unchecked |
| Environment variables documented | missing |
| Migrations applied and tracked, with rollback | missing; production state unknown |
| Backups and point-in-time recovery | unknown |
| Health endpoint | missing |
| Error tracker | present on `preview`, absent on this branch |
| Uptime monitoring and alerting | missing |
| Rollback plan and staged rollout | partial / missing |
| Contract audit and mainnet deploy | missing; Sepolia only |
| README, CHANGELOG, ADRs | partial |

## 8. Proposed layout (not executed)

L1 proposes eight move groups, each with the import fixes it needs. None was run; each needs your approval and its own commit.

| Group | Move | Fixes needed |
|---|---|---|
| L1-M1 | Five component tests from `components/**/__tests__/` into `tests/` so `npm test` runs them (S1-02) | import paths inside the five files |
| L1-M2 | `lib/utils.ts` to `lib/utils/format.ts` (it sits next to the `lib/utils/` folder) | 5 imports plus `tests/utils.test.ts` renamed |
| L1-M3 | `tests/sql` to `supabase/tests`, repointed at `supabase/migrations` (the harness mounts a `lib/sql` that no longer exists) | the script's mount path and file list |
| L1-M4 | `components/Modal.tsx` to `components/ui/Modal.tsx` | 8 imports |
| L1-M5 | `hooks/use-toast.ts` to `hooks/shared/use-toast.ts` | 4 imports |
| L1-M6 | `lib/services/audio.ts` to `lib/client/audio.ts` (skip if the file is deleted) | 2 imports, 2 test mocks |
| L1-M7 | `lib/utils/chain.ts` to `lib/services/chain.ts` | 3 imports and test mocks |
| L1-M8 | `SECURITY-TRADE-OFFS.md` and `PRODUCTION_COMMERCIALIZATION_GUIDE.md` into `docs/` | README link and plan references |

Not moves, but also in L1: the 1070-line `lib/actions/question-list-actions.ts` (split proposed as S1-03), two migration files both numbered `17-`, the `app/manifest.ts` and `public/manifest.json` pair, two unwired scripts, and `@axe-core/cli` missing from `package.json`. The exact `git mv` commands and import fixes are in `tasks/audit/L1-structure.md`.

## 9. Limits of this audit

- Accessibility and performance are code-level only; no running URL was available.
- The L2 findings that depend on live Supabase or hosting configuration are marked unverified in the lane file.
- The Docker image finding depends on the unanswered question of where production runs.
- The branch was 6 commits behind `preview` when audited (section 5).
- About 230 of the 273 findings were not re-checked by the main thread. They cite `file:line`, but treat them as leads until you pick a task and its first step re-reads the code.
