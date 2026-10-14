# Optional Tracking and Analytics SDK Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move all Sentry and PostHog code into `sdk/tracking-analytics`, so the app builds and runs with that folder deleted and uses the real vendor code when the folder exists.

**Architecture:** `@/lib/sdk/sentry` and `@/lib/sdk/posthog` stay the two seams the app imports. Their defaults are no-ops. `next.config.mjs` imports `withTrackingAnalytics` from `sdk/tracking-analytics/next.mjs` only if that file exists; it wraps the config with `withSentryConfig` and aliases each seam to `sdk/tracking-analytics/src/<name>.ts`. Sentry init moves from the three root `sentry.*.config.ts` files into the package, called through `instrumentation.ts` and `instrumentation-client.ts`.

**Tech Stack:** Next 16.4.0 (Turbopack default), React 19.3.0, TypeScript 5, `@sentry/nextjs` ^11.5.0, `posthog-js` ^1.438.3, Vitest 5.

**Spec:** `SPEC-sentry-sdk.md` (repo root, local only).

## Global Constraints

- No file outside `sdk/tracking-analytics` imports `@sentry/*` or `posthog-js`. `next.config.mjs` included.
- Each seam has the same signature in the no-op and the package. Sentry: `captureException(error: unknown): void`, `initSentry(): void`. PostHog: `PHProvider({ client?: unknown, children: ReactNode }): ReactNode`, `posthog`.
- No runtime check for the package. The choice is made once, at build time, in `next.config.mjs`.
- `@sentry/nextjs` and `posthog-js` stay in the root `dependencies`. The package declares both as `peerDependencies`. CI installs with `npm ci --legacy-peer-deps`.
- Specs, plans and `tasks/` files are local only. Do not commit this plan or `SPEC-sentry-sdk.md`.
- Work on branch `company/update-code` only. Do not open a PR.
- Every task ends with `npm run type-check` and `npm run lint` clean (0 errors).
- Build with `NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 npm run build`, like the CI build job.

## Rulings (open questions in the spec, decided by default)

- **Ruling 1:** keep `initSentry` in the Sentry seam, without a `runtime` argument. The three root config files are identical, so the argument would be unused. Cost if wrong: delete `initSentry` and keep the three root files, which breaks Global Constraint 1.
- **Ruling 2:** `@sentry/nextjs` and `posthog-js` stay in root `dependencies`. Cost if wrong: a later task moves them into an npm workspace and re-checks the lockfile.
- **Ruling 3:** the alias under Turbopack is checked in Task 4 by building both ways. A webpack alias is added at the same time as a fallback.
- **Ruling 4:** no CI job for the folder-absent build in this plan. It changes CI config, which is ask-first. Listed under Follow-ups.
- **Ruling 5:** whether the old root config files ran under Turbopack is not checked separately. Task 5 verifies that init code is in the server and client bundles after the move, which is the property that matters.
- **Ruling 6:** the folder is `sdk/tracking-analytics/`, inside one root `sdk/` folder meant to hold every optional SDK module. The package is `@quiz/tracking-analytics`. Cost if wrong: rename the folder and the string `sdk/tracking-analytics` in the files below.
- **Ruling 7:** PostHog is in the package. Its no-op seam keeps the names `PHProvider` and `posthog` so `components/providers/PostHogProvider.tsx` and `app/layout.tsx` do not change. The no-op `PHProvider` returns its children. Cost if wrong: rename the seam exports and update that one component.
- **Ruling 8:** `tests/posthog-provider.test.tsx` asserted the real PostHog init, which now lives in the package. It is rewritten to cover the no-op, and the init assertion moves to `sdk/tracking-analytics/tests/posthog.test.tsx`.

## File structure

| File | Responsibility |
|---|---|
| `lib/sdk/sentry.ts` | No-op default of the Sentry seam |
| `lib/sdk/posthog.ts` | No-op default of the PostHog seam |
| `sdk/tracking-analytics/package.json` | Package manifest, `peerDependencies` |
| `sdk/tracking-analytics/src/sentry.ts` | Real `captureException` and `initSentry` |
| `sdk/tracking-analytics/src/posthog.ts` | Real `PHProvider`, `posthog`, and the `posthog.init` call |
| `sdk/tracking-analytics/next.mjs` | `withTrackingAnalytics(nextConfig)`: both aliases plus `withSentryConfig` |
| `sdk/tracking-analytics/tests/*` | `sentry.test.ts`, `posthog.test.tsx`, `next.test.ts` |
| `sdk/tracking-analytics/README.md` | What it is, how to remove it |
| `tests/sentry-noop.test.ts`, `tests/posthog-provider.test.tsx` | No-op seam tests |
| `instrumentation.ts`, `instrumentation-client.ts` | Call `initSentry()` per runtime |
| `next.config.mjs` | Conditional wrap |
| `eslint.config.mjs`, `package.json`, `lib/sdk/README.md` | Rule ignore, test script, docs |

