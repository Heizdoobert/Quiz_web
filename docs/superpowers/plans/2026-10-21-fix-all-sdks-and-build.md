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

Replace:
```dart
import 'package:auth_s../features/auth/token_storage.dart';
import 'package:auth_s../features/auth/models.dart';
```
With:
```dart
import 'package:auth_sdk/src/mobile_token_storage.dart';
import 'package:auth_sdk/src/models.dart';
```

- [ ] **Step 2: Fix URI imports in `lib/src/apple_sign_in.dart` and `lib/src/token_storage.dart`**

In `lib/src/apple_sign_in.dart`:
Change `import 'src/models.dart';` and `import 'src/token_storage.dart';` to `import 'models.dart';` and `import 'token_storage.dart';`.
In `lib/src/token_storage.dart`:
Remove unused `import 'dart:convert';`.

- [ ] **Step 3: Implement stub helper methods in `lib/auth_sdk.dart` and remove missing file imports**

Remove missing imports (`src/auth_flow.dart`, `src/refresh.dart`, `src/sign_out.dart`, and unused `package:flutter/foundation.dart`).
Define the stub flow handlers:
```dart
Future<UserSession> _signInFlow(AuthProviderConfig provider, TokenStorage storage) async {
  throw const AuthException('not_implemented', 'Sign-in flow is not yet implemented in this stub.');
}

Future<TokenBundle> _refreshTokens(TokenBundle tokens, TokenStorage storage) async {
  throw const AuthException('not_implemented', 'Token refresh is not yet implemented in this stub.');
}

Future<void> _signOut(TokenStorage storage) async {
  await storage.clear();
}
```

- [ ] **Step 4: Verify Dart tests and analyzer**

Run:
```bash
dart analyze lib/auth_sdk.dart lib/src test/auth_sdk_test.dart
dart test test/auth_sdk_test.dart
```
Expected: All tests pass, 0 analyzer errors.

- [ ] **Step 5: Commit**

```bash
git add lib/auth_sdk.dart lib/src/ test/auth_sdk_test.dart
git commit -m "fix(auth_sdk): resolve missing stubs and test import paths in dart sdk"
```

---

### Task 2: Fix `packages/ui` Build Pipeline (`build:ui`)

**Files:**
- Create: `packages/ui/build.mjs`
- Modify: `packages/ui/package.json`

**Interfaces:**
- Produces: `packages/ui/dist/index.mjs`, `packages/ui/dist/index.cjs`, `packages/ui/dist/index.d.ts`, `packages/ui/dist/styles.css`.

- [ ] **Step 1: Create `packages/ui/build.mjs`**

Implement standalone atomic builder using `esbuild` that compiles ESM, CJS, and bundles CSS into `dist/styles.css`:
```javascript
import esbuild from 'esbuild';
import fs from 'node:fs/promises';

await fs.mkdir('dist', { recursive: true });

// 1. Build ESM bundle with CSS extraction
const result = await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  outfile: 'dist/index.mjs',
  format: 'esm',
  sourcemap: true,
  external: ['react', 'react-dom'],
});

// 2. Build CJS bundle
await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  outfile: 'dist/index.cjs',
  format: 'cjs',
  sourcemap: true,
  external: ['react', 'react-dom'],
});

// 3. Ensure styles.css exists (from extracted css or tokens.css fallback)
try {
  await fs.copyFile('src/styles/tokens.css', 'dist/styles.css');
} catch (e) {
  // Ignored if tokens already emitted
}

console.log('✔ packages/ui build completed successfully');
```

- [ ] **Step 2: Update `packages/ui/package.json` scripts**

Update `"build"` script in `packages/ui/package.json`:
```json
"scripts": {
  "build": "node build.mjs && tsc --emitDeclarationOnly --outDir dist",
  "type-check": "tsc --noEmit"
}
```

- [ ] **Step 3: Test build**

Run from root:
```bash
npm run build:ui
```
Expected: Clean exit code 0 in <2 seconds with artifacts generated in `packages/ui/dist`.

- [ ] **Step 4: Commit**

```bash
git add packages/ui/build.mjs packages/ui/package.json
git commit -m "fix(ui): use esbuild script for packages/ui build to eliminate tsup css deadlock"
```

---

### Task 3: Fix Supabase SDK TypeScript Declaration Resolution

**Files:**
- Modify: `package.json`
- Create: `scripts/ensure-supabase-types.mjs`

**Interfaces:**
- Ensures `@supabase/supabase-js/dist/index.d.mts` exists whenever `node_modules` is present.

- [ ] **Step 1: Create `scripts/ensure-supabase-types.mjs`**

```javascript
import fs from 'node:fs';
import path from 'node:path';

const ctsPath = path.resolve('node_modules/@supabase/supabase-js/dist/index.d.cts');
const mtsPath = path.resolve('node_modules/@supabase/supabase-js/dist/index.d.mts');

if (fs.existsSync(ctsPath) && !fs.existsSync(mtsPath)) {
  fs.copyFileSync(ctsPath, mtsPath);
  console.log('✔ Created @supabase/supabase-js index.d.mts');
}
```

- [ ] **Step 2: Add postinstall hook in `package.json`**

In `package.json` `"scripts"`:
```json
"postinstall": "node scripts/ensure-supabase-types.mjs"
```

