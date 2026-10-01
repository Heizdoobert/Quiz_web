# docs/specs/project-improvements.md
lines:69 exports:
---
# Spec: Project Improvements (fixes and missing pieces)

Module: cross-cutting (touches `rewards`, `lists`, CI, docs) — see `CAPABILITY-MAP.md`.
Status: Approved 2026-09-30 (owner pre-approved the audit's proposals). Audited at `preview` `1ddaa1d`.

## Objective
Close the gaps found in a whole-project audit: the last unbuilt code task of the accounts plan, a few security hardening items, CI gates that `CONSTRAINTS.md` promises but CI does not run, and setup docs that no longer match the code.

Out of scope (tracked elsewhere or needs the owner):
- Task 24 (production rollout: run the SQL scripts, Supabase email OTP and SMTP, `TREASURY_WALLET_ADDRESS`) and Task 25 (drop the legacy wallet columns, a week after Task 24) in `tasks/accounts-discovery-community/todo.md`.
- The custom domain and wallet blocklist reviews (the MetaMask "malicious" warning comes from the shared `*.vercel.app` domain).
- CONSTRAINTS.md exception W1 (`ws` via WalletConnect, needs `wagmi@3`).

## Workstreams

| Id | Responsibility | Depends on |
|---|---|---|
| no-wallet-rewards | Task 23 of the accounts plan: disclosure, held balance, contest wallet rule | — |
| security-hardening | SQL `search_path`, comment-triggered workflow | — |
| ci-gates | Contract tests in CI, Dependabot coverage | — |
| docs-ops | `.env.example`, README setup, LICENSE, Docker health check | — |

All four are independent; build order: no-wallet-rewards → security-hardening → ci-gates → docs-ops.

## Findings and fixes

**no-wallet-rewards** (spec `docs/specs/rewards-no-wallet-payee.md`, success criteria 1 and 5 were unmet)
- `RewardsModal` shows only "Connect your wallet" to an email account: no held $QUIZ, no sweep date, no disclosure. Fix: a no-wallet panel with the held amount, the sweep date, the disclosure from `lib/rewards-copy.ts` and an "Add wallet" button. `use-rewards-modal` loads rewards for any session account, not only a connected wallet.
- The header shows "Add wallet" with no disclosure or held amount. Fix: a native `<details>` next to it with the held amount and the disclosure.
- `startContest` / `startListAttempt` return a plain error string. Fix: `code: 'WALLET_REQUIRED'` on the result.
- The contest "Play" button gives no hint to an account without a wallet. Fix: it reads "Add a wallet to join contests" and opens wallet connect.

**security-hardening**
- `lib/sql/reward-payee.sql`: `sweep_to_treasury()` and `get_treasury_entitled_count()` are `SECURITY DEFINER` without `SET search_path` (every other definer function sets it). Fix: `SET search_path = public`. The script is re-runnable (`CREATE OR REPLACE`).
- `.github/workflows/opencode.yml`: any commenter can trigger `/oc`, which runs with `OPENCODE_API_KEY`. Fix: only `OWNER`, `MEMBER` or `COLLABORATOR` comments trigger it.

**ci-gates**
- CI never runs the Hardhat suite in `contracts/test/` although the contracts hold player funds. Fix: a `contracts` job (`npm ci` + `npx hardhat test` in `contracts/`).
- Dependabot watches only the root npm package: not `contracts/`, not GitHub Actions, and it keeps proposing eslint 10, which `eslint-config-next` does not support. Fix: add both ecosystems and ignore eslint major updates.

