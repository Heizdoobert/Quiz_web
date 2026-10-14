# Database Client Wrapper (`lib/db`) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move every Supabase call behind domain functions in `lib/db/`, turn every database failure into one `DbError`, and make ESLint reject any other file that imports a Supabase client.

**Architecture:** `lib/db/errors.ts` holds `DbError` and the `unwrap` helpers, which turn Supabase's `{ data, error }` into data or a thrown `DbError`. It is pure, so anything may import it. `lib/db/client.ts` hands out the two clients: `pub` (public key, RLS applies) and `admin()` (secret key, bypasses RLS). Only `lib/db/*` may import it. One file per domain (`users`, `auth`, `questions`, `results`, `community`, `groups`, `sponsors`, `rpc`) holds the queries. `lib/db` never logs. It throws, and the caller that picks the fallback logs once with its own event name.

**Tech Stack:** Next.js 16 server actions, `@supabase/supabase-js` v2, Vitest, ESLint 9 flat config.

**Spec:** the intent confirmed in chat on 2026-10-12. There is no separate spec file. This plan is the record:
- **Outcome:** a `lib/db/` data layer with domain functions. All Supabase access goes through it, and a failure throws a `DbError` that is logged once through `logger`.
- **User:** whoever writes server actions and routes in this repo.
- **Why now:** the 16 calling files each handle errors differently, and any of them can import `supabaseAdmin` and skip RLS.
- **Success:** no file outside `lib/db/` (and `lib/supabase/`, `tests/`) imports `@supabase/supabase-js`, `lib/supabase/supabase`, `lib/supabase/supabase-admin` or `lib/db/client`, and ESLint `no-restricted-imports` fails if one does. All `.from()` and `.rpc()` calls live in `lib/db/`. Existing tests and CI pass.
- **Constraint:** `lib/db` owns both clients. Migrate one domain per task. Behaviour does not change: the same queries, RLS and SQL.
- **Out of scope:** a published package, the logger SDK, retries, caching, transactions, schema/RLS/`lib/sql/` changes, and wiring the REST API + SDK plan to `lib/db`.

## Global Constraints

- Keep every query chain exactly as it is today: the same table, the same `select` string, and the same builder calls in the same order. The existing tests stub `supabase.from` / `supabaseAdmin.from` / `.rpc` with chain mocks, and they must pass **unmodified**.
- Keep every caller's return values, user-facing messages and error codes. The only allowed differences are in branches where `supabaseAdmin` is `null`, which only tests reach: `lib/supabase/supabase-admin.ts` throws at import when the key is missing outside the build. Those branches now go through the caller's catch.
- `lib/db/*` files start with `import 'server-only';`, except `errors.ts`, which has no clients.
- Never log inside `lib/db`. Each caller logs a `DbError` once, in the `catch` that picks its fallback.
- Expected Postgres codes are handled inside `lib/db` and returned as values, never thrown: `23505` unique violation, `23503` foreign-key violation, and `PGRST116` "no row" from `.single()`.
- Commands: `npx vitest run <file>` for one suite, `npm test` for all, `npm run type-check`, `npm run lint`.
- Work on `company/update-code` only. Commit after each task. No PR unless the user asks.

---

## File Structure

| File | Responsibility |
|---|---|
| `lib/db/errors.ts` (new) | `DbError`, `unwrap`, `unwrapOne`, `countOf`, Postgres code constants. No clients. |
| `lib/db/client.ts` (new) | `pub` (public client) and `admin()` (secret-key client). Only `lib/db/*` may import it. |
| `lib/db/users.ts` (new) | The `users` table: find or create the row for an auth user. |
| `lib/db/auth.ts` (new) | Supabase Auth: the public `auth()` and secret-key `createConfirmedUser`. |
| `lib/db/rpc.ts` (new) | Every Postgres function call (`.rpc`). |
| `lib/db/questions.ts` (new) | The `questions` and `question_disputes` tables. |
| `lib/db/results.ts` (new) | The `quiz_results` table. |
| `lib/db/community.ts` (new) | The `question_comments` and `question_ratings` tables. |
| `lib/db/groups.ts` (new) | The `groups` and `group_members` tables. |
| `lib/db/sponsors.ts` (new) | The `sponsors` table. |
| `tests/db-errors.test.ts` (new) | Unit test for `errors.ts`. |
| `eslint.config.mjs` (modify) | The `no-restricted-imports` rule. |
| 16 callers (modify) | Swap client calls for `lib/db` functions. |

---

### Task 1: Error type and clients

**Files:**
- Create: `lib/db/errors.ts`
- Create: `lib/db/client.ts`
- Test: `tests/db-errors.test.ts`

**Interfaces:**
- Produces:
  - `class DbError extends Error { op: string; code?: string }`
  - `unwrap<T>(op: string, res: DbResult<T>): T | null`
  - `unwrapOne<T>(op: string, res: DbResult<T>): T | null`, which turns `PGRST116` into `null`
  - `countOf(op: string, res: CountResult): number`
  - the constants `UNIQUE_VIOLATION = '23505'`, `FK_VIOLATION = '23503'`, `NO_ROWS = 'PGRST116'`
  - `pub` (the public client)
  - `admin()` (the secret-key client; throws `DbError('admin', …)` when it is not configured)

- [ ] **Step 1: Write the failing test**

`tests/db-errors.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { DbError, unwrap, unwrapOne, countOf, NO_ROWS } from '../lib/db/errors';

describe('lib/db/errors', () => {
  it('unwrap returns data when there is no error', () => {
    expect(unwrap('t.op', { data: [1, 2], error: null })).toEqual([1, 2]);
  });

  it('unwrap throws a DbError carrying the op, code and message', () => {
    try {
      unwrap('questions.insert', { data: null, error: { message: 'boom', code: '42P01' } });
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(DbError);
      expect(err).toMatchObject({ op: 'questions.insert', code: '42P01', message: 'questions.insert: boom' });
    }
  });

  it('unwrapOne turns a missing .single() row into null', () => {
    expect(unwrapOne('t.op', { data: null, error: { message: 'no rows', code: NO_ROWS } })).toBeNull();
    expect(() => unwrapOne('t.op', { data: null, error: { message: 'down' } })).toThrow(DbError);
  });

  it('countOf returns the count, 0 for null, and throws on error', () => {
    expect(countOf('t.op', { count: 7, error: null })).toBe(7);
    expect(countOf('t.op', { count: null, error: null })).toBe(0);
    expect(() => countOf('t.op', { count: null, error: { message: 'down' } })).toThrow(DbError);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/db-errors.test.ts`
Expected: FAIL, with "Failed to resolve import ../lib/db/errors".

- [ ] **Step 3: Write the implementation**

`lib/db/errors.ts`:

```ts
// Turns Supabase's { data, error } into data or one thrown DbError. No clients here, so
// any file may import it (to check `instanceof DbError`); lib/db never logs, callers do.

export const UNIQUE_VIOLATION = '23505';
export const FK_VIOLATION = '23503';
// PostgREST's "no row" from .single().
export const NO_ROWS = 'PGRST116';

type PgError = { message: string; code?: string };
export type DbResult<T> = { data: T | null; error: PgError | null };
export type CountResult = { count: number | null; error: PgError | null };

export class DbError extends Error {
  readonly op: string;
  readonly code?: string;

  constructor(op: string, cause: PgError) {
    super(`${op}: ${cause.message}`);
    this.name = 'DbError';
    this.op = op;
    this.code = cause.code;
  }
}

export function unwrap<T>(op: string, res: DbResult<T>): T | null {
  if (res.error) throw new DbError(op, res.error);
  return res.data;
}

// For .single() lookups, where no row is a normal answer rather than a failure.
export function unwrapOne<T>(op: string, res: DbResult<T>): T | null {
  if (res.error?.code === NO_ROWS) return null;
  return unwrap(op, res);
}

export function countOf(op: string, res: CountResult): number {
  if (res.error) throw new DbError(op, res.error);
  return res.count ?? 0;
}
```

`lib/db/client.ts`:

```ts
import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/supabase-admin';
import { DbError } from './errors';

// Only lib/db/* may import this file (eslint.config.mjs); everything else calls the
// domain functions next to it.

// Public key: RLS applies.
export { supabase as pub } from '@/lib/supabase/supabase';

// Secret key: bypasses RLS.
export function admin() {
  if (!supabaseAdmin) throw new DbError('admin', { message: 'SUPABASE_SECRET_KEY is not set' });
  return supabaseAdmin;
}
```

- [ ] **Step 4: Run the test and the type check**

Run: `npx vitest run tests/db-errors.test.ts && npm run type-check`
Expected: 4 tests pass and `tsc` reports no errors.

- [ ] **Step 5: Commit**

