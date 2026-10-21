# package.json
lines:87 exports:
---
{
  "name": "quick-quiz",
  "version": "0.6.0",
  "private": true,
  "workspaces": [
    "sdk",
    "sdk/shared_modules",
    "packages/*"
  ],
  "scripts": {
    "postinstall": "node scripts/ensure-supabase-types.mjs",
    "dev": "next dev --turbo",
    "gen:admin": "node scripts/gen-admin-modules.mjs",
    "predev": "npm run gen:admin && npm run build:ui",
    "prebuild": "npm run gen:admin && npm run build:sdk && npm run build:ui",
    "build": "next build",
    "build:sdk": "npm run --prefix sdk/shared_modules build && npm run --prefix sdk build",
    "build:sdk-core": "npm run --prefix sdk/shared_modules build",
    "build:ui": "npm run --prefix packages/ui build",
    "pretest": "npm run gen:admin && npm run build:sdk",
    "pretest:coverage": "npm run gen:admin && npm run build:sdk && npm run build:ui",
    "start": "next start",
    "lint": "eslint",
    "test": "vitest -c vitest.node.config.cjs run tests/ components/ sdk/tracking-analytics/ sdk/remote_config/ sdk/shared_modules/ sdk/formatter/",
    "test:coverage": "vitest run tests/ components/ sdk/tracking-analytics/ sdk/remote_config/ sdk/shared_modules/ sdk/formatter/ --coverage",
    "type-check": "tsc --noEmit",
    "check:fast": "npm run type-check && npm run lint && gitleaks git --pre-commit --redact --no-banner",
    "check:architecture": "depcruise --validate app lib components hooks sdk/remote_config",
    "check:bundle": "node scripts/check-bundle.mjs",
    "check:security": "uvx semgrep scan --config p/default --error app/ lib/ components/ hooks/",
    "check:a11y": "npx --yes @axe-core/cli@4.13.0 http://localhost:3000 --tags wcag2a,wcag2aa,wcag21aa",
    "check:perf": "lighthouse http://localhost:3000 --output=json --quiet",
    "check:task": "npm run check:fast && npm run check:architecture && npm run test:coverage",
    "check:full": "npm run check:task && npm run check:security && npm run check:deps",
    "check:deps": "npm audit --omit=dev --audit-level=high",
    "check:db": "supabase db reset && supabase test db && supabase db lint --level warning",
    "docker:build": "docker compose build && docker image prune -f",
    "docker:up": "docker compose up -d --build && docker image prune -f"
  },
  "dependencies": {
