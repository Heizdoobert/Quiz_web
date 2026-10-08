# Implementation Plan: Polling-Based Realtime Leaderboard

## Overview
The current leaderboard relies on Supabase Realtime (`postgres_changes`) to push live updates to users. However, a critical architectural flaw prevents this from working: the `quiz_results` table is heavily restricted by Row-Level Security (RLS) to prevent cheating, meaning Supabase Realtime drops the INSERT events for all users. We will replace this completely with a Visibility-Aware Polling mechanism using React Query, which respects RLS (via Security Definer RPCs), prevents connection thrashing, and stops UI flickering.

## Architecture Decisions
- **Data Fetching Strategy**: Replace manual React state fetching inside `use-quiz-logic.ts` with `@tanstack/react-query` to handle caching, background refetches, and window focus behaviors natively.
- **Polling over WebSockets**: React Query will poll the database (e.g., every 15 seconds) strictly when the `LeaderboardPanel` is intersecting the viewport and the browser tab is focused.
- **Cache Invalidation**: When a user submits an answer, we simply invalidate the `leaderboard` query cache, forcing an immediate background refetch without UI flickering.

## Task List

### Phase 1: Foundation
- [ ] Task 1: Integrate React Query for Leaderboards
- [ ] Task 2: Implement Visibility-Aware Polling

### Checkpoint: Foundation
- [ ] Manual test: Leaderboard fetches successfully on initial load.
- [ ] Manual test: Leaderboard polls exactly every 15 seconds when visible, and pauses when scrolled out of view or tab is backgrounded.
- [ ] Network tab confirms no WebSocket connection is established for `quiz_results`.

### Phase 2: Polish
- [ ] Task 3: Visual Highlights for Leaderboard Changes

### Checkpoint: Complete
- [ ] Leaderboard rows animate gracefully when data updates.
- [ ] All tests pass locally and the build succeeds.

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Polling causes DB load | Low | 15-second polling interval per active user is significantly less overhead than constant WebSocket messaging, especially since it pauses off-screen. |
| UI flicker on poll | Low | React Query background refetches leave the old data on-screen, completely eliminating the current `leaderboardLoading` boolean spinner flicker. |