```bash
git add lib/db/errors.ts lib/db/client.ts tests/db-errors.test.ts
git commit -m "feat(db): add DbError, unwrap helpers and the lib/db clients"
```

---

### Task 2: Users, auth and the rate limiter

**Files:**
- Create: `lib/db/users.ts`, `lib/db/auth.ts`, `lib/db/rpc.ts`
- Modify: `lib/services/users.ts`, `lib/services/credentials.ts`, `lib/services/rate-limit.ts`, `lib/actions/auth-actions.ts`
- Test (existing, unmodified): `tests/identity-accounts.test.ts`, `tests/ensure-account-no-admin.test.ts`, `tests/auth-actions.test.ts`, `tests/auth-rate-limit.test.ts`, `tests/credentials-google.test.ts`

**Interfaces:**
- Consumes: `admin`, `pub`, `unwrap`, `DbError` from Task 1.
- Produces:
  - `ensureUserForAuthUser(authUserId: string, displayName: string): Promise<string>`
  - `auth(): SupabaseAuthClient`, the public client's `.auth`
  - `createConfirmedUser(email: string, password: string, username: string)`, which returns Supabase's `{ data, error }`, or `null` when there is no secret key
  - `rateLimitHit(key: string, max: number, windowSeconds: number): Promise<boolean>`, true when the attempt is allowed

- [ ] **Step 1: Run the suites to record the baseline**

Run: `npx vitest run tests/identity-accounts.test.ts tests/ensure-account-no-admin.test.ts tests/auth-actions.test.ts tests/auth-rate-limit.test.ts tests/credentials-google.test.ts`
Expected: PASS. These suites are the safety net for this task.

- [ ] **Step 2: Create `lib/db/users.ts`**

```ts
import 'server-only';
import { admin } from './client';
import { DbError, unwrap } from './errors';

// The account id for a Supabase Auth user, creating the users row on its first sign-in.
export async function ensureUserForAuthUser(authUserId: string, displayName: string): Promise<string> {
  unwrap(
    'users.upsert',
    await admin()
      .from('users')
      .upsert({ auth_user_id: authUserId, display_name: displayName }, { onConflict: 'auth_user_id', ignoreDuplicates: true })
  );
  const row = unwrap('users.byAuthUser', await admin().from('users').select('id').eq('auth_user_id', authUserId).single());
  if (!row) throw new DbError('users.byAuthUser', { message: 'no users row after upsert' });
  return row.id;
}
```

- [ ] **Step 3: Create `lib/db/auth.ts`**

```ts
import 'server-only';
import { supabase } from '@/lib/supabase/supabase';
import { supabaseAdmin } from '@/lib/supabase/supabase-admin';

// Supabase Auth, not Postgres: results keep Supabase's { data, error } shape because
// callers turn auth errors (taken username, wrong password, bad code) into messages.
export function auth() {
  return supabase.auth;
}

// A confirmed auth user made with the secret key, or null when no secret key is configured.
export async function createConfirmedUser(email: string, password: string, username: string) {
  if (!supabaseAdmin?.auth?.admin?.createUser) return null;
  return supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username },
  });
}
```

- [ ] **Step 4: Create `lib/db/rpc.ts` with the rate-limit counter**

```ts
import 'server-only';
import { admin } from './client';
import { unwrap } from './errors';

// Postgres functions (lib/sql/, supabase/migrations/). Later tasks add to this file.

// True when the attempt is allowed (supabase/migrations/17-auth-rate-limit.sql).
export async function rateLimitHit(key: string, max: number, windowSeconds: number): Promise<boolean> {
  const allowed = unwrap(
    'rpc.rate_limit_hit',
    await admin().rpc('rate_limit_hit', { p_key: key, p_max: max, p_window_seconds: windowSeconds })
  );
  return allowed !== false;
}
```

- [ ] **Step 5: Rewrite `lib/services/users.ts`**

Replace the whole file with:

```ts
import 'server-only';
import { ensureUserForAuthUser } from '@/lib/db/users';
import { logger } from '@/lib/logger';

// The account id for a Supabase Auth user (email sign-in), creating the account
// if this is its first verified code. Never call this without a verified OTP.
export async function ensureAccountForAuthUser(
  authUserId: string,
  displayName?: string
): Promise<string | null> {
  try {
    return await ensureUserForAuthUser(authUserId, displayName || `Player-${authUserId.slice(0, 4)}`);
  } catch (err) {
    logger.error('ensureAccountForAuthUser error:', err);
    return null;
  }
}
```

- [ ] **Step 6: Edit `lib/services/rate-limit.ts`**

Replace the import `import { supabaseAdmin } from '@/lib/supabase/supabase-admin';` with `import { rateLimitHit } from '@/lib/db/rpc';`. Then replace the body of `allowAttempt` with:

```ts
  try {
    const digest = createHash('sha256').update(identifier.trim().toLowerCase()).digest('hex');
    if (!(await rateLimitHit(`${scope}:${digest}`, max, windowSeconds))) {
      logger.warn('auth_rate_limited', { scope });
      return false;
    }
    return true;
  } catch (err) {
    logger.error('rate_limit_check_failed', err, { scope });
    return true;
  }
```

The `ponytail:` fail-open comment above the function stays as it is. A missing secret key now reaches the catch and fails open, so the old `if (!supabaseAdmin) return true` is no longer needed.

- [ ] **Step 7: Edit `lib/services/credentials.ts`**

Replace the two client imports with:

```ts
import { auth, createConfirmedUser } from '@/lib/db/auth';
```

In `signUpAccount`, replace the `if (supabaseAdmin?.auth?.admin?.createUser) { … }` block with:

```ts
    const created = await createConfirmedUser(email, password, trimmed);
    if (created) {
      const { data, error } = created;
      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes('already registered') || msg.includes('already exists') || msg.includes('unique')) {
          return { ok: false, error: 'Username is already taken.' };
        }
      } else if (data?.user) {
        authUserId = data.user.id;
      }
    }
```

Then replace each `supabase.auth.` with `auth().`. There are three: `signUp`, `signInWithPassword` and `signInWithIdToken`.

- [ ] **Step 8: Edit `lib/actions/auth-actions.ts`**

Replace `import { supabase } from '@/lib/supabase/supabase';` with `import { auth } from '@/lib/db/auth';`. Then replace `supabase.auth.signInWithOtp` with `auth().signInWithOtp`, and `supabase.auth.verifyOtp` with `auth().verifyOtp`.

- [ ] **Step 9: Run the suites and the type check**

Run: `npx vitest run tests/identity-accounts.test.ts tests/ensure-account-no-admin.test.ts tests/auth-actions.test.ts tests/auth-rate-limit.test.ts tests/credentials-google.test.ts && npm run type-check`
Expected: PASS, with no type errors.

- [ ] **Step 10: Commit**

```bash
git add lib/db/users.ts lib/db/auth.ts lib/db/rpc.ts lib/services/users.ts lib/services/credentials.ts lib/services/rate-limit.ts lib/actions/auth-actions.ts
git commit -m "refactor(db): move users, auth and rate-limit queries into lib/db"
```

---

### Task 3: Answers and stats

**Files:**
- Create: `lib/db/questions.ts`, `lib/db/results.ts`
- Modify: `lib/db/rpc.ts`, `lib/actions/quiz-actions.ts`, `lib/utils/stats.ts`
- Test (existing, unmodified): `tests/answer-guards.test.ts`, `tests/submit-answer-no-admin.test.ts`, `tests/stats.test.ts`

**Interfaces:**
- Consumes: `admin`, `pub`, `unwrap`, `unwrapOne`, `UNIQUE_VIOLATION` from Task 1.
- Produces:
  - `questionForAnswer(id: string): Promise<QuestionRow | null>`, the full row including `correct_index`
  - `insertResult(row: { user_id: string; question_id: string; answer_index: number; is_correct: boolean }): Promise<'recorded' | 'duplicate'>`
  - `recentResults(accountId: string, limit: number): Promise<unknown[]>`
  - `userStats(accountId: string): Promise<UserStatsRow | null>`

- [ ] **Step 1: Run the suites to record the baseline**

Run: `npx vitest run tests/answer-guards.test.ts tests/submit-answer-no-admin.test.ts tests/stats.test.ts`
Expected: PASS.

- [ ] **Step 2: Create `lib/db/questions.ts`**

```ts
import 'server-only';
import { admin } from './client';
import { unwrapOne } from './errors';

// questions and question_disputes. Later tasks add to this file.

export type QuestionRow = {
  id: string;
  status: string;
  correct_index: number;
  explanation: string | null;
  created_by_user: string | null;
  list_id: string | null;
};

// The full row, including the answer key; secret key only.
export async function questionForAnswer(id: string): Promise<QuestionRow | null> {
  return unwrapOne('questions.forAnswer', await admin().from('questions').select('*').eq('id', id).single());
}
```

