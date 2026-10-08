# Spec: Deep repository audit

Intent: [`docs/intent/repo-audit.md`](../intent/repo-audit.md), confirmed 2026-10-08. Status: **draft, awaiting owner approval**.

## Objective

Produce an evidence-backed audit of the whole repository and turn it into an ordered backlog. The audit answers three questions:

1. Which files and folders are misplaced, duplicated or dead, and what layout should replace them (a proposal only).
2. What is missing for production (observability, health checks, e2e in CI, docs, contract hardening, rollback plan).
3. What should be added or updated, in what order, and why.

The reader is the repository owner, who picks the next task from the backlog ("go t1"). Every finding cites `file:line` or the output of a command; findings without evidence are dropped. The audit changes no code.

### Assumptions (correct me before approval)

1. "Use CocoIndex to preview all the project" means using the generated `coco/out` markdown (258 files) as the map of the repo, then confirming each finding against the real file.
2. "Must use SKILL, plus check too" means every lane below runs the named skill or agent and also runs the real command (type-check, lint, tests, audit, build), not opinion alone.
3. The audit covers tracked source on `company/update-code` (which equals `preview` plus the intent and spec files). It does not audit `main`'s history.
4. Tracked file counts today: `app` 20, `components` 76, `hooks` 15, `lib` 34, `supabase` 20, `contracts` 12, `tests` 44, `scripts` 2, `.github` 5.
5. Findings about dev-only and AI-use files follow `tasks/production-exclusions.md`; those files stay on `preview` and local only and are not reported as defects.
6. The report is written in English because it is persisted. Chat updates to the owner are in Vietnamese.

## Tech stack

Next.js 16.4.0 (Turbopack), React, TypeScript, Tailwind, wagmi 2 and RainbowKit, viem, Supabase (Postgres, RLS, Auth), Hardhat contracts (`ContestEscrow`), vitest, dependency-cruiser, ESLint, gitleaks, Semgrep, Docker, GitHub Actions. CocoIndex lives in `coco/` (`main.py`, `pyproject.toml`).

## Commands

All verification runs in the ext4 scratch copy, because `npm ci` and vitest are unreliable on the NTFS drive.

```
Types:        npm run type-check
Lint:         npm run lint
Tests:        npm test
Coverage:     npm run test:coverage
Architecture: npm run check:architecture
Deps:         npm run check:deps
Code scan:    npm run check:security          (uvx semgrep scan --config p/default --error app/ lib/ components/ hooks/)
Secrets:      gitleaks git --pre-commit --redact --no-banner
Build:        npm run build                   (first-load JS budget 150 kB gzip per route)
Contracts:    cd contracts && npx hardhat test
Gate bundle:  npm run check:task   /   npm run check:full
Runtime:      npm run check:a11y, npm run check:perf   (need a running URL; dropped if none is available)
```

## Project structure under audit

```
app/            routes, server components, api/ (csp-report and others)
components/     UI, one folder per feature (max 200 lines per file)
hooks/          client hooks (quiz logic, polling, auth sync)
lib/            actions/ (server actions), services/ (session, rate limit), supabase/, contracts/, utils/, constants/
supabase/       migrations and RLS lock-down
contracts/      ContestEscrow and Hardhat tests
tests/          vitest suites (44 files)
scripts/        2 files
.github/        CI, CD, Dependabot, CodeQL-related workflows
Dockerfile, docker-compose.yml, next.config.mjs, package.json and config files
docs/decisions/ ADR-001 to ADR-007
docs/, tasks/, coco/, e2e/, design-system/   dev-only, reviewed for hygiene but not as production code
```

## Method (audit lanes)

Each lane is read file by file, not sampled, and ends in findings with severity, evidence, and a sized fix. Independent lanes run in parallel as subagents; the main thread checks every finding against the code before it enters the report.

