# Mobile Core Screens Task List (1->2->3->4)

## Task 1: Implement ScoreScreen & Quiz Completion Flow

**Description:** Replace the placeholder `ScoreScreen` with a full-featured quiz result screen that displays score, total questions, accuracy rate, streak progress, and action buttons ("Play Again", "Review Answers", "Home"). Wire up `ReviewScreen` to transition to `ScoreScreen` upon final answer submission.

**Acceptance criteria:**
- [x] Displays points earned, correct answer ratio, and percentage accuracy.
- [x] Highlights streak counter with fiery/trophy theme token visuals.
- [x] Provides functional buttons: "Play Again" (restarts quiz), "Review Answers" (inspects choices), and "Home" (navigates to `/main`).
- [x] Gracefully falls back to current board state from `boardProvider` if no explicit route arguments are passed.

**Verification:**
- [x] Tests pass: `cd mobile && flutter test test/score_screen_test.dart`
- [x] Build succeeds: `cd mobile && flutter analyze`
- [x] Manual check: Submit in ReviewScreen triggers navigation to ScoreScreen with correct data.

**Dependencies:** None

**Files likely touched:**
- `mobile/lib/features/score/score_screen.dart`
- `mobile/lib/features/quiz/review_screen.dart`
- `mobile/test/score_screen_test.dart`

**Estimated scope:** S (2-3 files)

---

## Checkpoint: After Task 1
- [x] `flutter test test/score_screen_test.dart` passes
- [x] Review -> Score navigation contract confirmed

---

## Task 2: Implement SettingsScreen with Offline Sync & Account Controls

**Description:** Build out `SettingsScreen` to display user identity, connection/remote-config health, offline sync queue status with a manual "Sync Now" trigger, legal links (`LegalLinks`), app version info, and a "Sign Out" button.

**Acceptance criteria:**
- [x] Shows current username/account identity from `authProvider`.
- [x] Shows number of offline answers pending synchronization via `quizRepositoryProvider`.
- [x] "Sync Now" button triggers `SyncService.syncAnswers()` and updates UI state.
- [x] Embeds `LegalLinks` and app version.
- [x] "Sign Out" button signs the user out via `authProvider.notifier.signOut()` and redirects to `/auth`.

**Verification:**
- [x] Tests pass: `cd mobile && flutter test test/settings_screen_test.dart`
- [x] Build succeeds: `cd mobile && flutter analyze`
- [x] Manual check: Sign-out clears credentials and pops back to auth screen.

**Dependencies:** None (independent feature slice)

**Files likely touched:**
- `mobile/lib/features/settings/settings_screen.dart`
- `mobile/test/settings_screen_test.dart`

**Estimated scope:** S (2 files)

---

## Checkpoint: After Task 2
- [x] `flutter test test/settings_screen_test.dart` passes
- [x] Settings screen handles auth sign out and manual sync seamlessly

---

## Task 3: Implement MainScreen Navigation Shell

**Description:** Replace the placeholder `MainScreen` with an app navigation shell using Material 3 `NavigationBar`. It hosts 4 destinations: Play/Quiz, Leaderboard, Profile, and Settings. It maintains tab index state and deep link handling so users can navigate between app sections smoothly.

**Acceptance criteria:**
- [x] Material 3 `NavigationBar` with 4 tabs: Quiz (Play), Leaderboard, Profile, Settings.
- [x] Switching tabs renders the respective feature widget without crashing or rebuilding prematurely.
- [x] Deep links with target tabs (or arguments) select the appropriate tab.
- [x] `StartupGate` updates default authenticated route to `/main`.

**Verification:**
- [x] Tests pass: `cd mobile && flutter test test/main_screen_test.dart`
- [x] Build succeeds: `cd mobile && flutter analyze`
- [x] Manual check: Tapping navigation bar icons switches screens correctly.

**Dependencies:** Task 1, Task 2

**Files likely touched:**
- `mobile/lib/features/main/main_screen.dart`
- `mobile/lib/startup_gate.dart`
- `mobile/lib/main.dart`
- `mobile/test/main_screen_test.dart`

**Estimated scope:** M (3-4 files)

---

## Checkpoint: After Task 3
- [x] `flutter test test/main_screen_test.dart` passes
- [x] Full app navigation shell is active and stable

---

## Task 4: Implement LeaderboardScreen

**Description:** Build `LeaderboardScreen` to fetch and render the global top players ranking. It displays the podium (Top 1, 2, 3) with distinct badges, a scrollable list of ranked players, and a bottom pinned card showing the current player's personal rank.

**Acceptance criteria:**
- [x] Provides `leaderboardProvider` fetching rankings from API (with offline fallback or mock handling).
- [x] Renders top 3 players with Gold/Silver/Bronze indicators and remaining players in a clean scrollable list.
- [x] Shows current player's standing in a pinned bottom card.
- [x] Includes pull-to-refresh (`RefreshIndicator`) to reload data.
- [x] Handles error and offline states gracefully with a retry button.

**Verification:**
- [x] Tests pass: `cd mobile && flutter test test/leaderboard_screen_test.dart`
- [x] Build succeeds: `cd mobile && flutter analyze`
- [x] All tests pass: `cd mobile && flutter test`

**Dependencies:** Task 3

**Files likely touched:**
- `mobile/lib/features/leaderboard/leaderboard_provider.dart`
- `mobile/lib/features/leaderboard/leaderboard_screen.dart`
- `mobile/test/leaderboard_screen_test.dart`

**Estimated scope:** M (3 files)

---

## Final Checkpoint: Complete Verification
- [x] `cd mobile && flutter analyze` reports 0 issues
- [x] `cd mobile && flutter test` passes all tests across the mobile suite
