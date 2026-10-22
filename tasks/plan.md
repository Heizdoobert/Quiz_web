# Implementation Plan: Mobile Core Screens (1->2->3->4)

## Overview
Transform the placeholder screens in `mobile/` into fully functional, production-ready screens following the requested sequence:
1. **ScoreScreen**: Quiz completion & results display (score, accuracy, streak, replay).
2. **SettingsScreen**: Account management, manual offline sync trigger, legal links & sign-out.
3. **MainScreen**: Bottom navigation shell hosting Quiz, Leaderboard, Profile, and Settings tabs.
4. **LeaderboardScreen**: Global player rankings, rank podium badges, and current user's pinned standing.

## Architecture Decisions
- **Design System & Theme**: Reuse existing `GlassCard`, dark-space palette, and tokens from `app_theme.dart`.
- **State Management**: Use `flutter_riverpod` (`ConsumerWidget` / `ConsumerStatefulWidget`) strictly following `mobile/CLAUDE.md`.
- **Navigation**: `MainScreen` acts as the root navigation container with `NavigationBar`, while modal/flow screens (e.g. `QuizScreen`, `ReviewScreen`, `ScoreScreen`) can be pushed on top.
- **Offline & Sync**: Settings exposes the `QuizRepository` queued answer count and triggers `SyncService.syncAnswers()`.
- **Deterministic Tests**: Every screen has isolated unit/widget tests using `flutter_test` with mocks/fakes.

---

## Task List

### Phase 1: Score Screen
- [ ] **Task 1**: Implement `ScoreScreen` and wire up quiz completion flow.
  - Files: `mobile/lib/features/score/score_screen.dart`, `mobile/lib/features/quiz/review_screen.dart`, `mobile/test/score_screen_test.dart`
  - Scope: S (2-3 files)

### Checkpoint: Score Flow
- [ ] `cd mobile && flutter test test/score_screen_test.dart` passes.
- [ ] Finishing review navigates cleanly to ScoreScreen.

---

### Phase 2: Settings Screen
- [ ] **Task 2**: Implement `SettingsScreen` with account info, sync queue status & sign-out.
  - Files: `mobile/lib/features/settings/settings_screen.dart`, `mobile/test/settings_screen_test.dart`
  - Scope: S (2 files)

### Checkpoint: Settings & Sign-out
- [ ] `cd mobile && flutter test test/settings_screen_test.dart` passes.
- [ ] Sign-out clears credentials and returns to `/auth`.

---

### Phase 3: Main Navigation Shell
- [ ] **Task 3**: Implement `MainScreen` with `NavigationBar` (Tabs: Quiz, Leaderboard, Profile, Settings) and update initial navigation.
  - Files: `mobile/lib/features/main/main_screen.dart`, `mobile/lib/startup_gate.dart`, `mobile/lib/main.dart`, `mobile/test/main_screen_test.dart`
  - Scope: M (3-4 files)

### Checkpoint: Navigation Shell
- [ ] `cd mobile && flutter test test/main_screen_test.dart` passes.
- [ ] Bottom tabs switch between views without state loss.

---

### Phase 4: Leaderboard Screen
- [ ] **Task 4**: Implement `LeaderboardScreen` with ranking list, top 3 badges, and pinned user rank.
  - Files: `mobile/lib/features/leaderboard/leaderboard_provider.dart`, `mobile/lib/features/leaderboard/leaderboard_screen.dart`, `mobile/test/leaderboard_screen_test.dart`
  - Scope: M (3 files)

### Checkpoint: Complete Verification
- [ ] `cd mobile && flutter analyze` reports 0 issues.
- [ ] `cd mobile && flutter test` runs all tests with 100% pass rate.

---

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Leaderboard API unavailability | Screen fails to load in offline mode | Provide offline fallback message and cached/mock view with retry button |
| Auth state transition during tab navigation | Zombie screens or null pointer | Use Riverpod `ref.listen` on `authProvider` to auto-pop or redirect on logout |
| Test flakiness due to animations | Timeout in `flutter test` | Use `tester.pump()` with short duration instead of unbounded `pumpAndSettle()` |
