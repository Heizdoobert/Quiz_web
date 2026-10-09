# Intent: Deep repository audit

Confirmed by the owner on 2026-10-08.

## Outcome

An audit report and a prioritized backlog. They cover which files and folders are misplaced, what production is still missing, and what to add or update. Every finding cites `file:line` or the output of a command.

## User

The repository owner, who decides what to build next. Backlog items are sized S or M so the owner can say "go t1" and the work starts.

## Why now

`main` has just shipped the security reconciliation. The open items (CSP enforcement, `/api/health`, an error tracker, e2e in CI, contracts hardening, the functions-coverage drop, major upgrades blocked upstream) have no single ordered view.

## Success

- Every layer is read, not skimmed: `app/`, `components/`, `hooks/`, `lib/`, `supabase/` (migrations and RLS), `contracts/`, `tests/`, CI/CD, Docker, dependencies and docs.
- Skill audits run in parallel: security-auditor, code-reviewer, test-engineer, web-performance-auditor, shipping-and-launch and the `CONSTRAINTS.md` gates.
- Each finding is checked against the real code before it goes into the report.
- Deliverables: `tasks/audit-report.md`, plus updated `tasks/plan.md` and `tasks/todo.md`.

## Constraints

- CocoIndex output (`coco/out`) is the map; findings are confirmed against the actual files.
- Verification runs in the ext4 scratch copy, because `npm ci` and vitest are unreliable on NTFS.
- Dev-only and AI-use files stay on `preview` and local only (`tasks/production-exclusions.md`).

## Out of scope

- No code changes and no file moves. A new layout is only proposed; the owner approves it before any `git mv`.
- No deploys, no Supabase migrations run, no contract deploys.
- No pushes to `main`, and no PR unless the owner asks.
