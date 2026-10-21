# docs/superpowers/plans/2026-10-21-fix-all-sdks-and-build.md
lines:366 exports:deleteAuthUser,authUserIdOf,deleteUserRow
---
# Fix All SDKs and Workspace Build Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve all defects and build issues across 1st-party SDKs (`auth_sdk`, `packages/ui`), vendor SDK typing (`@supabase/supabase-js`), and workspace-level TypeScript compilation errors.

**Architecture:** 
1. Fix `auth_sdk` (Dart) stub methods and test import typos so `dart analyze` and `dart test` pass cleanly.
2. Replace `packages/ui` deadlock-prone `tsup` configuration with a dedicated fast `esbuild` script + declaration emitter that runs cleanly in milliseconds on any filesystem.
3. Fix the missing `index.d.mts` declaration export in `@supabase/supabase-js` via an automated postinstall script.
4. Correct all broken service/action import paths and export signatures across `lib/` and `app/` so `npm run type-check` succeeds with 0 errors.
5. Configure Vitest options in `vitest.node.config.cjs` so unit and SDK tests run reliably without bus errors.

**Tech Stack:** TypeScript, Next.js 16, React 19, Dart 3 / Flutter, Supabase JS SDK, ESBuild, Vitest.

**Spec:** Multi-SDK health check and verification findings from 2026-10-21.

## Global Constraints

- Never import vendor SDKs (`@supabase/*`, `@google/genai`, `@sentry/*`, `posthog-js`) outside `lib/sdk/`.
- Maintain 100% test success in mobile and SDK packages (`dart test`, `flutter test`).
- Ensure `npm run type-check` exits 0 with 0 TypeScript diagnostics.
- Ensure all SDK builds (`npm run build:sdk`, `npm run build:ui`) execute without deadlocks or hangs.

---

### Task 1: Fix `auth_sdk` (Dart Root SDK) & Pass All Dart Tests

**Files:**
- Modify: `lib/auth_sdk.dart`
- Modify: `lib/src/apple_sign_in.dart`
- Modify: `lib/src/token_storage.dart`
- Modify: `test/auth_sdk_test.dart`

**Interfaces:**
- Consumes: `lib/src/models.dart`, `lib/src/token_storage.dart`, `lib/src/mobile_token_storage.dart`.
- Produces: `AuthSdk.initialize`, `AuthSdk.signIn`, `AuthSdk.refreshToken`, `AuthSdk.signOut`, `MobileTokenStorage`.

- [ ] **Step 1: Fix typo imports in `test/auth_sdk_test.dart`**

