# Quick Quiz REST API + TypeScript SDK Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete v1 REST API (`/api/v1/*`) and zero-dependency TypeScript SDK (`@quickquiz/sdk` in `packages/sdk/`) for Quick Quiz.

**Architecture:** Next.js Route Handlers wrap existing server actions with a unified response envelope (`{ success, data }` or `{ success: false, error }`) and Bearer token JWT authentication. The TypeScript SDK wraps this REST API into modular resource clients with automatic token management and build-time types derived from the core backend.

**Tech Stack:** Next.js 16 App Router Route Handlers, TypeScript 5, Vitest, tsup (ESM/CJS SDK bundler), Node `fetch`.

**Spec:** `docs/superpowers/specs/2026-10-12-quickquiz-sdk-design.md`

## Global Constraints

- Response envelope must match `{ success: true, data: T }` or `{ success: false, error: { code: string, message: string, details?: unknown } }`.
- Auth uses Bearer tokens verified by `verifyMobileAuthToken` in `lib/services/mobile-auth.ts`.
- Server actions retain backward-compatibility with web cookie sessions: accept optional `authAccount?: SessionAccount` parameter fallback.
- The SDK package has ZERO runtime dependencies beyond standard global `fetch`.
- SDK must support dual ESM/CJS formats and export complete TypeScript `.d.ts` types.
- Follow existing codebase patterns and strict type safety (`tsc --noEmit` must pass cleanly).

---

### Task 1: API Infrastructure & Auth Bridging Helpers

**Files:**
- Create: `lib/services/api-response.ts`
- Create: `lib/services/api-auth.ts`
- Test: `tests/api/v1/infra.test.ts`

**Interfaces:**
- Consumes: `ActionResult`, `ActionErrorCode` from `lib/types.ts`, `verifyMobileAuthToken` from `lib/services/mobile-auth.ts`, `SessionAccount` from `lib/services/session.ts`
- Produces: `apiOk(data, status?)`, `apiError(code, message, details?, status?)`, `extractBearerToken(req)`, `requireAuth(req)`

- [ ] **Step 1: Write the failing tests for API helpers**

Create `tests/api/v1/infra.test.ts` testing `apiOk`, `apiError` status mapping, `extractBearerToken`, and `requireAuth`.

```ts
import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { apiOk, apiError, mapErrorCodeToStatus } from '@/lib/services/api-response';
import { extractBearerToken, requireAuth } from '@/lib/services/api-auth';
import * as mobileAuth from '@/lib/services/mobile-auth';

describe('API Infrastructure Helpers', () => {
  it('maps error codes to appropriate HTTP status codes', () => {
    expect(mapErrorCodeToStatus('VALIDATION_ERROR')).toBe(400);
    expect(mapErrorCodeToStatus('UNAUTHORIZED')).toBe(401);
    expect(mapErrorCodeToStatus('NOT_FOUND')).toBe(404);
    expect(mapErrorCodeToStatus('CONFLICT')).toBe(409);
    expect(mapErrorCodeToStatus('RATE_LIMITED')).toBe(429);
    expect(mapErrorCodeToStatus('SERVER_ERROR')).toBe(500);
    expect(mapErrorCodeToStatus('UNKNOWN_ERROR')).toBe(500);
  });

  it('apiOk returns 200 with standard envelope', async () => {
    const res = apiOk({ test: 123 });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ success: true, data: { test: 123 } });
  });

  it('apiError returns mapped status and error envelope', async () => {
    const res = apiError('UNAUTHORIZED', 'Please log in');
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json).toEqual({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Please log in' },
    });
  });

  it('extractBearerToken extracts token from header', () => {
    const req = new NextRequest('http://localhost/api/test', {
      headers: { Authorization: 'Bearer test-token-123' },
    });
    expect(extractBearerToken(req)).toBe('test-token-123');
  });

  it('requireAuth rejects missing or invalid token', () => {
    const reqNoAuth = new NextRequest('http://localhost/api/test');
    const authResult = requireAuth(reqNoAuth);
    expect(authResult.ok).toBe(false);
    if (!authResult.ok) {
      expect(authResult.response.status).toBe(401);
    }
  });

  it('requireAuth accepts valid token', () => {
    vi.spyOn(mobileAuth, 'verifyMobileAuthToken').mockReturnValueOnce({
      id: 'acc-123',
      username: 'tester',
    });
    const req = new NextRequest('http://localhost/api/test', {
      headers: { Authorization: 'Bearer valid-jwt' },
    });
    const authResult = requireAuth(req);
    expect(authResult.ok).toBe(true);
    if (authResult.ok) {
      expect(authResult.account.id).toBe('acc-123');
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/api/v1/infra.test.ts`
Expected: FAIL with missing modules.

