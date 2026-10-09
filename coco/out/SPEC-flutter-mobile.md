# SPEC-flutter-mobile.md
lines:66 exports:
---
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
