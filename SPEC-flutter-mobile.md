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
mobile/lib/
├── api/                ApiClient: Bearer header, 401 reporting, token and account id storage
├── db/                 sqflite: question cache, answer queue
├── services/           SyncService: sends the queue, keeps what the server has not settled
├── features/auth/      sign-in screen, AuthNotifier (session expiry, queue ownership)
├── features/quiz/      quiz screen, scoreboard and leaderboard panels
└── features/profile/   profile screen
```

## Sessions and the Answer Queue
- A mobile token is `id.exp.mac` and lives 30 days. There is no refresh: the player signs in again.
- Any request that carried the token and gets a 401 signs the player out with `sessionExpired` set. The app says so and offers sign-in. The answer queue is kept.
- The queue belongs to the account id saved at sign-in. The same account signing back in syncs it at once; a different account drops it first. Explicit sign-out syncs what it can, then clears the queue.
- A queued answer leaves the queue once the server settles it: recorded, already answered, own question, gone. Rate-limited answers stay and the app pauses syncing for 10 minutes.

## Builds and Releases
- `.github/workflows/mobile.yml` runs `flutter analyze` and `flutter test` on every push that touches `mobile/`.
- Pushing a `mobile-v*` tag also builds a release APK and app bundle and publishes them as a GitHub prerelease. The build number is the workflow run number.
- Release signing uses the `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` and `ANDROID_KEY_PASSWORD` secrets; without them the build is debug-signed (sideloading only).
- Repository variables: `MOBILE_API_BASE_URL` (defaults to the production API), `GOOGLE_SERVER_CLIENT_ID`, `MOBILE_SENTRY_DSN`.
- App id: `com.quiz3web.mobile` (Android and iOS). iOS builds are not automated.

## Testing Strategy
- **Backend:** Vitest suites `tests/mobile-*.test.ts` cover every mobile route.
- **Mobile:** unit tests for the sync rules, ApiClient 401 handling and queue ownership; widget tests for the theme and the profile screen.

## Boundaries
- **Always:** route all reads and writes through `/api/mobile/v1`. Keep tokens and account ids in `flutter_secure_storage`.
- **Ask first:** changing the token format or TTL, adding token refresh, changing grading in `/quiz/sync`.
- **Never:** connect to Supabase from Dart. Cache `correct_index` or `explanation` on the device.