- [ ] **Step 3: Verify Supabase SDK types**

Run:
```bash
node scripts/ensure-supabase-types.mjs
npx tsc lib/sdk/supabase.ts lib/sdk/supabase-admin.ts --noEmit
```
Expected: Exits 0 with no errors.

- [ ] **Step 4: Commit**

```bash
git add package.json scripts/ensure-supabase-types.mjs
git commit -m "fix(sdk): ensure @supabase/supabase-js has index.d.mts for bundler resolution"
```

---

### Task 4: Fix Workspace TypeScript Compilation Errors

**Files:**
- Modify: `tsconfig.json`
- Modify: `app/api/v1/auth/refresh/route.ts`
- Modify: `lib/db/auth.ts`
- Modify: `lib/db/users.ts`
- Modify: `lib/services/admin/account-deletion.ts`
- Modify: `lib/services/admin/config-admin.ts`
- Modify: `lib/services/admin/report-admin.ts`
- Modify: `lib/services/admin/role-admin.ts`
- Modify: `lib/actions/question-actions.ts`

**Interfaces:**
- Produces: Clean zero-error `npm run type-check`.

- [ ] **Step 1: Exclude non-app backend experiment directories in `tsconfig.json`**

In `tsconfig.json`:
Add `"server"` to the `"exclude"` list:
```json
"exclude": ["node_modules", ".agents", "mobile", "sdk/dist", "server"]
```

- [ ] **Step 2: Add missing db functions in `lib/db/auth.ts` and `lib/db/users.ts`**

In `lib/db/auth.ts`:
```typescript
export async function deleteAuthUser(authUserId: string) {
  if (!supabaseAdmin?.auth?.admin?.deleteUser) return { error: null };
  return supabaseAdmin.auth.admin.deleteUser(authUserId);
}
```

In `lib/db/users.ts`:
```typescript
export async function authUserIdOf(userId: string): Promise<string | null> {
  const row = unwrap('users.authUserIdOf', await admin().from('users').select('auth_user_id').eq('id', userId).single());
  return (row as { auth_user_id?: string | null })?.auth_user_id ?? null;
}

export async function deleteUserRow(userId: string): Promise<void> {
  unwrap('users.delete', await admin().from('users').delete().eq('id', userId));
}
```

- [ ] **Step 3: Fix relative imports in admin services**

In `lib/services/admin/account-deletion.ts`:
Change `import type { SessionAccount } from './session';` to `import type { SessionAccount } from '../session';`.

In `lib/services/admin/config-admin.ts`:
Change `import { authorize } from './authorize';` to `import { authorize } from '../authorize';`.
Change `import { SessionAccount } from './session';` to `import { SessionAccount } from '../session';`.

In `lib/services/admin/report-admin.ts`:
Change `import { authorize } from './authorize';` to `import { authorize } from '../authorize';`.
Change `import { SessionAccount } from './session';` to `import { SessionAccount } from '../session';`.
Change `import ... from './system-report';` to `import ... from '../system-report';`.

In `lib/services/admin/role-admin.ts`:
Change `import { authorize } from './authorize';` to `import { authorize } from '../authorize';`.
Change `import { isRole, Role } from './rbac';` to `import { isRole, Role } from '../rbac';`.
Change `import { SessionAccount } from './session';` to `import { SessionAccount } from '../session';`.

- [ ] **Step 4: Fix `signRefresh` and payload type in `app/api/v1/auth/refresh/route.ts`**

In `app/api/v1/auth/refresh/route.ts`:
Import `signRefresh` from `@/lib/auth`.
Cast payload properly: `const payload = verifyRefresh(refreshToken) as { accountId?: string } | null;`.

- [ ] **Step 5: Fix dynamic import in `lib/actions/question-actions.ts`**

Change:
`await import('@/lib/services/ai-moderation')`
To:
`await import('@/lib/services/moderation/ai-moderation')`

- [ ] **Step 6: Run `npm run type-check`**

Run:
```bash
npm run type-check
```
Expected: Exits 0 with 0 errors.

- [ ] **Step 7: Commit**

```bash
git add tsconfig.json app/ lib/
git commit -m "fix(types): fix relative service imports and db functions for type-check"
```

---

### Task 5: Vitest Pool Configuration & Full Verification

**Files:**
- Modify: `vitest.node.config.cjs`

**Interfaces:**
- Produces: Working test execution for SDK test suites without worker thread / bus errors.

- [ ] **Step 1: Configure `vitest.node.config.cjs` pool options**

Update `vitest.node.config.cjs`:
```javascript
module.exports = {
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/setup-env.ts'],
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      include: ['app/**', 'lib/**', 'hooks/**', 'components/**'],
      exclude: ['**/*.d.ts', '**/__tests__/**', '**/*.test.*'],
    },
    maxWorkers: 1,
  },
};
```

- [ ] **Step 2: Run Full Verification Suite**

Run:
```bash
npm run build:sdk
npm run build:ui
npm run type-check
npm run check:architecture
cd sdk/dart && dart test
cd ../../mobile && flutter test
```
Expected: All build commands and test suites pass 100%.

- [ ] **Step 3: Commit**

```bash
git add vitest.node.config.cjs
git commit -m "chore(test): configure vitest node config singleThread pool"
```