- [ ] **Step 3: Implement `lib/services/api-response.ts` and `lib/services/api-auth.ts`**

`lib/services/api-response.ts`:
```ts
import { NextResponse } from 'next/server';
import { ActionErrorCode } from '@/lib/types';

export function mapErrorCodeToStatus(code: string): number {
  switch (code) {
    case 'VALIDATION_ERROR':
    case 'INVALID':
      return 400;
    case 'UNAUTHORIZED':
      return 401;
    case 'NOT_FOUND':
      return 404;
    case 'CONFLICT':
      return 409;
    case 'RATE_LIMITED':
      return 429;
    case 'NOT_ALLOWED':
      return 403;
    case 'SERVER_ERROR':
    case 'UNKNOWN_ERROR':
    default:
      return 500;
  }
}

export function apiOk<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ success: true, data }, { status });
}

export function apiError(
  code: ActionErrorCode | string,
  message: string,
  details?: unknown,
  statusOverride?: number
): NextResponse {
  const status = statusOverride ?? mapErrorCodeToStatus(code);
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        ...(details !== undefined ? { details } : {}),
      },
    },
    { status }
  );
}
```

`lib/services/api-auth.ts`:
```ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyMobileAuthToken } from '@/lib/services/mobile-auth';
import { SessionAccount } from '@/lib/services/session';
import { apiError } from './api-response';

export function extractBearerToken(req: NextRequest): string | null {
  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice(7).trim();
}

export type AuthRequirementResult =
  | { ok: true; account: SessionAccount }
  | { ok: false; response: NextResponse };

export function requireAuth(req: NextRequest): AuthRequirementResult {
  const token = extractBearerToken(req);
  if (!token) {
    return { ok: false, response: apiError('UNAUTHORIZED', 'Authentication token required', undefined, 401) };
  }

  const account = verifyMobileAuthToken(token);
  if (!account) {
    return { ok: false, response: apiError('UNAUTHORIZED', 'Invalid or expired token', undefined, 401) };
  }

  return { ok: true, account };
}

export function optionalAuth(req: NextRequest): SessionAccount | null {
  const token = extractBearerToken(req);
  if (!token) return null;
  return verifyMobileAuthToken(token);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/api/v1/infra.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/services/api-response.ts lib/services/api-auth.ts tests/api/v1/infra.test.ts
git commit -m "feat(api): add v1 response envelope and auth verification helpers"
```

---

### Task 2: Auth Endpoints (`/api/v1/auth/*`)

**Files:**
- Modify: `lib/actions/auth-actions.ts` (accept optional `authAccount`)
- Create: `app/api/v1/auth/signup/route.ts`
- Create: `app/api/v1/auth/signin/route.ts`
- Create: `app/api/v1/auth/signin/google/route.ts`
- Create: `app/api/v1/auth/email/request/route.ts`
- Create: `app/api/v1/auth/email/verify/route.ts`
- Create: `app/api/v1/auth/session/route.ts`
- Create: `app/api/v1/auth/signout/route.ts`
- Test: `tests/api/v1/auth.test.ts`

**Interfaces:**
- Consumes: `signUpAccount`, `signInAccount`, `signInAccountWithGoogle` from `lib/services/credentials.ts`, `issueMobileAuthToken` from `lib/services/mobile-auth.ts`, `requestEmailCode`, `verifyEmailCode`, `getSessionInfo` from `lib/actions/auth-actions.ts`
- Produces: POST `/api/v1/auth/signup`, POST `/api/v1/auth/signin`, POST `/api/v1/auth/signin/google`, POST `/api/v1/auth/email/request`, POST `/api/v1/auth/email/verify`, GET `/api/v1/auth/session`, POST `/api/v1/auth/signout`

- [ ] **Step 1: Write failing tests for auth endpoints**

Create `tests/api/v1/auth.test.ts` covering username signup, signin, token issue, session check, and signout.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/api/v1/auth.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement Auth Route Handlers & update `lib/actions/auth-actions.ts`**

