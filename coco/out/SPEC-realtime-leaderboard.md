# SPEC-realtime-leaderboard.md
lines:68 exports:useRealtimeLeaderboard
---
# Spec: Realtime Leaderboard

## Objective
The leaderboard currently only updates on page refresh or when the local user answers a question. We want it to update in real-time for all users by listening to `quiz_results` inserts via Supabase Realtime, with a debounced refetch and visual highlight animations for new/changed entries, optimizing for performance by only subscribing when the panel is visible on screen.

## Tech Stack
- React / Next.js (App Router)
- Supabase (Realtime / postgres_changes)
- Framer Motion (Animations)
- Intersection Observer API (Visibility detection)
- Tailwind CSS

## Commands
Build: `npm run build`
Test: `npm test`
Lint: `npm run lint`
Dev: `npm run dev`

## Project Structure
- `components/leaderboard/LeaderboardPanel.tsx` -> Will host the Intersection Observer, Supabase Realtime subscription, and Framer Motion highlight logic.
- `hooks/quiz/use-quiz-logic.ts` -> Will expose `loadLeaderboards` down to the panel so it can trigger debounced refreshes.
- `lib/supabase/supabase-client.ts` -> Used for the realtime channel.

## Code Style
```tsx
import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase/supabase-client';

export function useRealtimeLeaderboard(onUpdate: () => void, isVisible: boolean) {
  useEffect(() => {
    if (!isVisible) return;
    
    const channel = supabase
      .channel('public:quiz_results')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'quiz_results' },
        () => {
          // debounced onUpdate call
        }
