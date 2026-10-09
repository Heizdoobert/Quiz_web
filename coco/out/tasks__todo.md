# tasks/todo.md
lines:115 exports:
---
## Task 1: Isolate `mobile/` from Next.js CI
**Description:** Configure the monorepo tooling to completely ignore the `mobile/` directory so Vercel builds, linting, and TS compilers don't fail when encountering Dart code.
**Acceptance criteria:**
- [x] `.vercelignore`, `.eslintignore`, `tsconfig.json`, and `.prettierignore` correctly exclude `mobile/`.
- [x] `.github/workflows` (if applicable) is updated to ignore `mobile/` changes for Next.js builds.
**Verification:**
- [x] `npm run lint` and `npm run build` in root pass successfully.
**Dependencies:** None
**Files likely touched:** `.vercelignore`, `.eslintignore`, `tsconfig.json`
**Estimated scope:** Small

## Task 2: Initialize Flutter Project & Dependencies
**Description:** Create the base Flutter project inside the `mobile/` directory and add the core dependencies required for architecture.
**Acceptance criteria:**
- [x] Flutter project created at `mobile/`.
- [x] `pubspec.yaml` includes `flutter_riverpod`, `flutter_secure_storage`, `walletconnect_flutter_v2`, `http`, and `sqflite`.
**Verification:**
- [x] `cd mobile && flutter build ios --simulator` succeeds.
**Dependencies:** 1
**Files likely touched:** `mobile/pubspec.yaml`, `mobile/lib/main.dart`
**Estimated scope:** Small

## Checkpoint: Foundation
- [x] Next.js Vercel builds succeed without trying to parse Dart.
- [x] Flutter app builds to simulator successfully.

## Task 3: Build Next.js Mobile SIWE API endpoints
**Description:** Create a new REST API specifically for mobile that handles Sign-In With Ethereum (SIWE), bypassing the Next.js cookie restrictions by issuing a Bearer JWT.
**Acceptance criteria:**
- [x] `POST /api/mobile/v1/auth/nonce` returns a secure nonce.
- [x] `POST /api/mobile/v1/auth/verify` accepts a SIWE signature, verifies it, and returns a signed JWT Bearer token valid for mobile use.
**Verification:**
- [x] Tests pass: Verify the endpoints using curl/Postman with valid signatures.
**Dependencies:** 2
**Files likely touched:** `app/api/mobile/v1/auth/nonce/route.ts`, `app/api/mobile/v1/auth/verify/route.ts`, `lib/services/mobile-auth.ts`
**Estimated scope:** Medium

## Task 4: Configure WalletConnect v2 & Deep Linking in Flutter
**Description:** Set up WalletConnect v2 inside the Flutter app and configure OS-level deep linking so wallet apps can return the user to the Flutter app after signing.
**Acceptance criteria:**
