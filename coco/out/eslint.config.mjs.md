# eslint.config.mjs
lines:94 exports:default
---
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    ".worktrees/**",
    ".claude/**",
    ".agents/**",
    "coverage/**",
    "mobile/**",
    "packages/**/dist/**",
    "sdk/**/dist/**",
  ]),
  {
    // An empty catch hides failures; say why ignoring is safe in a comment instead.
    rules: { "no-empty": ["error", { allowEmptyCatch: false }] },
  },
  {
    // lib/sdk is the only place that imports a vendor SDK (see lib/sdk/README.md); add new
    // packages to the first group. Sentry and PostHog live in sdk/tracking-analytics, which is
    // optional (see sdk/tracking-analytics/README.md).
    // lib/db owns database access: everything else calls its domain functions, never a
    // Supabase client. The secret-key client bypasses RLS, so this is a security boundary.
    // sdk/remote_config has its own block below.
    ignores: ["lib/sdk/**", "sdk/tracking-analytics/**", "sdk/remote_config/**", "tests/**"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [
          {
            group: ["@supabase/*", "@google/genai", "@sentry/*", "posthog-js", "posthog-js/*"],
            message: "Import vendor SDKs through lib/sdk, not directly.",
