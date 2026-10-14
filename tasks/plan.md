# Plan: QuickQuiz HTTP Client SDK Core & Integration

## Overview
Decompose the finalization, documentation, build packaging, and application integration of the newly enhanced HTTP Client Core in `@heizdoobert/quickquiz-sdk`.

## Dependency Graph
```
SDK Core (sdk/src/client/http.ts - DONE)
    │
    ├── SDK Documentation & Examples (sdk/README.md)
    │
    ├── SDK Build & Type Distribution (sdk/dist/)
    │       │
    │       └── Next.js App Client Integration (lib/client/)
    │
    └── Full Verification Suite (tests & lint)
```

## Tasks

### Task 1: Document HTTP Options in SDK README
**Description:** Update `sdk/README.md` to document the new `timeout`, `signal` (cancellation), and `retries` configuration options for `QuickQuizClient` and `HttpClient`.
**Acceptance criteria:**
- README documents `timeout`, `signal`, `retries` in configuration options.
- Includes code snippets for request cancellation via `AbortController` and custom timeouts.
**Verification:**
- Manual documentation inspection.
**Dependencies:** None (SDK core complete).
**Files likely touched:**
- `sdk/README.md`
**Estimated scope:** Small (1 file).

### Task 2: Build & Verify SDK Distribution Artifacts
**Description:** Run SDK build tooling (`tsup`) to ensure `dist/` contains valid `.mjs`, `.cjs`, and `.d.ts` declaration maps reflecting the new options.
**Acceptance criteria:**
- `dist/client.d.ts` and `dist/index.d.ts` export updated `HttpClientOptions` and `RequestOptions`.
- SDK packaging passes without type errors.
**Verification:**
- `npm --prefix sdk run type-check`
- `npm run build:sdk`
**Dependencies:** Task 1.
**Files likely touched:**
- `sdk/dist/*`
**Estimated scope:** Small (build artifacts).

### Task 3: Next.js Client App Integration Helper (Optional)
**Description:** Provide a shared singleton or factory in `lib/client/api-client.ts` for browser and server components to consume `@heizdoobert/quickquiz-sdk` with default timeout and retries.
**Acceptance criteria:**
- Helper initializes `createClient()` with appropriate `baseUrl` and defaults.
- Preserves zero external dependencies.
**Verification:**
- `npx vitest run tests/sdk-integration.test.ts`
**Dependencies:** Task 2.
**Files likely touched:**
- `lib/client/api-client.ts` (if required)
**Estimated scope:** Small (1 file).

### Task 4: Full Verification Check
**Description:** Execute full test suite, linting, and architecture verification across the entire repository.
**Acceptance criteria:**
- All tests pass (SDK tests + app tests).
- Type checking passes with 0 errors.
**Verification:**
- `npm run check:fast`
- `npx vitest run`
**Dependencies:** Tasks 1-3.
**Files likely touched:** None.
**Estimated scope:** Verification only.