In `lib/actions/auth-actions.ts`, allow `getSessionInfo(authAccount?: SessionAccount)`.
Create route handlers under `app/api/v1/auth/`:
- `signup/route.ts`: calls `signUpAccount`, issues token, returns `apiOk({ token, accountId })`.
- `signin/route.ts`: calls `signInAccount`, issues token, returns `apiOk({ token, accountId })`.
- `signin/google/route.ts`: calls `signInAccountWithGoogle`, issues token, returns `apiOk({ token, accountId })`.
- `email/request/route.ts`: calls `requestEmailCode`, returns `apiOk({ sent })`.
- `email/verify/route.ts`: calls `verifyEmailCode`, returns `apiOk({ ok })`.
- `session/route.ts`: `requireAuth(req)`, returns `apiOk({ id: account.id, username: account.username })`.
- `signout/route.ts`: `requireAuth(req)`, returns `apiOk({ ok: true })`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/api/v1/auth.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/api/v1/auth/ lib/actions/auth-actions.ts tests/api/v1/auth.test.ts
git commit -m "feat(api): implement v1 auth endpoints"
```

---

### Task 3: Public Questions & Discovery Endpoints

**Files:**
- Create: `app/api/v1/questions/random/route.ts`
- Create: `app/api/v1/questions/count/route.ts`
- Create: `app/api/v1/questions/[id]/route.ts`
- Create: `app/api/v1/topics/route.ts`
- Create: `app/api/v1/topics/[topic]/questions/route.ts`
- Create: `app/api/v1/search/route.ts`
- Test: `tests/api/v1/questions-public.test.ts`

**Interfaces:**
- Consumes: `fetchRandomQuestion`, `getQuestionCount`, `getPublicQuestion`, `getTopics` from `lib/actions/question-actions.ts`, `searchQuestions`, `getTopicQuestions` from `lib/actions/discovery-actions.ts`
- Produces: Public GET endpoints for questions, topics, search

- [ ] **Step 1: Write failing tests for public question and discovery endpoints**

Create `tests/api/v1/questions-public.test.ts` asserting search params, results envelope, 404 for missing question.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/api/v1/questions-public.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement route handlers**

- `questions/random/route.ts`: parses `category`, `exclude` (comma-separated), calls `fetchRandomQuestion`.
- `questions/count/route.ts`: calls `getQuestionCount`.
- `questions/[id]/route.ts`: calls `getPublicQuestion(id)`. Returns 404 if not found.
- `topics/route.ts`: calls `getTopics()`.
- `topics/[topic]/questions/route.ts`: parses pagination, calls `getTopicQuestions(topic, limit, offset)`.
- `search/route.ts`: parses `q`, `limit`, `offset`, calls `searchQuestions(q, limit, offset)`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/api/v1/questions-public.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/api/v1/questions/ app/api/v1/topics/ app/api/v1/search/ tests/api/v1/questions-public.test.ts
git commit -m "feat(api): implement public question, topic and search endpoints"
```

---

### Task 4: Authenticated Questions & Lifeline Endpoints

**Files:**
- Modify: `lib/actions/question-actions.ts` (allow `authAccount` in `createQuestion`, `generateQuestion`, `disputeQuestion`)
- Create: `app/api/v1/questions/route.ts` (POST)
- Create: `app/api/v1/questions/generate/route.ts` (POST)
- Create: `app/api/v1/questions/[id]/dispute/route.ts` (POST)
- Create: `app/api/v1/questions/[id]/5050/route.ts` (GET)
- Test: `tests/api/v1/questions-auth.test.ts`

**Interfaces:**
- Consumes: `createQuestion`, `generateQuestion`, `disputeQuestion`, `get5050EliminatedIndices` from `lib/actions/question-actions.ts`
- Produces: POST `/api/v1/questions`, POST `/api/v1/questions/generate`, POST `/api/v1/questions/:id/dispute`, GET `/api/v1/questions/:id/5050`

- [ ] **Step 1: Write failing tests for authenticated question endpoints**

Create `tests/api/v1/questions-auth.test.ts` checking auth enforcement and parameter passing.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/api/v1/questions-auth.test.ts`
Expected: FAIL

- [ ] **Step 3: Update `lib/actions/question-actions.ts` and implement route handlers**

Add `authAccount?: SessionAccount` parameter to `createQuestion`, `generateQuestion`, `disputeQuestion` using `const account = authAccount ?? (await getSessionAccount());`.
Implement routes using `requireAuth(req)`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/api/v1/questions-auth.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/api/v1/questions/ lib/actions/question-actions.ts tests/api/v1/questions-auth.test.ts
git commit -m "feat(api): implement authenticated question and lifeline endpoints"
```

---

### Task 5: Quiz & Leaderboard Endpoints

