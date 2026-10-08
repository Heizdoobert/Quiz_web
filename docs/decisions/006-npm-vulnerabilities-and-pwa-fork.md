# ADR-006: Resolving High-Severity NPM Vulnerabilities via PWA Fork and Dependency Overrides

## Status
Accepted

## Date
2026-10-07

## Context
A security audit (`npm audit --omit=dev --audit-level=high`) reported several high-severity vulnerabilities in the production dependencies of Quick Quiz. The primary sources of these vulnerabilities were:
1. `next-pwa@5.6.0`: Unmaintained package pulling in outdated dependencies with critical vulnerabilities (`workbox-build`, `rollup`, `fast-glob`).
2. `wagmi@2.19.5`: Indirectly pulling in vulnerable versions of `braces` and `micromatch` via its dependencies (`viem`, `ws`, `@walletconnect`).

Attempting to blindly run `npm audit fix --force` caused cascading failures:
- It upgraded `wagmi` to version 3.x, which removed the `wagmi/experimental` module entirely. This module is strictly required by the `ContestPlayResult` component for EIP-5792 interactions, breaking the application build.
- It downgraded other Next.js and ESLint configurations incompatibly.

## Decision
Instead of performing forced upgrades that break existing application logic, we resolved the vulnerabilities through targeted overrides and package swapping:

1. **Swap to Maintained PWA Plugin**: We uninstalled the abandoned `next-pwa` package and replaced it with its actively maintained fork `@ducanh2912/next-pwa@^6.1.0`. This modern fork removes vulnerable legacy dependencies like `workbox-build@6.x` and `rollup@2.x`, and compiles correctly with Webpack 5.
2. **NPM Overrides for Wagmi/Viem**: Instead of upgrading `wagmi` to 3.x, we preserved `wagmi@^2.19.5` and injected targeted `overrides` in `package.json` to force its underlying dependencies (`braces`, `micromatch`, `serialize-javascript`, and `@walletconnect/*`) to their patched versions.
3. **Delete Unused/Broken DevDependencies**: We removed `@axe-core/cli` (a dev dependency that was vulnerable and unfixable without breaking).

## Alternatives Considered

### Upgrading Wagmi to 3.x
- **Pros**: Officially supported path; resolves dependency chains natively.
- **Cons**: `wagmi/experimental` is removed in v3. Refactoring `ContestPlayResult` away from the experimental features would require a massive rewrite of the on-chain submission logic and EIP-5792 (wallet_sendCalls) integrations.
- **Decision**: Rejected. The cost and risk of rewriting the core blockchain integration is too high just to resolve a sub-dependency's RegEx DoS vulnerability.

### `npm audit fix --force`
- **Pros**: Automated and fast.
- **Cons**: Breaks the app by pulling in incompatible major version bumps (`wagmi@3`, `eslint-config-next@14`).
- **Decision**: Rejected. Security fixes must not break the CI or production build.

### Ignoring the Vulnerabilities
- **Pros**: Zero effort.
- **Cons**: Leaves the project exposed to high-severity RegEx DoS and prototype pollution vectors in production. Fails CI/CD pipelines enforcing `npm run check:deps`.
- **Decision**: Rejected.

## Consequences
- **Positive**: `npm run check:deps` now successfully returns 0 vulnerabilities in production dependencies, satisfying CI/CD security gates.
- **Positive**: The application continues to use `wagmi@2.x` and `wagmi/experimental` without requiring a rewrite.
- **Negative / Operational Requirement**: `package.json` now contains manual `overrides`. If `wagmi` is ever upgraded to v3 in the future, these overrides should be re-evaluated and potentially removed to avoid version locking issues.
