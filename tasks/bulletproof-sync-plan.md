# Implementation Plan: Bulletproof Sync Core

## Overview
We will refactor the quiz answer synchronization mechanism to be fully **event‑driven**, **idempotent**, and **resilient**. The goal is zero data loss, no duplicate scoring, and protection of daily streaks when users go offline (e.g., on a train) and later reconnect.

## Architecture Decisions
- **Idempotent Queue:** Each answer stored locally gets a `client_uuid` (UUIDv4). The server will deduplicate based on this UUID (or a composite of `account_id`, `question_id`, `client_uuid`).
- **Event‑Driven Sync:** Remove the 30‑second polling timer. Sync will fire on three events:
  1. User submits an answer (if network is available).
  2. Connectivity changes from offline → online (`connectivity_plus`).
  3. App lifecycle change from background → foreground.
- **Exponential Backoff & Jitter:** When the server returns `rate‑limited` or any 5xx error, the client will back‑off exponentially with a random jitter to avoid thundering‑herd retries.
- **Streak Grace Window:** Server will accept timestamps from the client and, if the answer falls within a 24‑hour grace window after midnight, still credit the previous day’s streak.

## Task List

### Phase 1: Foundation (Database & Repository)
- **Task 1:** Add `client_uuid TEXT` column to `answer_queue` table and update `DatabaseHelper` creation script.
  - **Acceptance criteria:**
    - New column created in fresh DB.
    - Migration adds column for existing DB without data loss.
  - **Verification:** Run `flutter test` that opens the DB, inserts a row, and checks the column exists.
  - **Dependencies:** None
  - **Files likely touched:**
    - `mobile/lib/db/database_helper.dart`
    - `mobile/lib/db/quiz_repository.dart`
  - **Estimated scope:** Small

- **Task 2:** Modify `QuizRepository.queueAnswer` to generate a UUID (using `uuid` package) and store it in `client_uuid`.
  - **Acceptance criteria:**
    - After calling `queueAnswer`, the row contains a non‑null, unique `client_uuid`.
  - **Verification:** Unit test asserting the field is present and unique.
  - **Dependencies:** Task 1
  - **Files likely touched:**
    - `mobile/lib/data/db/quiz_repository.dart`
  - **Estimated scope:** Small

- **Task 3:** Add unit test for `queueAnswer` verifying `client_uuid` persistence.
  - **Acceptance criteria:** Test passes on CI.
  - **Verification:** `flutter test` runs without failures.
  - **Dependencies:** Task 2
  - **Files likely touched:**
    - `mobile/test/quiz_repository_test.dart`
  - **Estimated scope:** Small

**Checkpoint: Foundation**
- [ ] All tests pass
- [ ] Database schema includes `client_uuid`

### Phase 2: Client‑Side Sync Refactor
- **Task 4:** Remove `Timer.periodic` from `QuizNotifier` and replace with listeners for:
  1. Answer submission
  2. Connectivity changes (`connectivity_plus` Stream)
  3. App lifecycle (`WidgetsBindingObserver`).
  - **Acceptance criteria:** Sync is triggered immediately after any of the three events.
  - **Verification:** Integration test mocking connectivity change and confirming `SyncService.syncAnswers` is called.
  - **Dependencies:** Tasks 1‑3
  - **Files likely touched:**
    - `mobile/lib/features/quiz/quiz_provider.dart`
    - `mobile/lib/main.dart` (if lifecycle observer added)
  - **Estimated scope:** Medium

- **Task 5:** Implement exponential backoff with jitter inside `SyncService.syncAnswers`.
  - **Acceptance criteria:** On `rate‑limited` response, subsequent retries wait 2 s, 4 s, 8 s … plus ±250 ms jitter, up to a max of 1 min.
  - **Verification:** Unit test that forces a rate‑limited response and asserts delay intervals.
  - **Dependencies:** Task 4
  - **Files likely touched:**
    - `mobile/lib/services/sync/sync_service.dart`
  - **Estimated scope:** Medium

- **Task 6:** Extend payload sent to `/quiz/sync` to include each answer’s `client_uuid`.
  - **Acceptance criteria:** Server receives `client_uuid` for every queued answer.
  - **Verification:** Mock API test that inspects request body.
  - **Dependencies:** Task 5
  - **Files likely touched:**
    - `mobile/lib/services/sync/sync_service.dart`
  - **Estimated scope:** Small

- **Task 7:** Write integration test covering the whole client side: queue an answer, simulate offline → online transition, verify sync occurs, backoff works, and `pendingSyncCount` updates correctly.
  - **Acceptance criteria:** Test passes in CI.
  - **Verification:** `flutter test integration_test/sync_flow_test.dart`.
  - **Dependencies:** Tasks 4‑6
  - **Files likely touched:**
    - `mobile/integration_test/sync_flow_test.dart`
  - **Estimated scope:** Medium