---

### Task 1: No-op seams

**Files:**
- Modify: `lib/sdk/sentry.ts`, `lib/sdk/posthog.ts`, `tests/posthog-provider.test.tsx`
- Create: `tests/sentry-noop.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `captureException(error: unknown): void` and `initSentry(): void` from `@/lib/sdk/sentry`; `PHProvider` and `posthog` from `@/lib/sdk/posthog`. Callers `app/error.tsx`, `app/global-error.tsx` and `components/providers/PostHogProvider.tsx` keep their imports unchanged.

- [ ] **Step 1: Write the failing tests**

Create `tests/sentry-noop.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { captureException, initSentry } from '@/lib/sdk/sentry';

describe('lib/sdk/sentry default (no package)', () => {
  it('captureException returns undefined and does not throw', () => {
    expect(captureException(new Error('boom'))).toBeUndefined();
  });

  it('initSentry returns undefined and does not throw', () => {
    expect(initSentry()).toBeUndefined();
  });
});
```

Replace the whole of `tests/posthog-provider.test.tsx` with:

```tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PostHogProvider } from '@/components/providers/PostHogProvider';

// Without sdk/tracking-analytics the seam must not touch posthog-js at all.
vi.mock('posthog-js', () => {
  throw new Error('posthog-js must not load without sdk/tracking-analytics');
});

