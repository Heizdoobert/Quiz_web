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

## Task 4: Realtime Subscription
**Description:** Implement Supabase Realtime subscription in `LeaderboardPanel` when visible.
**Acceptance criteria:**
- [x] Subscribes to `public:quiz_results` INSERT events.
- [x] Unsubscribes when hidden or unmounted.
- [x] Calls `refreshLeaderboard` debounced by 5 seconds.
**Verification:**
- [x] Manual check: Insert row in `quiz_results`, verify UI updates after 5s.
**Dependencies:** Task 1, Task 2, Task 3
**Files likely touched:** `components/leaderboard/LeaderboardPanel.tsx`
**Estimated scope:** M

## Checkpoint: After Task 4
- [x] Realtime functionality works end-to-end.

## Task 5: Row Highlight Animations
**Description:** Highlight rows in the leaderboard when their data changes.
**Acceptance criteria:**
- [x] Rows briefly highlight (e.g., flash color) when score increases.
- [x] Framer Motion is used for smooth transitions.
**Verification:**
- [x] Manual check: Watch leaderboard update, row should flash.
**Dependencies:** Task 4
**Files likely touched:** `components/leaderboard/GlobalLeaderboard.tsx`, `components/leaderboard/GroupLeaderboard.tsx`
**Estimated scope:** M

## Checkpoint: Complete
- [x] All acceptance criteria met
- [x] Review with human before proceeding