**Files:**
- Modify: `lib/actions/quiz-actions.ts` (allow `authAccount` in `getAnswerHistory`, `getUserStats`)
- Modify: `lib/actions/leaderboard-actions.ts` (allow `authAccount` in `getGroupLeaderboard`)
- Create: `app/api/v1/quiz/answer/route.ts` (POST)
- Create: `app/api/v1/quiz/history/route.ts` (GET)
- Create: `app/api/v1/quiz/stats/route.ts` (GET)
- Create: `app/api/v1/leaderboard/route.ts` (GET)
- Create: `app/api/v1/leaderboard/group/[id]/route.ts` (GET)
- Test: `tests/api/v1/quiz-leaderboard.test.ts`

**Interfaces:**
- Consumes: `submitAnswer`, `getAnswerHistory`, `getUserStats` from `lib/actions/quiz-actions.ts`, `getGlobalLeaderboard`, `getGroupLeaderboard` from `lib/actions/leaderboard-actions.ts`
- Produces: Quiz answer submission and stats endpoints, global and group leaderboard endpoints

- [ ] **Step 1: Write failing tests for quiz & leaderboard endpoints**

Create `tests/api/v1/quiz-leaderboard.test.ts`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/api/v1/quiz-leaderboard.test.ts`
Expected: FAIL

- [ ] **Step 3: Update server actions & implement route handlers**

Update `getAnswerHistory(authAccount?)`, `getUserStats(authAccount?)`, `getGroupLeaderboard(groupId, limit?, offset?, authAccount?)`.
Implement route handlers returning `apiOk(...)`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/api/v1/quiz-leaderboard.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/api/v1/quiz/ app/api/v1/leaderboard/ lib/actions/quiz-actions.ts lib/actions/leaderboard-actions.ts tests/api/v1/quiz-leaderboard.test.ts
git commit -m "feat(api): implement quiz submission, stats, and leaderboard endpoints"
```

---

### Task 6: Groups, Community & Profile Endpoints

**Files:**
- Modify: `lib/actions/group-actions.ts`, `lib/actions/community-actions.ts`, `lib/actions/profile-actions.ts` (allow `authAccount`)
- Create: `app/api/v1/groups/route.ts` (GET, POST)
- Create: `app/api/v1/groups/[id]/join/route.ts` (POST)
- Create: `app/api/v1/groups/[id]/leave/route.ts` (POST)
- Create: `app/api/v1/questions/[id]/rate/route.ts` (POST)
- Create: `app/api/v1/questions/[id]/comment/route.ts` (POST)
- Create: `app/api/v1/comments/[id]/route.ts` (DELETE)
- Create: `app/api/v1/suggestions/[id]/resolve/route.ts` (POST)
- Create: `app/api/v1/questions/[id]/discussion/route.ts` (GET)
- Create: `app/api/v1/suggestions/route.ts` (GET)
- Create: `app/api/v1/profile/quizzes/route.ts` (GET)
- Create: `app/api/v1/profile/export/route.ts` (GET)
- Create: `app/api/v1/profile/analytics/route.ts` (GET)
- Test: `tests/api/v1/community-groups-profile.test.ts`

**Interfaces:**
- Consumes: Action functions across community, group, and profile
- Produces: Remaining v1 API route handlers

- [ ] **Step 1: Write failing tests for community, group, and profile endpoints**

Create `tests/api/v1/community-groups-profile.test.ts`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/api/v1/community-groups-profile.test.ts`
Expected: FAIL

- [ ] **Step 3: Update actions and implement route handlers**

Wire up auth bridging for group, community, and profile actions.
Implement all route handlers with appropriate HTTP methods and status codes.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/api/v1/community-groups-profile.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/api/v1/groups/ app/api/v1/comments/ app/api/v1/suggestions/ app/api/v1/profile/ app/api/v1/questions/ lib/actions/ tests/api/v1/community-groups-profile.test.ts
git commit -m "feat(api): implement groups, community, and profile endpoints"
```

---

### Task 7: TypeScript SDK Setup & Core HTTP Client

**Files:**
- Create: `packages/sdk/package.json`
- Create: `packages/sdk/tsconfig.json`
- Create: `packages/sdk/tsup.config.ts`
- Create: `packages/sdk/src/types.ts`
- Create: `packages/sdk/src/errors.ts`
- Create: `packages/sdk/src/http.ts`
- Create: `packages/sdk/src/client.ts`
- Test: `packages/sdk/tests/http.test.ts`

