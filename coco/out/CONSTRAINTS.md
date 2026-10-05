# CONSTRAINTS.md
lines:65 exports:
---
# Constraints

Last reviewed: 2026-09-28 by @alexheiz

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
| Coverage (project ratchet) | Lines ≥ 62.5% (measured 62.56% on 2026-10-01) — must not fall | `npm run test:coverage` | CI, `check:task` |
| Security: code | Zero high findings | `npm run check:security` (`uvx semgrep scan`) | CI, on-demand |
| Security: deps | No high+ findings outside Exceptions table | `npm run check:deps` (`npm audit --omit=dev`) | CI, `check:full` |
| Accessibility | Zero critical or serious axe violations | `npm run check:a11y` (`axe $PREVIEW_URL --tags wcag2a,wcag2aa,wcag21aa`) | preview deploy (warns locally) |
| Performance (runtime) | LCP ≤ 2500ms, CLS ≤ 0.1 | `npm run check:perf` (`lighthouse $PREVIEW_URL --output=json`) | preview deploy (warns locally) |
| Performance (bundle) | First-load JS ≤ 150 kB gzip per route (measured 127 kB on 2026-09-28) — must not grow | `npm run build` shared chunk analysis | CI, on dependency changes |

### Why these numbers

- **Coverage 80% on changed lines**: High enough to require comprehensive tests for new logic, low enough to accommodate boilerplate and pure types.
- **Coverage project ratchet (62.5%)**: Measured value today (62.56%). Never relaxed downward; updated upward whenever coverage improves.
- **Secrets scanning**: Gitleaks pre-commit diff scan guarantees no credentials or private keys leak into commits, running in under 200ms.
- **Architecture boundaries**: Enforced by dependency-cruiser; prevents `lib/` (business logic) from coupling to `app/` or `components/`, and prevents circular module dependencies.
- **Security scanning**: Semgrep scans source code for OWASP Top Ten and framework vulnerabilities without slowing down the edit loop.
- **Security dependencies**: `npm audit --omit=dev` targets production runtime risk; transitive exceptions require specific deprecation plans.
- **Accessibility & Lighthouse**: Core Web Vitals (LCP ≤ 2.5s, CLS ≤ 0.1) and WCAG 2.1 AA zero critical/serious issues prevent UX and accessibility degradation on deployed preview routes.
- **Bundle size budget (150 kB gzip)**: Wagmi/RainbowKit/Viem already contribute ~127 kB; 150 kB caps new dependency bloat while leaving 23 kB headroom.
