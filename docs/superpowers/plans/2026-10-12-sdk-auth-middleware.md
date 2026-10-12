# Quick Quiz SDK Auth Middleware Implementation Plan

**Goal:** Add `@quickquiz/sdk/server`, a subpath export of the existing SDK package that lets another app's server (Next.js route handlers, Express) authenticate requests with Quick Quiz Bearer tokens.

**Builds on:** `packages/sdk/` and `GET /api/v1/auth/session` on branch `feat/sdk-and-api-v1`. Design context: `docs/superpowers/specs/2026-10-12-quickquiz-sdk-design.md`.

## Confirmed intent

- Developers of other Node or Next apps (Discord bot, internal tools) need to know which Quick Quiz account made a request.
- The middleware reads `Authorization: Bearer <token>`, verifies it remotely through `GET /v1/auth/session`, caches the verdict in memory, and hands the account to the host handler.
- Two modes: required (401 in the REST error envelope) and optional (`account: null`).
- Verification is remote only. There is no signing secret and no local JWT check. If Quick Quiz is unreachable the request is rejected (fail closed).
- Zero runtime dependencies. Next.js and Express are matched with structural types, so there are no peer dependencies.
- Out of scope: other frameworks, roles or permissions, token refresh, REST API changes, publishing to GitHub Packages, a PR into `preview`.

## Findings that shaped this plan

- The branch holds SDK Task 7 only (`HttpClient`, `QuickQuizClient`, `QuickQuizError`). Tasks 8 and 9 of `2026-10-12-quickquiz-sdk.md` (resource modules, `client.auth.session()`, README, integration test, `.gitignore` for `dist`) are not on it. The middleware therefore calls `HttpClient` directly and does not depend on them.
- SDK tests use `baseUrl = https://api.quickquiz.app` with paths like `/v1/...`, while the real routes live under `/api/v1/...`. The verifier uses the same `baseUrl` as the SDK client and requests `/v1/auth/session`, so a real deployment passes a `baseUrl` that ends in `/api`. Task 0 confirms this convention.
- `npm test` runs `vitest run tests/ components/`, so tests under `packages/sdk/tests/` never run in CI. The middleware tests go under `tests/` at the repo root so CI runs them.
- The worktree has an empty `node_modules`, and `npm ci` hangs on this drive. Install and verify in an ext4 scratch copy (`git archive HEAD | tar -x -C <scratch>`).
- The branch is 73 commits behind `origin/preview` (merge base fb27887). The middleware only touches `packages/sdk/` and does not depend on that gap, but merging the branch later will conflict in the API routes.

## Architecture decisions

- **Core is a verifier, adapters are thin.** `createTokenVerifier` owns fetching and caching. The Next and Express adapters only extract the token, call `verify`, and shape the response.
- **Cache key is the SHA-256 hex of the token** (`crypto.subtle`, async), so raw tokens never sit in the Map. Both verdicts are cached for `ttlMs` (default 30000): an account on success, `null` on 401. Errors (network, 5xx, 429) are not cached. The Map is capped at `maxEntries` (default 1000) and evicts the oldest entry first.
- **Failure shapes.** Missing token: 401 `UNAUTHORIZED` "Authentication token required". Invalid token: 401 `UNAUTHORIZED` "Invalid or expired token". These match `lib/services/api-auth.ts`. Upstream error: 503 `UPSTREAM_UNAVAILABLE` "Authentication service unavailable".
- **Optional mode.** No token gives `account: null`. An invalid token also gives `null`. An upstream error also gives `null` (decided after the first build, which returned 503): optional means anonymous is acceptable, and `onError` still reports the outage. Required mode answers 503.
- **`onError` hook (added during build).** Both adapters take `{ optional?, onError? }`. A wrong `baseUrl` (for example one missing `/api`) makes every verification fail with a 404, which would otherwise show up only as silent 503s. `onError` receives the upstream error, and a throwing `onError` is swallowed so it cannot cause an unhandled rejection.
- **A new `HttpClient` per verification**, not a shared one, because `setToken` is mutable state and concurrent verifications would race.
- **Runtime floor:** Node 20 or later (global `crypto.subtle`, `fetch`, `Request`, `Response`). Declared in `engines`.

## Task list

### Task 0: Baseline and convention check

**Description:** Install in a scratch copy, run the existing SDK test, and confirm how `baseUrl` maps to `/api/v1`.

**Acceptance criteria:**
- [ ] `npx vitest run packages/sdk/tests/http.test.ts` passes in the scratch copy.
- [ ] The `baseUrl` convention is written down at the top of `packages/sdk/src/server/verifier.ts` as a TSDoc line.

**Verification:**
- [ ] The scratch copy installs with `npm ci --legacy-peer-deps`, and `npx tsc --noEmit` is clean before any change.

**Dependencies:** None. **Files:** none. **Scope:** XS.

### Task 1: Token verifier with cache

**Description:** Remote token verification with a bounded in-memory cache.

**Files:**
- Create: `packages/sdk/src/server/verifier.ts`
- Test: `tests/sdk-server-verifier.test.ts`

**Interfaces:**
- `QuickQuizAccount = { id: string; username: string }`
- `TokenVerifier = { verify(token: string): Promise<QuickQuizAccount | null> }`
- `createTokenVerifier({ baseUrl, ttlMs?, maxEntries?, fetch? }): TokenVerifier`
- `getBearerToken(header: string | string[] | null | undefined): string | null`

