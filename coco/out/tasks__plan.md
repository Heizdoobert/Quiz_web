# tasks/plan.md
lines:43 exports:
---
# Implementation Plan: Realtime Leaderboard

## Overview
Update the leaderboard to update in real-time by subscribing to `quiz_results` inserts via Supabase Realtime. The subscription will be active only when the leaderboard panel is visible, will debounce API refetches, and will highlight rows that change position or score.

## Architecture Decisions
- **Debouncing:** We will use `lodash.debounce` to debounce the refetch API calls, preventing database spam during high activity.
- **Visibility:** Use `IntersectionObserver` within `LeaderboardPanel` to only subscribe when the panel is actually visible.
- **Data Flow:** Pass `loadLeaderboards` down from `useQuizLogic` -> `QuizLayout` -> `LeaderboardPanel` so it can trigger the refetch.
- **Animations:** Use Framer Motion in the row components (`GlobalLeaderboard` / `GroupLeaderboard`) to apply a highlight effect when a row's score changes.

## Task List

### Phase 1: Foundation
- [ ] Task 1: Install dependencies (`lodash.debounce` and `@types/lodash.debounce`).
- [ ] Task 2: Create `useIntersectionObserver` hook for visibility tracking.
- [ ] Task 3: Expose and pass `loadLeaderboards` down to `LeaderboardPanel`.

### Checkpoint: Foundation
- [ ] Dependencies installed.
- [ ] Props passed down correctly without breaking the current UI.

### Phase 2: Core Realtime Logic
- [ ] Task 4: Implement `useRealtimeLeaderboard` hook (or logic inside `LeaderboardPanel`) that subscribes to `quiz_results` `INSERT` events when visible and debounces the `loadLeaderboards` callback.

### Checkpoint: Core Features
- [ ] Leaderboard automatically refetches when a new quiz result is inserted (testable via manual DB insert or another browser).

### Phase 3: Polish
- [ ] Task 5: Add Framer Motion highlight animations to leaderboard rows when their score updates.

### Checkpoint: Complete
- [ ] All acceptance criteria met.
- [ ] Ready for review.

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Subscription memory leak | High | Ensure the realtime channel is removed in the `useEffect` cleanup. |
| Excessive API calls | High | Implement strict debouncing (max 1 per 5 seconds). |
