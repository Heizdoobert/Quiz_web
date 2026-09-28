# Constraints

Last reviewed: 2026-09-28 by @alexheiz

## Floor (always enforced, no setup required)

- No new suppression comments: `@ts-ignore`, `eslint-disable`, `# noqa`, `# type: ignore`
- No unimplemented stubs: `throw new Error("Not implemented")`, empty `catch {}`
- No skipped or deleted tests without a reason in the commit message
- No secrets in source
- This file does not get weakened to make a change pass

## Enforced with numbers

| Dimension | Rule | Checked by | Runs at |
|-----------|------|-----------|---------|
| Types | Zero type errors | `npm run type-check` (`tsc --noEmit`) | every edit |
| Lint | Zero errors from our config | `npm run lint` (`eslint`) | every edit |
| Coverage (changed lines) | Changed lines ≥ 80% covered | `npx vitest run tests/ --coverage` + git diff | task end, CI |
| Coverage (project ratchet) | Lines ≥ 54% (measured 54.12% on 2026-09-28) — must not fall | `npx vitest run tests/ --coverage` | CI |
| Deps | No high+ findings outside the Exceptions table | `npm run check:deps`, output diffed against Exceptions at review | task end, CI |
| Bundle | First-load JS ≤ 150 kB gzip per route (measured 127 kB on 2026-09-28) — must not grow | python snippet below | CI, on dependency changes |

Why these numbers: 80% changed-lines is high enough to force a test, low enough
to allow a config line. The 54% project ratchet is today's measured value, not an
aspiration — update it upward when coverage improves, never downward to pass.
`npm audit` without `--omit=dev` is noise; prod deps are what ship.

## Measured, not yet enforced

| Metric | Today | Direction |
|--------|-------|-----------|
| Statements / Branches / Functions | 50.0% / 45.8% / 63.7% | must not fall |
| First-load JS (gzip, per route) | 127 kB (`/`, `/contest`, `/my-lists`, `/profile`, `/review`) | must not grow past 150 kB |

### Bundle measurement

After `npm run build`, sum gzip sizes of each route's `rootMainFiles` JS.
150 kB budget = skill default (200 kB) tightened to measured + headroom,
because wagmi/viem/rainbowkit already dominate the shared chunks.

## Exceptions

| ID | Rule | Path | Reason | Owner | Expires |
|----|------|------|--------|-------|---------|
| W1 | Deps high | `ws <=8.20.1` via walletconnect/reown (transitive) | Fix is `wagmi@3` breaking change; tracked separately | @alexheiz | 2026-12-27 |

## Lifecycle mapping

| Phase | Command | Budget |
|-------|---------|--------|
| BUILD (`/build`) | `npm run check:fast` — types, lint, floor | seconds, changed files only |
| VERIFY (`/test`) | `npm run check:task` — fast + coverage | under 90s |
| SHIP (`/ship`) | Full gates + audit; ratchets compared in CI | CI |

`CONSTRAINTS.md` is canonical. `check:*` scripts mirror it; if they drift, this file wins.
