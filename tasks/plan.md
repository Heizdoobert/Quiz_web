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
- [ ] Task 4: Rate-limit auth actions
- [ ] Task 5: CSP report-only
- [ ] Task 6: Enforce CSP

### Checkpoint: Phase 2
- [ ] Preview deploy clean for a full wallet + email + username sign-in, no CSP reports for first-party flows

### Phase 3: Rewrite the doc
- [ ] Task 7: Update STRIDE table, §2, §3, §4 in `SECURITY-TRADE-OFFS.md`

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
