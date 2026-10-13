# Adoption of `@quizweb/sdk-core` and `@heizdoobert/quickquiz-ui` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate `@quizweb/sdk-core` into `sdk/` and `lib/` as the single source of truth for domain types, and wire `@heizdoobert/quickquiz-ui` design tokens and primitives into `web_quiz` components.

**Architecture:** 
1. **Domain Types:** `@quizweb/sdk-core` (`sdk/shared_modules`) exports canonical TypeScript types and Zod schemas. `sdk/src/types.ts` and `lib/types.ts` will re-export from `@quizweb/sdk-core` to remove type duplication and enforce cross-platform consistency with mobile while maintaining 100% backwards compatibility.
2. **UI Primitives:** `@heizdoobert/quickquiz-ui` (`packages/ui`) delivers CSS custom property design tokens and accessible React 19 primitives (`Button`, `Card`, `Badge`, `Input`, `Modal`). `app/globals.css` imports `@heizdoobert/quickquiz-ui/styles.css`, and `components/ui/Modal.tsx` along with target components adopt UI SDK primitives.

**Tech Stack:** React 19, TypeScript, Next.js 16.4.0 (Turbopack), Tailwind CSS v4, tsup, Vitest.

---

### Task 1: Configure Path Aliases for `@quizweb/sdk-core`

**Files:**
- Modify: `tsconfig.json`
- Modify: `vitest.config.ts`

- [x] **Step 1: Add path alias for `@quizweb/sdk-core` in `tsconfig.json`** (`"@quizweb/sdk-core": ["./sdk/shared_modules/src/index.ts"]`)
- [x] **Step 2: Add path alias for `@quizweb/sdk-core` in `vitest.config.ts`**
- [x] **Step 3: Run `npm run type-check` to verify configuration**
- [x] **Step 4: Commit with message `feat(config): add path aliases for @quizweb/sdk-core`**

---

### Task 2: Consolidate `sdk/src/types.ts` with `@quizweb/sdk-core`

**Files:**
- Modify: `sdk/src/types.ts`
- Test: `sdk/tests/resources.test.ts`, `sdk/tests/named-functions.test.ts`

- [x] **Step 1: Check existing types in `sdk/src/types.ts` vs `@quizweb/sdk-core`**
- [x] **Step 2: Re-export shared domain types from `@quizweb/sdk-core` in `sdk/src/types.ts`** (`Question`, `ClientQuestion`, `QuestionDispute`, `QuizResult`, `Group`, `LeaderboardEntry`, etc.)
- [x] **Step 3: Build SDK with `npm run build:sdk`**
- [x] **Step 4: Run SDK unit tests (`npx vitest run sdk/tests/`)**
- [x] **Step 5: Commit with message `refactor(sdk): adopt @quizweb/sdk-core types in sdk/src/types.ts`**

---

### Task 3: Consolidate `lib/types.ts` with `@quizweb/sdk-core`

**Files:**
- Modify: `lib/types.ts`
- Test: `tests/sdk-gate.test.ts`, `tests/question-actions.test.ts`

- [x] **Step 1: Inspect `lib/types.ts` domain DTOs**
- [x] **Step 2: Import and re-export shared domain DTOs from `@quizweb/sdk-core`** while preserving web-specific types (`UserStats`, `HistoryItem`, `ActionResult`, `ThemeMode`, etc.)
- [x] **Step 3: Run `npm run type-check` and `npm run check:architecture`**
- [x] **Step 4: Run full Vitest test suite**
- [x] **Step 5: Commit with message `refactor(web): re-export core domain types from @quizweb/sdk-core in lib/types.ts`**

---

### Task 4: Wire `@heizdoobert/quickquiz-ui` Tokens into Root CSS

**Files:**
- Modify: `app/globals.css`
- Test: `tests/ui-sdk-integration.test.tsx`

- [x] **Step 1: Add `@import "@heizdoobert/quickquiz-ui/styles.css";` to `app/globals.css`**
- [x] **Step 2: Verify CSS builds cleanly under Tailwind v4**
- [x] **Step 3: Run `npm run build` to verify Next.js production build passes**
- [x] **Step 4: Commit with message `feat(ui): import @heizdoobert/quickquiz-ui styles and tokens in globals.css`**

---

### Task 5: Adapt `components/ui/Modal.tsx` to Use `@heizdoobert/quickquiz-ui`

**Files:**
- Modify: `components/ui/Modal.tsx`
- Test: `tests/modal-focus.test.tsx`

- [x] **Step 1: Review `components/ui/Modal.tsx` and its test contract in `tests/modal-focus.test.tsx`**
- [x] **Step 2: Update `components/ui/Modal.tsx` to adopt `@heizdoobert/quickquiz-ui` Modal styling & tokens while maintaining existing props & ARIA focus trapping**
- [x] **Step 3: Run `npx vitest run tests/modal-focus.test.tsx` and all modal-dependent tests**
- [x] **Step 4: Commit with message `refactor(ui): align components/ui/Modal with @heizdoobert/quickquiz-ui modal foundation`**

---

### Task 6: Adopt UI Primitives and Full Verification

**Files:**
- Test: Monorepo test suite & quality gate

- [x] **Step 1: Verify Button, Badge, Card, and Input integrations**
- [x] **Step 2: Run `npm run check:task` (TypeScript, ESLint, Architecture, Coverage Ratchet)**
- [x] **Step 3: Run Next.js production build (`npm run build`)**
- [x] **Step 4: Commit with message `chore(ui): complete @quizweb/sdk-core and @heizdoobert/quickquiz-ui adoption`**
