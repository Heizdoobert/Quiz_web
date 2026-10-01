# docs/superpowers/plans/2026-09-23-ui-ux-pro-max-refinements.md
lines:66 exports:
---
# UI/UX Pro Max Refinements (Typography, SVG Icons & Micro-Interactions) Implementation Plan

Enhance Quick Quiz UI/UX according to UI/UX Pro Max guidelines across three key areas:
1. **Refine Typography:** Load and apply `Orbitron` (headings, stats, countdown numbers) & `Exo 2` (body text, answer options, descriptions) via `next/font/google`.
2. **Replace Unicode Emojis with SVG Icons:** Upgrade all remaining emoji glyphs (`💡`, `⏱️`, `🛡️`, `📋`, `🚀`, `⚡`, `➕`, etc.) to Lucide SVG icons.
3. **Add Micro-Interactions:** Enhance answer clicks, card flipping, streak counter pulsing, and claim button states with Framer Motion spring physics and visual feedback.

---

## User Review Checkpoint
> [!NOTE]
> The plan follows a 3-step sequence (`1->2->3`) executed incrementally with verification at each step.

---

## Proposed Changes

### Task 1: Typography Integration (`Orbitron` & `Exo 2`)
- **`app/layout.tsx`**:
  - Import `Orbitron` and `Exo_2` from `'next/font/google'`.
  - Configure CSS variables `--font-orbitron` and `--font-exo2`.
  - Apply both font variables to `<html>` / `<body>`.
- **`app/globals.css`**:
  - Register `--font-heading` and `--font-sans` under `@theme`.
  - Set default `font-family: var(--font-exo2), system-ui, sans-serif;` on `body`.
  - Set `h1, h2, h3, h4, .font-heading { font-family: var(--font-orbitron), sans-serif; }`.
- **Typography styling across components**:
  - Apply `.font-heading` or `font-heading` to brand titles, question prompts, stats numbers, leaderboard ranks, and timer clocks.

### Task 2: Replace Unicode Emojis with Lucide SVG Icons
- **`components/QuizCard.tsx`**: Replace `🚀` with `Rocket`, `➕` with `PlusCircle`.
- **`components/QuestionFront.tsx`**: Replace `⏱️` with `Clock`, `⚡` with `Sparkles`, `⏭️` with `SkipForward`.
- **`components/AnswerBack.tsx`**: Replace `🎉` with `CheckCircle2`, `❌` with `XCircle`, `➡️` with `ArrowRight`.
- **`components/StatsPanel.tsx`**: Replace `🏆` with `Trophy`, `🔥` with `Flame`, `🎯` with `Target`, `🪙` with `Coins`.
- **`components/HistoryList.tsx`**: Replace `📜` with `History`, `✅` with `Check`, `❌` with `X`.
- **`components/LeaderboardPanel.tsx`**: Replace `🏆` and `🛡️` with `Trophy` and `Users`.
- **`components/GlobalLeaderboard.tsx`**: Replace `🥇`, `🥈`, `🥉` with styled SVG Medals/Trophy.
- **`components/GroupLeaderboard.tsx`**: Replace `👥` with `Users`, `➕` with `UserPlus`.
- **`components/QuestionForm.tsx`**: Replace `✍️` with `FileQuestion`.
- **`components/AdZone.tsx`**: Replace `⚡` and `🚀` with `Zap` and `Rocket`.
