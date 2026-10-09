# Spec: Flutter Mobile Companion App & Mobile API

## Objective
Build a Flutter companion app for iOS and Android that allows users to play the Web3 quiz natively on their devices. The app must feature secure offline question caching (with server-side delayed grading to prevent cheating) and native Web3 wallet connections. To support this without compromising the existing Next.js security model, a dedicated Bearer-token REST API will be built within the Next.js application.

## Tech Stack
- **Mobile Client:** Flutter (Dart), Riverpod (State Management), `flutter_secure_storage` (Token/Data Encryption), `walletconnect_flutter_v2` (Web3 Integration).
- **Backend (Existing Repo):** Next.js App Router API (`app/api/mobile/v1`), Supabase (Admin SDK for DB operations).

## Commands
**Mobile (Run from the `mobile/` directory):**
- Build iOS: `flutter build ios`
- Build Android: `flutter build apk`
- Test: `flutter test`
- Lint: `flutter analyze`
- Dev: `flutter run`

**Backend (Run from root):**
- Dev: `npm run dev`

## Project Structure
To avoid tooling conflicts, the Flutter app will live in a clearly isolated `mobile/` directory, and Vercel/Next.js CI will be explicitly configured to ignore it.

```text
/ (Root Next.js Repo)
├── app/api/mobile/v1/       → New Bearer-token REST API for the mobile app
│   ├── auth/                → SIWE & Session endpoints
│   ├── quiz/                → Fetch questions & submit queued answers
├── mobile/                  → The isolated Flutter application
│   ├── lib/
│   │   ├── api/             → API client for connecting to Next.js
│   │   ├── features/        → UI and logic (Riverpod providers)
│   │   ├── models/          → Data models
│   ├── pubspec.yaml         → Flutter dependencies
```

## Code Style
**Backend (TypeScript):** Follow existing Next.js conventions (strict typing, functional components).
**Mobile (Dart):** Follow official Dart style guidelines. Use Riverpod for dependency injection and state.
```dart
// Example: Riverpod State Provider
final quizSyncProvider = StateNotifierProvider<QuizSyncNotifier, AsyncValue<void>>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return QuizSyncNotifier(apiClient);
});
```

## Testing Strategy
- **Backend API:** Integration tests hitting the new `/api/mobile/v1` routes using mock Bearer tokens to ensure business logic matches the web interface.
- **Mobile:** 
  - Unit tests for API serialization and offline queue logic (`flutter test`).
  - Widget tests for critical UI paths (Wallet connection prompt, quiz answering).

## Boundaries
- **Always do:** Route all database reads/writes through the Next.js `/api/mobile/v1` endpoints. Use `flutter_secure_storage` for caching auth tokens.
- **Ask first:** Modifying Next.js CI/CD pipelines (to ensure Flutter doesn't break Vercel builds). Changing the WalletConnect SIWE flow on the backend.
- **Never do:** Connect to Supabase directly from Dart using `supabase_flutter`. Cache the `correct_index` or `explanation` for quizzes offline (only cache the question text and options to prevent cheating).

## Success Criteria
1. The Next.js API can issue and validate JWT Bearer tokens for mobile users.
2. The Flutter app runs on iOS/Android and can authenticate a user via a native WalletConnect prompt.
3. Users can fetch a list of questions, go offline, answer them, and the app securely queues those answers.
4. Upon reconnecting, the queued answers are submitted to the Next.js API, which grades them server-side using the `first-answer-wins` logic and rewards the user.

## Open Questions
- Do we want to completely isolate the Flutter app into a **separate GitHub repository** to guarantee zero CI/CD tooling friction, or are you strictly committed to keeping it in a `mobile/` directory within this monorepo?
