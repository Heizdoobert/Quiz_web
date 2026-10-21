# Relocate and Organize Dart `auth_sdk` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract the Dart `auth_sdk` package out of root `lib/` and root `test/` into [`packages/auth_sdk/`](file:///mnt/second_drive/web_quiz/packages/auth_sdk), organizing its internal `lib/src/` files into logical domain subfolders (`models/`, `storage/`, `providers/`), fixing broken test imports, and leaving root [`lib/`](file:///mnt/second_drive/web_quiz/lib) 100% pure TypeScript for Next.js.

**Target Structure:**
```
packages/auth_sdk/
├── pubspec.yaml
├── pubspec.lock
├── lib/
│   ├── auth_sdk.dart
│   └── src/
│       ├── models/
│       │   └── models.dart
│       ├── storage/
│       │   ├── token_storage.dart
│       │   ├── mobile_token_storage.dart
│       │   └── web_token_storage.dart
│       └── providers/
│           └── apple_sign_in.dart
└── test/
    ├── auth_sdk_test.dart
    ├── mobile_token_storage_error_test.dart
    └── web_token_storage_test.dart
```

Root [`lib/`](file:///mnt/second_drive/web_quiz/lib) becomes pure TypeScript:
- `actions/`, `client/`, `constants/`, `db/`, `sdk/`, `services/`, `utils/`
- `auth.ts`, `legal.ts`, `logger.ts`, `sdk.ts`, `types.ts`
(All Dart files `auth_sdk.dart`, `src/`, and root `test/` removed from root).

---

## Tasks

### Task 1: Scaffolding and File Relocation to `packages/auth_sdk/`

**Files:**
- Create directory: `packages/auth_sdk/lib/src/{models,storage,providers}`
- Create directory: `packages/auth_sdk/test`
- Move: `pubspec.yaml`, `pubspec.lock` -> `packages/auth_sdk/`
- Move: `lib/auth_sdk.dart` -> `packages/auth_sdk/lib/auth_sdk.dart`
- Move & Reorganize:
  - `lib/src/models.dart` -> `packages/auth_sdk/lib/src/models/models.dart`
  - `lib/src/token_storage.dart` -> `packages/auth_sdk/lib/src/storage/token_storage.dart`
  - `lib/src/mobile_token_storage.dart` -> `packages/auth_sdk/lib/src/storage/mobile_token_storage.dart`
  - `lib/src/web_token_storage.dart` -> `packages/auth_sdk/lib/src/storage/web_token_storage.dart`
  - `lib/src/apple_sign_in.dart` -> `packages/auth_sdk/lib/src/providers/apple_sign_in.dart`
- Move Dart tests:
  - `test/auth_sdk_test.dart` -> `packages/auth_sdk/test/auth_sdk_test.dart`
  - `test/mobile_token_storage_error_test.dart` -> `packages/auth_sdk/test/mobile_token_storage_error_test.dart`
  - `test/web_token_storage_test.dart` -> `packages/auth_sdk/test/web_token_storage_test.dart`
- Remove: `lib/src/`, `test/` (root)

- [x] **Step 1:** Create `packages/auth_sdk` directory structure.
- [x] **Step 2:** Copy/move files from root into `packages/auth_sdk/`.
- [x] **Step 3:** Remove relocated Dart files from root `lib/` and root `test/`.

---

### Task 2: Internal Import Adjustments in `packages/auth_sdk/`

**Files:**
- Modify: `packages/auth_sdk/lib/auth_sdk.dart`
- Modify: `packages/auth_sdk/lib/src/storage/token_storage.dart`
- Modify: `packages/auth_sdk/lib/src/storage/mobile_token_storage.dart`
- Modify: `packages/auth_sdk/lib/src/storage/web_token_storage.dart`
- Modify: `packages/auth_sdk/lib/src/providers/apple_sign_in.dart`

- [x] **Step 1:** Update `packages/auth_sdk/lib/auth_sdk.dart`:
  - `import 'src/models/models.dart';`
  - `import 'src/storage/token_storage.dart';`
  - Re-export models and token_storage for public consumers.
- [x] **Step 2:** Update `packages/auth_sdk/lib/src/storage/token_storage.dart`:
  - `export 'mobile_token_storage.dart' if (dart.library.html) 'web_token_storage.dart';`
  - `import '../models/models.dart';`
- [x] **Step 3:** Update `packages/auth_sdk/lib/src/storage/mobile_token_storage.dart`:
  - `import '../models/models.dart';`
  - `import 'token_storage.dart';`
- [x] **Step 4:** Update `packages/auth_sdk/lib/src/storage/web_token_storage.dart`:
  - `import '../models/models.dart';`
  - `import 'token_storage.dart';`
- [x] **Step 5:** Update `packages/auth_sdk/lib/src/providers/apple_sign_in.dart`:
  - `import '../models/models.dart';`
  - `import '../storage/token_storage.dart';`

---

### Task 3: Fix and Update Dart Tests in `packages/auth_sdk/test/`

**Files:**
- Modify: `packages/auth_sdk/test/auth_sdk_test.dart`
- Modify: `packages/auth_sdk/test/mobile_token_storage_error_test.dart`
- Modify: `packages/auth_sdk/test/web_token_storage_test.dart`

- [x] **Step 1:** Fix typo imports in `mobile_token_storage_error_test.dart`:
  - `import 'package:auth_sdk/src/storage/token_storage.dart';`
  - `import 'package:auth_sdk/src/models/models.dart';`
  - `import 'package:auth_sdk/src/storage/mobile_token_storage.dart';`
- [x] **Step 2:** Fix typo imports in `web_token_storage_test.dart`:
  - `import 'package:auth_sdk/src/storage/token_storage.dart';`
  - `import 'package:auth_sdk/src/models/models.dart';`
  - `import 'package:auth_sdk/src/storage/web_token_storage.dart';`
- [x] **Step 3:** Update `auth_sdk_test.dart`:
  - `import 'package:auth_sdk/src/storage/mobile_token_storage.dart';`
  - `import 'package:auth_sdk/src/models/models.dart';`

---

### Task 4: Verification and Clean-up

- [x] **Step 1:** Run `dart analyze` in `packages/auth_sdk/`.
- [x] **Step 2:** Run `dart test` in `packages/auth_sdk/`.
- [x] **Step 3:** Verify root Next.js build: `npm run type-check && npm run check:architecture`.
- [x] **Step 4:** Clean up root `.dart_tool/` if no longer needed at root.
