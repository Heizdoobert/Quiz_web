# Implementation Plan: Security Posture Reconciliation

## Overview
`SECURITY-TRADE-OFFS.md` has drifted from the code (checked 2026-10-08). This plan makes the document true again and closes the real gaps it exposes. Work happens only on `company/update-code`, one task per commit, merged to `preview` first (see `AGENTS.md`, `CONSTRAINTS.md`). It overlaps with the prod-health plan (T1 `next` bump, T4 CI audit, T7 CSP); those tasks are done here once, not twice.

## Findings (evidence, 2026-10-08)
| # | Doc claim | Reality |
|---|-----------|---------|
| F1 | §4.C / ADR-003: `claimListReward` returns "Contest payouts are paused" | `lib/actions/question-list-actions.ts:868` is live: signs a voucher for `ContestEscrow` after on-chain status check. `contracts/contracts/ContestEscrow.sol` exists. No "paused" string anywhere in `lib/` or `app/`. |
| F2 | §3: 23 moderate + 1 high, `ws` via `viem` | `npm audit --omit=dev`: 26 vulns, 22 moderate, 4 high, all `ws <=8.20.1` nested under `@reown/appkit*` and `@walletconnect/utils` (two advisories). `package.json` has no `overrides`. |
| F3 | STRIDE table covers wallet auth only | Auth now also has email code (`requestEmailCode`, `verifyEmailCode`) and username (`signUpWithUsername`, `signInWithUsername`) in `lib/actions/auth-actions.ts`. No rate limit on any auth action (rate limits exist only in `community-actions.ts` and `question-actions.ts`). |
| F4 | §2 lists headers | Accurate, but CSP is only `frame-ancestors 'none'` (no script/connect/img policy). |
| F5 | n/a | `next` 16.3.6 has a high advisory fixed in 16.4.0 (image optimizer SSRF, ISR cache poisoning). Not in the doc. |
| F6 | `CONSTRAINTS.md` W1 exception (expires 2026-12-27) | Still valid per F2; the earlier assumption that an override already clears `ws` is false. |

## Architecture Decisions
- Auth rate limiting reuses the existing pattern (count rows in a window via `supabaseAdmin`, return `RATE_LIMITED`), not a new dependency or Redis. Ceiling: per-account/IP counting in Postgres; move to edge limiter if traffic demands.
- CSP ships report-only first, then enforce, because wagmi/RainbowKit/WalletConnect need broad `connect-src`/`frame-src`.
- Docs are corrected from code, not from memory: each doc task starts by re-reading the cited file.
- No contract deployment or external audit in this plan; those need the user (prod-health T10).

## Task List
Details, acceptance criteria and verification are in `tasks/todo.md`.

### Phase 1: Make the record true (low risk, docs + deps)
- [x] Task 1: Bump `next` and `eslint-config-next` to 16.4.0
- [x] Task 1b: Repair 7 stale tests so `test:coverage` is green
- [x] Task 2: Verify `ws` fix path and re-triage W1
- [x] Task 3: Verify contest claim flow; correct §4.C and ADR-003

### Checkpoint: Phase 1
- [ ] `npm run check:task` and `npm run check:deps` pass; first-load JS ≤ 150 kB

### Phase 2: Close real gaps
- [x] Task 4: Rate-limit auth actions
- [x] Task 5: (code done; preview observation pending) CSP report-only
- [ ] Task 6: (BLOCKED: needs preview observation) Enforce CSP

### Checkpoint: Phase 2
- [ ] Preview deploy clean for a full wallet + email + username sign-in, no CSP reports for first-party flows

### Phase 3: Rewrite the doc
- [x] Task 7: Update STRIDE table, §2, §3, §4 in `SECURITY-TRADE-OFFS.md`

### Checkpoint: Complete
- [ ] Every claim in `SECURITY-TRADE-OFFS.md` matches code; CI green on `preview`

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| `next` 16.4.0 changes build output or bundle size | Med | Verify build + first-load JS before commit; revert if over 150 kB |
| Strict CSP breaks wallet modal / WalletConnect | High | Report-only first; test wallet connect on preview before enforcing |
| `ws` has no patched release reachable without `wagmi@3` | Low | Keep W1 with fresh reasoning; do not weaken `CONSTRAINTS.md` |
| F1 is wrong (claims actually unsafe) | High | Task 3 reads full claim flow before editing docs; if unsafe, stop and report |
| Auth rate limit locks out shared-IP users | Med | Key by normalized identifier (email/username/address) first, IP only as secondary |

## Open Questions
- Is production on Vercel or the GHCR image? (affects whether Dockerfile build args matter; not blocking here)
- Want the CI audit step made strict (remove `|| echo ::warning::`) as part of Task 2? Default: yes, if W1 still covers the remaining findings.

---

# Part 2: Audit backlog (2026-10-08)

## Overview
A nine-lane read of the whole repository (`tasks/audit-report.md`, evidence in `tasks/audit/`) found 273 candidate issues. Part 1 above is the security reconciliation and is complete except Task 6 (CSP enforcement), which waits on a preview observation. Part 2 orders the audit's findings into tasks. Details, acceptance criteria and verification for each task are in `tasks/todo.md` (Part 2). Task ids start with a letter (A1 and so on) so they do not collide with Part 1.