describe('PostHogProvider (no package)', () => {
  it('renders its children', () => {
    render(
      <PostHogProvider>
        <p>child</p>
      </PostHogProvider>
    );
    expect(screen.getByText('child')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run tests/sentry-noop.test.ts tests/posthog-provider.test.tsx`
Expected: FAIL. `initSentry` is not exported, and the current seam imports `posthog-js`, which the mock rejects.

- [ ] **Step 3: Write the no-ops**

Replace the whole of `lib/sdk/sentry.ts` with:

```ts
// No-op default. When sdk/tracking-analytics exists, next.config.mjs aliases this module to
// sdk/tracking-analytics/src/sentry.ts at build time (see sdk/tracking-analytics/README.md).
export const captureException: (error: unknown) => void = () => {};
export const initSentry: () => void = () => {};
```

Replace the whole of `lib/sdk/posthog.ts` with (the real implementation is recreated in `sdk/tracking-analytics/src/posthog.ts` in Task 3; this commit leaves analytics off until then):

```ts
import type { ReactNode } from 'react';

// No-op default. When sdk/tracking-analytics exists, next.config.mjs aliases this module to
// sdk/tracking-analytics/src/posthog.ts at build time (see sdk/tracking-analytics/README.md).
export const posthog = undefined;

export function PHProvider({ children }: { client?: unknown; children: ReactNode }): ReactNode {
  return children;
}
```

- [ ] **Step 4: Run them to verify they pass**

Run: `npx vitest run tests/sentry-noop.test.ts tests/posthog-provider.test.tsx && npm run type-check && npm run lint`
Expected: 3 tests pass, type-check and lint clean.

- [ ] **Step 5: Commit**

```bash
git add lib/sdk/sentry.ts lib/sdk/posthog.ts tests/sentry-noop.test.ts tests/posthog-provider.test.tsx
git commit -m "refactor: make the Sentry and PostHog seams no-ops by default"
```

---

### Task 2: Package skeleton and Sentry

**Files:**
- Create: `sdk/tracking-analytics/package.json`, `sdk/tracking-analytics/src/sentry.ts`, `sdk/tracking-analytics/tests/sentry.test.ts`
- Modify: `package.json` (`test` scripts)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `captureException(error: unknown): void` and `initSentry(): void` from `sdk/tracking-analytics/src/sentry.ts`. Same signatures as Task 1.

- [ ] **Step 1: Write the failing test**

Create `sdk/tracking-analytics/tests/sentry.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as Sentry from '@sentry/nextjs';
import { captureException, initSentry } from '../src/sentry';

vi.mock('@sentry/nextjs', () => ({ init: vi.fn(), captureException: vi.fn() }));

describe('sdk/tracking-analytics sentry', () => {
  beforeEach(() => vi.clearAllMocks());

  it('captureException forwards the error to Sentry', () => {
    const err = new Error('boom');
    captureException(err);
    expect(Sentry.captureException).toHaveBeenCalledWith(err);
  });

  it('initSentry calls Sentry.init with the dsn from the environment', () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = 'https://key@example.ingest.sentry.io/1';
    initSentry();
    expect(Sentry.init).toHaveBeenCalledWith({
      dsn: 'https://key@example.ingest.sentry.io/1',
      tracesSampleRate: 1.0,
      debug: false,
    });
  });
});
```

- [ ] **Step 2: Add the package folder to the root test scripts**

In `package.json`, change the two vitest scripts:

```json
"test": "vitest run tests/ components/ sdk/tracking-analytics/",
"test:coverage": "vitest run tests/ components/ sdk/tracking-analytics/ --coverage",
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npx vitest run sdk/tracking-analytics/tests/sentry.test.ts`
Expected: FAIL, cannot resolve `../src/sentry`.

- [ ] **Step 4: Write the implementation**

Create `sdk/tracking-analytics/package.json`:

```json
{
  "name": "@quiz/tracking-analytics",
  "version": "0.1.0",
  "private": true,
  "description": "Optional error tracking (Sentry) and analytics (PostHog). Delete this folder and the app runs without them.",
  "peerDependencies": {
    "@sentry/nextjs": "^11.5.0",
    "posthog-js": "^1.438.3"
  }
}
```

Create `sdk/tracking-analytics/src/sentry.ts`:

```ts
import * as Sentry from '@sentry/nextjs';

export function captureException(error: unknown): void {
  Sentry.captureException(error);
}

export function initSentry(): void {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    // Adjust this value in production, or use tracesSampler for greater control
    tracesSampleRate: 1.0,
    debug: false,
  });
}
```

- [ ] **Step 5: Run it to verify it passes**

Run: `npm test && npm run type-check && npm run lint`
Expected: all tests pass (including the 2 new ones), type-check clean. Lint may flag `sdk/tracking-analytics/src/sentry.ts` for the `@sentry/*` import. That is fixed in Task 6; if it does, note it and continue.

- [ ] **Step 6: Commit**

```bash
git add sdk/tracking-analytics package.json
git commit -m "feat: add optional tracking-analytics package with Sentry"
```

---

### Task 3: PostHog in the package

**Files:**
- Create: `sdk/tracking-analytics/src/posthog.ts`, `sdk/tracking-analytics/tests/posthog.test.tsx`

**Interfaces:**
- Consumes: nothing from earlier tasks (the package folder exists from Task 2).
- Produces: `PHProvider` (posthog-js's `PostHogProvider`) and `posthog` (initialised client) from `sdk/tracking-analytics/src/posthog.ts`. Same names as the Task 1 no-op.

- [ ] **Step 1: Write the failing test**

Create `sdk/tracking-analytics/tests/posthog.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

const { init } = vi.hoisted(() => ({ init: vi.fn() }));
vi.mock('posthog-js', () => ({ default: { init } }));
vi.mock('posthog-js/react', () => ({
  PostHogProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="ph">{children}</div>,
}));

describe('sdk/tracking-analytics posthog', () => {
  it('initialises posthog once on import and renders its children', async () => {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = 'phc_test';
    delete process.env.NEXT_PUBLIC_POSTHOG_HOST;
    const { PHProvider, posthog } = await import('../src/posthog');

    expect(init).toHaveBeenCalledTimes(1);
    expect(init).toHaveBeenCalledWith('phc_test', {
      api_host: 'https://app.posthog.com',
      person_profiles: 'identified_only',
      capture_pageview: false,
    });

    render(
      <PHProvider client={posthog}>
        <p>child</p>
      </PHProvider>
    );
    expect(screen.getByTestId('ph').textContent).toBe('child');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run sdk/tracking-analytics/tests/posthog.test.tsx`
Expected: FAIL, cannot resolve `../src/posthog`.

- [ ] **Step 3: Write the implementation**

Create `sdk/tracking-analytics/src/posthog.ts` (the code `lib/sdk/posthog.ts` had before Task 1, unchanged):

```ts
'use client';

import posthog from 'posthog-js';

export { PostHogProvider as PHProvider } from 'posthog-js/react';

if (typeof window !== 'undefined') {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY || '', {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
    person_profiles: 'identified_only',
    capture_pageview: false, // App Router needs custom pageviews if we want them
  });
}

export { posthog };
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npm test && npm run type-check && npm run lint`
Expected: all pass. The same lint caveat as Task 2 applies (fixed in Task 6).

- [ ] **Step 5: Commit**

```bash
git add sdk/tracking-analytics/src/posthog.ts sdk/tracking-analytics/tests/posthog.test.tsx
git commit -m "feat: add PostHog to the tracking-analytics package"
```

---

### Task 4: Build-time swap

**Files:**
- Create: `sdk/tracking-analytics/next.mjs`, `sdk/tracking-analytics/tests/next.test.ts`
- Modify: `next.config.mjs`

**Interfaces:**
- Consumes: `src/sentry.ts` (Task 2), `src/posthog.ts` (Task 3), the no-op seams (Task 1).
- Produces: `withTrackingAnalytics(nextConfig)` from `sdk/tracking-analytics/next.mjs`. `next.config.mjs` exports the wrapped config when that file exists, the plain config when it does not.

- [ ] **Step 1: Write the failing test**

Create `sdk/tracking-analytics/tests/next.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { withTrackingAnalytics } from '../next.mjs';

// Identity stand-in so the test sees the config withTrackingAnalytics builds, not Sentry's webpack plugin wiring.
vi.mock('@sentry/nextjs/config', () => ({ withSentryConfig: (config: unknown) => config }));

type Alias = Record<string, string>;
type Built = {
  turbopack: { resolveAlias: Alias };
  webpack: (config: { resolve: { alias: Alias } }, options: object) => { resolve: { alias: Alias } };
};
const build = (config: object) => withTrackingAnalytics(config) as unknown as Built;

describe('withTrackingAnalytics', () => {
  it('aliases both seams to the package under Turbopack and keeps existing aliases', () => {
    const out = build({ turbopack: { resolveAlias: { other: './other.ts' } } });
    expect(out.turbopack.resolveAlias).toEqual({
      other: './other.ts',
      '@/lib/sdk/sentry': './sdk/tracking-analytics/src/sentry.ts',
      '@/lib/sdk/posthog': './sdk/tracking-analytics/src/posthog.ts',
    });
  });

  it('aliases both seams to the package under webpack and calls an existing webpack hook', () => {
    const existing = vi.fn((config) => config);
    const result = build({ webpack: existing }).webpack({ resolve: { alias: {} } }, {});
    expect(result.resolve.alias['@/lib/sdk/sentry$']).toMatch(/sdk\/tracking-analytics\/src\/sentry\.ts$/);
    expect(result.resolve.alias['@/lib/sdk/posthog$']).toMatch(/sdk\/tracking-analytics\/src\/posthog\.ts$/);
    expect(existing).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run sdk/tracking-analytics/tests/next.test.ts`
Expected: FAIL, cannot resolve `../next.mjs`.

- [ ] **Step 3: Write `sdk/tracking-analytics/next.mjs`**

```js
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { withSentryConfig } from '@sentry/nextjs/config';

// Seam module in the app -> file in this package that replaces it.
const SEAMS = { '@/lib/sdk/sentry': 'sentry', '@/lib/sdk/posthog': 'posthog' };
const srcDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'src');

// Swaps the app's no-op seams for this package and applies Sentry's build config.
export function withTrackingAnalytics(nextConfig) {
  const resolveAlias = { ...nextConfig.turbopack?.resolveAlias };
  for (const [seam, file] of Object.entries(SEAMS)) {
    resolveAlias[seam] = `./sdk/tracking-analytics/src/${file}.ts`;
  }

  const config = {
    ...nextConfig,
    turbopack: { ...nextConfig.turbopack, resolveAlias },
    webpack(webpackConfig, options) {
      for (const [seam, file] of Object.entries(SEAMS)) {
        webpackConfig.resolve.alias[`${seam}$`] = path.join(srcDir, `${file}.ts`);
      }
      return nextConfig.webpack ? nextConfig.webpack(webpackConfig, options) : webpackConfig;
    },
  };

  return withSentryConfig(config, {
    // For all available options, see:
    // https://github.com/getsentry/sentry-webpack-plugin#options

    // Suppresses source map uploading logs during build
    silent: true,
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
  }, {
    // For all available options, see:
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

    // Upload a larger set of source maps for prettier stack traces (increases build time)
    widenClientFileUpload: true,
    // Transpiles SDK to be compatible with IE11 (increases bundle size)
    transpileClientSDK: true,
    // Hides source maps from generated client bundles
    hideSourceMaps: true,
    // Automatically tree-shake Sentry logger statements to reduce bundle size
    disableLogger: true,
    // Enables automatic instrumentation of Vercel Cron Monitors.
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,
  });
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run sdk/tracking-analytics/tests/next.test.ts`
Expected: 2 tests pass.

- [ ] **Step 5: Wire `next.config.mjs`**

At the top, replace the first line `import { withSentryConfig } from '@sentry/nextjs/config';` with:

```js
import { existsSync } from 'node:fs';

// sdk/tracking-analytics is optional. Without it the app keeps the no-op seams in lib/sdk/.
const trackingAnalytics = new URL('./sdk/tracking-analytics/next.mjs', import.meta.url);
const withTrackingAnalytics = existsSync(trackingAnalytics)
  ? (await import(trackingAnalytics.href)).withTrackingAnalytics
  : (config) => config;
```

Replace everything from `export default withSentryConfig(nextConfig, {` to the end of the file with:

```js
export default withTrackingAnalytics(nextConfig);
```

- [ ] **Step 6: Build with the package and check both vendors are in the output**

Run:

```bash
rm -rf .next && NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 npm run build 2>&1 | tail -15
grep -rli "sentry" .next/static .next/server | head -3
grep -rl "person_profiles" .next/static | head -3
```

Expected: build passes; both greps print at least one file. If the build fails to resolve an alias under Turbopack, change the Turbopack alias value in `next.mjs` to the form the error asks for (a relative `./` path is documented), rerun, and keep the webpack alias. If Turbopack cannot alias a tsconfig-path specifier at all, stop and report: the fallback is to give each seam a bare specifier such as `tracking-sentry` and `tracking-posthog` in `tsconfig.json` `paths` and in the three callers. If the `'use client'` PostHog module does not behave as a client module once aliased (build error about server and client boundaries), stop and report.

- [ ] **Step 7: Build without the package and check neither vendor is in the output**

Run:

```bash
mv sdk/tracking-analytics /tmp/ta-pkg
rm -rf .next && NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 npm run build 2>&1 | tail -15
grep -rl "@sentry\|tracesSampleRate" .next/static .next/server --include=*.js --include=*.json | head -3
grep -rl "person_profiles" .next/static .next/server | head -3
mv /tmp/ta-pkg sdk/tracking-analytics
```

Expected: build passes; both greps print nothing. (A loose `grep -i sentry` also matches unrelated third-party text such as `sentry-trace` in tracing code, so the check uses `@sentry` and `tracesSampleRate`.)

- [ ] **Step 8: Commit**

```bash
git add sdk/tracking-analytics/next.mjs sdk/tracking-analytics/tests/next.test.ts next.config.mjs
git commit -m "feat: swap in sdk/tracking-analytics at build time when present"
```

---

### Task 5: Move Sentry init into the package

**Files:**
- Create: `instrumentation.ts`, `instrumentation-client.ts`
- Delete: `sentry.client.config.ts`, `sentry.edge.config.ts`, `sentry.server.config.ts`

**Interfaces:**
- Consumes: `initSentry(): void` from `@/lib/sdk/sentry` (Tasks 1 and 2).
- Produces: nothing for later tasks.

- [ ] **Step 1: Create `instrumentation.ts`**

```ts
import { initSentry } from '@/lib/sdk/sentry';

// Runs once per server runtime (nodejs and edge). initSentry is a no-op unless sdk/tracking-analytics is present.
export function register() {
  initSentry();
}
```

- [ ] **Step 2: Create `instrumentation-client.ts`**

```ts
import { initSentry } from '@/lib/sdk/sentry';

initSentry();
```

- [ ] **Step 3: Delete the three root config files**

```bash
git rm sentry.client.config.ts sentry.edge.config.ts sentry.server.config.ts
```

- [ ] **Step 4: Build with the package and check Sentry init is in the server and client output**

Run:

```bash
rm -rf .next && NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 npm run build 2>&1 | tail -15
grep -rl "tracesSampleRate" .next/static | head -2
grep -rl "tracesSampleRate" .next/server | head -2
```

Expected: build passes; each grep prints at least one file, so init is in both the client and the server output.

- [ ] **Step 5: Build without the package and check init is gone**

Run:

```bash
mv sdk/tracking-analytics /tmp/ta-pkg
rm -rf .next && NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 npm run build 2>&1 | tail -15
grep -rl "tracesSampleRate" .next/static .next/server | head -2
mv /tmp/ta-pkg sdk/tracking-analytics
```

Expected: build passes; grep prints nothing.

- [ ] **Step 6: Run the checks**

Run: `npm test && npm run type-check && npm run lint`
Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add instrumentation.ts instrumentation-client.ts
git commit -m "refactor: init Sentry through instrumentation and lib/sdk/sentry"
```

---

### Task 6: Lint rule, docs, final checks

**Files:**
- Modify: `eslint.config.mjs`, `lib/sdk/README.md`
- Create: `sdk/tracking-analytics/README.md`

**Interfaces:**
- Consumes: everything from Tasks 1 to 5.
- Produces: nothing.

- [ ] **Step 1: Let the package import the vendors**

In `eslint.config.mjs`, change the `ignores` line of the `no-restricted-imports` block from:

```js
ignores: ["lib/sdk/**", "sentry.*.config.ts", "next.config.mjs", "tests/**"],
```

to:

```js
ignores: ["lib/sdk/**", "sdk/tracking-analytics/**", "tests/**"],
```

In the comment above it, replace the sentence about root `sentry.*.config.ts` files and `next.config.mjs` with: `Sentry and PostHog live in sdk/tracking-analytics, which is optional (see sdk/tracking-analytics/README.md).`

- [ ] **Step 2: Update `lib/sdk/README.md`**

In the table, replace the `sentry.ts` and `posthog.ts` rows with:

```
| `sentry.ts` | none: no-op default, replaced by `sdk/tracking-analytics` at build time when that folder exists | error boundaries, `instrumentation*.ts` |
| `posthog.ts` | none: no-op default, replaced by `sdk/tracking-analytics` at build time when that folder exists | `components/providers/PostHogProvider.tsx` |
```

Delete the last paragraph (`Root \`sentry.*.config.ts\` files and \`next.config.mjs\` stay where Next.js looks for them and may import \`@sentry/nextjs\` directly.`) and replace it with:

```
Sentry and PostHog are optional. See `sdk/tracking-analytics/README.md`.
```

- [ ] **Step 3: Write `sdk/tracking-analytics/README.md`**

```md
# sdk/tracking-analytics

Optional error tracking (Sentry) and analytics (PostHog). The app imports from `@/lib/sdk/sentry` and
`@/lib/sdk/posthog`, which are no-ops. When this folder exists, `next.config.mjs` loads `next.mjs`, which
aliases those two modules to `src/sentry.ts` and `src/posthog.ts` and applies Sentry's build config.
Nothing checks for the folder at runtime.

| File | Role |
|---|---|
| `src/sentry.ts` | Real `captureException` and `initSentry` (the only `@sentry/nextjs` import in the app) |
| `src/posthog.ts` | Real `PHProvider` and `posthog`, and the `posthog.init` call (the only `posthog-js` import in the app) |
| `next.mjs` | `withTrackingAnalytics(nextConfig)`: both aliases plus `withSentryConfig` |

`sdk/` is the home for optional SDK modules; add the next one as `sdk/<name>/` in the same shape.
`lib/sdk/` is the app-side seam that imports from it.

Remove it: delete this folder. `@sentry/nextjs` and `posthog-js` stay in the root `dependencies` and are not bundled.

Check it is gone: `rm -rf .next && npm run build && grep -rli sentry .next/static .next/server` and
`grep -rl person_profiles .next/static .next/server` both print nothing.
```

- [ ] **Step 4: Run all checks with the package**

Run: `npm run check:task`
Expected: type-check, lint (0 errors), gitleaks, architecture check and tests with coverage pass. If the gitleaks step is not installed locally, run the pieces separately: `npm run type-check && npm run lint && npm run check:architecture && npm run test:coverage`.

- [ ] **Step 5: Run the checks without the package**

Run:

```bash
mv sdk/tracking-analytics /tmp/ta-pkg
npm run type-check && npm run lint && npm test
mv /tmp/ta-pkg sdk/tracking-analytics
```

Expected: all pass. (The build without the package was proved in Tasks 4 and 5.)

- [ ] **Step 6: Commit**

```bash
git add eslint.config.mjs lib/sdk/README.md sdk/tracking-analytics/README.md
git commit -m "docs: document optional tracking-analytics package and update lint ignores"
```

---

## Follow-ups (not in this plan)

- CI job that deletes `sdk/tracking-analytics` and runs type-check, test and build (changes CI config; ask first).
- Move `@sentry/nextjs` and `posthog-js` out of root `dependencies` (workspace plus lockfile check).
- `captureMessage`, `setUser`, PostHog `capture` and `identify` helpers, and Next's `onRequestError` hook.
