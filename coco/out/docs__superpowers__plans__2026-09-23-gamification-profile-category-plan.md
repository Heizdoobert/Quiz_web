# docs/superpowers/plans/2026-09-23-gamification-profile-category-plan.md
lines:195 exports:
---
# Gamification, User Profile & Category Taxonomy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Web Audio synthesizer sound effects, Crypto Category taxonomy & filtering, a Web3 User Profile modal with NFT trophy showcase, and Leaderboard pagination.

**Architecture:** 
1. `lib/audio.ts` provides a zero-dependency Web Audio API synthesizer for retro cyberpunk sound effects with mute toggle and `localStorage` persistence.
2. `lib/actions/question-actions.ts` extends `fetchRandomQuestion` to accept category filtering, coupled with a responsive `CategoryBar.tsx` selector.
3. `components/modals/ProfileModal.tsx` provides a gamified Web3 player profile with stats, tier levels, category mastery, and an on-chain NFT badge trophy showcase.
4. `GlobalLeaderboard.tsx` and `GroupLeaderboard.tsx` add responsive pagination without layout shifts.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, Framer Motion, Web Audio API, Wagmi, Viem, Lucide React.

**Spec:** `docs/superpowers/specs/2026-09-23-gamification-profile-category-design.md`

## Global Constraints
- Theme: Dark space-tech aesthetic strictly using Gen Z Crypto Quiz palette:
  - `#0A1128` (Deep Space background)
  - `#1A1B35` (Cyber Violet card surface)
  - `#00FFCC` (Neo Mint primary CTA/success)
  - `#6C5CE7` (Electric Indigo transition/progress)
  - `#FFD166` (Crypto Gold rewards/trophy)
  - `#FF4757` (Pop Coral danger/timer)
  - Category accents: `#8A2BE2` (DeFi), `#FF007F` (NFT & Gaming), `#3071FF` (Layer 1)
- Micro-interactions: `:hover`, `:active:scale-95`, `:focus-visible:ring-2 focus-visible:ring-neo-mint` on all interactive elements.
- Zero audio assets: Pure browser Web Audio API synthesis.
- Zero errors on `npm run lint` and `npm run build`.
- Local Docker container `quick-quiz-web` kept running on `http://localhost:3000`.
- All completed work pushed to BOTH `origin/main` and `origin/preview`.

---

### Task 1: Synthesizer Audio Engine & Sound Toggle

**Files:**
- Create: `lib/audio.ts`
- Modify: `components/Header.tsx`
- Modify: `components/QuizLayout.tsx`