## Architecture decisions
- **Order by risk, not by lane.** Money and answer secrecy first (A), then correctness, tests and accessibility (B), then performance (C), delivery (D), docs and layout (E).
- **Re-verify before fixing.** About 230 of the 273 findings were not re-checked by the main thread. Each task starts by re-reading the cited code; if the finding is wrong, the task is dropped and the report corrected.
- **Test first for bugs.** A1, A2, B1, B2 each start with a failing test.
- **Reuse before building.** A3 and the auth limiter share `rate_limit_hit`; B3 prefers native `<dialog>` and `inert` to a library; C1 is a small script, not a new dependency.
- **Moves need approval.** The L1 move groups change many imports and the dev-only exclusion list, so each is its own commit after you approve it.
- **Branch hygiene.** `company/update-code` is 6 commits behind `preview` (Sentry, migration 19). Task D1 merges it after the `coco/out` edits are dealt with; findings in those files are provisional until then.

## Task list

### Phase A: Fail closed and keep answers secret
- [x] Task A1: Fail closed in `isContestVoucherUsed`
- [x] Task A2: Gate `get5050EliminatedIndices` (the guest part moves to A3)
- [x] Task A3: Limit guest answer harvesting (default policy taken: keep guest reveal, 120 per IP per hour)
- [x] Task A4: Gate CD on CI (code done, red-commit check not run; you add the required "CI gate" check in the ruleset)
- [x] Task A5: Dropped, production runs on Vercel so the image placeholders never reach users (you check the Vercel Production env vars, see todo.md)
- [ ] Task A6 (yours): Apply migrations 17 and 19 in Supabase; confirm backups

### Checkpoint: Phase A
- [ ] `npm run check:task` green; CI green on `preview`

### Phase B: Correctness, tests, accessibility
- [x] Task B1: Confirm and fix the toast re-render loop (loop was real: 27 calls before the fix, 1 after)
- [x] Task B2: Show the send-code error in `EmailTab`
- [x] Task B3: Modal focus management
- [x] Task B4: Labels, live regions and form errors (Toast, auth, quiz, community; follow-up B4b listed in todo.md)
- [x] Task B5: Run the component tests in CI (widened the script, no file moves)
- [x] Task B6: Honest coverage (lines 51.7, functions 48, branches 47.7)
- [x] Task B7: Enforce the Floor rules that nothing enforces
- [ ] Task B8: Contest reward tests

### Checkpoint: Phase B
- [ ] `npm run check:full` green

### Phase C: Performance
- [ ] Task C1: Make the bundle budget measurable
- [ ] Task C2: Keep the wallet stack off non-wallet routes
- [ ] Task C3: `/topics` is frozen at build time
- [ ] Task C4: Cache or index the global leaderboard

### Checkpoint: Phase C
- [ ] Bundle number reported honestly

### Phase D: Delivery and operations
- [ ] Task D1: Merge `origin/preview` into this branch
- [ ] Task D2: Migration ledger and rollback policy
- [ ] Task D3: `/api/health`

### Checkpoint: Phase D
- [ ] CI green on `preview`

### Phase E: Docs, structure, dependencies
- [ ] Task E1: README and environment docs
- [ ] Task E2: Truth in `SECURITY-TRADE-OFFS.md` and `CHANGELOG.md`
- [ ] Task E3: ADRs for decisions never recorded
- [ ] Task E4: Fix the promotion list and AI-file maps
- [ ] Task E5: Move groups L1-M1 to M8 (one commit each, with approval)
- [ ] Task E6: Remove dead dependencies

### Checkpoint: Complete
- [ ] `npm run check:full` green; review with human before any merge toward `main`

## Risks and mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| A subagent finding is wrong | Med | Re-read the cited code first; drop and correct the report if so |
| A3 changes the guest experience | High | Product decision first; the guest reveal is intended in `docs/specs/trivia-guest-access.md` |
| A4 or the ruleset change blocks hotfixes | Med | Keep the admin bypass; add one aggregate "CI gate" check |
| B6 lowers the displayed coverage ratchet | Low | Expected; record the honest baseline and the reason in the commit |
| C1 fails CI immediately (about 450 kB against 150 kB) | Med | Land as measured-only with a ratchet and a `CONSTRAINTS.md` exception until C2 |
| E5 moves break imports or the exclusion list | Med | One group per commit, `npm run check:task` after each |
| Merging `preview` (D1) conflicts with uncommitted `coco/out` edits | Low | Commit or set aside those edits first, or merge in a throwaway worktree |

## Open questions
- D1: answered 2026-10-09, production runs on Vercel.
- D4: is there a multisig and an external contract auditor?
- A3: keep the guest answer reveal with a rate limit, or require sign-in?
- Contest integrity (S2-03, S2-04): reviewer model and token-farming limits.
- D2: Supabase CLI or a manual ledger for migrations?
- PWA: keep, replace or drop the service worker?
