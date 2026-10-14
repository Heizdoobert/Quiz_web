# SPEC-flutter-mobile.md
lines:59 exports:
---
# Spec: Flutter Mobile App & Mobile API

## Objective
A Flutter app for Android and iOS that plays the same trivia game as the web: guests browse questions, signed-in players answer them, and the score, streak and leaderboard rank are the reward ([ADR-013](docs/decisions/013-web2-only.md): no wallets, tokens or contracts). Answers given offline are queued on the device and graded by the server when they sync, so the device never holds an answer key.

## Tech Stack
- **Mobile:** Flutter (Dart), Riverpod 3, `http`, `flutter_secure_storage` (token and account id), `sqflite` (question cache and answer queue), `google_sign_in`, `sentry_flutter`.
- **Backend (this repo):** Next.js route handlers under `app/api/mobile/v1`, authenticated with a Bearer token (`lib/services/mobile-auth.ts`).

## Commands
Mobile, from `mobile/`:
```
flutter pub get
flutter analyze
flutter test
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000/api/mobile/v1
```
Backend, from the root: `npm run dev`, `npm test`.

## Project Structure
```text
app/api/mobile/v1/
├── auth/google/        POST  Google ID token -> { token, accountId }
├── auth/password/      POST  username + password, signin or signup -> { token, accountId }
├── quiz/questions/     GET   10 questions, no answer key (open to guests)
├── quiz/sync/          POST  queued answers -> per-question verdicts (Bearer)
├── quiz/board/         GET   stats, history, leaderboard (guest without a header, 401 for a bad token)
└── profile/quizzes/    GET   the player's own questions (Bearer)
app/api/config/         GET   remote config, shared with the web (no auth, no /mobile/v1 prefix)
mobile/lib/
├── api/                ApiClient: Bearer header, 401 reporting, token and account id storage
├── db/                 sqflite: question cache, answer queue
├── services/           SyncService: sends the queue, keeps what the server has not settled; RemoteConfigService: reads /api/config, keeps defaults on failure
├── features/auth/      sign-in screen, AuthNotifier (session expiry, queue ownership)
├── features/quiz/      quiz screen, scoreboard and leaderboard panels
└── features/profile/   profile screen
```

## Sessions and the Answer Queue
- A mobile token is `id.exp.mac` and lives 30 days. There is no refresh: the player signs in again.
