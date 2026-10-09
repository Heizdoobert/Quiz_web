# Constraints

Last reviewed: 2026-10-08 by @alexheiz

## Floor (always enforced, no setup required)

- No new suppression comments: `@ts-ignore`, `eslint-disable`, `# noqa`, `# type: ignore`, `istanbul ignore`, `gitleaks:allow`, `nosemgrep`
- No unimplemented stubs: `throw new Error("Not implemented")`, empty `catch {}`
- No skipped or deleted tests without a reason in the commit message
- No secrets in source
- No direct pushes or merges to `main` (production): all changes must merge to `preview` first, pass all CI/CD checks (all green), and only then merge to `main`
- This file does not get weakened to make a change pass

## Enforced with numbers

| Dimension | Rule | Checked by | Runs at |
|-----------|------|-----------|---------|
| Types | Zero type errors | `npm run type-check` (`tsc --noEmit`) | every edit, `check:fast` |
| Lint | Zero errors from our config | `npm run lint` (`eslint`) | every edit, `check:fast` |
| Secrets | Zero secret leaks in diff | `gitleaks git --pre-commit --redact --no-banner` | every edit, `check:fast` |
| Architecture | Zero boundary or circular dependency violations | `npm run check:architecture` (`npx depcruise`) | task end, `check:task` |
| UI Components | Max 200 lines per component file | `npm run lint` (ESLint `max-lines`) | every edit, `check:fast` |
| Coverage (changed lines) | Changed lines ≥ 80% covered | `npm run test:coverage` + git diff | task end, CI |
| Coverage (project ratchet) | Lines ≥ 53.8%, functions ≥ 50.7%, branches ≥ 49.4% (measured 53.86 / 50.73 / 49.48 on 2026-10-09 after the merge of preview over every file in `app`, `lib`, `hooks`, `components`) — must not fall | `npm run test:coverage` | CI, `check:task` |
| Security: code | Zero high findings | `npm run check:security` (`uvx semgrep scan`) | CI, on-demand |
| Security: deps | No high+ findings outside Exceptions table | `npm run check:deps` (`npm audit --omit=dev`) | CI, `check:full` |
| Accessibility | Zero critical or serious axe violations | `npm run check:a11y` (`axe $PREVIEW_URL --tags wcag2a,wcag2aa,wcag21aa`) | preview deploy (warns locally) |
| Performance (runtime) | LCP ≤ 2500ms, CLS ≤ 0.1 | `npm run check:perf` (`lighthouse $PREVIEW_URL --output=json`) | preview deploy (warns locally) |
| Performance (bundle) | First-load JS ≤ 150 kB gzip per route target; today's ratchet is 570 kB (measured 553 to 561 kB on 2026-10-09, after Sentry and PostHog) — must not grow, see Exceptions | `npm run build && npm run check:bundle` (sums the gzip size of every script in each prerendered page's HTML) | CI, after the build job |

### Why these numbers

- **Coverage 80% on changed lines**: High enough to require comprehensive tests for new logic, low enough to accommodate boilerplate and pure types.
- **Coverage project ratchet (lines 53.8%, functions 50.7%, branches 49.4%)**: Measured on 2026-10-09 with `coverage.include` set, so files no test imports now count (3.6 thousand lines, up from the 2464 that were visible before; it first measured 51.72% lines, then rose with the accessibility and contest-claim tests). The old 65.5% line figure counted only imported files; it fell to 51.72% because the denominator grew, not because tests were lost. Never relaxed downward; updated upward whenever coverage improves.
- **Secrets scanning**: Gitleaks pre-commit diff scan guarantees no credentials or private keys leak into commits, running in under 200ms.
- **Architecture boundaries**: Enforced by dependency-cruiser; prevents `lib/` (business logic) from coupling to `app/` or `components/`, and prevents circular module dependencies.
- **Security scanning**: Semgrep scans source code for OWASP Top Ten and framework vulnerabilities without slowing down the edit loop.
- **Security dependencies**: `npm audit --omit=dev` targets production runtime risk; transitive exceptions require specific deprecation plans.
- **Accessibility & Lighthouse**: Core Web Vitals (LCP ≤ 2.5s, CLS ≤ 0.1) and WCAG 2.1 AA zero critical/serious issues prevent UX and accessibility degradation on deployed preview routes.
- **Bundle size budget (150 kB gzip)**: The target for first-load JS. The earlier 127 kB figure could not be reproduced (Turbopack prints no size table). `scripts/check-bundle.mjs` now measures it: it reads only the `<script>` tags in prerendered HTML, so it misses chunks loaded later by `next/dynamic`. The figures in this section were measured before the wallet stack (wagmi, viem, RainbowKit) was removed in the web2-only change; re-measure before lowering the ratchet. The script fails above the 570 kB ratchet; 150 kB is still out of reach.

## Measured, not yet enforced

| Metric | Today | Direction |
|--------|-------|-----------|
| Statements | 52.3% (2026-10-09, all of `app`, `lib`, `hooks`, `components`) | must not fall |
| First-load JS (gzip, per prerendered route, `check-bundle`) | 553 to 561 kB (2026-10-09, after Sentry and PostHog, before the wallet stack was removed; excludes `next/dynamic` chunks and dynamic routes) | must not grow past 570 kB, target 150 kB |

## Exceptions

| ID | Rule | Path | Reason | Owner | Expires |
|----|------|------|--------|-------|---------|
| X-1 | Performance (bundle): 150 kB per route | all prerendered routes | Routes weighed about 560 kB with Sentry and PostHog before the wallet stack was removed; re-measure. The ratchet at 570 kB stops growth meanwhile | alexheiz | 2026-12-31 |


## Lifecycle mapping

| Phase | Command | What runs | Budget |
|-------|---------|-----------|--------|
| BUILD (`/build`) | `npm run check:fast` | Types, lint, secrets | under 5s, changed files only |
| VERIFY (`/test`) | `npm run check:task` | Fast gates + architecture + test coverage | under 90s (measured ~16s) |
| SHIP (`/ship`) | `npm run check:full` | Task gates + Semgrep + deps audit + bundle + preview runtime checks | CI |
| RELEASE | Merge `preview` -> `main` | Production deployment (only after preview CI/CD is all green) | Post-CI |

`CONSTRAINTS.md` is canonical. `check:*` scripts mirror it; if they drift, this file wins.