- [ ] **Step 3: Create `lib/db/results.ts`**

```ts
import 'server-only';
import { admin } from './client';
import { unwrap, UNIQUE_VIOLATION } from './errors';

// quiz_results. Later tasks add to this file.

// The first answer counts: quiz_results is unique per account and question.
export async function insertResult(row: {
  user_id: string;
  question_id: string;
  answer_index: number;
  is_correct: boolean;
}): Promise<'recorded' | 'duplicate'> {
  const res = await admin().from('quiz_results').insert(row);
  if (res.error?.code === UNIQUE_VIOLATION) return 'duplicate';
  unwrap('results.insert', res);
  return 'recorded';
}

// Newest first, with the question prompt; never answer_index.
export async function recentResults(accountId: string, limit: number): Promise<unknown[]> {
  const rows = unwrap(
    'results.recent',
    await admin()
      .from('quiz_results')
      .select('question_id, is_correct, answered_at, questions(prompt)')
      .eq('user_id', accountId)
      .order('answered_at', { ascending: false })
      .limit(limit)
  );
  return rows ?? [];
}
```

- [ ] **Step 4: Add `userStats` to `lib/db/rpc.ts`**

Change the imports to `import { admin, pub } from './client';` and `import { unwrap, unwrapOne } from './errors';`, then append:

```ts
export type UserStatsRow = { total_answered: number; correct_count: number; streak: number; best_streak: number };

// Aggregated in Postgres (lib/sql/stats-functions.sql); raw rows are capped at 1000.
export async function userStats(accountId: string): Promise<UserStatsRow | null> {
  return unwrapOne('rpc.get_user_stats', await pub.rpc('get_user_stats', { p_user: accountId }).single<UserStatsRow>());
}
```

- [ ] **Step 5: Rewrite the two functions in `lib/utils/stats.ts`**

Replace the two client imports with:

```ts
import { recentResults } from '@/lib/db/results';
import { userStats } from '@/lib/db/rpc';
```

Replace `historyForAccount` with:

```ts
export async function historyForAccount(accountId: string): Promise<HistoryItem[]> {
  try {
    const rows = (await recentResults(accountId, HISTORY_LIMIT)) as Array<{
      question_id: string;
      is_correct: boolean;
      questions: { prompt: string } | null;
    }>;
    return rows.map((row) => ({
      questionId: row.question_id,
      prompt: row.questions?.prompt ?? '',
      isCorrect: row.is_correct,
    }));
  } catch (err) {
    logger.error('historyForAccount error:', err);
    return [];
  }
}
```

Replace `statsForAccount` with the version below, keeping its comment block:

```ts
export async function statsForAccount(accountId: string): Promise<UserStats> {
  try {
    const data = await userStats(accountId);
    if (!data || data.total_answered === 0) return ZERO_STATS;
    return {
      score: data.correct_count,
      streak: data.streak,
      bestStreak: data.best_streak,
      accuracy: Math.round((data.correct_count / data.total_answered) * 100),
      totalAnswered: data.total_answered,
    };
  } catch (err) {
    logger.error('statsForAccount error:', err);
    return ZERO_STATS;
  }
}
```

- [ ] **Step 6: Rewrite `submitAnswer` in `lib/actions/quiz-actions.ts`**

Replace `import { supabaseAdmin } from '@/lib/supabase/supabase-admin';` with:

```ts
import { questionForAnswer } from '@/lib/db/questions';
import { insertResult } from '@/lib/db/results';
```

Then replace the body of the `try` in `submitAnswer` with:

```ts
    if (!isUuid(params.questionId)) return failed('error');
    if (!(await allowAttemptFromIp('submit-answer-ip', ANSWERS_PER_IP_PER_HOUR, HOUR))) return failed('rate-limited');
    // correct_index and explanation are only readable with the secret key.
    const qData = await questionForAnswer(params.questionId);
    if (!qData) return failed('error');
    const account = mobileAccount ?? await getSessionAccount();
    // Only verified questions are answerable; anything else reveals nothing.
    if (qData.status !== 'verified') return failed('error');

    const isCorrect = params.answerIndex === qData.correct_index;
    const revealed = { isCorrect, correctIndex: qData.correct_index, explanation: qData.explanation };

    // Only a signed-in account's answers count; guests still see the result.
    if (!account) return { ...revealed, recorded: false, notSavedReason: 'signed-out' };
    // Nobody scores on a question they wrote.
    if (qData.created_by_user === account.id) {
      return { ...revealed, recorded: false, notSavedReason: 'own-question' };
    }

    // A failed write still shows the answer; only the score is lost.
    try {
      const outcome = await insertResult({
        user_id: account.id,
        question_id: params.questionId,
        answer_index: params.answerIndex,
        is_correct: isCorrect,
      });
      return outcome === 'recorded'
        ? { ...revealed, recorded: true }
        : { ...revealed, recorded: false, notSavedReason: 'already-answered' };
    } catch (err) {
      logger.error('submitAnswer insert error:', err);
      return { ...revealed, recorded: false, notSavedReason: 'error' };
    }
```

The outer `catch` (`logger.error('submitAnswer error:', err); return failed('error');`) stays. It now also covers a missing secret key and a failed question read.

- [ ] **Step 7: Run the suites and the type check**

Run: `npx vitest run tests/answer-guards.test.ts tests/submit-answer-no-admin.test.ts tests/stats.test.ts && npm run type-check`
Expected: PASS, with no type errors.

- [ ] **Step 8: Commit**

```bash
git add lib/db/questions.ts lib/db/results.ts lib/db/rpc.ts lib/utils/stats.ts lib/actions/quiz-actions.ts
git commit -m "refactor(db): move answer and stats queries into lib/db"
```

---

### Task 4: Questions, search and health

**Files:**
- Modify: `lib/db/questions.ts`, `lib/db/results.ts`, `lib/db/rpc.ts`, `lib/actions/question-actions.ts`, `lib/actions/discovery-actions.ts`, `lib/services/user-quizzes.ts`, `app/api/health/route.ts`
- Test (existing, unmodified): `tests/question-actions.test.ts`, `tests/answer-guards.test.ts`, `tests/discovery.test.ts`, `tests/trivia-guest-access.test.tsx`, `tests/profile-actions.test.ts`, `tests/health-route.test.ts`

**Interfaces:**
- Consumes: Task 1 helpers, and `questionForAnswer` from Task 3.
- Produces, in `questions.ts`:
  - `ping(timeoutMs: number): Promise<void>`
  - `countQuestions(): Promise<number>`
  - `countQuestionsByAuthorSince(accountId: string, since: string): Promise<number>`
  - `insertQuestion(row: NewQuestion): Promise<void>`
  - `listPublicQuestions(opts: { excludeIds?: string[]; category?: string; limit: number }): Promise<PublicQuestionRow[]>`
  - `publicQuestion(id: string): Promise<PublicQuestionRow | null>`
  - `answerKey(id: string): Promise<{ correct_index: number; status: string; list_id: string | null } | null>`
  - `listTopicQuestions(topic: string, offset: number, pageSize: number): Promise<unknown[]>`
  - `listQuestionsByAuthor(accountId: string, f: { category?: string; status?: string; offset: number; limit: number }): Promise<unknown[]>`
  - `insertDispute(row: { question_id: string; reporter_user: string; reason: string }): Promise<'created' | 'duplicate'>`
  - `countDisputes(questionId: string): Promise<number>`
  - `setDisputeState(questionId: string, disputeCount: number, quarantine: boolean): Promise<void>`
- Produces, in `results.ts`: `hasRecordedAnswer(accountId: string, questionId: string): Promise<boolean>`
- Produces, in `rpc.ts`:
  - `topics(): Promise<Array<{ name: string; question_count: number; latest_at: string }>>`
  - `incrementAiGeneration(accountId: string): Promise<number>`
  - `searchQuestionsRpc(query: string, limit: number, offset: number): Promise<unknown[]>`

- [ ] **Step 1: Run the suites to record the baseline**

Run: `npx vitest run tests/question-actions.test.ts tests/answer-guards.test.ts tests/discovery.test.ts tests/trivia-guest-access.test.tsx tests/profile-actions.test.ts tests/health-route.test.ts`
Expected: PASS.

- [ ] **Step 2: Append to `lib/db/questions.ts`**

Change the imports to:

```ts
import { admin, pub } from './client';
import { countOf, unwrap, unwrapOne, UNIQUE_VIOLATION } from './errors';
import { escapeLikePattern } from '@/lib/utils/validation';
```

Then append:

```ts
const PUBLIC_FIELDS = 'id, category, prompt, options, created_by_user, status';

export type PublicQuestionRow = {
  id: string;
  category: string;
  prompt: string;
  options: unknown;
  created_by_user: string | null;
  status: string | null;
};

export type NewQuestion = {
  prompt: string;
  options: string[];
  correct_index: number;
  category: string;
  explanation: string | null;
  created_by_user: string;
  status: 'verified';
  dispute_count: 0;
};

// Liveness probe for /api/health.
export async function ping(timeoutMs: number): Promise<void> {
  unwrap('questions.ping', await pub.from('questions').select('id').limit(1).abortSignal(AbortSignal.timeout(timeoutMs)));
}

export async function countQuestions(): Promise<number> {
  return countOf('questions.count', await pub.from('questions').select('id', { count: 'exact', head: true }));
}

export async function countQuestionsByAuthorSince(accountId: string, since: string): Promise<number> {
  return countOf(
    'questions.countByAuthorSince',
    await admin()
      .from('questions')
      .select('id', { count: 'exact', head: true })
      .eq('created_by_user', accountId)
      .gte('created_at', since)
  );
}

export async function insertQuestion(row: NewQuestion): Promise<void> {
  unwrap('questions.insert', await admin().from('questions').insert(row));
}

// Public questions: verified and not in a contest list. Unordered, up to `limit`.
export async function listPublicQuestions(opts: {
  excludeIds?: string[];
  category?: string;
  limit: number;
}): Promise<PublicQuestionRow[]> {
  let query = pub.from('questions').select(PUBLIC_FIELDS).eq('status', 'verified').is('list_id', null);
  if (opts.excludeIds?.length) query = query.not('id', 'in', `(${opts.excludeIds.join(',')})`);
  if (opts.category) query = query.ilike('category', escapeLikePattern(opts.category));
  return unwrap('questions.listPublic', await query.limit(opts.limit)) ?? [];
}

export async function publicQuestion(id: string): Promise<PublicQuestionRow | null> {
  return unwrapOne(
    'questions.public',
    await pub.from('questions').select(PUBLIC_FIELDS).eq('id', id).eq('status', 'verified').is('list_id', null).single()
  );
}

// The answer key and visibility only; secret key only.
export async function answerKey(id: string): Promise<{ correct_index: number; status: string; list_id: string | null } | null> {
  return unwrapOne(
    'questions.answerKey',
    await admin().from('questions').select('correct_index, status, list_id').eq('id', id).single()
  );
}

// One topic's public questions, newest first. Fetches pageSize + 1 rows so the caller can tell whether there is more.
export async function listTopicQuestions(topic: string, offset: number, pageSize: number): Promise<unknown[]> {
  const rows = unwrap(
    'questions.listTopic',
    await pub
      .from('questions')
      .select('id, prompt, category, created_at, users(display_name)')
      .eq('status', 'verified')
      .is('list_id', null)
      .ilike('category', escapeLikePattern(topic))
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize)
  );
  return rows ?? [];
}

// An author's questions, newest first; never correct_index or explanation.
export async function listQuestionsByAuthor(
  accountId: string,
  f: { category?: string; status?: string; offset: number; limit: number }
): Promise<unknown[]> {
  let query = pub
    .from('questions')
    .select('id, category, prompt, options, status, created_at')
    .eq('created_by_user', accountId);
  if (f.category) query = query.eq('category', f.category);
  if (f.status) query = query.eq('status', f.status);
  const rows = unwrap(
    'questions.listByAuthor',
    await query.order('created_at', { ascending: false }).range(f.offset, f.offset + f.limit - 1)
  );
  return rows ?? [];
}

// One report per account and question.
export async function insertDispute(row: {
  question_id: string;
  reporter_user: string;
  reason: string;
}): Promise<'created' | 'duplicate'> {
  const res = await admin().from('question_disputes').insert(row);
  if (res.error?.code === UNIQUE_VIOLATION) return 'duplicate';
  unwrap('disputes.insert', res);
  return 'created';
}

export async function countDisputes(questionId: string): Promise<number> {
  return countOf(
    'disputes.count',
    await admin().from('question_disputes').select('id', { count: 'exact', head: true }).eq('question_id', questionId)
  );
}

export async function setDisputeState(questionId: string, disputeCount: number, quarantine: boolean): Promise<void> {
  unwrap(
    'questions.setDisputeState',
    await admin()
      .from('questions')
      .update({ dispute_count: disputeCount, ...(quarantine ? { status: 'quarantined' } : {}) })
      .eq('id', questionId)
  );
}
```

- [ ] **Step 3: Append `hasRecordedAnswer` to `lib/db/results.ts`**

```ts
// quiz_results is unique per account and question, so maybeSingle is exact.
export async function hasRecordedAnswer(accountId: string, questionId: string): Promise<boolean> {
  const row = unwrap(
    'results.hasRecorded',
    await admin().from('quiz_results').select('id').eq('user_id', accountId).eq('question_id', questionId).maybeSingle()
  );
  return row !== null;
}
```

This replaces two chains. `disputeQuestion` used `.limit(1)` and community's `checkCanDiscuss` used `.maybeSingle()`. The answer-guards chain mock supports both, and `tests/community.test.ts` mocks `maybeSingle`.

- [ ] **Step 4: Append to `lib/db/rpc.ts`**

```ts
export async function topics(): Promise<Array<{ name: string; question_count: number; latest_at: string }>> {
  return unwrap('rpc.get_topics', await pub.rpc('get_topics')) ?? [];
}

// Today's AI generations for the account, after counting this one.
export async function incrementAiGeneration(accountId: string): Promise<number> {
  return unwrap('rpc.increment_ai_generation', await admin().rpc('increment_ai_generation', { p_user_id: accountId })) ?? 0;
}

export async function searchQuestionsRpc(query: string, limit: number, offset: number): Promise<unknown[]> {
  return unwrap('rpc.search_questions', await pub.rpc('search_questions', { p_query: query, p_limit: limit, p_offset: offset })) ?? [];
}
```

- [ ] **Step 5: Rewrite the database calls in `lib/actions/question-actions.ts`**

Replace the two client imports with:

```ts
import {
  answerKey, countDisputes, countQuestions, countQuestionsByAuthorSince, insertDispute,
  insertQuestion, listPublicQuestions, publicQuestion, setDisputeState,
} from '@/lib/db/questions';
import { hasRecordedAnswer } from '@/lib/db/results';
import { incrementAiGeneration, topics } from '@/lib/db/rpc';
```

Replace each function's database steps as follows. Keep every other line, including the validation, moderation, Gemini call and comments.

**`createQuestion`.** Delete the `if (!supabaseAdmin) { … }` block. Replace the count query and its `if (countErr)` block with:

```ts
    let count: number;
    try {
      count = await countQuestionsByAuthorSince(account.id, since);
    } catch (err) {
      logger.error('question_creation_rate_limit_check_failed', err, { userId: account.id });
      return { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to add question.' } };
    }
    if (count >= QUESTIONS_PER_DAY) {
```

The `logger.warn` and the `RATE_LIMITED` return inside that `if` do not change. Then replace the insert and its `if (error)` block with:

```ts
    try {
      await insertQuestion({
        prompt: validated.prompt,
        options: validated.options,
        correct_index: validated.correctIndex,
        category: validated.category,
        explanation: validated.explanation,
        created_by_user: account.id,
        status: 'verified',
        dispute_count: 0,
      });
    } catch (err) {
      logger.error('question_creation_db_insert_failed', err, { userId: account.id });
      return { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to add question.' } };
    }
```

If `tsc` rejects `validated.category` or `validated.explanation` against `NewQuestion`, widen the `NewQuestion` field types in `lib/db/questions.ts` to match the return type of `validateQuestionInput`. Do not cast at the call site.

**`fetchRandomQuestion`.** Replace everything from `let query = supabase` through the closing `}` of the general-fallback `if`, ending just before `const randomIndex`, with:

```ts
    const ids = (Array.isArray(excludeIds) ? excludeIds : []).filter(isUuid).slice(-200);
    const named = category && category !== 'All' ? category : undefined;
    // Each step falls back to a wider pool, so one failed read is logged and treated as empty.
    const list = (opts: Parameters<typeof listPublicQuestions>[0]) =>
      listPublicQuestions(opts).catch((err) => {
        logger.error('fetch_random_question_query_failed', err, { category });
        return [];
      });

    let data = await list({ excludeIds: ids, category: named, limit: 20 });
    if (data.length === 0 && named) {
      logger.info('fetch_random_question_fallback_triggered', { category, excludedCount: ids.length });
      data = await list({ category: named, limit: 20 });
    }
    if (data.length === 0) {
      logger.info('fetch_random_question_general_fallback_triggered', { category });
      data = await list({ limit: 20 });
      if (data.length === 0) {
        logger.warn('fetch_random_question_exhausted', { category });
        return null;
      }
    }
```

