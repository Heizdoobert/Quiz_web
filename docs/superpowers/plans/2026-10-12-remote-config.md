# Remote Config Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Supabase `remote_config` table and a required module, `sdk/remote_config/`, that reads it. One route, `GET /api/config`, serves web and mobile, and the Flutter app reads it with built-in defaults.

**Architecture:** `sdk/remote_config/keys.ts` is the registry of allowed keys (default and validator each). `sdk/remote_config/index.ts` reads the table through `pub` from `@/lib/db/client`, keeps only registered keys, validates each value, and fills defaults. `app/api/config/route.ts` returns the result with `Cache-Control: public, s-maxage=60, stale-while-revalidate=300`, or 503 without error text. The Flutter `RemoteConfigService` calls the same route and returns defaults on any failure.

**Tech Stack:** Next 16.4.0, React 19.3.0, TypeScript 5, Vitest 5, ESLint 9 flat config, dependency-cruiser, Supabase through `lib/sdk/supabase`, Flutter with `package:http` and `flutter_riverpod`.

**Spec:** `SPEC-remote-config.md` (repo root, local only).

## Global Constraints

- The only registered key at launch is `maintenance_mode` (boolean, default `false`). Do not add another key.
- `GET /api/config` answers `200 { "config": { "maintenance_mode": <boolean> } }` with `Cache-Control: public, s-maxage=60, stale-while-revalidate=300`, or `503 { "error": "unavailable" }` with `Cache-Control: no-store`. The 503 body never carries the database error.
- Rows whose key is not in `KEYS` are never returned. A value of the wrong type resolves to the key's default.
- No file outside `lib/db/` and `sdk/remote_config/` imports `@/lib/db/client`. `sdk/remote_config` imports no `@supabase/*` package directly.
- The table has no insert, update or delete RLS policy. Only the dashboard and the secret key write.
- `sdk/remote_config` is required: no no-op seam, no build-time swap, no optional import in `next.config.mjs`.
- No new dependency. No zod (it is not in `package.json`).
- No new suppression comments (`@ts-ignore`, `eslint-disable`, ...), per `CONSTRAINTS.md`.
- Specs, plans and `tasks/` files are local only. Do not commit this plan or `SPEC-remote-config.md`.
- Work on branch `company/update-code` only. Do not open a PR.
- Every task ends with `npm run type-check` and `npm run lint` clean (0 errors).
- Commit messages end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Rulings (the spec's open questions, decided by the defaults you chose)

- **Ruling 1:** the route is `GET /api/config`. Dart drops the `/mobile/v1` suffix from `API_BASE_URL` to find the origin. Cost if wrong: add a second route file that re-exports `GET`, and point Dart at `baseUrl`.
- **Ruling 2:** no UI consumes `maintenance_mode`. The Dart provider exists but nothing reads it yet. The spec's "fetch on start and on resume" is dropped with it: `remoteConfigProvider` fetches when first read, and the first consumer decides when to refetch. Cost if wrong: a later task wires a consumer and a lifecycle hook.
- **Ruling 3:** the mobile app keeps nothing between runs. Cost if wrong: store the last good value in shared preferences.
- **Ruling 4:** `check:architecture` gets `sdk/remote_config`. `coverage.include` stays as it is. Cost if wrong: add the path to `vitest.config.ts` and check the ratchet.
- **Ruling 5:** no `updated_at` trigger. Cost if wrong: a trigger is a few lines in a later migration.
- **Ruling 6:** the owner runs `supabase/migrations/remote-config.sql` in the Supabase SQL Editor. The agent never touches a live database. Until it runs, `/api/config` answers 503 and clients use defaults, which is the designed failure path.

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `supabase/migrations/remote-config.sql` | create | table, RLS, seed row |
| `sdk/remote_config/keys.ts` | create | the registry of allowed keys |
| `sdk/remote_config/index.ts` | create | `getRemoteConfig`, `REMOTE_CONFIG_DEFAULTS`, `RemoteConfig` |
| `sdk/remote_config/tests/remote-config.test.ts` | create | unit tests for the module |
| `sdk/remote_config/README.md` | create | what it is, how to add a key |
| `app/api/config/route.ts` | create | the shared GET handler |
| `tests/config-route.test.ts` | create | route tests |
| `eslint.config.mjs` | modify | allow `sdk/remote_config/**` to import `@/lib/db/client` |
| `lib/db/client.ts` | modify | comment names both allowed callers |
| `package.json` | modify | `test`, `test:coverage` and `check:architecture` include the module |
| `mobile/lib/services/remote_config_service.dart` | create | fetch with defaults |
| `mobile/test/remote_config_service_test.dart` | create | Dart tests |

## Conflict scan

| Pair or task | Shares | Produces against consumes | Finding |
|---|---|---|---|
| Task 1 and Task 2 | `getRemoteConfig` | Task 1 produces `getRemoteConfig(): Promise<RemoteConfig>` and throws `DbError`; Task 2 catches any error and answers 503 | agree |
| Task 1 and Task 3 | the key name `maintenance_mode` and the JSON shape | Task 2 produces `{config:{maintenance_mode}}`; Task 3 reads `config['maintenance_mode']` as a boolean | agree |
| Task 2 and Task 3 | the URL | Task 2 serves `/api/config`; Task 3 builds `<origin>/config` from `.../api/mobile/v1` and gets `.../api/config` | agree, checked by the URL test |
| Task 1 text | tests against code | the five test cases match `index.ts` branches: empty, override, wrong type, unregistered, error | agree |
| Task 2 text | tests against code | the 200 test sends an unregistered row and expects it absent, which `index.ts` guarantees | agree |
| Task 3 text | tests against code | six cases match the `fetch` branches: 200, URL, non-200, bad JSON, throw, wrong type | agree |

---

### Task 1: Table and `getRemoteConfig`

**Files:**
- Create: `supabase/migrations/remote-config.sql`, `sdk/remote_config/keys.ts`, `sdk/remote_config/index.ts`, `sdk/remote_config/tests/remote-config.test.ts`, `sdk/remote_config/README.md`
- Modify: `eslint.config.mjs`, `lib/db/client.ts`, `package.json`

**Interfaces:**
- Consumes: `pub` from `@/lib/db/client`, `unwrap` and `DbError` from `@/lib/db/errors`.
- Produces: `getRemoteConfig(): Promise<RemoteConfig>` (throws `DbError` when the read fails), `REMOTE_CONFIG_DEFAULTS: RemoteConfig`, `type RemoteConfig = { maintenance_mode: boolean }`.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/remote-config.sql`:

```sql
-- Remote config: flags and tunable values the owner changes in the Supabase dashboard.
-- Read by sdk/remote_config through the public key (RLS applies). No write policy exists, so
-- only the dashboard and the secret key can change a row. Never store a secret here.
-- Idempotent: safe to re-run in the Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS remote_config (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE remote_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read on remote_config" ON remote_config;
CREATE POLICY "Allow public read on remote_config"
  ON remote_config FOR SELECT
  USING (true);

INSERT INTO remote_config (key, value)
VALUES ('maintenance_mode', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;
```

- [ ] **Step 2: Write the failing test**

Create `sdk/remote_config/tests/remote-config.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DbError } from '@/lib/db/errors';
import { getRemoteConfig, REMOTE_CONFIG_DEFAULTS } from '../index';

const { select } = vi.hoisted(() => ({ select: vi.fn() }));

vi.mock('@/lib/sdk/supabase', () => ({
  supabase: { from: () => ({ select }) },
}));

describe('getRemoteConfig', () => {
  beforeEach(() => vi.resetAllMocks());

  it('gives the defaults when the table is empty', async () => {
    select.mockResolvedValue({ data: [], error: null });
    expect(await getRemoteConfig()).toEqual({ maintenance_mode: false });
    expect(REMOTE_CONFIG_DEFAULTS).toEqual({ maintenance_mode: false });
  });

  it('uses a stored value over the default', async () => {
    select.mockResolvedValue({ data: [{ key: 'maintenance_mode', value: true }], error: null });
    expect(await getRemoteConfig()).toEqual({ maintenance_mode: true });
  });

  it('falls back to the default for a value of the wrong type', async () => {
    select.mockResolvedValue({ data: [{ key: 'maintenance_mode', value: 'yes' }], error: null });
    expect(await getRemoteConfig()).toEqual({ maintenance_mode: false });
  });

  it('drops keys that are not registered', async () => {
    select.mockResolvedValue({ data: [{ key: 'service_secret', value: 'hunter2' }], error: null });
    const config = await getRemoteConfig();
    expect(config).toEqual({ maintenance_mode: false });
    expect(config).not.toHaveProperty('service_secret');
  });

  it('throws a DbError when the read fails', async () => {
    select.mockResolvedValue({ data: null, error: { message: 'boom' } });
    await expect(getRemoteConfig()).rejects.toBeInstanceOf(DbError);
  });
});
```

- [ ] **Step 3: Run it to see it fail**

Run: `npx vitest run sdk/remote_config/`
Expected: FAIL, `Failed to resolve import "../index"`.

- [ ] **Step 4: Write the module**

Create `sdk/remote_config/keys.ts`:

```ts
// The only keys the route may return. Add a key here and the types follow; the table may hold
// other rows, but they never leave the server.
export const KEYS = {
  maintenance_mode: {
    default: false,
    parse: (v: unknown) => (typeof v === 'boolean' ? v : undefined),
  },
};
```

Create `sdk/remote_config/index.ts`:

```ts
import 'server-only';
import { pub } from '@/lib/db/client';
import { unwrap } from '@/lib/db/errors';
import { KEYS } from './keys';

export type RemoteConfig = { [K in keyof typeof KEYS]: (typeof KEYS)[K]['default'] };

export const REMOTE_CONFIG_DEFAULTS = Object.fromEntries(
  Object.entries(KEYS).map(([key, spec]) => [key, spec.default]),
) as RemoteConfig;

// Every registered key, from the table when it holds a valid value and from its default
// otherwise. Throws DbError when the read fails; the caller decides what to answer.
export async function getRemoteConfig(): Promise<RemoteConfig> {
  const rows =
    unwrap<{ key: string; value: unknown }[]>('remote_config.list', await pub.from('remote_config').select('key, value')) ?? [];
  const config: Record<string, unknown> = { ...REMOTE_CONFIG_DEFAULTS };
  for (const { key, value } of rows) {
    if (!(key in KEYS)) continue; // an unregistered row never leaves the server
    const parsed = KEYS[key as keyof typeof KEYS].parse(value);
    if (parsed !== undefined) config[key] = parsed;
  }
  return config as RemoteConfig;
}
```

- [ ] **Step 5: Run the test to see it pass**

Run: `npx vitest run sdk/remote_config/`
Expected: PASS, 5 tests.

- [ ] **Step 6: Let lint and the scripts accept the module**

In `eslint.config.mjs`, change the comment and ignores of the first `no-restricted-imports` block, and the `files` of the second:

```js
    // lib/db owns database access: everything else calls its domain functions, never a
    // Supabase client. sdk/remote_config is the one other caller of lib/db/client, for the
    // remote_config table. The secret-key client bypasses RLS, so this is a security boundary.
    ignores: ["lib/sdk/**", "sdk/tracking-analytics/**", "sdk/remote_config/**", "tests/**"],
```

```js
    // lib/db and sdk/remote_config are the callers of the Supabase wrappers; vendor packages
    // stay banned there.
    files: ["lib/db/**", "sdk/remote_config/**"],
```

In `lib/db/client.ts`, replace the first comment line:

```ts
// Only lib/db/* and sdk/remote_config/* may import this file (eslint.config.mjs); everything
// else calls the domain functions next to it.
```

In `package.json`, add `sdk/remote_config/` to three scripts:

```json
    "test": "vitest run tests/ components/ sdk/tracking-analytics/ sdk/remote_config/",
    "test:coverage": "vitest run tests/ components/ sdk/tracking-analytics/ sdk/remote_config/ --coverage",
    "check:architecture": "depcruise --validate app lib components hooks sdk/remote_config",
```

- [ ] **Step 7: Check that the lint rule still blocks everyone else**

Create `app/zz-lint-probe.ts` with `import { pub } from '@/lib/db/client'; export const probe = pub;`.
Run: `npx eslint app/zz-lint-probe.ts`
Expected: an error from `no-restricted-imports` ("Use the domain functions in lib/db instead of a Supabase client."). Then delete the probe: `rm app/zz-lint-probe.ts`.

- [ ] **Step 8: Write the README**

Create `sdk/remote_config/README.md`:

```markdown
# remote_config

Flags and tunable values the owner changes in the Supabase dashboard, with no deploy. Required, unlike `sdk/tracking-analytics`: the app imports it directly and there is no no-op seam.

- Table: `remote_config(key, value jsonb)`. Schema in `supabase/migrations/remote-config.sql`, run by hand in the SQL Editor. Anyone can read, nobody can write with the public key. Never store a secret here.
- `getRemoteConfig()` returns every key in `keys.ts`, from the table when the value has the right type and from the default otherwise. Rows for unregistered keys are ignored. It throws `DbError` when the read fails.
- `GET /api/config` serves the result to web and mobile. A CDN keeps a good answer for 60 seconds, so an edit shows up within a minute.
- Only this folder and `lib/db` may import `@/lib/db/client`; `eslint.config.mjs` enforces it.

## Add a key

1. Add it to `KEYS` in `keys.ts` with a `default` and a `parse` that returns `undefined` for a wrong type.
2. Insert a row in the dashboard or in a new migration.
3. Mirror it in `mobile/lib/services/remote_config_service.dart`.
```

- [ ] **Step 9: Verify the task**

Run: `npm run type-check && npm run lint && npm test && npm run check:architecture`
Expected: all pass, 0 lint errors.

- [ ] **Step 10: Commit**

```bash
git add supabase/migrations/remote-config.sql sdk/remote_config eslint.config.mjs lib/db/client.ts package.json
git commit -m "feat(remote-config): add remote_config table and sdk/remote_config module" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: `GET /api/config`

**Files:**
- Create: `app/api/config/route.ts`, `tests/config-route.test.ts`

**Interfaces:**
- Consumes: `getRemoteConfig()` from `@/sdk/remote_config` (Task 1), `logger` from `@/lib/logger`.
- Produces: `GET /api/config` returning `200 { "config": { "maintenance_mode": boolean } }` with `Cache-Control: public, s-maxage=60, stale-while-revalidate=300`, or `503 { "error": "unavailable" }` with `Cache-Control: no-store`.

- [ ] **Step 1: Write the failing test**

Create `tests/config-route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../app/api/config/route';

const { select } = vi.hoisted(() => ({ select: vi.fn() }));

vi.mock('../lib/sdk/supabase', () => ({
  supabase: { from: () => ({ select }) },
}));

describe('GET /api/config', () => {
  beforeEach(() => vi.resetAllMocks());

  it('answers the config, cacheable for 60 seconds, without unregistered rows', async () => {
    select.mockResolvedValue({
      data: [
        { key: 'maintenance_mode', value: true },
        { key: 'internal_note', value: 'not for clients' },
      ],
      error: null,
    });
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('public, s-maxage=60, stale-while-revalidate=300');
    expect(await res.json()).toEqual({ config: { maintenance_mode: true } });
  });

  it('answers 503 without the error text, uncached, when the database returns an error', async () => {
    select.mockResolvedValue({ data: null, error: { message: 'password authentication failed for user "postgres"' } });
    const res = await GET();
    expect(res.status).toBe(503);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(JSON.stringify(await res.json())).toBe('{"error":"unavailable"}');
  });

  it('answers 503 when the read throws', async () => {
    select.mockRejectedValue(new Error('timeout'));
    const res = await GET();
    expect(res.status).toBe(503);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run tests/config-route.test.ts`
Expected: FAIL, `Failed to resolve import "../app/api/config/route"`.

- [ ] **Step 3: Write the route**

Create `app/api/config/route.ts`:

```ts
import { getRemoteConfig } from '@/sdk/remote_config';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// Shared by web and mobile. A CDN keeps a good answer for 60 seconds, so a dashboard edit
// shows up within a minute. A failure is never cached and never carries the database error;
// that goes to the server log, and clients fall back to their built-in defaults.
export async function GET() {
  try {
    return Response.json(
      { config: await getRemoteConfig() },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } },
    );
  } catch (err) {
    logger.error('remote_config_failed', { message: err instanceof Error ? err.message : String(err) });
  }
  return Response.json({ error: 'unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
}
```

- [ ] **Step 4: Run the test to see it pass**

Run: `npx vitest run tests/config-route.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Verify the task**

Run: `npm run type-check && npm run lint && npm test && npm run check:architecture`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add app/api/config/route.ts tests/config-route.test.ts
git commit -m "feat(remote-config): serve remote config at GET /api/config" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Flutter `RemoteConfigService`

**Files:**
- Create: `mobile/lib/services/remote_config_service.dart`, `mobile/test/remote_config_service_test.dart`

**Interfaces:**
- Consumes: `GET <origin>/api/config` (Task 2), `ApiClient.baseUrl` from `mobile/lib/api/api_client.dart`.
- Produces: `class RemoteConfig { const RemoteConfig({bool maintenanceMode = false}); final bool maintenanceMode; }`, `RemoteConfigService({http.Client? client, String? baseUrl}).fetch(): Future<RemoteConfig>` (never throws), `remoteConfigServiceProvider`, `remoteConfigProvider`.

- [ ] **Step 1: Write the failing test**

Create `mobile/test/remote_config_service_test.dart`:

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:mobile/services/remote_config_service.dart';

void main() {
  RemoteConfigService serviceFor(Future<http.Response> Function(http.Request) handler) =>
      RemoteConfigService(client: MockClient(handler), baseUrl: 'https://quiz.example/api/mobile/v1');

  test('a 200 sets the value', () async {
    final config = await serviceFor((_) async => http.Response('{"config":{"maintenance_mode":true}}', 200)).fetch();
    expect(config.maintenanceMode, true);
  });

  test('asks the shared route on the same origin, not the mobile one', () async {
    Uri? asked;
    await serviceFor((request) async {
      asked = request.url;
      return http.Response('{"config":{"maintenance_mode":false}}', 200);
    }).fetch();
    expect(asked.toString(), 'https://quiz.example/api/config');
  });

  test('a 503 leaves the defaults', () async {
    final config = await serviceFor((_) async => http.Response('{"error":"unavailable"}', 503)).fetch();
    expect(config.maintenanceMode, false);
  });

  test('malformed JSON leaves the defaults', () async {
    final config = await serviceFor((_) async => http.Response('<html>proxy error</html>', 200)).fetch();
    expect(config.maintenanceMode, false);
  });

  test('a network error leaves the defaults', () async {
    final config = await serviceFor((_) async => throw http.ClientException('offline')).fetch();
    expect(config.maintenanceMode, false);
  });

  test('a value of the wrong type leaves the default', () async {
    final config = await serviceFor((_) async => http.Response('{"config":{"maintenance_mode":"yes"}}', 200)).fetch();
    expect(config.maintenanceMode, false);
  });
}
```

- [ ] **Step 2: Run it to see it fail**

Run: `cd mobile && flutter test test/remote_config_service_test.dart`
Expected: FAIL, `Target of URI doesn't exist: 'package:mobile/services/remote_config_service.dart'`.

- [ ] **Step 3: Write the service**

Create `mobile/lib/services/remote_config_service.dart`:

```dart
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;
import '../api/api_client.dart';

final remoteConfigServiceProvider = Provider((ref) => RemoteConfigService());

/// Fetches when first read. The first screen that uses a value decides when to refetch.
final remoteConfigProvider = FutureProvider<RemoteConfig>(
  (ref) => ref.watch(remoteConfigServiceProvider).fetch(),
);

/// The built-in values: used until the server answers, and whenever it cannot.
/// Mirror every key of sdk/remote_config/keys.ts here with the same default.
class RemoteConfig {
  const RemoteConfig({this.maintenanceMode = false});

  final bool maintenanceMode;
}

class RemoteConfigService {
  RemoteConfigService({http.Client? client, String? baseUrl})
      : _client = client ?? http.Client(),
        _url = Uri.parse('${_origin(baseUrl ?? ApiClient.baseUrl)}/config');

  final http.Client _client;
  final Uri _url;

  // The route is shared with the web, so it sits at /api/config, next to /api/mobile/v1.
  static String _origin(String baseUrl) => baseUrl.replaceFirst(RegExp(r'/mobile/v1$'), '');

  /// The server's values, or the defaults when the request fails, times out, answers a
  /// non-200, or sends something unexpected. Never throws: the app must work offline.
  Future<RemoteConfig> fetch() async {
    try {
      final response = await _client.get(_url).timeout(const Duration(seconds: 5));
      if (response.statusCode != 200) return const RemoteConfig();
      final config = (jsonDecode(response.body) as Map)['config'] as Map;
      final maintenance = config['maintenance_mode'];
      return RemoteConfig(maintenanceMode: maintenance is bool ? maintenance : false);
    } catch (e) {
      debugPrint('Remote config unavailable, using defaults: $e');
      return const RemoteConfig();
    }
  }
}
```

- [ ] **Step 4: Run the test to see it pass**

Run: `cd mobile && flutter test test/remote_config_service_test.dart`
Expected: PASS, 6 tests.

- [ ] **Step 5: Verify the task**

Run: `cd mobile && flutter analyze && flutter test`
Expected: no issues, all tests pass. (If `flutter` is not installed on this machine, say so in the report and leave this step to mobile CI.)

- [ ] **Step 6: Commit**

```bash
git add mobile/lib/services/remote_config_service.dart mobile/test/remote_config_service_test.dart
git commit -m "feat(mobile): read remote config with built-in defaults" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Whole-branch check

**Files:** none changed unless a check fails.

- [ ] **Step 1: Run the full gate**

Run: `npm run check:task`
Expected: type-check, lint, gitleaks, architecture and coverage all pass. Coverage must not fall below the ratchet in `vitest.config.ts`.

- [ ] **Step 2: Build and check the bundle**

Run: `NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 npm run build && npm run check:bundle`
Expected: build succeeds, `/api/config` is listed as a dynamic route, and the bundle check stays under the 360 kB ratchet (this work adds server code only).

- [ ] **Step 3: Prove the failure path locally**

Run `npm run dev` in the Browser pane or a terminal tab, then `curl -si http://localhost:3000/api/config`.
Expected before the owner runs the migration: `503`, body `{"error":"unavailable"}`, `Cache-Control: no-store`. With a dev Supabase project that has no `remote_config` table this is the real failure path; with none configured it is the same.

- [ ] **Step 4: Report to the owner**

Say what is left for the owner, which the agent does not do (Ruling 6):
1. Paste `supabase/migrations/remote-config.sql` into the Supabase SQL Editor of the target project.
2. `curl -s <host>/api/config` should now answer `{"config":{"maintenance_mode":false}}`.
3. Flip the `maintenance_mode` value to `true` in the dashboard, wait 60 seconds, and curl again. It should read `true`.

## Self-review

- **Spec coverage:** criterion 1 is Task 2 (headers) plus Task 4 step 4; 2 is Task 1 tests and the route test; 3 is the "drops keys that are not registered" test and the route 200 test; 4 is the 503 tests and the Dart failure tests; 5 is the migration (select policy only); 6 is Task 3; 7 is Task 4; 8 is Task 1 steps 6 and 7. Every spec file in the structure has a task. The spec's "fetch on resume" is covered by Ruling 2.
- **Placeholder scan:** no TBD or "similar to" text; every code step has its code.
- **Type consistency:** `getRemoteConfig`, `REMOTE_CONFIG_DEFAULTS`, `RemoteConfig`, `KEYS`, `maintenance_mode`, `RemoteConfigService`, `remoteConfigProvider` and `fetch` keep one spelling in every task. `maintenanceMode` (Dart) and `maintenance_mode` (JSON and table) are the only intended pair.

## Follow-ups (not in this plan)

A consumer for `maintenance_mode` (web banner, mobile screen, refetch on resume). Persisting the last good value on mobile. An `updated_at` trigger. RBAC and the admin dashboard. A CI job that runs the migration against a scratch Postgres. A PR into `preview` through the release flow, when you ask for it.