| Lane | Skill or agent | Scope | Command evidence |
|---|---|---|---|
| L1 Structure | CocoIndex `coco/out` plus `Explore` | Misplaced, duplicate, dead or oversized files; folder layout; unused exports and dependencies; naming | `npm run check:architecture`, dependency-cruiser graph, unused-export scan |
| L2 Security | `security-auditor`, `agent-skills:security-and-hardening` | Server actions, session and SIWE, rate limiter, RLS policies, CSP, headers, secrets, supply chain, `.github` workflows | `npm run check:security`, gitleaks, `npm run check:deps` |
| L3 Contracts | `security-auditor` with `web3-fundamentals` skill | `ContestEscrow`, voucher signing path, key handling, `Ownable2Step`, pause, fuzz and invariant gaps | `cd contracts && npx hardhat test` |
| L4 Code quality | `code-reviewer` | Correctness, readability, architecture fit, error handling, duplicated logic, the 200-line rule | type-check, lint |
| L5 Tests | `test-engineer`, `agent-skills:test-driven-development` | Coverage by area, untested trust boundaries, flaky or failing tests (`RewardsTokensTab`), functions-coverage drop (72.1% to 66.66%) | `npm run test:coverage` |
| L6 Performance | `web-performance-auditor` | First-load JS per route, images, fonts, data fetching and polling cost, caching, service worker | `npm run build`, `npm run check:perf` if a URL exists |
| L7 Accessibility | `agent-skills:accessibility` checklist | Keyboard, focus, contrast, labels on forms and modals | `npm run check:a11y` if a URL exists, otherwise a code-level review only |
| L8 Delivery and ops | `agent-skills:shipping-and-launch` | CI and CD gating, Docker build args, health endpoint, error tracker, logging, rollback plan, migrations process, environment documentation | `.github/workflows`, `Dockerfile`, `docker-compose.yml` read in full |
| L9 Docs and AI-use files | `documentation-and-adrs` | README, CHANGELOG, ADR coverage, stale references, `AGENTS.md`/`CONSTRAINTS.md` accuracy, what belongs on `main` | link and reference check |

## Deliverables

- `tasks/audit-report.md`: executive summary, a findings table per lane (id, severity, evidence, recommendation, size), a proposed folder layout with the exact `git mv` list marked "not executed", and a "what is missing" list.
- `tasks/plan.md` and `tasks/todo.md`: the ordered backlog in the existing format (phases, checkpoints, S or M tasks with acceptance criteria and verification). The current unfinished items in those files are kept; the audit extends them in place and does not overwrite another plan.
- Severity scale: **critical** (data loss, fund loss, auth bypass), **high**, **medium**, **low**, **info**. Ordering of the backlog is by severity, then by size.

## Code style for the report

Findings are one table row each, with the evidence in the row:

```
| S2-04 | high | lib/services/rate-limit.ts:88 | Limiter fails open when the RPC errors | Alert on rate_limit_check_failed; add a health check | S |
```

## Testing strategy

The audit itself ships no code, so there is no unit test. Proof is:

- every finding has evidence (a `file:line` or pasted command output) that the main thread re-checked;
- every command in the Commands section is run once in the scratch copy and its result recorded in the report, including failures;
- numbers quoted in the report (coverage, bundle size, vulnerability count) come from a run made on this branch, not from earlier notes.

## Boundaries

- **Always:** read the real file before reporting a finding; record the exact command and its result; label unverified items "unverified"; keep dev-only files out of `main`-bound recommendations; write the report in normal English prose.
- **Ask first:** adding dependencies, changing CI or the `main` ruleset, running any migration, moving files, enabling the CSP, any contract deployment, opening a PR.
- **Never:** edit application code during the audit; push to `main`; commit secrets or print the PAT in the git remote URL; weaken `CONSTRAINTS.md`; deploy contracts or touch funds; run the `rsync --delete` scratch refresh against the real tree.

## Success criteria

1. Lanes L1 to L9 each produced a findings section, or an explicit "nothing found" with the evidence searched.
2. 100% of tracked directories listed in Project structure are named in the report as read.
3. Every finding row has a severity, a `file:line` or command output, and a size of S or M (anything larger is split).
4. All commands in the Commands section were run, and failures are recorded with the shortest decisive line.
5. The proposed layout lists exact `git mv` moves and the import fixes each needs, and marks them "not executed".
6. `tasks/plan.md` and `tasks/todo.md` carry the new backlog, ordered, with checkpoints after every two or three tasks, and no earlier unchecked task is lost.
7. The owner can answer "what is missing for production" from the report alone.

## Open questions

1. Is there a production or preview URL I can use for `check:a11y` and `check:perf`? Without one, those two lanes are code-review only.
2. Should audit findings go into one report, or one file per lane (`tasks/audit/L1-structure.md` and so on)? Default: one report.
3. Should `docs/intent/repo-audit.md` and this spec be committed on `company/update-code` now? Default: commit them together after approval.
4. Is a multisig or an external contract auditor available (decision D4 from the earlier plan)? Default: L3 reports gaps and does not assume either.