**`getTopics`.** Replace the `try` body with:

```ts
    return (await topics()).map((row) => ({
      name: row.name,
      questionCount: row.question_count,
      latestAt: row.latest_at,
    }));
```

**`getPublicQuestion`.** Replace the query and the `if (error || !data) return null;` line with:

```ts
    const data = await publicQuestion(id);
    if (!data) return null;
```

**`disputeQuestion`.** Delete the `if (!supabaseAdmin) return …` line. Then replace everything from `// Only players whose answer…` to the final `return { success: true, … }` with:

```ts
    // Only players whose answer to this question was recorded may report it
    let answered: boolean;
    try {
      answered = await hasRecordedAnswer(account.id, params.questionId);
    } catch (err) {
      logger.error('dispute_question_answered_check_failed', err, { userId: account.id, questionId: params.questionId });
      return { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to submit dispute.' } };
    }
    if (!answered) {
      logger.warn('dispute_question_rejected_unanswered', { userId: account.id, questionId: params.questionId });
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Answer this question before reporting it.' } };
    }

    let created: 'created' | 'duplicate';
    try {
      created = await insertDispute({ question_id: params.questionId, reporter_user: account.id, reason });
    } catch (err) {
      logger.error('dispute_question_db_insert_failed', err, { userId: account.id, questionId: params.questionId });
      return { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to submit dispute.' } };
    }
    if (created === 'duplicate') {
      logger.warn('dispute_question_duplicate_report', { userId: account.id, questionId: params.questionId });
      return { success: false, error: { code: 'CONFLICT', message: 'You have already reported this question.' } };
    }

    let disputeCount: number;
    try {
      disputeCount = await countDisputes(params.questionId);
    } catch (err) {
      logger.error('dispute_question_count_check_failed', err, { questionId: params.questionId });
      return { success: true, data: { quarantined: false } };
    }

    const quarantined = disputeCount >= QUARANTINE_AT;
    let updated = true;
    try {
      await setDisputeState(params.questionId, disputeCount, quarantined);
    } catch (err) {
      logger.error('dispute_question_update_failed', err, { questionId: params.questionId });
      updated = false;
    }

    logger.info('question_disputed', { userId: account.id, questionId: params.questionId, quarantined });
    return { success: true, data: { quarantined: quarantined && updated } };
```

**`getQuestionCount`.** Replace the whole function with:

```ts
export async function getQuestionCount(): Promise<number> {
  try {
    return await countQuestions();
  } catch (err) {
    logger.error('getQuestionCount error:', err);
    return 0;
  }
}
```

**`get5050EliminatedIndices`.** Replace `if (!isUuid(questionId) || !supabaseAdmin) return [];` and the query with:

```ts
    if (!isUuid(questionId)) return [];
    const data = await answerKey(questionId);
```

The bare `catch { return []; }` becomes `catch (err) { logger.error('get5050EliminatedIndices error:', err); return []; }`.

**`generateQuestion`.** Delete the `if (!supabaseAdmin) { … }` block. Replace the rpc call and its `if (countErr)` block with:

```ts
    const countData = await incrementAiGeneration(account.id);
```

The outer catch already returns `SERVER_ERROR` / `'Failed to generate question.'`, the response `tests/question-actions.test.ts:80` expects when the rpc fails.

Finally, drop `escapeLikePattern` from the `@/lib/utils/validation` import. `lib/db/questions.ts` now uses it, so only `isUuid` and `validateQuestionInput` stay.

- [ ] **Step 6: Rewrite `lib/actions/discovery-actions.ts`**

Replace the client import with:

```ts
import { listTopicQuestions } from '@/lib/db/questions';
import { searchQuestionsRpc } from '@/lib/db/rpc';
```

Then remove the `escapeLikePattern` import, which `lib/db/questions.ts` now uses.

In `searchQuestions`, replace the rpc call through the `if (error || !data) { … }` block with:

```ts
  let rows: SearchQuestionRow[];
  try {
    rows = (await searchQuestionsRpc(q, PAGE_SIZE + 1, (Math.max(1, page) - 1) * PAGE_SIZE)) as SearchQuestionRow[];
  } catch (err) {
    logger.error('searchQuestions error:', err);
    return { results: [], hasMore: false };
  }
```

Then delete the `const rows = data as SearchQuestionRow[];` line.

In `getTopicQuestions`, replace the query through `const rows = data as unknown as TopicQuestionRow[];` with:

```ts
  let rows: TopicQuestionRow[];
  try {
    rows = (await listTopicQuestions(topic, offset, PAGE_SIZE)) as TopicQuestionRow[];
  } catch (err) {
    logger.error('getTopicQuestions error:', err);
    return { results: [], hasMore: false };
  }
```

Keep the comment about the public-question rule above the `try`.

- [ ] **Step 7: Rewrite the query in `lib/services/user-quizzes.ts`**

Replace the client import with:

```ts
import { listQuestionsByAuthor } from '@/lib/db/questions';
import { DbError } from '@/lib/db/errors';
```

Replace everything from `// SECURITY:` through the `if (error) { … }` block with:

```ts
    // SECURITY: public display fields only (lib/db/questions.ts listQuestionsByAuthor).
    const data = await listQuestionsByAuthor(accountId, {
      category: options?.category,
      status: options?.status,
      offset,
      limit,
    });
```

Change the catch to:

```ts
  } catch (error: unknown) {
    logger.error('[quizzesForAccount]', error);
    if (error instanceof DbError) {
      return { success: false, error: 'Failed to fetch your quizzes.', code: 'FETCH_FAILED' };
    }
    return { success: false, error: 'An unexpected error occurred.', code: 'UNKNOWN_ERROR' };
  }
```

- [ ] **Step 8: Rewrite `app/api/health/route.ts`**

```ts
import { ping } from '@/lib/db/questions';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const TIMEOUT_MS = 3000;

// Liveness for uptime monitors: 200 only when the database answers. The body never carries
// the underlying error; that goes to the server log.
export async function GET() {
  try {
    await ping(TIMEOUT_MS);
    return Response.json({ status: 'ok' });
  } catch (err) {
    logger.error('health_check_failed', { message: err instanceof Error ? err.message : String(err) });
  }
  return Response.json({ status: 'unavailable' }, { status: 503 });
}
```

- [ ] **Step 9: Run the suites, the type check and lint**

Run: `npx vitest run tests/question-actions.test.ts tests/answer-guards.test.ts tests/discovery.test.ts tests/trivia-guest-access.test.tsx tests/profile-actions.test.ts tests/health-route.test.ts && npm run type-check && npm run lint`
Expected: PASS, with no type or lint errors.

- [ ] **Step 10: Commit**

```bash
git add lib/db/questions.ts lib/db/results.ts lib/db/rpc.ts lib/actions/question-actions.ts lib/actions/discovery-actions.ts lib/services/user-quizzes.ts app/api/health/route.ts
git commit -m "refactor(db): move question, search and health queries into lib/db"
```

---

### Task 5: Community (ratings, comments, suggestions)

**Files:**
- Create: `lib/db/community.ts`
- Modify: `lib/db/rpc.ts`, `lib/actions/community-actions.ts`
- Test (existing, unmodified): `tests/community.test.ts`, `tests/community-ui.test.tsx`

**Interfaces:**
- Consumes: Task 1 helpers, and `hasRecordedAnswer` from Task 4.
- Produces, in `community.ts`:
  - `questionForDiscussion(id: string): Promise<{ id: string; status: string; list_id: string | null; created_by_user: string | null } | null>`
  - `upsertRating(questionId: string, accountId: string, rating: number): Promise<void>`
  - `myRating(questionId: string, accountId: string): Promise<number | null>`
  - `countCommentsSince(accountId: string, since: string): Promise<number>`
  - `insertComment(row: { question_id: string; user_id: string; kind: 'comment' | 'suggestion'; body: string }): Promise<void>`
  - `commentAuthor(commentId: string): Promise<string | null>`
  - `deleteCommentRow(commentId: string): Promise<void>`
  - `suggestionForResolve(commentId: string): Promise<unknown | null>`
  - `markSuggestionResolved(commentId: string): Promise<void>`
  - `listComments(questionId: string, offset: number, pageSize: number): Promise<unknown[]>`
  - `listSuggestionsForAuthor(accountId: string): Promise<unknown[]>`
- Produces, in `rpc.ts`: `ratingSummary(questionId: string): Promise<Array<{ average: unknown; count: unknown }>>`

- [ ] **Step 1: Run the suites to record the baseline**

