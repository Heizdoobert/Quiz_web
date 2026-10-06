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
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isVisible, onUpdate]);
}
```

## Testing Strategy
- **Framework:** Vitest & React Testing Library.
- **Locations:** `tests/leaderboard-actions.test.ts` (if logic changes), or component tests.
- **Coverage:** Ensure the debounced fetch is called when an event fires, and that the subscription correctly tears down when the component unmounts or becomes hidden.

## Boundaries
- **Always:** Use `postgres_changes` instead of broadcasting custom events to save on complexity. Debounce the refetch (e.g. 5 seconds) to avoid spamming the database on high traffic. Clean up the subscription on unmount or when out of view.
- **Ask first:** Installing new packages (e.g. `lodash.debounce` vs hand-rolled). Modifying RLS policies or database schemas.
- **Never:** Subscribe unconditionally without visibility checks. Remove failing tests without a replacement.

## Success Criteria
- The leaderboard fetches fresh data (debounced by max 1 per 5s) when a new result is inserted into `quiz_results` by any user.
- The subscription is active only when the `LeaderboardPanel` is intersecting the viewport.
- Rows in the leaderboard that change their `score` or are newly inserted flash/highlight briefly to indicate movement.

## Open Questions
- Do we want to install `lodash.debounce` or use a custom debounce hook? A simple `useRef` timeout is usually enough, but I'd like your preference.
- Should the highlight animation apply to the entire row, or just the score badge?
