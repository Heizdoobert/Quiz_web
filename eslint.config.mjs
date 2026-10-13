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
    rules: {
      "no-empty": ["error", { allowEmptyCatch: false }],
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
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
    // sdk/remote_config reads the remote_config table through the public client only: no
    // vendor package, no direct wrapper, no secret-key admin().
    files: ["sdk/remote_config/**"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [
          {
            group: ["@supabase/*", "@google/genai", "@sentry/*", "posthog-js", "posthog-js/*"],
            message: "Import vendor SDKs through lib/sdk, not directly.",
          },
          {
            group: ["**/sdk/supabase", "**/sdk/supabase-admin"],
            message: "sdk/remote_config reads through pub from @/lib/db/client only.",
          },
          {
            group: ["**/db/client*"],
            importNames: ["admin"],
            message: "sdk/remote_config may use pub only, never the secret-key admin client.",
          },
        ],
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
