# tasks/todo.md
lines:70 exports:
---
# Tasks: Realtime Leaderboard

> Plan: [plan.md](./plan.md)

---

## Task 1: Install Dependencies
**Description:** Install `lodash.debounce` for debouncing refetches.
**Acceptance criteria:**
- [x] `lodash.debounce` is in dependencies.
- [x] `@types/lodash.debounce` is in devDependencies.
**Verification:**
- [x] Build succeeds: `npm run build`
**Dependencies:** None
**Files likely touched:** `package.json`
**Estimated scope:** XS

## Task 2: Visibility Tracking
**Description:** Create a hook to track if an element is visible on screen.
**Acceptance criteria:**
- [x] `useIntersectionObserver` hook created.
**Verification:**
- [x] Build succeeds: `npm run build`
**Dependencies:** None
**Files likely touched:** `hooks/shared/use-intersection.ts`
**Estimated scope:** S

## Task 3: Pass down refetch function
**Description:** Pass `loadLeaderboards` from `useQuizLogic` to `LeaderboardPanel`.
**Acceptance criteria:**
- [x] `LeaderboardPanel` receives `refreshLeaderboard` prop.
**Verification:**
- [x] Tests pass: `npm run test`
**Dependencies:** None
**Files likely touched:** `components/quiz/QuizLayout.tsx`, `components/leaderboard/LeaderboardPanel.tsx`
**Estimated scope:** S

## Checkpoint: After Tasks 1-3
- [x] All tests pass
- [x] Application builds without errors