**Acceptance criteria:**
- [ ] A valid token returns the account, and a second call inside the TTL makes no second fetch.
- [ ] After the TTL passes (fake timers) the verifier fetches again.
- [ ] A 401 returns `null` and is cached. A network error, 5xx or 429 throws `QuickQuizError` and is not cached.
- [ ] Once `maxEntries` is exceeded the oldest entry is evicted.

**Verification:**
- [ ] `npx vitest run tests/sdk-server-verifier.test.ts` passes, `npx tsc --noEmit` is clean.

**Dependencies:** Task 0. **Scope:** M.

### Task 2: Next.js route-handler adapter

**Description:** Wrap an App Router handler so it receives the verified account.

**Files:**
- Create: `packages/sdk/src/server/authenticate.ts` (shared core used by both adapters: the three failure bodies and the verdict logic)
- Create: `packages/sdk/src/server/next.ts`
- Test: `tests/sdk-server-next.test.ts`

**Interfaces:** `withQuickQuizAuth(verifier, handler, opts?)`. The handler is `(req: Request, ctx: C, account) => Response | Promise<Response>`. Overloads type `account` as non-null by default and nullable when `{ optional: true }`.

**Acceptance criteria:**
- [ ] Required mode: a missing or bad token returns 401 with the envelope, a good token calls the handler with the account.
- [ ] Optional mode: no token or a bad token calls the handler with `null`.
- [ ] A verifier error returns 503 `UPSTREAM_UNAVAILABLE` in required mode and the handler is not called. In optional mode the handler is called with `null`.

**Verification:**
- [ ] `npx vitest run tests/sdk-server-next.test.ts` passes, using the Web `Request` and `Response` globals.

**Dependencies:** Task 1. **Scope:** S.

### Task 3: Express adapter

**Description:** Express middleware that sets `req.quickQuizAccount`.

**Files:**
- Create: `packages/sdk/src/server/express.ts`
- Test: `tests/sdk-server-express.test.ts`

**Interfaces:** `quickQuizAuth(verifier, opts?)` returns `(req, res, next) => Promise<void>`. Request, response and next are structural types (`headers`, `status().json()`, `next()`), so Express is not a dependency, not even a dev one.

**Acceptance criteria:**
- [ ] Same required, optional and upstream-error behavior as Task 2, answered with `res.status(n).json(body)`.
- [ ] On success `next()` is called once and `req.quickQuizAccount` holds the account (or `null` in optional mode).
- [ ] A verifier error never reaches `next(err)` and never leaves an unhandled rejection.

**Verification:**
- [ ] `npx vitest run tests/sdk-server-express.test.ts` passes with plain mock objects.

**Dependencies:** Task 1 (Task 2 for `authenticate.ts`). **Scope:** S.

### Checkpoint: after Tasks 1-3

- [ ] `npx vitest run tests/sdk-server-*.test.ts` passes.
- [ ] `npx tsc --noEmit` is clean.
- [ ] Review with the user before packaging.

### Task 4: Subpath export and build

**Description:** Ship the code as `@quickquiz/sdk/server` in ESM, CJS and `.d.ts`.

**Files:**
- Create: `packages/sdk/src/server/index.ts`
- Modify: `packages/sdk/tsup.config.ts` (entries `index` and `server`)
- Modify: `packages/sdk/package.json` (`exports["./server"]`, `typesVersions` for node10 resolution, `engines.node >= 20`)
- Modify: `.gitignore` (`packages/sdk/dist`)

**Acceptance criteria:**
- [ ] `cd packages/sdk && npx tsup` emits `dist/server.mjs`, `dist/server.cjs` and `dist/server.d.ts`.
- [ ] `dist/server.d.ts` has no path into `lib/`.
- [ ] Both `import('@quickquiz/sdk/server')` and `require('@quickquiz/sdk/server')` resolve from the built `dist`.

**Verification:**
- [ ] The smoke commands run in the scratch copy: `node --input-type=module -e "import('./packages/sdk/dist/server.mjs').then(m => console.log(Object.keys(m)))"` and the same with `require` on the `.cjs`.
- [ ] `npm run type-check`, `npm run lint` and `npm test` pass at the repo root.

**Dependencies:** Tasks 1-3. **Scope:** S.

### Checkpoint: complete

- [ ] All acceptance criteria above are met.
- [ ] `git status` shows only the files listed in this plan.
- [ ] Nothing is published and no PR is opened. The user decides that next.

## Risks and mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| SDK Tasks 8 and 9 are not on the branch, although the SDK was described as finished | High | Build only on `HttpClient`. If the finished SDK lives elsewhere, rebase this work onto it before Task 4. |
| `baseUrl` ends in `/api` or not | Med | Task 0 fixes the convention. Document it in the TSDoc of `createTokenVerifier`. |
| Branch is 73 commits behind `preview` | Med | Out of scope here. Flag before any PR, because the API routes will conflict. |
| CI does not run `packages/sdk/tests` | Low | New tests live under `tests/`. The existing `http.test.ts` gap is left alone. |
| Cached verdict outlives token expiry by up to 30 s | Low | Accepted. Tokens are stateless and cannot be revoked anyway. `ttlMs` is configurable. |
| A flood of junk tokens evicts valid cache entries | Low | The only effect is more remote calls, never a wrong verdict. |

## Open questions

- Resolved: upstream outage in optional mode with a token present continues as `null`, not 503.
- Where does the finished SDK (Tasks 8-9) live, if not on `feat/sdk-and-api-v1`?