**Checkpoint: Client Refactor**
- [ ] All client‑side tests pass
- [ ] No polling timer remains in codebase

### Phase 3: Server‑Side Enhancements
- **Task 8:** Update `app/api/mobile/v1/quiz/sync/route.ts` to read `client_uuid` and enforce idempotency.
  - **Acceptance criteria:** Duplicate submissions (same `client_uuid`) are ignored and existing result returned.
  - **Verification:** Jest test that posts the same payload twice and asserts the second response contains the same `recorded` status without creating a new DB row.
  - **Dependencies:** None
  - **Files likely touched:**
    - `app/api/mobile/v1/quiz/sync/route.ts`
  - **Estimated scope:** Medium

- **Task 9:** Add a unique constraint/index on (`account_id`, `question_id`, `client_uuid`) in the answers table (Supabase/PG). Include migration script.
  - **Acceptance criteria:** Database rejects duplicate `client_uuid` insert.
  - **Verification:** Migration runs in CI, duplicate insert throws error caught by API.
  - **Dependencies:** Task 8
  - **Files likely touched:**
    - `supabase/migrations/xxx_add_client_uuid_constraint.sql`
  - **Estimated scope:** Small

- **Task 10:** Server unit tests for idempotency and streak grace window.
  - **Acceptance criteria:** Tests cover:
    1. Duplicate payload deduped.
    2. Answer timestamp within grace window still counts for previous day's streak.
  - **Verification:** `npm test` passes.
  - **Dependencies:** Tasks 8‑9
  - **Files likely touched:**
    - `tests/mobile-quiz-api.test.ts`
  - **Estimated scope:** Medium

### Phase 4: Streak & Timezone Shield
- **Task 11:** Extend sync endpoint logic to interpret client timestamps with timezone offset and apply a 24‑hour grace window for streak calculations.
  - **Acceptance criteria:** Answers submitted after midnight but before 00:10 (client local time) are still credited to the prior day’s streak.
  - **Verification:** Unit test feeding timestamps across midnight.
  - **Dependencies:** Task 8
  - **Files likely touched:**
    - `app/api/mobile/v1/quiz/sync/route.ts`
  - **Estimated scope:** Medium

- **Task 12:** Add integration test covering offline‑to‑online flow that crosses midnight, confirming streak is preserved.
  - **Acceptance criteria:** Test simulates offline answer at 23:55, reconnect at 00:05, and asserts streak unchanged.
  - **Verification:** Runs in CI.
  - **Dependencies:** Tasks 10‑11
  - **Files likely touched:**
    - `tests/streak_grace.test.ts`
  - **Estimated scope:** Medium

**Checkpoint: Server & Streak**
- [ ] Server tests pass
- [ ] DB constraint in place
- [ ] Streak grace logic verified

### Phase 5: Verification, QA & Documentation
- **Task 13:** Run full test suite (`flutter test && npm test && ./scripts/check‑all.sh`). All must pass.
  - **Acceptance criteria:** CI green.
  - **Verification:** Automated CI run.
  - **Dependencies:** All previous tasks
  - **Estimated scope:** Small

- **Task 14:** Manual QA: launch mobile app, go offline, answer several questions, reconnect, verify that:
  1. Answers are sent.
  2. `pendingSyncCount` drops to 0.
  3. Streak is maintained if crossing midnight.
  - **Acceptance criteria:** Tester signs off.
  - **Verification:** Checklist completed.
  - **Dependencies:** Task 13
  - **Estimated scope:** Small

- **Task 15:** Update project README and internal docs (`docs/architecture/sync.md`) describing the new event‑driven sync, idempotency, and streak grace.
  - **Acceptance criteria:** Docs reflect current implementation and include a diagram of the flow.
  - **Verification:** Docs build without errors.
  - **Dependencies:** Task 13
  - **Estimated scope:** Small

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Migration failure on existing user DBs | Users lose unsynced answers | Write a safe migration that adds column with `NULL` default and back‑fills using a script; test on a copy of production DB.
| Duplicate UUID generation (collision) | Rare but could cause lost answers | Use `uuid` package which guarantees cryptographic uniqueness.
| Backoff logic causing long delays | Users think sync is broken | Cap backoff at 1 min and surface a UI toast after 3 retries.
| Server idempotency check becomes bottleneck | Performance degradation | Index on (`account_id`, `question_id`, `client_uuid`). |

## Open Questions
- Do we want to expose the `client_uuid` in any analytics/events? (Probably not.)
- Should we add a UI indicator for “Pending sync” count? (Can be added later.)

---
*Plan generated on 2026‑10‑16.*
