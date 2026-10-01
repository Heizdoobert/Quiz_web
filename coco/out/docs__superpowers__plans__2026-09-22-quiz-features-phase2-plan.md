# docs/superpowers/plans/2026-09-22-quiz-features-phase2-plan.md
lines:2803 exports:User,Question,ClientQuestion,QuizResult,Group,UserStats,LeaderboardEntry,AnswerSubmissionResult,getOrCreateUser,createQuestion,fetchRandomQuestion,getQuestionCount,submitAnswer,getUserStats,getQuestionHistory,getGlobalLeaderboard,getGroupLeaderboard,createGroup,joinGroup,leaveGroup
---
# Quick Quiz Phase 2: Full Quiz Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete interactive quiz experience on top of Next.js, Supabase, and Web3, including Quiz Card (3D flip), Server Actions data layer, live Stats Sidebar, Question Form, Groups & Leaderboards, responsive Ad Zones, and Modals.

**Architecture:** Next.js App Router client components coordinated by a central `QuizLayout` reducer, with data persistence and answer verification handled securely by Next.js Server Actions querying Supabase. Responsive layout with sticky desktop skyscraper ads, horizontal banners, and collapsible modals.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Supabase JS Client, Wagmi v2 / Viem, RainbowKit, Framer Motion, Canvas-Confetti, Lucide React.

**Spec:** `docs/superpowers/specs/2026-09-22-quiz-features-phase2-design.md`

## Global Constraints
- Use Next.js App Router (`app/` directory).
- All styling using Tailwind CSS v4 and existing dark theme palette (`#0f172a` slate-900 background, `#1e293b` slate-800 cards, `#3b82f6` blue accents).
- Never send `correct_index` to the client prior to answer submission.
- Server Actions must handle missing environment variables or database errors gracefully without throwing unhandled exceptions.
- Ad zones must be responsive: skyscrapers on desktop (≥1280px), banners on tablet/mobile.
- Run `npm run lint` and `npm run build` after each task to verify zero errors and clean builds.

---

### Task 1: TypeScript Types & Supabase Schema Helper

**Files:**
- Create: `lib/types.ts`
- Create: `lib/schema.sql`

**Interfaces:**
- Produces: Data interfaces (`User`, `Question`, `ClientQuestion`, `QuizResult`, `Group`, `UserStats`, `LeaderboardEntry`, `QuizState`) used across all subsequent tasks.

- [ ] **Step 1: Create `lib/types.ts`**
Create `lib/types.ts` containing the shared domain types:
```typescript
export interface User {
  wallet_address: string;
  display_name: string | null;
  created_at: string;
}

