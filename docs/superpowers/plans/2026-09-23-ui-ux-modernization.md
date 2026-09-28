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
  --color-elevation-2: #14163A;
```

Add to `@theme` block (after line 34, before closing `}`):

```css
  --color-elevation-2: #14163A;
```

Add after the existing `.gradient-victory` rule (after line 83):

```css
/* Glassmorphism surfaces (Neo-Crypto Glassmorphism redesign) */
.glass {
  background: rgba(20, 22, 58, 0.6);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

.glass-border {
  position: relative;
}
.glass-border::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 1px;
  background: linear-gradient(135deg, rgba(0, 255, 204, 0.4), rgba(108, 92, 231, 0.4));
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
}

.glass-edge {
  position: relative;
}
.glass-edge::after {
  content: "";
  position: absolute;
  top: 0;
  left: 8%;
  right: 8%;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.25), transparent);
  pointer-events: none;
}
```

- [ ] **Step 2: Remove retired glow/gradient utilities**

Delete lines 64-83 in `app/globals.css` (the `.glow-mint`, `.glow-indigo`, `.glow-gold`, `.glow-coral`, `.gradient-claim`, `.gradient-victory` rules) — they are superseded by `.glass`/`.glass-border`/`.glass-edge`. Do this only after confirming (via Step 3 grep) every usage site is a file a later task will touch.

- [ ] **Step 3: Verify no orphaned references**

Run: `grep -rn "glow-mint\|glow-indigo\|glow-gold\|glow-coral\|gradient-claim\|gradient-victory" components/ app/`
Expected: every match is in a file covered by Task 2-7 below (record the list — later tasks must remove these usages when they touch that file). If a match is in a file not covered by any task, add it to Task 7's file list before proceeding.

- [ ] **Step 4: Typecheck and lint**

Run: `npx tsc --noEmit`
Expected: no new errors.

Run: `npx eslint app/globals.css` (CSS not linted by eslint — skip; instead run `npx next build 2>&1 | tail -30` to confirm the CSS parses)
Expected: build succeeds (component-level errors from removed classes are expected until Tasks 2-7 land — do not treat as blocking for this task's commit since it's an additive+prep step, but note the count of build warnings/errors here for comparison after Task 2).

- [ ] **Step 5: Commit**

```bash
git add app/globals.css
git commit -m "feat(ui): add glassmorphism design tokens and utilities

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 2: Shared `Modal.tsx` primitive + motion

**Files:**
- Modify: `components/Modal.tsx`

**Interfaces:**
- Consumes: `.glass`, `.glass-border` from Task 1.
- Produces (consumed by Task 5): the modal shell's outer wrapper className pattern and the `AnimatePresence`/`motion.div` open-close pattern — later modal-specific components must not re-implement backdrop/shell markup, only content.

- [ ] **Step 1: Read current implementation**

Run: `cat components/Modal.tsx` — identify the current backdrop element, panel element, and any existing open/close conditional rendering (`isOpen && (...)` or similar).

- [ ] **Step 2: Apply glass shell + framer-motion open/close**

Replace the panel wrapper's className to use the new elevation-3 surface + glass utilities, e.g. (adapt to the actual existing class list found in Step 1 — keep any existing responsive/positioning classes, only replace background/border/shadow classes):

```tsx
import { motion, AnimatePresence } from "framer-motion";

// backdrop
<AnimatePresence>
  {isOpen && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="glass glass-border glass-edge rounded-3xl bg-[color:var(--color-elevation-2)]/60 p-6"
      >
        {children}
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>
```

Keep the existing close-button and click-outside-to-close logic as-is — only the styling/motion wrapper changes.

- [ ] **Step 3: Typecheck and lint**

Run: `npx tsc --noEmit` — expected: no errors.
Run: `npx eslint components/Modal.tsx` — expected: clean.

- [ ] **Step 4: Commit**