Run: `npx vitest run tests/community.test.ts tests/community-ui.test.tsx`
Expected: PASS.

- [ ] **Step 2: Create `lib/db/community.ts`**

```ts
import 'server-only';
import { admin } from './client';
import { countOf, unwrap } from './errors';

// question_comments and question_ratings. All secret key: the public key cannot write them.

export async function questionForDiscussion(
  id: string
): Promise<{ id: string; status: string; list_id: string | null; created_by_user: string | null } | null> {
  return unwrap(
    'community.question',
    await admin().from('questions').select('id, status, list_id, created_by_user').eq('id', id).maybeSingle()
  );
}

export async function upsertRating(questionId: string, accountId: string, rating: number): Promise<void> {
  unwrap(
    'ratings.upsert',
    await admin().from('question_ratings').upsert({
      question_id: questionId,
      user_id: accountId,
      rating,
      updated_at: new Date().toISOString(),
    })
  );
}

export async function myRating(questionId: string, accountId: string): Promise<number | null> {
  const row = unwrap(
    'ratings.mine',
    await admin().from('question_ratings').select('rating').eq('question_id', questionId).eq('user_id', accountId).maybeSingle()
  );
  return row?.rating ? Number(row.rating) : null;
}

export async function countCommentsSince(accountId: string, since: string): Promise<number> {
  return countOf(
    'comments.countSince',
    await admin()
      .from('question_comments')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', accountId)
      .gte('created_at', since)
  );
}

export async function insertComment(row: {
  question_id: string;
  user_id: string;
  kind: 'comment' | 'suggestion';
  body: string;
}): Promise<void> {
  unwrap('comments.insert', await admin().from('question_comments').insert(row));
}

// The comment's author id, or null when there is no such comment.
export async function commentAuthor(commentId: string): Promise<string | null> {
  const row = unwrap(
    'comments.author',
    await admin().from('question_comments').select('id, user_id').eq('id', commentId).maybeSingle()
  );
  return row?.user_id ?? null;
}

export async function deleteCommentRow(commentId: string): Promise<void> {
  unwrap('comments.delete', await admin().from('question_comments').delete().eq('id', commentId));
}

export async function suggestionForResolve(commentId: string): Promise<unknown | null> {
  return unwrap(
    'comments.suggestion',
    await admin()
      .from('question_comments')
      .select('id, kind, questions!inner(created_by_user)')
      .eq('id', commentId)
      .maybeSingle()
  );
}

export async function markSuggestionResolved(commentId: string): Promise<void> {
  unwrap(
    'comments.resolve',
    await admin().from('question_comments').update({ resolved_at: new Date().toISOString() }).eq('id', commentId)
  );
}

// Plain comments (not suggestions), newest first; pageSize + 1 rows so the caller can tell whether there is more.
export async function listComments(questionId: string, offset: number, pageSize: number): Promise<unknown[]> {
  const rows = unwrap(
    'comments.list',
    await admin()
      .from('question_comments')
      .select('id, body, created_at, user_id, users(display_name)')
      .eq('question_id', questionId)
      .eq('kind', 'comment')
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize)
  );
  return rows ?? [];
}

export async function listSuggestionsForAuthor(accountId: string): Promise<unknown[]> {
  const rows = unwrap(
    'comments.suggestionsForAuthor',
    await admin()
      .from('question_comments')
      .select(`
      id,
      question_id,
      body,
      created_at,
      resolved_at,
      questions!inner(prompt, created_by_user),
      users(display_name)
    `)
      .eq('kind', 'suggestion')
      .eq('questions.created_by_user', accountId)
      .order('created_at', { ascending: false })
  );
  return rows ?? [];
}
```

- [ ] **Step 3: Append `ratingSummary` to `lib/db/rpc.ts`**

```ts
export async function ratingSummary(questionId: string): Promise<Array<{ average: unknown; count: unknown }>> {
  return unwrap('rpc.get_rating_summary', await pub.rpc('get_rating_summary', { p_question_id: questionId })) ?? [];
}
```

- [ ] **Step 4: Rewrite the database calls in `lib/actions/community-actions.ts`**

Replace the two client imports with:

```ts
import {
  commentAuthor, countCommentsSince, deleteCommentRow, insertComment, listComments,
  listSuggestionsForAuthor, markSuggestionResolved, myRating as readMyRating,
  questionForDiscussion, suggestionForResolve, upsertRating,
} from '@/lib/db/community';
import { hasRecordedAnswer } from '@/lib/db/results';
import { ratingSummary } from '@/lib/db/rpc';
```

Replace `checkCanDiscuss` with the version below. It keeps today's mapping: a failed or missing question gives `NOT_ALLOWED`, and a failed or missing answer gives `NOT_ANSWERED`.

```ts
async function checkCanDiscuss(
  accountId: string,
  questionId: string,
  options: { allowAuthor: boolean }
): Promise<CommunityResult> {
  // 1. The question must be public (status = 'verified' AND list_id IS NULL)
  let question: Awaited<ReturnType<typeof questionForDiscussion>>;
  try {
    question = await questionForDiscussion(questionId);
  } catch (err) {
    logger.error('checkCanDiscuss question error:', err);
    return { ok: false, code: 'NOT_ALLOWED' };
  }
  if (!question || question.status !== 'verified' || question.list_id !== null) {
    return { ok: false, code: 'NOT_ALLOWED' };
  }

  // 2. Author gate
  if (!options.allowAuthor && question.created_by_user === accountId) {
    return { ok: false, code: 'NOT_ALLOWED' };
  }

  // 3. A recorded answer in quiz_results
  try {
    if (!(await hasRecordedAnswer(accountId, questionId))) return { ok: false, code: 'NOT_ANSWERED' };
  } catch (err) {
    logger.error('checkCanDiscuss answer error:', err);
    return { ok: false, code: 'NOT_ANSWERED' };
  }

  return { ok: true };
}
```

In `rateQuestion`, delete `if (!supabaseAdmin) return …`. Replace the upsert and its `if (error)` block with:

```ts
  try {
    await upsertRating(questionId, account.id, rating);
  } catch (err) {
    logger.error('rateQuestion error:', err);
    return { ok: false, code: 'FAILED' };
  }
  return { ok: true };
```

In `addComment`, delete `if (!supabaseAdmin) return …`. Replace everything from `const { count, error: countErr }` to the end of the function with:

```ts
  try {
    if ((await countCommentsSince(account.id, since)) >= 20) return { ok: false, code: 'RATE_LIMITED' };
    await insertComment({ question_id: questionId, user_id: account.id, kind, body: trimmed });
  } catch (err) {
    logger.error('addComment error:', err);
    return { ok: false, code: 'FAILED' };
  }
  return { ok: true };
```

In `deleteComment`, delete `if (!supabaseAdmin) return …`. Replace everything from `const { data: existing` to the end of the function with:

```ts
  let authorId: string | null;
  try {
    authorId = await commentAuthor(commentId);
  } catch (err) {
    logger.error('deleteComment lookup error:', err);
    return { ok: false, code: 'NOT_ALLOWED' };
  }
  if (authorId !== account.id) return { ok: false, code: 'NOT_ALLOWED' };

  try {
    await deleteCommentRow(commentId);
  } catch (err) {
    logger.error('deleteComment error:', err);
    return { ok: false, code: 'FAILED' };
  }
  return { ok: true };
```

In `resolveSuggestion`, delete `if (!supabaseAdmin) return …`. Replace everything from `const { data: existing` to the end of the function with:

```ts
  let existing: { kind?: string; questions?: unknown } | null;
  try {
    existing = (await suggestionForResolve(commentId)) as { kind?: string; questions?: unknown } | null;
  } catch (err) {
    logger.error('resolveSuggestion lookup error:', err);
    return { ok: false, code: 'NOT_ALLOWED' };
  }
  if (!existing || existing.kind !== 'suggestion') return { ok: false, code: 'NOT_ALLOWED' };

  const question = (Array.isArray(existing.questions) ? existing.questions[0] : existing.questions) as
    | { created_by_user?: string }
    | undefined;
  if (!question || question.created_by_user !== account.id) {
    return { ok: false, code: 'NOT_ALLOWED' };
  }

  try {
    await markSuggestionResolved(commentId);
  } catch (err) {
    logger.error('resolveSuggestion error:', err);
    return { ok: false, code: 'FAILED' };
  }
  return { ok: true };
```

In `getQuestionDiscussion`, replace steps 1 to 3 (from `// 1. Fetch rating summary` through `const rows = commentRows as unknown as Array<{`) with the code below. The rating and `myRating` stay best-effort, as they are today.

