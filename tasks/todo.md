# Tasks: Polling-Based Realtime Leaderboard

> Plan: [plan.md](./plan.md)

---

## Task 1: Integrate React Query for Leaderboards
**Description:** Refactor leaderboard data fetching from manual React state (`useState`) to `@tanstack/react-query` (`useQuery`). 
**Acceptance criteria:**
- [ ] `useQuizLogic` hook uses `useQuery` for both global and group leaderboards instead of manual async functions and state.
- [ ] Submitting an answer calls `queryClient.invalidateQueries({ queryKey: ['leaderboard'] })` rather than manually invoking `loadLeaderboards()`.
- [ ] The `leaderboardLoading` state is derived from React Query's `isPending` / `isFetching` properties, ensuring background refetches do not trigger hard loading spinners (preventing UI flicker).
**Verification:**
- [ ] Tests pass: `npm run test`
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: Submit an answer and verify the leaderboard updates immediately without a loading spinner flash.
**Dependencies:** None
**Files likely touched:** `hooks/quiz/use-quiz-logic.ts`, `components/leaderboard/LeaderboardPanel.tsx`
**Estimated scope:** M

## Task 2: Implement Visibility-Aware Polling
**Description:** Add a conditional polling interval to the leaderboard queries that activates exclusively when the leaderboard panel is visible on screen.
**Acceptance criteria:**
- [ ] Remove all Supabase Realtime WebSocket logic (`supabase.channel().on(...)`) from `LeaderboardPanel.tsx`.
- [ ] Pass the `isVisible` boolean (from `useIntersectionObserver`) into `useQuizLogic` or directly to the `useQuery` hook.
- [ ] Set `refetchInterval: isVisible ? 15000 : false` on the leaderboard queries.
**Verification:**
- [ ] Tests pass: `npm run test`
- [ ] Manual check: Open network tab, scroll the leaderboard into view, wait 15 seconds, and confirm an RPC network request is fired. Scroll out of view and confirm requests stop.
**Dependencies:** Task 1
**Files likely touched:** `components/leaderboard/LeaderboardPanel.tsx`, `hooks/quiz/use-quiz-logic.ts`
**Estimated scope:** S

## Checkpoint: Foundation
- [ ] Manual test: Leaderboard fetches successfully on initial load.
- [ ] Manual test: Leaderboard polls exactly every 15 seconds when visible, and pauses when scrolled out of view or tab is backgrounded.
- [ ] Network tab confirms no WebSocket connection is established for `quiz_results`.

## Task 3: Visual Highlights for Leaderboard Changes
**Description:** Add subtle animation cues to leaderboard rows when they update, so users notice changes that occur passively in the background.
**Acceptance criteria:**
- [ ] Leaderboard rows (e.g., in `GlobalLeaderboard.tsx` and `GroupLeaderboard.tsx`) use `framer-motion` to flash a subtle background color or pulse when their `score` or `rank` changes.
**Verification:**
- [ ] Tests pass: `npm run test`
- [ ] Manual check: Trigger a mock cache update and observe the affected row animating smoothly.
**Dependencies:** Task 1, Task 2
**Files likely touched:** `components/leaderboard/GlobalLeaderboard.tsx`, `components/leaderboard/GroupLeaderboard.tsx`
**Estimated scope:** S

## Checkpoint: Complete
- [ ] Leaderboard rows animate gracefully when data updates.
- [ ] All tests pass locally and the build succeeds.