```bash
git add components/Modal.tsx
git commit -m "feat(ui): glass shell + motion for shared Modal primitive

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 3: Layout components (Header, Sidebar, StatsPanel, HistoryList)

**Files:**
- Modify: `components/layout/Header.tsx`
- Modify: `components/layout/Sidebar.tsx`
- Modify: `components/layout/StatsPanel.tsx`
- Modify: `components/layout/HistoryList.tsx`

**Interfaces:**
- Consumes: `.glass`, `.glass-border`, `.glass-edge`, `--color-elevation-2` from Task 1.

- [ ] **Step 1: Grep current glow/gradient usage in these 4 files**

Run: `grep -n "glow-\|gradient-claim\|gradient-victory" components/layout/*.tsx`
Record each match — these are the exact lines to replace in Step 2.

- [ ] **Step 2: Replace glow/gradient surfaces with glass**

For each panel/card container found in Step 1, replace the class list's shadow/glow class with `glass glass-border` (add `glass-edge` only on top-level cards, not nested elements), and bump `rounded-lg`/`rounded-xl` to `rounded-2xl` on card containers. Increase container padding one Tailwind step (e.g. `p-4` → `p-5`, `p-6` → `p-8`) per spec section A spacing guidance.

- [ ] **Step 3: Typecheck and lint**

Run: `npx tsc --noEmit` — expected: no errors.
Run: `npx eslint components/layout/` — expected: clean.

- [ ] **Step 4: Commit**

```bash
git add components/layout/
git commit -m "feat(ui): glassmorphism pass on layout components

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 4: Quiz flow components

**Files:**
- Modify: `components/quiz/QuizCard.tsx`
- Modify: `components/quiz/QuestionFront.tsx`
- Modify: `components/quiz/QuestionForm.tsx`
- Modify: `components/quiz/AnswerBack.tsx`
- Modify: `components/quiz/CategoryBar.tsx`
- Modify: `components/quiz/QuizLayout.tsx`

**Interfaces:**
- Consumes: `.glass`, `.glass-border`, `.glass-edge`, `--color-elevation-2` from Task 1.
- Produces: none consumed elsewhere (leaf surface).

- [ ] **Step 1: Grep current glow/gradient usage**

Run: `grep -n "glow-\|gradient-claim\|gradient-victory" components/quiz/*.tsx`

- [ ] **Step 2: Apply glass surfaces to QuizCard/AnswerBack**

Replace card face background/shadow classes with `glass glass-border glass-edge`, bump radius to `rounded-2xl`+. Re-time the existing 3D flip transition: find the current flip `transition` prop (likely a `motion.div` with `animate={{ rotateY: ... }}`) and change its `transition` to `{ type: "spring", stiffness: 300, damping: 30 }` instead of a linear/ease duration, per spec section C.

- [ ] **Step 3: Apply glass to CategoryBar badges**

Replace category badge classes (glow-pill style) with a solid chip using the existing `cat-defi`/`cat-nft`/`cat-l1` background colors at full opacity + `glass-border` outline instead of a glow box-shadow.

- [ ] **Step 4: Add button motion in QuestionForm**

For the answer-selection buttons, add `whileTap={{ scale: 0.97 }}` and change hover state from a static glow class to a `whileHover` gradient-brighten (e.g. `whileHover={{ filter: "brightness(1.1)" }}`) using framer-motion's `motion.button`.

- [ ] **Step 5: Add list stagger to any list rendering in QuizLayout**

If `QuizLayout.tsx` renders a list (e.g. answer options), wrap items in `motion.div` with `initial={{ opacity: 0, y: 10 }}`, `animate={{ opacity: 1, y: 0 }}`, `transition={{ delay: index * 0.04 }}`.

- [ ] **Step 6: Typecheck and lint**

Run: `npx tsc --noEmit` — expected: no errors.
Run: `npx eslint components/quiz/` — expected: clean.

- [ ] **Step 7: Commit**

```bash
git add components/quiz/
git commit -m "feat(ui): glassmorphism + motion pass on quiz flow

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 5: Feature modals

**Files:**
- Modify: `components/modals/DisputeModal.tsx`
- Modify: `components/modals/GroupModal.tsx`
- Modify: `components/modals/IntroModal.tsx`
- Modify: `components/modals/ProfileModal.tsx`
- Modify: `components/modals/ReviewModal.tsx`
- Modify: `components/modals/RewardsModal.tsx`
- Modify: `components/modals/TimerSettingsModal.tsx`

**Interfaces:**
- Consumes: the glass shell pattern from `components/Modal.tsx` (Task 2) — each of these 7 files renders content *inside* that shell; do not re-add backdrop/panel wrapper markup here if it already delegates to `Modal.tsx`. If a modal has its own independent wrapper (not using the shared primitive), give it the same `glass glass-border glass-edge rounded-3xl` treatment directly.

- [ ] **Step 1: Check which modals use the shared primitive**

Run: `grep -L "from.*['\"].*/Modal['\"]" components/modals/*.tsx` — files listed here do NOT import the shared `Modal.tsx` and need direct glass styling; files not listed already delegate and only need internal content spacing/typography updates (bump padding, drop Orbitron from non-hero headings per Task 1's typography guidance).

- [ ] **Step 2: Apply glass styling per file**

For each file identified in Step 1 as not using the shared primitive: same treatment as Task 2 Step 2 (glass shell + framer-motion open/close). For all 7 files: increase internal padding, replace any remaining `glow-*` classes on internal elements (buttons, badges) the same way as Task 4 Step 4.

- [ ] **Step 3: Typecheck and lint**

Run: `npx tsc --noEmit` — expected: no errors.
Run: `npx eslint components/modals/` — expected: clean.

- [ ] **Step 4: Commit**