**Interfaces:**
- Consumes: Types from `lib/types.ts`
- Produces: `QuickQuizError`, `HttpClient`, `QuickQuizClient` base class with `setToken()`

- [ ] **Step 1: Write failing tests for SDK HTTP client and error unwrap**

Create `packages/sdk/tests/http.test.ts` using custom injected fetch to test:
- Attaching `Authorization: Bearer <token>`
- Envelope unwrapping on success
- Throwing `QuickQuizError` on failure envelope or network error

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run packages/sdk/tests/http.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement package configuration and core SDK files**

Setup `packages/sdk/package.json` with `@quickquiz/sdk`, `tsup.config.ts` targeting `esm` and `cjs` with `dts: true`.
Implement `errors.ts`, `http.ts`, `client.ts`, and re-export `types.ts`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run packages/sdk/tests/http.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/sdk/
git commit -m "feat(sdk): setup package and implement core HTTP client and error handling"
```

---

### Task 8: SDK Resource Modules

**Files:**
- Create: `packages/sdk/src/resources/auth.ts`
- Create: `packages/sdk/src/resources/questions.ts`
- Create: `packages/sdk/src/resources/quiz.ts`
- Create: `packages/sdk/src/resources/leaderboard.ts`
- Create: `packages/sdk/src/resources/community.ts`
- Create: `packages/sdk/src/resources/groups.ts`
- Create: `packages/sdk/src/resources/discovery.ts`
- Create: `packages/sdk/src/resources/profile.ts`
- Create: `packages/sdk/src/index.ts`
- Test: `packages/sdk/tests/resources.test.ts`

**Interfaces:**
- Consumes: `HttpClient`
- Produces: `client.auth`, `client.questions`, `client.quiz`, `client.leaderboard`, `client.community`, `client.groups`, `client.discovery`, `client.profile`

- [ ] **Step 1: Write failing tests for SDK resource methods**

Create `packages/sdk/tests/resources.test.ts` verifying all resource methods call expected endpoints with expected payloads.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run packages/sdk/tests/resources.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement all resource modules and public index**

Implement all 8 resource modules according to the design spec:
- `auth.ts`: `signUp`, `signIn`, `signInWithGoogle`, `requestEmailCode`, `verifyEmailCode`, `session`, `signOut`.
- `questions.ts`: `random`, `get`, `count`, `create`, `generate`, `dispute`, `fiftyFifty`.
- `quiz.ts`: `submitAnswer`, `history`, `stats`.
- `leaderboard.ts`: `global`, `group`.
- `community.ts`: `rate`, `comment`, `deleteComment`, `resolveSuggestion`, `discussion`, `suggestions`.
- `groups.ts`: `create`, `list`, `join`, `leave`.
- `discovery.ts`: `search`, `topics`, `topicQuestions`.
- `profile.ts`: `quizzes`, `export`, `analytics`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run packages/sdk/tests/resources.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/sdk/src/ packages/sdk/tests/resources.test.ts
git commit -m "feat(sdk): implement all resource modules and public entry point"
```

---

### Task 9: SDK Packaging, Build & End-to-End Verification

**Files:**
- Modify: `package.json` (add workspaces support and SDK build scripts)
- Create: `packages/sdk/README.md`
- Modify: `.gitignore` (ignore `packages/sdk/dist`)
- Test: `tests/sdk-integration.test.ts`

**Interfaces:**
- Consumes: Built `@quickquiz/sdk` dist bundle
- Produces: Working build artifacts (`packages/sdk/dist`), documentation, end-to-end integration test

- [ ] **Step 1: Write integration test that imports and exercises built SDK against API handlers**

Create `tests/sdk-integration.test.ts` demonstrating end-to-end flow: creating client, fetching question, answering question with mock fetch routed to handler.

- [ ] **Step 2: Run build script for the SDK**

Run: `cd packages/sdk && npx tsup`
Verify `dist/index.mjs`, `dist/index.cjs`, and `dist/index.d.ts` are generated.

- [ ] **Step 3: Run full verification suite**

Run:
- `npm run type-check`
- `npm test`
- `npm run check:task`

- [ ] **Step 4: Write `packages/sdk/README.md` with usage examples**

Include installation, quickstart, client instantiation, and examples for questions, quiz submission, and auth.

- [ ] **Step 5: Commit**

```bash
git add package.json .gitignore packages/sdk/README.md tests/sdk-integration.test.ts
git commit -m "feat(sdk): complete SDK build, packaging, documentation, and end-to-end verification"
```