```ts
  // 1. Rating summary; the discussion still loads without it
  let rating: RatingSummary = { average: 0, count: 0 };
  try {
    const [summary] = await ratingSummary(questionId);
    if (summary) rating = { average: Number(summary.average) || 0, count: Number(summary.count) || 0 };
  } catch (err) {
    logger.error('getQuestionDiscussion rating error:', err);
  }

  // 2. The signed-in account's own rating
  let myRating: number | null = null;
  if (account) {
    try {
      myRating = await readMyRating(questionId, account.id);
    } catch (err) {
      logger.error('getQuestionDiscussion myRating error:', err);
    }
  }

  // 3. Comments (kind = 'comment' only, newest first)
  let commentRows: unknown[];
  try {
    commentRows = await listComments(questionId, offset, PAGE_SIZE);
  } catch (err) {
    logger.error('getQuestionDiscussion comments error:', err);
    return { rating, myRating, comments: [], hasMore: false };
  }

  const rows = commentRows as Array<{
```

The rest of the type literal and the mapping below it stay.

In `getSuggestionsForAuthor`, change `if (!isUuid(accountId) || !supabaseAdmin) return [];` to `if (!isUuid(accountId)) return [];`. Then replace the query and its `if (error || !data)` block with:

```ts
  let data: unknown[];
  try {
    data = await listSuggestionsForAuthor(account.id);
  } catch (err) {
    logger.error('getSuggestionsForAuthor error:', err);
    return [];
  }
```

The `const rows = data as unknown as Array<…>` cast below it stays. Change `as unknown as` to `as`.

- [ ] **Step 5: Run the suites, the type check and lint**

Run: `npx vitest run tests/community.test.ts tests/community-ui.test.tsx && npm run type-check && npm run lint`
Expected: PASS, with no type or lint errors.

- [ ] **Step 6: Commit**

```bash
git add lib/db/community.ts lib/db/rpc.ts lib/actions/community-actions.ts
git commit -m "refactor(db): move community queries into lib/db"
```

---

### Task 6: Groups, leaderboards, sponsors and profile

**Files:**
- Create: `lib/db/groups.ts`, `lib/db/sponsors.ts`
- Modify: `lib/db/rpc.ts`, `lib/db/questions.ts`, `lib/db/results.ts`, `lib/actions/group-actions.ts`, `lib/actions/leaderboard-actions.ts`, `lib/actions/ads-actions.ts`, `lib/actions/profile-actions.ts`
- Test (existing, unmodified): `tests/group-actions.test.ts`, `tests/leaderboard-actions.test.ts`, `tests/profile-actions.test.ts`

**Interfaces:**
- Consumes: Task 1 helpers.
- Produces:
  - `insertGroup(row: { name: string; description: string | null; owner_user: string }): Promise<unknown | 'taken'>`
  - `addMember(groupId: string, accountId: string): Promise<'added' | 'already-member' | 'no-group'>`
  - `removeMember(groupId: string, accountId: string): Promise<void>`
  - `groupsForAccount(accountId: string): Promise<unknown[]>`
  - `listActiveSponsors(): Promise<unknown[]>`
  - `globalLeaderboard(limit: number, offset: number): Promise<unknown[]>`
  - `groupLeaderboard(groupId: string, limit: number, offset: number): Promise<unknown[]>`
  - `questionAnalytics(accountId: string): Promise<unknown[]>`
  - `questionsForExport(accountId: string, limit: number): Promise<unknown[]>`
  - `resultsForExport(accountId: string, limit: number): Promise<unknown[]>`

- [ ] **Step 1: Run the suites to record the baseline**

Run: `npx vitest run tests/group-actions.test.ts tests/leaderboard-actions.test.ts tests/profile-actions.test.ts`
Expected: PASS.

- [ ] **Step 2: Create `lib/db/groups.ts`**

```ts
import 'server-only';
import { admin, pub } from './client';
import { FK_VIOLATION, unwrap, UNIQUE_VIOLATION } from './errors';

// groups and group_members. Writes use the secret key: the public key can no longer write them.

// The new group row, or 'taken' when the name is in use.
export async function insertGroup(row: {
  name: string;
  description: string | null;
  owner_user: string;
}): Promise<unknown | 'taken'> {
  const res = await admin().from('groups').insert(row).select().single();
  if (res.error?.code === UNIQUE_VIOLATION) return 'taken';
  return unwrap('groups.insert', res);
}

export async function addMember(groupId: string, accountId: string): Promise<'added' | 'already-member' | 'no-group'> {
  const res = await admin().from('group_members').insert({ group_id: groupId, user_id: accountId });
  if (res.error?.code === UNIQUE_VIOLATION) return 'already-member';
  if (res.error?.code === FK_VIOLATION) return 'no-group';
  unwrap('groups.addMember', res);
  return 'added';
}

export async function removeMember(groupId: string, accountId: string): Promise<void> {
  unwrap(
    'groups.removeMember',
    await admin().from('group_members').delete().eq('group_id', groupId).eq('user_id', accountId)
  );
}

export async function groupsForAccount(accountId: string): Promise<unknown[]> {
  const rows = unwrap(
    'groups.forAccount',
    await pub.from('group_members').select('group_id, groups(*)').eq('user_id', accountId)
  );
  return (rows ?? []).map((d: { groups: unknown }) => d.groups).filter(Boolean);
}
```

- [ ] **Step 3: Create `lib/db/sponsors.ts`**

```ts
import 'server-only';
import { pub } from './client';
import { unwrap } from './errors';

export async function listActiveSponsors(): Promise<unknown[]> {
  return unwrap('sponsors.active', await pub.from('sponsors').select('*').eq('active', true)) ?? [];
}
```

- [ ] **Step 4: Append the leaderboard and analytics functions to `lib/db/rpc.ts`**

```ts
// Pre-aggregated and pre-sorted in Postgres (supabase/migrations/stats-functions.sql).
export async function globalLeaderboard(limit: number, offset: number): Promise<unknown[]> {
  return unwrap('rpc.get_global_leaderboard', await pub.rpc('get_global_leaderboard', { p_limit: limit, p_offset: offset })) ?? [];
}

export async function groupLeaderboard(groupId: string, limit: number, offset: number): Promise<unknown[]> {
  return (
    unwrap(
      'rpc.get_group_leaderboard',
      await pub.rpc('get_group_leaderboard', { p_group_id: groupId, p_limit: limit, p_offset: offset })
    ) ?? []
  );
}

export async function questionAnalytics(accountId: string): Promise<unknown[]> {
  return unwrap('rpc.get_question_analytics', await pub.rpc('get_question_analytics', { p_user_id: accountId })) ?? [];
}
```

- [ ] **Step 5: Append the export reads**

Append to `lib/db/questions.ts`:

```ts
// Every column, for the account's own backup; secret key only.
export async function questionsForExport(accountId: string, limit: number): Promise<unknown[]> {
  return unwrap('questions.export', await admin().from('questions').select('*').eq('created_by_user', accountId).limit(limit)) ?? [];
}
```

Append to `lib/db/results.ts`:

```ts
// Every column, for the account's own backup; secret key only.
export async function resultsForExport(accountId: string, limit: number): Promise<unknown[]> {
  return unwrap('results.export', await admin().from('quiz_results').select('*').eq('user_id', accountId).limit(limit)) ?? [];
}
```

- [ ] **Step 6: Rewrite the database calls in `lib/actions/group-actions.ts`**

Replace the two client imports with:

```ts
import { addMember, groupsForAccount, insertGroup, removeMember } from '@/lib/db/groups';
```

Delete the `signedIn` helper, and drop `SessionAccount` from the session import. In `createGroup`, `joinGroup` and `leaveGroup`, replace `const auth = await signedIn(); if ('error' in auth) return { success: false, error: auth.error };` with:

```ts
    const account = await getSessionAccount();
    if (!account) return { success: false, error: 'Sign in to manage groups.' };
```

Then use `account.id` wherever the code had `auth.account.id`.

In `createGroup`, replace the insert through the owner-membership log with:

```ts
    let group: unknown;
    try {
      group = await insertGroup({ name, description: description || null, owner_user: account.id });
    } catch (err) {
      logger.error('createGroup insert error:', err);
      return { success: false, error: 'Failed to create group.' };
    }
    if (group === 'taken') return { success: false, error: 'That group name is taken.' };

    // Automatically add owner as a member
    try {
      await addMember((group as Group).id, account.id);
    } catch (err) {
      logger.error('createGroup owner membership error:', err);
    }
```

The `return { success: true, group: group as Group };` stays.

In `joinGroup`, replace the insert and its `if (error)` block with:

