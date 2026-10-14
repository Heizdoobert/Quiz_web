# docs/decisions/004-server-action-module-separation.md
lines:34 exports:MIN_LIST_QUESTIONS,validateQuestionInput
---
# ADR-004: Next.js Server Action Bundling & Module Separation

## Status
Accepted

## Date
2026-09-28

## Context
Next.js App Router enforces strict constraints on files marked with the `'use server'` directive:
1. **Export Constraints**: Next.js transforms all exports of a `'use server'` module into asynchronous RPC stubs when bundled for client components.
2. **Failure Mode**: If a `'use server'` file exports non-async items — such as constants (`export const MIN_LIST_QUESTIONS = 20`) or synchronous helper functions (`export function validateQuestionInput(...)`) — the Next.js compiler rejects the module for client bundles with the error:
   ```
   The module has no exports at all. All exports of the module are statically known...
   ```
   This broke client components importing those actions (e.g. `MyListsDashboard.tsx`, `ReviewQueue.tsx`).

## Decision
We established a strict separation of concerns for server-side code:
1. **Action Files (`lib/actions/*.ts`)**:
   - Contain `'use server'` at top-level.
   - **Exclusively export `async function` declarations**.
   - Prohibit exporting `const`, `let`, `var`, `enum`, or synchronous functions.
2. **Shared Constants (`lib/list-constants.ts`, `lib/contracts/*.ts`)**:
   - Standalone TypeScript files without `'use server'`.
   - Safe to import by both React Server Components, Client Components (`'use client'`), and Server Actions.
3. **Pure Validation & Utilities (`lib/validation.ts`, `lib/utils.ts`)**:
   - Pure synchronous functions (`isUuid`, `validateQuestionInput`, `normalizePrompt`) reside in `lib/validation.ts`.
   - Callable anywhere without triggering Next.js server RPC overhead.

## Consequences
- **Positive**: Eliminates Next.js compilation failures and ensures clean client-server boundaries.
- **Positive**: Client components can evaluate input validation constraints locally (instant UI feedback) using the exact same logic that runs on the server.
- **Convention**: Developers and agents working on the codebase must never export constants or non-async utilities from files under `lib/actions/`.
