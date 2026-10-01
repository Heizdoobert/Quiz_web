# docs/superpowers/plans/2026-09-23-question-verification-dispute-plan.md
lines:133 exports:
---
# Question Verification & Community Dispute System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement automated submission verification heuristics, question transparency badges, and a community dispute/quarantine engine to protect crypto token earning integrity.

**Architecture:**
1. `lib/types.ts` & `lib/schema.sql`: Extends `questions` with `status`, `dispute_count`, and creates `question_disputes` table with unique constraint.
2. `lib/actions/question-actions.ts`: Validates submissions (no duplicate options, minimum explanation depth), adds `disputeQuestion` server action with auto-quarantine at 3 disputes, and restricts `fetchRandomQuestion` to verified questions.
3. `components/modals/DisputeModal.tsx`: Snappy modal allowing players to challenge incorrect questions.
4. `components/AnswerBack.tsx` & `components/QuestionFront.tsx`: Adds Dispute button on answer back and transparency badge on question front.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, Supabase PostgreSQL, Lucide React.

**Spec:** `docs/superpowers/specs/2026-09-23-question-verification-dispute-design.md`

## Global Constraints
- Gen Z Crypto Quiz Palette: `#0A1128`, `#1A1B35`, `#00FFCC`, `#6C5CE7`, `#FFD166`, `#FF4757`.
- Quarantined questions must never earn tokens or be served in active quizzes.
- 1 dispute per wallet per question.
- 0 errors on `npm run lint` and `npm run build`.
- Local Docker container `quick-quiz-web` kept operational on `http://localhost:3000`.
- All commits pushed to both `origin/main` and `origin/preview`.

---

### Task 1: Schema Extensions & Types

**Files:**
- Modify: `lib/types.ts`
- Modify: `lib/schema.sql`

- [ ] **Step 1: Update `lib/types.ts`**
Add `status?: 'verified' | 'pending' | 'quarantined' | 'rejected'`, `dispute_count?: number`, and `created_by: string | null` to `ClientQuestion` and `Question`.
Export `QuestionDispute` interface.

- [ ] **Step 2: Update `lib/schema.sql`**
Add `status` and `dispute_count` to `questions` table.
Add `question_disputes` table with RLS and `UNIQUE(question_id, reporter_wallet)`.

