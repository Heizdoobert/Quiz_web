# mobile/CLAUDE.md
lines:29 exports:
---
# Project: Web Quiz – Flutter mobile app

## Tech Stack
- Flutter 3.x, Dart 3
- Riverpod (flutter_riverpod)
- Provider pattern for shared services
- Testing: flutter_test, widget_test

## Commands
- Build: `flutter build apk` (or `flutter build ios`)
- Test: `flutter test`
- Clean: `flutter clean`
- Run: `flutter run`

## Code Conventions
- Use **ConsumerWidget** or **ConsumerStatefulWidget** for Riverpod‑aware UI.
- Keep UI pure; async work belongs in `initState` or a `FutureBuilder` with `initialData`.
- Provide a **single source of truth** for services via providers (e.g., `apiClientProvider`, `secureStorageProvider` in `auth_provider.dart`).
- No navigation side‑effects inside `build`; render the target widget directly.
- Tests must be deterministic – avoid timers, animations, or network calls that aren’t mocked.

## Boundaries
- **Never** add new dependencies without checking bundle size impact.
- **Never** commit generated files (e.g., `*.g.dart`, build artifacts).
- All secure storage and API clients must be accessed through the providers defined in `auth_provider.dart`.

## Patterns
- **AuthLoadingScreen** – a `ConsumerStatefulWidget` that validates the token in `initState`, stores result in a nullable bool, and returns `QuizScreen` or `AuthScreen` immediately.
- **AuthScreen** – contains a visible widget with text “Sign in”.
