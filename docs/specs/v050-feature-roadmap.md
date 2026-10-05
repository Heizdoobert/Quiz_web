# Spec: v0.5.0 Feature Roadmap — Next-Level Quick Quiz

Module: cross-cutting (new modules + enhancements to existing).
Status: Draft 2026-10-05 — pending owner review.

## Objective

Evolve Quick Quiz from a testnet demo into a production-grade, live-chain product with analytics, real-time features, and AI-powered gameplay enhancements. This spec covers the work between v0.4.0 (current) and v0.5.0.

## Pre-requisites (must be done before v0.5.0 feature work)

- [ ] Task 24: Production SQL migration rollout (manual)
- [ ] Task 25: Legacy wallet column drop (1 week after Task 24)
- [ ] Base Mainnet contract deployment (QuizToken, QuizBadgeNFT, ContestEscrow)

## Workstreams

| Id | Module | Responsibility | Depends on | Size |
|---|---|---|---|---|
| analytics | profile | Creator question analytics: per-question accuracy, play count, skip rate, avg time | pre-requisites | M |
| contest-analytics | lists | Contest analytics: participation, completion rate, avg score | pre-requisites | M |
| realtime-leaderboard | rankings | Live leaderboard updates via Supabase Realtime subscriptions | pre-requisites | S |
| toast-notifications | cross-cutting | In-app toast system for events (question approved, reward available, review needed) | — | S |
| ai-question-gen | trivia | AI question generation from topic/URL via Gemini for creators | — | M |
| ai-difficulty | trivia | Auto-classify question difficulty (Easy/Medium/Hard) on creation | ai-question-gen | S |
| pwa-offline | cross-cutting | Service worker for offline question caching and install prompt | — | M |
| social-sharing | community | Share quiz results to Twitter/Farcaster with OG images and referral | — | S |

Build order: toast-notifications and ai-question-gen have no dependencies and can start immediately. The rest depends on production data or prior workstreams.

## Workstream Details

### `analytics` — Creator Question Analytics

**Problem:** Creators have no visibility into how their questions perform. They can see ratings/comments but not quantitative data.

**Solution:** Add a stats panel to `/profile` showing per-question:
- Play count (total times answered)
- Accuracy rate (% correct)
- Skip rate (% skipped via lifeline)
- Average answer time

**Implementation:**
- New SQL function `get_question_analytics(p_user_id UUID)` aggregating from `quiz_results`
- New server action `getQuestionAnalytics()` in `profile-actions.ts`
- New `QuestionAnalyticsPanel` component on `/profile`
- Data already exists in `quiz_results` — no schema changes needed

### `contest-analytics` — Contest Performance Analytics

**Problem:** Contest creators can't see how their contests performed.

**Solution:** Add contest stats to the contest browser and creator profile:
- Participation count per contest
- Completion rate (finished / started)
- Average score
- Time distribution

**Implementation:**
- SQL function `get_contest_analytics(p_list_id UUID)` aggregating `list_entries`
- Server action in `question-list-actions.ts`
- Stats cards on `ContestBrowser` for owned contests

### `realtime-leaderboard` — Live Leaderboard Updates

**Problem:** Leaderboard only updates on page refresh.

**Solution:** Subscribe to `quiz_results` changes via Supabase Realtime and refresh leaderboard data when a new result is inserted.

**Implementation:**
- Supabase Realtime subscription in `LeaderboardPanel`
- Debounce refresh (max 1 per 5 seconds)
- Visual indicator for new entries (highlight animation)
- Only subscribe when the leaderboard panel is visible

### `toast-notifications` — In-App Toast System

**Problem:** No feedback mechanism for async events (question approved, review needed, etc.)

**Solution:** Lightweight toast notification system:
- Positioned bottom-right, auto-dismiss after 5s
- Types: success (green), info (blue), warning (yellow), error (red)
- Framer Motion enter/exit animations
- Context provider pattern, callable from any component

**Implementation:**
- `components/ui/Toast.tsx` and `ToastProvider`
- `useToast()` hook
- Wire into existing success/error paths in quiz, review, and reward flows

### `ai-question-gen` — AI Question Generation

**Problem:** Creating good trivia questions is time-consuming for creators.

**Solution:** "Generate with AI" button in the question form that:
1. Takes a topic (or URL) as input
2. Calls Gemini to generate a trivia question with 4 options and an explanation
3. Populates the form fields for creator review/editing before submission
4. Still goes through existing moderation on submit

**Implementation:**
- New server action `generateQuestion(topic: string)` in `question-actions.ts`
- Gemini prompt engineering for high-quality trivia generation
- Rate limit: 3 AI generations per day per account
- UI: collapsible "Generate with AI" section in `QuestionForm`

### `ai-difficulty` — Auto Difficulty Classification

**Problem:** No difficulty metadata on questions — all questions feel equal.

**Solution:** On question creation, auto-classify difficulty:
- Easy: factual recall, well-known topics
- Medium: requires some knowledge synthesis
- Hard: obscure facts, multi-step reasoning

**Implementation:**
- Add `difficulty` column to `questions` table (`TEXT CHECK (difficulty IN ('easy','medium','hard'))`)
- Classify during `moderateContent` call (add difficulty to the Gemini response schema)
- Display difficulty badge on `QuestionFront`
- Filter by difficulty in `CategoryBar`

### `pwa-offline` — Progressive Web App Enhancements

**Problem:** App requires network for every interaction.

**Solution:**
- Service worker caching strategy: NetworkFirst for API, CacheFirst for static
- Pre-cache a batch of questions for offline play
- Queue answer submissions when offline, sync when back online
- Mobile install prompt (beforeinstallprompt event)

**Implementation:**
- `next-pwa` or custom service worker in `public/sw.js`
- IndexedDB for offline question storage
- Background Sync API for answer queue

### `social-sharing` — Share Results & Referrals

**Problem:** No viral loop — players can't share their achievements.

**Solution:** Share button after quiz completion:
- Generate OG image with score, streak, and quiz branding
- One-click share to Twitter/X with pre-filled text
- Farcaster frame support for in-feed quiz playing
- Referral tracking via URL parameters

**Implementation:**
- Dynamic OG image route (`app/og/[type]/route.tsx` using `ImageResponse`)
- Share modal after `AnswerBack` with platform buttons
- Referral param tracking in `quiz_results` for analytics

## Testing Strategy

Each workstream follows the existing ratchet:
- New server actions: Vitest unit tests (mock Supabase)
- New components: Testing Library render tests
- Changed lines ≥ 80% coverage
- `npm run check:task` must pass before merge

## Boundaries

- **Always:** keep the 200-line component cap; keep `lib/` free of UI imports
- **Ask first:** new database columns or functions (SQL scripts need owner review before running)
- **Never:** weaken CONSTRAINTS.md; add @ts-ignore or eslint-disable

## Success Criteria

1. Creators see per-question analytics on their profile
2. An "AI Generate" button populates the question form from a topic
3. Toast notifications appear for key app events
4. Quiz results can be shared to Twitter with an OG preview image
5. `npm run check:task` and `npm run build` pass at every merge
