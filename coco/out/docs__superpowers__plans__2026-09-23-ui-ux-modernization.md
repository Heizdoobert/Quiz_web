# docs/superpowers/plans/2026-09-23-ui-ux-modernization.md
lines:392 exports:
---
# UI/UX Modernization (Neo-Crypto Glassmorphism) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modernize the whole app's visual design (glassmorphism over the existing dark cyber-crypto identity) without changing quiz logic, backend, or adding dependencies.

**Architecture:** All new visual language lives as Tailwind v4 CSS tokens/utilities in `app/globals.css` (Task 1). Every later task consumes only those tokens/utilities — no task invents its own one-off colors or shadow values. Framer-motion (already installed) is used for entrance/hover/tap/modal motion, added directly in each component.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind CSS v4 (CSS-first `@theme` config, no JS theme in `tailwind.config.js`), framer-motion 13, TypeScript. No test framework exists in this repo — verification is `tsc --noEmit`, `eslint`, and `next build` per task, plus a manual visual check (no automated visual regression, per spec).

**Spec:** `docs/superpowers/specs/2026-09-23-ui-ux-modernization-design.md`

## Global Constraints

- No new npm dependencies (spec: "stays within the existing stack").
- No quiz-logic/backend changes — presentation layer only.
- All new motion must degrade through the existing `prefers-reduced-motion` media query in `app/globals.css:99-105` — never bypass it.
- Base color palette (deep-space, cyber-violet, neo-mint, electric-indigo, crypto-gold, pop-coral, `cat-defi`/`cat-nft`/`cat-l1`) stays — only how it's applied changes (glass surfaces instead of glow).
- Every task must pass `npx tsc --noEmit` and `npx eslint <changed files>` clean before commit.

---

## Task 1: Design tokens & glass utility layer

**Files:**
- Modify: `app/globals.css`

**Interfaces:**
- Produces (consumed by every later task):
  - `--color-elevation-2: #14163A` — new mid-tone surface (between existing `--color-deep-space: #0A1128` and `--color-cyber-violet: #1A1B35`)
  - `.glass` — base glass surface utility class
  - `.glass-border` — 1px gradient-border utility (pairs with `.glass`)
  - `.glass-edge` — 1px inset top highlight (pairs with `.glass`)
  - Retired (do not use in new code, remove usages as each later task touches a file): `.glow-mint`, `.glow-indigo`, `.glow-gold`, `.glow-coral`, `.gradient-claim`, `.gradient-victory`

- [ ] **Step 1: Add elevation token and glass utilities**

Add to `:root` block in `app/globals.css` (after line 18, before closing `}`):

```css
