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
  ]),
  {
    // An empty catch hides failures; say why ignoring is safe in a comment instead.
    rules: { "no-empty": ["error", { allowEmptyCatch: false }] },
  },
  {
    // lib/sdk is the only place that imports a vendor SDK (see lib/sdk/README.md); add new
    // packages to the first group. The root sentry.*.config.ts files and next.config.mjs must stay where Next.js
    // looks for them.
    // lib/db owns database access: everything else calls its domain functions, never a
    // Supabase client. The secret-key client bypasses RLS, so this is a security boundary.
    ignores: ["lib/sdk/**", "sdk/tracking-analytics/**", "sentry.*.config.ts", "next.config.mjs", "tests/**"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [
          {
            group: ["@supabase/*", "@google/genai", "@sentry/*", "posthog-js", "posthog-js/*"],
            message: "Import vendor SDKs through lib/sdk, not directly.",
          },
          {
            group: ["**/sdk/supabase", "**/sdk/supabase-admin", "**/db/client*"],
            message: "Use the domain functions in lib/db instead of a Supabase client.",
          },
        ],
      }],
    },
  },
  {
    // lib/db is the one caller of the Supabase wrappers; vendor packages stay banned there.
    files: ["lib/db/**"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{
          group: ["@supabase/*", "@google/genai", "@sentry/*", "posthog-js", "posthog-js/*"],
          message: "Import vendor SDKs through lib/sdk, not directly.",
        }],
      }],
    },
  },
  {
    files: ["components/**/*.tsx", "components/**/*.jsx"],
    rules: {
      "max-lines": ["error", { "max": 200, "skipBlankLines": true, "skipComments": true }]
    }
  }
]);

export default eslintConfig;
