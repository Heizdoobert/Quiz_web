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
    "contracts/**",
    ".agents/**",
    "coverage/**",
    "mobile/**",
  ]),
  {
    files: ["components/**/*.tsx", "components/**/*.jsx"],
    rules: {
      "max-lines": ["error", { "max": 200, "skipBlankLines": true, "skipComments": true }]
    }
  }
]);

export default eslintConfig;
