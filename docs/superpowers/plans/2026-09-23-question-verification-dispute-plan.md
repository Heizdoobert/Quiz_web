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

- [ ] **Step 3: Verify TypeScript and Lint**
Run `npm run lint`.

- [ ] **Step 4: Commit**
```bash
git add lib/types.ts lib/schema.sql
git commit -m "feat(disputes): add question status, dispute tracking types, and database schema"
```

---

### Task 2: Heuristic Validation & Dispute Server Action

**Files:**
- Modify: `lib/actions/question-actions.ts`

- [ ] **Step 1: Enhance `createQuestion` with heuristic validation**
- Check prompt is $\ge 15$ characters.
- Check all 4 options are distinct (case-insensitive deduplication).
- Check explanation is provided and $\ge 20$ characters.
- Insert with `status: 'verified'` and `dispute_count: 0`.

- [ ] **Step 2: Implement `disputeQuestion` server action**
- Insert report into `question_disputes`. Return error if already reported.
- Increment `dispute_count` on `questions`.
- If `dispute_count >= 3`, set `status = 'quarantined'`.

- [ ] **Step 3: Update `fetchRandomQuestion` to exclude quarantined questions**
Add `.neq('status', 'quarantined')` (or `.eq('status', 'verified')`).

- [ ] **Step 4: Verify build and lint**
Run `npm run lint` and `npm run build`.

- [ ] **Step 5: Commit**
```bash
git add lib/actions/question-actions.ts
git commit -m "feat(actions): add question validation heuristics, disputeQuestion action, and quarantine filtering"
```

---

### Task 3: Dispute Modal, AnswerBack & Transparency Badging

**Files:**
- Create: `components/modals/DisputeModal.tsx`
- Modify: `components/AnswerBack.tsx`
- Modify: `components/QuizCard.tsx`
- Modify: `components/QuestionFront.tsx`

- [ ] **Step 1: Create `components/modals/DisputeModal.tsx`**
Dialog with dispute reason options:
1. *Incorrect answer marked*
2. *Misleading or ambiguous choices*
3. *Outdated crypto information*
4. *Spam or low quality*
Integrates with `disputeQuestion` action and shows clear confirmation message.

- [ ] **Step 2: Add Dispute button in `components/AnswerBack.tsx`**
Subtle "Dispute Question" button with `Flag` icon, hover feedback in Pop Coral (`#FF4757`), next to the Next Question button.

- [ ] **Step 3: Wire in `components/QuizCard.tsx`**
Propagate `onOpenDispute` callback through `QuizCard`.

- [ ] **Step 4: Add Transparency Badge in `components/QuestionFront.tsx`**
Show "Verified Core" (`#00FFCC`) if `created_by` is null, or "Community • [0x12..34]" (`#FFD166`) if submitted by a player.

- [ ] **Step 5: Verify build and lint**
Run `npm run lint` and `npm run build`.

- [ ] **Step 6: Commit**
```bash
git add components/modals/DisputeModal.tsx components/AnswerBack.tsx components/QuizCard.tsx components/QuestionFront.tsx
git commit -m "feat(ui): add DisputeModal, answer dispute button, and community transparency badging"
```

---

### Task 4: QuizLayout Integration, Container Rebuild & Push

**Files:**
- Modify: `components/QuizLayout.tsx`

- [ ] **Step 1: Wire `DisputeModal` into `QuizLayout.tsx`**
Add `'dispute'` to `activeModal` state, render `<DisputeModal>` with current question ID and wallet address.

- [ ] **Step 2: Full lint and build verification**
Run `npm run lint && npm run build` with 0 errors.

- [ ] **Step 3: Rebuild and restart local Docker web container**
Run `docker compose build web && docker compose up -d web`. Verify with `curl -sI http://localhost:3000`.

- [ ] **Step 4: Dual branch push to GitHub**
Push `main` to `origin/main` and `origin/preview`.
