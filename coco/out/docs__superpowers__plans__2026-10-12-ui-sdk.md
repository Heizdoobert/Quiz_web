# docs/superpowers/plans/2026-10-12-ui-sdk.md
lines:156 exports:
---
# QuickQuiz UI SDK Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone, reusable workspace UI SDK (`@heizdoobert/quickquiz-ui` in `packages/ui`) featuring centralized design tokens (CSS variables + TypeScript) and Ant Design-style core primitives (`Button`, `Card`, `Badge`, `Input`, `Modal`), then wire it into `web_quiz`.

**Architecture:** A standalone monorepo workspace package (`packages/ui`) built with `tsup` targeting ESM/CJS bundles and full TypeScript `.d.ts` declarations. Styling is powered by clean, standard CSS variables and utility classes in `@heizdoobert/quickquiz-ui/styles.css` without external runtime CSS-in-JS dependencies. Core primitives use accessible HTML5 semantics and ARIA standards. Root `web_quiz` registers the workspace, imports components, and can be globally re-themed by adjusting tokens.

**Tech Stack:** React 19, TypeScript, CSS Variables, Tailwind CSS v4, tsup, Vitest, `@testing-library/react`.

**Spec:** Defined and verified via `/interview-me` on 2026-10-12:
- Standalone workspace package `@heizdoobert/quickquiz-ui` in `packages/ui`.
- Centralized design tokens: colors (primary, secondary, accent, destructive, surface, background, text, border), radii, spacing, typography, shadows.
- Core primitives: `Button`, `Card` (with header/title/content/footer), `Badge`, `Input`, `Modal` (dialog with backdrop, ESC dismissal, accessible focus).
- Stylesheet export `@heizdoobert/quickquiz-ui/styles.css`.
- Ponytail ultra principle: Zero heavy external component libraries; lean native React 19 components with peer dependencies on `react` and `react-dom`.
- Independent test suite running in Vitest.
- Monorepo integration into `package.json` workspaces.

## Global Constraints
- Target Node.js >= 20, React 19, Tailwind CSS v4.
- Zero runtime UI dependencies (no Radix/MUI/Antd runtime dependencies; pure React 19 + ARIA).
- CSS tokens delivered via standard CSS variables compatible with Tailwind `@theme`.
- 100% passing tests for all primitives across variants and states.

---

### Task 1: Package Scaffolding & Design Tokens

**Files:**
- Create: `packages/ui/package.json`
- Create: `packages/ui/tsconfig.json`
- Create: `packages/ui/tsup.config.ts`
- Create: `packages/ui/src/tokens/colors.ts`
- Create: `packages/ui/src/tokens/radii.ts`
- Create: `packages/ui/src/tokens/typography.ts`
- Create: `packages/ui/src/tokens/index.ts`
- Create: `packages/ui/src/styles/tokens.css`
- Create: `packages/ui/src/index.ts`
- Test: `packages/ui/tests/tokens.test.ts`
