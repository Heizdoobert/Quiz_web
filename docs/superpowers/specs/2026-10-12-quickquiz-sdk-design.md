# Quick Quiz REST API + TypeScript SDK — Design Spec

**Date:** 2026-10-12
**Status:** Approved
**Scope:** Internal SDK for the Quick Quiz developer (not a public developer platform)

## 1. Overview

Two deliverables in one monorepo:

1. **REST API** — 33 Next.js route handlers under `app/api/v1/` that wrap the existing server actions with a consistent JSON envelope, HTTP status codes, and Bearer token auth.
2. **TypeScript SDK** — `packages/sdk/` published as `@heizdoobert/sdk` on GitHub Packages. Zero-dependency typed client that works anywhere with global `fetch`.

### Goals

- Clean REST endpoints so any client (Flutter, CLI, Discord bot, future apps) can integrate without copy-pasting fetch logic.
- Auto-generated TypeScript types that stay in sync with the backend.
- Stable API contract versioned under `/v1/`.
- Publishable npm package on GitHub Packages.

### Non-Goals (YAGNI)

- No OpenAPI spec generation (add later if external devs need it).
- No retry/backoff logic in the SDK.
- No WebSocket/realtime support.
- No Dart SDK (REST API is clean enough for Dart's `http` package).
- No API key management / developer portal.
- No rate limit headers on the SDK side (server handles rate limiting).

## 2. REST API Layer

### 2.1 Location

`app/api/v1/` — new route handlers alongside the existing `app/api/mobile/v1/` routes (which remain untouched).

### 2.2 Auth

Bearer token using the existing JWT mechanism (`issueMobileAuthToken` / `verifyMobileAuthToken` from `lib/services/mobile-auth.ts`). Public endpoints work without auth.

A shared helper (`lib/services/api-auth.ts`) will extract and verify the Bearer token from the `Authorization` header, returning a `SessionAccount | null`. Each route handler calls this instead of duplicating the header parsing.

### 2.3 Response Envelope

Every endpoint returns the same shape, mirroring the existing `ActionResult<T>`:

```json
// 2xx Success
{ "success": true, "data": { ... } }

// 4xx/5xx Error
{ "success": false, "error": { "code": "RATE_LIMITED", "message": "..." } }
```

A shared `apiResponse` helper in `lib/services/api-response.ts` creates these `NextResponse.json()` calls with the correct HTTP status code derived from the error code:

| Error Code | HTTP Status |
|------------|-------------|
| `VALIDATION_ERROR` | 400 |
| `INVALID` | 400 |
| `UNAUTHORIZED` | 401 |
| `NOT_ALLOWED` | 403 |
| `NOT_FOUND` | 404 |
| `CONFLICT` | 409 |
| `RATE_LIMITED` | 429 |
| `SERVER_ERROR` | 500 |
| `UNKNOWN_ERROR` | 500 |

#### Domain Error Translation
Route handlers must not return HTTP 200 with embedded failure indicators. Handlers explicitly translate domain failure shapes (`CommunityErrorCode`, `AnswerSubmissionResult.notSavedReason`, `GetUserQuizzesResult`) into `apiError`:
- `NOT_ANSWERED`, `NOT_ALLOWED` → 403 `NOT_ALLOWED`
- `rate-limited`, `RATE_LIMITED` → 429 `RATE_LIMITED`
- `signed-out` → 401 `UNAUTHORIZED`
- `INVALID`, `VALIDATION_ERROR` → 400 `VALIDATION_ERROR`

### 2.4 Endpoint Map

#### Auth

| Method | Path | Auth | Wraps |
|--------|------|------|-------|
| `POST` | `/v1/auth/signup` | — | `signUpWithUsername` |
| `POST` | `/v1/auth/signin` | — | `signInWithUsername` |
| `POST` | `/v1/auth/signin/google` | — | `signInAccountWithGoogle` |
| `POST` | `/v1/auth/email/request` | — | `requestEmailCode` |
| `POST` | `/v1/auth/email/verify` | — | `verifyEmailCode` (with token issuance) |
| `GET` | `/v1/auth/session` | ✓ | `getSessionInfo` |
| `POST` | `/v1/auth/signout` | ✓ | `signOut` (advisory client-side token discard in v1) |

Auth endpoints that create sessions (`signup`, `signin`, `signin/google`, `email/verify`) return `{ token, accountId }`.
`GET /v1/auth/session` returns `{ id, username }` (falling back to user display name / id).
Bearer tokens are stateless HMACs with a 30-day TTL; `POST /v1/auth/signout` clears cookie state and provides an endpoint for clients to signal signout, while the client discards the token.

#### Questions

| Method | Path | Auth | Wraps |
|--------|------|------|-------|
| `GET` | `/v1/questions/random` | — | `fetchRandomQuestion` |
| `GET` | `/v1/questions/count` | — | `getQuestionCount` |
| `GET` | `/v1/questions/:id` | — | `getPublicQuestion` |
| `POST` | `/v1/questions` | ✓ | `createQuestion` |
| `POST` | `/v1/questions/generate` | ✓ | `generateQuestion` |
| `POST` | `/v1/questions/:id/dispute` | ✓ | `disputeQuestion` |
| `GET` | `/v1/questions/:id/5050` | ✓ | `get5050EliminatedIndices` |
| `GET` | `/v1/questions/:id/discussion` | — | `getQuestionDiscussion` |
| `POST` | `/v1/questions/:id/rate` | ✓ | `rateQuestion` |
| `POST` | `/v1/questions/:id/comment` | ✓ | `addComment` |

Query params for `GET /v1/questions/random`: `?category=Science&exclude=id1,id2`

#### Quiz

| Method | Path | Auth | Wraps |
|--------|------|------|-------|
| `POST` | `/v1/quiz/answer` | ✓ | `submitAnswer` |
| `GET` | `/v1/quiz/history` | ✓ | `getAnswerHistory` |
| `GET` | `/v1/quiz/stats` | ✓ | `getUserStats` |

#### Leaderboard

| Method | Path | Auth | Wraps |
|--------|------|------|-------|
| `GET` | `/v1/leaderboard` | — | `getGlobalLeaderboard` |
| `GET` | `/v1/leaderboard/group/:id` | ✓ | `getGroupLeaderboard` |

Query params: `?limit=50&offset=0`

#### Groups

| Method | Path | Auth | Wraps |
|--------|------|------|-------|
| `POST` | `/v1/groups` | ✓ | `createGroup` |
| `GET` | `/v1/groups` | ✓ | `getUserGroups` |
| `POST` | `/v1/groups/:id/join` | ✓ | `joinGroup` |
| `POST` | `/v1/groups/:id/leave` | ✓ | `leaveGroup` |

#### Community

| Method | Path | Auth | Wraps |
|--------|------|------|-------|
| `DELETE` | `/v1/comments/:id` | ✓ | `deleteComment` |
| `POST` | `/v1/suggestions/:id/resolve` | ✓ | `resolveSuggestion` |
| `GET` | `/v1/suggestions` | ✓ | `getSuggestionsForAuthor` |

#### Profile

| Method | Path | Auth | Wraps |
|--------|------|------|-------|
| `GET` | `/v1/profile/quizzes` | ✓ | `getUserQuizzes` |
| `GET` | `/v1/profile/export` | ✓ | `exportUserData` |
| `GET` | `/v1/profile/analytics` | ✓ | `getQuestionAnalytics` |

#### Discovery

| Method | Path | Auth | Wraps |
|--------|------|------|-------|
| `GET` | `/v1/topics` | — | `getTopics` |
| `GET` | `/v1/topics/:topic/questions` | — | `getTopicQuestions` |
| `GET` | `/v1/search` | — | `searchQuestions` |

Query params for search: `?q=keyword&limit=20&offset=0`

### 2.5 Route Handler Pattern

Every route handler follows the same structure:

```ts
// app/api/v1/questions/random/route.ts
import { NextRequest } from 'next/server';
import { fetchRandomQuestion } from '@/lib/actions/question-actions';
import { apiOk, apiError } from '@/lib/services/api-response';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const category = searchParams.get('category') ?? undefined;
    const exclude = searchParams.get('exclude')?.split(',').filter(Boolean) ?? [];

    const question = await fetchRandomQuestion(exclude, category);
    return apiOk(question);
  } catch {
    return apiError('SERVER_ERROR', 'Failed to fetch question');
  }
}
```

For authenticated endpoints, the pattern adds account verification:

```ts
import { requireAuth } from '@/lib/services/api-auth';

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response;  // 401

  // ... use auth.account
}
```

## 3. TypeScript SDK Package

### 3.1 Location & Publishing

```
packages/sdk/
├── src/
│   ├── index.ts              # Public exports
│   ├── client.ts             # QuickQuizClient class
│   ├── http.ts               # Fetch wrapper: headers, auth, envelope unwrap
│   ├── errors.ts             # QuickQuizError with code/message/status
│   ├── types.ts              # Re-exports from ../../lib/types.ts at build time
│   └── resources/
│       ├── auth.ts           # client.auth.*
│       ├── questions.ts      # client.questions.*
│       ├── quiz.ts           # client.quiz.*
│       ├── leaderboard.ts    # client.leaderboard.*
│       ├── community.ts      # client.community.*
│       ├── groups.ts         # client.groups.*
│       ├── discovery.ts      # client.discovery.*
│       └── profile.ts        # client.profile.*
├── tests/
├── package.json              # @heizdoobert/sdk
├── tsconfig.json
├── tsup.config.ts            # ESM + CJS dual build
└── README.md
```

Published to GitHub Packages as `@heizdoobert/sdk`. `publishConfig.registry` points to `https://npm.pkg.github.com`.

### 3.2 Client Class

```ts
export interface QuickQuizClientOptions {
  baseUrl: string;             // e.g. 'https://quickquiz.app'
  token?: string;              // Pre-existing auth token
  fetch?: typeof globalThis.fetch;  // Custom fetch for testing
}

export class QuickQuizClient {
  readonly auth: AuthResource;
  readonly questions: QuestionsResource;
  readonly quiz: QuizResource;
  readonly leaderboard: LeaderboardResource;
  readonly community: CommunityResource;
  readonly groups: GroupsResource;
  readonly discovery: DiscoveryResource;
  readonly profile: ProfileResource;

  constructor(options: QuickQuizClientOptions);

  /** Update the stored auth token (called internally by auth.signIn) */
  setToken(token: string | null): void;
}
```

### 3.3 HTTP Layer

`http.ts` provides a single `request()` function that:

1. Prepends `baseUrl` to the path.
2. Attaches `Authorization: Bearer <token>` if a token is set.
3. Sets `Content-Type: application/json` for bodies.
4. Calls `fetch()`.
5. Parses the JSON response.
6. If `success: true`, returns `data`.
7. If `success: false`, throws `QuickQuizError` with the `code`, `message`, and HTTP `status`.

### 3.4 Error Class

```ts
export class QuickQuizError extends Error {
  readonly code: string;       // e.g. 'RATE_LIMITED'
  readonly status: number;     // HTTP status
  readonly details?: unknown;

  constructor(code: string, message: string, status: number, details?: unknown);
}
```

### 3.5 Types

`packages/sdk/src/types.ts` re-exports the shared types from `lib/types.ts`:

```ts
export type {
  ClientQuestion,
  AnswerSubmissionResult,
  UserStats,
  LeaderboardEntry,
  HistoryItem,
  SearchResult,
  // ... etc
} from '../../lib/types';
```

At build time, `tsup` resolves these imports and bundles the type declarations into the SDK's output. When you update `lib/types.ts`, rebuilding the SDK picks up the changes automatically.

### 3.6 Auth Flow

- `client.auth.signIn()` calls `POST /v1/auth/signin`, receives `{ token, accountId }`, and stores the token in the client instance via `client.setToken(token)`.
- All subsequent requests include the token automatically.
- The consumer is responsible for persisting the token between sessions (localStorage, keychain, file, etc.).
- `client.auth.signOut()` calls the endpoint and clears the stored token.

## 4. Auth Bridging & Security Architecture

The existing server actions (e.g. `submitAnswer`, `createQuestion`) traditionally read the web session from cookies via `getSessionAccount()`. API route handlers authenticate via Bearer token instead using `requireAuth(req)`.

### Security Constraints:
- **Never expose public account overrides:** Server actions marked with `'use server'` are publicly callable RPC endpoints. To prevent account impersonation, server actions must NEVER accept client-supplied account IDs over the wire.
- **Shared Service Architecture:** Business logic lives in service functions (or internal actions with authenticated context passed only from trusted server-side callers like Route Handlers).
- **Bearer Token Verification:** Route handlers parse `Authorization: Bearer <token>`, verify the token via `verifyMobileAuthToken(token)`, and only invoke backend operations once the account identity is cryptographically validated.

## 5. Shared Helpers (New Files)

Two new files in the main app support the API layer:

### `lib/services/api-auth.ts`

Extracts Bearer token from `Authorization` header, verifies it via `verifyMobileAuthToken`, returns `{ ok: true, account }` or `{ ok: false, response: NextResponse }`.

### `lib/services/api-response.ts`

Helper functions:
- `apiOk(data, status?)` — returns `NextResponse.json({ success: true, data }, { status })`.
- `apiError(code, message, details?)` — maps error code to HTTP status and returns `NextResponse.json({ success: false, error: { code, message, details } }, { status })`.

## 6. Testing Strategy

### 6.1 API Route Tests

Integration tests in `tests/api/v1/`. Each test:
- Mocks the underlying server action.
- Calls the route handler with a crafted `NextRequest`.
- Asserts HTTP status, envelope shape, and correct data forwarding.
- Tests auth enforcement (401 without token, 200 with valid token).

### 6.2 SDK Tests

Unit tests in `packages/sdk/tests/`. Each resource file gets a test that:
- Injects a mock `fetch` via `QuickQuizClientOptions.fetch`.
- Verifies the SDK calls the right method + path with correct params.
- Verifies successful responses are unwrapped correctly.
- Verifies error responses throw `QuickQuizError` with correct fields.

### 6.3 Test Commands

- `npm test` runs repo test suites.
- `packages/sdk` tests run via vitest (`npx vitest run packages/sdk/tests/`).
- Root `package.json` configures `"workspaces": ["packages/*"]` so dependencies and commands resolve cleanly across monorepo packages.

## 7. Publishing & Build

- Package name: `@heizdoobert/sdk`
- Registry: GitHub Packages (`https://npm.pkg.github.com`)
- Initial version: `0.1.0`
- Build: `tsup` producing ESM + CJS + bundled standalone `.d.ts` (resolving external types cleanly)
- Publish command: `cd packages/sdk && npm run build && npm publish`
- CI publishing can be added later as a GitHub Actions workflow.

## 8. Migration Path

1. Build the `/v1/` API routes and SDK.
2. Use the SDK from new projects (CLI, Discord bot, etc.).
3. Optionally migrate the Flutter mobile app from `/api/mobile/v1/` to `/api/v1/`.
4. Once migrated, deprecate and remove `/api/mobile/v1/` routes.

## 9. Files Changed

### New files:
- `lib/services/api-auth.ts` — shared auth extraction for API routes
- `lib/services/api-response.ts` — shared response envelope helpers
- `app/api/v1/**/*.ts` — 33 route handler files (one per endpoint)
- `packages/sdk/**` — entire SDK package
- `tests/api/v1/**` — API route integration tests

### Modified files:
- `package.json` — add workspace config for `packages/*` (if using npm workspaces)
- `.gitignore` — add `packages/sdk/dist/`
