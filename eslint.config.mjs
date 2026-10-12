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
    // lib/db owns database access: everything else calls its domain functions, never a
    // Supabase client. The secret-key client bypasses RLS, so this is a security boundary.
    ignores: ["lib/db/**", "lib/supabase/**", "tests/**"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{
          group: ["@supabase/supabase-js", "**/supabase/supabase", "**/supabase/supabase-admin", "**/db/client"],
          message: "Use the domain functions in lib/db instead of a Supabase client.",
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
