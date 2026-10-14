# Task List: SDK Gate & Package Resolution

## Phase 1: Foundation (Package & Path Resolution)

### Task 1: Configure TypeScript path aliases in tsconfig.json
**Description:** Map `@heizdoobert/quickquiz-sdk` and its subpaths (`/client`, `/server`) directly to `sdk/src` entries.
**Acceptance criteria:**
- [x] `@heizdoobert/quickquiz-sdk` maps to `./sdk/src/index.ts`
- [x] `@heizdoobert/quickquiz-sdk/client` maps to `./sdk/src/client/index.ts`
- [x] `@heizdoobert/quickquiz-sdk/server` maps to `./sdk/src/server/index.ts`
**Verification:**
- [x] `npm run type-check`
**Dependencies:** None
**Files touched:** `tsconfig.json`
**Commit:** `838e128`

### Task 2: Configure Vitest module aliases in vitest.config.ts
**Description:** Add matching resolve aliases for Vitest so test runs resolve SDK imports from source without build artifacts.
**Acceptance criteria:**
- [x] Vitest resolves `@heizdoobert/quickquiz-sdk` to `./sdk/src/index.ts`
- [x] Vitest resolves subpaths `/client` and `/server`
**Verification:**
- [x] `npx vitest run tests/sdk-integration.test.ts`
**Dependencies:** Task 1
**Files likely touched:** `vitest.config.ts`
**Estimated scope:** Small (1 file)

## Checkpoint: Foundation
- [x] TypeScript compiler resolves SDK aliases without errors

## Phase 2: Core Feature (SDK Gate Module)

### Task 3: Create lib/sdk.ts gateway factory function
**Description:** Implement `getSdk()` factory in `lib/sdk.ts` using `getSiteUrl() + '/api'` and optional options.
**Acceptance criteria:**
- [x] `getSdk(options?: Partial<QuickQuizClientOptions>)` returns configured `QuickQuizClient` instance
- [x] Default baseUrl uses `${getSiteUrl()}/api`
- [x] No mutable global singleton exported
**Verification:**
- [x] `npm run check:architecture`
**Dependencies:** Task 1, Task 2
**Files likely touched:** `lib/sdk.ts`
**Estimated scope:** Small (1 file)

### Task 4: Add focused unit tests for lib/sdk.ts
**Description:** Create test suite verifying `getSdk()` instantiates client, sets baseUrl with `/api`, handles tokens, and custom fetch.
**Acceptance criteria:**
- [x] Tests verify default baseUrl resolves to `/api` suffix
- [x] Tests verify token passed to client correctly
- [x] Tests verify custom fetch passthrough
**Verification:**
- [x] `npx vitest run tests/sdk-gate.test.ts`
**Dependencies:** Task 3
**Files likely touched:** `tests/sdk-gate.test.ts`
**Estimated scope:** Small (1 file)

## Checkpoint: Verification & Architecture
- [x] All tests pass: `npx vitest run tests/sdk-gate.test.ts tests/sdk-integration.test.ts`
- [x] Architecture clean: `npm run check:architecture`
- [x] Type check clean: `npm run type-check`
