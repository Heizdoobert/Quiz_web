# mobile/docs/architecture/sync.md
lines:68 exports:
---
# Sync Core Architecture

## Overview

The mobile quiz app now includes a **Bulletproof Sync Core** that provides reliable, event‑driven synchronization of user answers with the backend.

### Key Features

- **`client_uuid` Column**
  - Added to the `answer_queue` table (migration version 2).
  - Generated via the `uuid` package for every queued answer, enabling de‑duplication and better traceability.
- **Event‑Driven Sync Triggers**
  - Sync starts on:
    - App resume (`WidgetsBindingObserver` listening for `AppLifecycleState.resumed`).
    - Network connectivity changes (`connectivity_plus`).
    - User sign‑in events.
  - The old 30‑second periodic timer has been removed.
- **Exponential Backoff with Jitter**
  - Implemented in `_BackoffHelper` (see `lib/services/sync/sync_service.dart`).
  - On rate‑limited responses the service pauses (`isPaused`) and increments `backoffAttempts`.
  - Successful sync resets the back‑off state.
- **Testability**
  - Public getters `isPaused` and `backoffAttempts` expose internal state.
  - `resetPauseForTest()` allows unit tests to clear the pause without accessing private fields.

## Code Walk‑through

### Database Migration (`DatabaseHelper`)
```dart
await db.execute('''
  ALTER TABLE answer_queue ADD COLUMN client_uuid TEXT;
''');
```

### UUID Generation (`QuizRepository.queueAnswer`)
```dart
final uuid = const Uuid().v4();
await db.insert('answer_queue', {..., 'client_uuid': uuid});
```