```bash
git add components/modals/
git commit -m "feat(ui): glassmorphism pass on feature modals

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 6: Leaderboard components

**Files:**
- Modify: `components/leaderboard/LeaderboardPanel.tsx`
- Modify: `components/leaderboard/GlobalLeaderboard.tsx`
- Modify: `components/leaderboard/GroupLeaderboard.tsx`

**Interfaces:**
- Consumes: `.glass`, `.glass-border`, `.glass-edge`, `--color-elevation-2` from Task 1.

- [ ] **Step 1: Grep current glow/gradient usage**

Run: `grep -n "glow-\|gradient-claim\|gradient-victory" components/leaderboard/*.tsx`

- [ ] **Step 2: Alternating elevation for rows**

In `GlobalLeaderboard.tsx` and `GroupLeaderboard.tsx`, find the row-rendering map and change any alternating-color-banding class (e.g. `bg-cyber-violet` vs `bg-cyber-violet-light` by index parity) to alternate between `bg-[color:var(--color-deep-space)]` and `bg-[color:var(--color-elevation-2)]` instead, keeping the same index-parity condition.

- [ ] **Step 3: Rank #1-3 accent**

Replace any rank-1/2/3 glow badge class with a gradient-mesh background: `bg-gradient-to-br from-[--color-crypto-gold]/20 to-[--color-pop-coral]/20` combined with `glass-border`, applied only when `rank <= 3`.

- [ ] **Step 4: Stagger entrance**

Wrap each row in `motion.div` with the same stagger pattern as Task 4 Step 5 (`transition={{ delay: index * 0.04 }}`).

- [ ] **Step 5: Typecheck and lint**

Run: `npx tsc --noEmit` — expected: no errors.
Run: `npx eslint components/leaderboard/` — expected: clean.

- [ ] **Step 6: Commit**

```bash
git add components/leaderboard/
git commit -m "feat(ui): glassmorphism + stagger motion on leaderboard

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 7: Ads + SEO touch-ups, final orphan cleanup, full build

**Files:**
- Modify: `components/ads/AdZone.tsx`
- Modify: `components/ads/StickyBannerAd.tsx`
- Modify: `components/seo/SeoFaqSection.tsx`
- Modify: any file flagged as an orphan in Task 1 Step 3 not already covered above

**Interfaces:**
- Consumes: `.glass`, `.glass-border` from Task 1.

- [ ] **Step 1: Grep remaining glow/gradient usage across whole repo**

Run: `grep -rn "glow-mint\|glow-indigo\|glow-gold\|glow-coral\|gradient-claim\|gradient-victory" components/ app/`
Expected: zero matches. If any remain, they belong to this task — apply the same `glass`/`glass-border` substitution used in prior tasks.

- [ ] **Step 2: Token-only touch-up on ads/SEO**

Bump radius/padding on `AdZone.tsx`, `StickyBannerAd.tsx`, `SeoFaqSection.tsx` containers to match the rest of the app (`rounded-2xl`, one padding step up) — no motion or structural change needed here per spec (lowest priority surfaces).

- [ ] **Step 3: Full verification**

Run: `npx tsc --noEmit` — expected: no errors.
Run: `npx eslint components/ app/` — expected: clean.
Run: `npx next build` — expected: compiles successfully, same route list as before (`/`, `/_not-found`, `/manifest.webmanifest`, `/robots.txt`, `/sitemap.xml`), no new errors.

- [ ] **Step 4: Manual visual check**

Run `npm run dev`, open the app, click through: quiz flow (flip card, answer selection), open each of the 7 modals, view leaderboard (global + group tabs), confirm glass/blur renders and motion feels smooth. Confirm OS-level "reduce motion" setting suppresses the new animations (existing `prefers-reduced-motion` block in `globals.css` already covers this — no code change needed, just confirm).

- [ ] **Step 5: Commit**

```bash
git add components/ads/ components/seo/
git commit -m "feat(ui): token touch-ups on ads/SEO, complete glassmorphism rollout

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Self-Review Notes

- **Spec coverage:** Section A (tokens) → Task 1. Section B (component patterns: cards/buttons/badges/modals/leaderboard rows) → Tasks 2-6. Section C (motion) → Tasks 2, 4, 6. Section D (rollout order) → Task numbering matches spec's 1-5 sequencing exactly, with Task 2 (shared Modal primitive) pulled ahead of Task 3 since spec section D groups it under "shared/layout" stage 2 and Task 5 (per-modal content) depends on it.
- **Modal count correction:** spec said "all 6 feature modals"; repo actually has 7 (`ReviewModal.tsx` exists in addition to the 6 named). Task 5 covers all 7 — not a scope change, just an accurate file list.
- **Type consistency:** utility class names (`.glass`, `.glass-border`, `.glass-edge`) and token name (`--color-elevation-2`) are defined once in Task 1 and referenced identically in Tasks 2-7.
