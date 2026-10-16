# Implementation Plan: Mobile Pages Addition

## Overview
Add seven new Flutter screens (Auth, Main, Settings, User, Quiz, Leaderboard, Score) with named routes, placeholder UI, and widget tests. The work follows a vertical‑slice approach: each screen is built, routed, and tested before moving to the next.

## Architecture Decisions
- Use the existing `MaterialApp` routes defined in `mobile/lib/main.dart`.
- Keep each screen in its own feature folder under `mobile/lib/features/<name>/`.
- No new third‑party packages; rely on existing Riverpod, Sentry, and theme.
- Tests will be simple widget tests that pump the screen and verify a placeholder text.

## Task List

### Phase 1: Foundation (Auth & Main)
- **Task 1:** Create `AuthScreen` widget placeholder.
- **Task 2:** Create `MainScreen` widget placeholder (already added).
- **Task 3:** Add routes for `/auth` and `/main` (already added to `main.dart`).
- **Task 4:** Write widget tests for Auth and Main screens.

### Checkpoint: Foundation
- [ ] All tests pass.
- [ ] Application builds and launches to the Auth screen.

### Phase 2: Core Screens (Settings, User, Quiz)
- **Task 5:** Create `SettingsScreen` placeholder (already added).
- **Task 6:** Create `UserScreen` placeholder.
- **Task 7:** Create `QuizScreen` placeholder (exists, but ensure route `/quiz`).
- **Task 8:** Add routes for `/settings`, `/user`, `/quiz` (already in `main.dart`).
- **Task 9:** Write widget tests for Settings, User, Quiz screens.

### Checkpoint: Core Screens
- [ ] All new tests pass.
- [ ] Navigation from Auth → Main → Settings/User/Quiz works.

### Phase 3: Final Screens (Leaderboard, Score)
- **Task 10:** Create `LeaderboardScreen` placeholder.
- **Task 11:** Create `ScoreScreen` placeholder.
- **Task 12:** Add routes for `/leaderboard` and `/score` (already in `main.dart`).
- **Task 13:** Write widget tests for Leaderboard and Score screens.
- **Task 14:** End‑to‑end navigation test covering the full flow Auth → Main → Quiz → Score → Leaderboard.

### Checkpoint: Complete
- [ ] All screens compile without runtime errors.
- [ ] All widget tests pass.
- [ ] Manual run shows correct navigation order.
- [ ] Ready for review.

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Missing route registration | App crashes on navigation | Verify routes in `main.dart` after each phase |
| Placeholder UI too minimal for future work | May need redesign later | Keep UI simple; later iteration can replace placeholders |
| Tests not covering navigation edges | Bugs slip through | Include a small integration test for full flow |

## Open Questions
- Do you need any specific UI elements (icons, colors) on the new screens beyond the placeholder text?
- Will the Auth screen eventually integrate with Supabase or another auth backend?