```ts
    let outcome: Awaited<ReturnType<typeof addMember>>;
    try {
      outcome = await addMember(groupId, account.id);
    } catch (err) {
      logger.error('joinGroup insert error:', err);
      return { success: false, error: 'Failed to join group.' };
    }
    if (outcome === 'already-member') return { success: false, error: 'You are already in this group.' };
    if (outcome === 'no-group') return { success: false, error: 'Group not found.' };
    return { success: true };
```

In `leaveGroup`, replace the delete and its `if (error)` block with:

```ts
    try {
      await removeMember(groupId, account.id);
    } catch (err) {
      logger.error('leaveGroup delete error:', err);
      return { success: false, error: 'Failed to leave group.' };
    }
    return { success: true };
```

In `getUserGroups`, replace the query through the `return data.map(…)` line with:

```ts
    return (await groupsForAccount(account.id)) as Group[];
```

`getUserGroups`'s existing catch (`logger.error('getUserGroups error:', err); return [];`) now also covers a failed read.

The comment above the deleted `signedIn` helper (`// Group writes act for the signed-in account only…`) moves to the top of `lib/db/groups.ts`, which already has an equivalent line. Delete it here.

- [ ] **Step 7: Rewrite the rpc calls in `lib/actions/leaderboard-actions.ts`**

Replace `import { supabase } from '@/lib/supabase/supabase';` with `import { globalLeaderboard, groupLeaderboard } from '@/lib/db/rpc';`.

In `readGlobalLeaderboard`, replace the two body lines with:

```ts
    return (await globalLeaderboard(limit, offset)) as LeaderboardRow[];
```

It still throws on a failed read, now as a `DbError`, so `unstable_cache` never caches an error.

In `getGroupLeaderboard`, replace the rpc call through `return toEntries(data as LeaderboardRow[], offset);` with:

```ts
    const rows = (await groupLeaderboard(groupId, clampLimit(limit), Math.max(0, offset))) as LeaderboardRow[];
    return toEntries(rows, offset);
```

The existing catch logs `getGroupLeaderboard error:` and returns `[]`.

- [ ] **Step 8: Rewrite `fetchRandomSponsor` in `lib/actions/ads-actions.ts`**

Replace the client import with `import { listActiveSponsors } from '@/lib/db/sponsors';`. Then replace the function body with:

```ts
  try {
    const data = await listActiveSponsors();
    if (data.length === 0) return null;

    // Pick a random sponsor
    return data[Math.floor(Math.random() * data.length)] as Sponsor;
  } catch (error) {
    logger.error('fetch_sponsors_failed', error);
    return null;
  }
```

- [ ] **Step 9: Rewrite the database calls in `lib/actions/profile-actions.ts`**

Replace the two client imports with:

```ts
import { questionsForExport } from '../db/questions';
import { resultsForExport } from '../db/results';
import { questionAnalytics } from '../db/rpc';
```

In `exportUserData`, delete the `if (!supabaseAdmin) { … }` block. Then replace everything from `const [quizzesResponse, statsResponse]` through `const stats = …` with the code below. Each read keeps its own message, which `tests/profile-actions.test.ts:137` asserts.

```ts
    // Each read keeps its own message; a failure is logged here and reported as EXPORT_FAILED.
    const read = (label: string, p: Promise<unknown[]>) =>
      p.catch((err) => {
        logger.error(`[exportUserData:${label}]`, err);
        return null;
      });
    const [quizRows, statRows] = await Promise.all([
      read('quizzes', questionsForExport(account.id, MAX_EXPORT_QUIZZES)),
      read('stats', resultsForExport(account.id, MAX_EXPORT_STATS)),
    ]);
    if (!quizRows) {
      return { success: false, error: 'Failed to fetch quizzes for export.', code: 'EXPORT_FAILED' };
    }
    if (!statRows) {
      return { success: false, error: 'Failed to fetch stats for export.', code: 'EXPORT_FAILED' };
    }

    const quizzes = quizRows as Question[];
    const stats = statRows as QuizResult[];
```

In `getQuestionAnalytics`, replace the rpc call through `return { success: true, data: data as QuestionAnalytics[] };` with:

```ts
    let data: unknown[];
    try {
      data = await questionAnalytics(account.id);
    } catch (err) {
      logger.error('[getQuestionAnalytics:rpc]', err);
      return { success: false, error: 'Failed to fetch analytics.' };
    }
    return { success: true, data: data as QuestionAnalytics[] };
```

- [ ] **Step 10: Run the suites, the type check and lint**

Run: `npx vitest run tests/group-actions.test.ts tests/leaderboard-actions.test.ts tests/profile-actions.test.ts && npm run type-check && npm run lint`
Expected: PASS, with no type or lint errors.

- [ ] **Step 11: Commit**

```bash
git add lib/db/groups.ts lib/db/sponsors.ts lib/db/rpc.ts lib/db/questions.ts lib/db/results.ts lib/actions/group-actions.ts lib/actions/leaderboard-actions.ts lib/actions/ads-actions.ts lib/actions/profile-actions.ts
git commit -m "refactor(db): move group, leaderboard, sponsor and profile queries into lib/db"
```

---

### Task 7: Enforce the boundary with ESLint

**Files:**
- Modify: `eslint.config.mjs`

**Interfaces:**
- Consumes: Tasks 2 to 6. After them, no file outside `lib/db/`, `lib/supabase/` and `tests/` imports a client.

- [ ] **Step 1: Confirm nothing outside the boundary still imports a client**

Run: `grep -rnE "from ['\"][^'\"]*(supabase/supabase(-admin)?|@supabase/supabase-js|db/client)['\"]" app lib components hooks --include=*.ts --include=*.tsx | grep -vE "^lib/(db|supabase)/"`
Expected: no output. If a line prints, migrate that file the same way as Tasks 2 to 6 before going on.

- [ ] **Step 2: Write a violating file to prove the rule fails first**

```bash
mkdir -p lib/tmp-lint-probe && printf "import { supabaseAdmin } from '../supabase/supabase-admin';\nexport const x = supabaseAdmin;\n" > lib/tmp-lint-probe/probe.ts
npx eslint lib/tmp-lint-probe/probe.ts
```

Expected: exit code 0 and no `no-restricted-imports` error, because the rule doesn't exist yet.

- [ ] **Step 3: Add the rule**

In `eslint.config.mjs`, add this object after the `no-empty` block:

```js
  {
    // lib/db owns database access: everything else calls its domain functions, never a
    // Supabase client. The secret-key client bypasses RLS, so this is a security boundary.
    ignores: ["lib/db/**", "lib/supabase/**", "tests/**"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{
          group: ["@supabase/supabase-js", "**/supabase/supabase", "**/supabase/supabase-admin", "**/db/client"],
          message: "Use the domain functions in lib/db instead of a Supabase client.",
        }],
      }],
    },
  },
```

- [ ] **Step 4: Run the probe again, then delete it**

```bash
npx eslint lib/tmp-lint-probe/probe.ts; echo "exit=$?"
rm -r lib/tmp-lint-probe
```

Expected: one `no-restricted-imports` error ("Use the domain functions in lib/db instead of a Supabase client.") and `exit=1`. If the relative path `../supabase/supabase-admin` is not reported, add `"../supabase/*"` and `"./supabase/*"` to `group` and rerun the probe.

- [ ] **Step 5: Run the full check**

Run: `npm run lint && npm run type-check && npm test`
Expected: all three pass.

- [ ] **Step 6: Commit**

```bash
git add eslint.config.mjs
git commit -m "chore(lint): only lib/db may import a Supabase client"
```

---

## Self-review

- **Spec coverage.**
  - Domain functions in `lib/db`: Tasks 2 to 6.
  - `DbError` and centralised unwrap: Task 1.
  - Logged once: each caller logs in the catch that picks its fallback (Global Constraints).
  - `lib/db` owns both clients: Task 1 `client.ts`.
  - ESLint ban: Task 7.
  - One domain per task: Tasks 2 to 6.
  - Unchanged behaviour: the Global Constraints, plus the per-task baseline and rerun of the unmodified suites.
- **Known behaviour differences.**
  - All of them are in branches where `supabaseAdmin` is null, which only tests reach: "Groups are unavailable right now.", "Adding questions is unavailable right now.", "Reporting is unavailable right now." and "Database not available." become the caller's generic failure message, and `allowAttempt` now logs before failing open.
  - Reads that used to fail silently now log once: topics, the question count, user groups, the 50/50 lifeline, rating summary and own rating.
- **Type consistency.**
  - `hasRecordedAnswer` is defined in Task 4 and reused in Task 5.
  - `rpc.ts` imports grow by task: `admin` in Task 2, then `pub` and `unwrapOne` in Task 3.
  - `questions.ts` imports grow in Task 4.
  - `results.ts` gains `hasRecordedAnswer` (Task 4) and `resultsForExport` (Task 6).
