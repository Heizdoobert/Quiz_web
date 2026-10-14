# tests/moderation.test.ts
lines:120 exports:
---
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { countDisputes, quarantinedQuestions, resolveQuarantined } from '../lib/db/questions';
import { DbError } from '../lib/db/errors';
import { supabaseAdmin } from '../lib/sdk/supabase-admin';

vi.mock('../lib/sdk/supabase-admin', () => ({ supabaseAdmin: { from: vi.fn(), rpc: vi.fn() } }));
vi.mock('../lib/sdk/supabase', () => ({ supabase: { from: vi.fn() } }));

const Q_ID = '00000000-0000-4000-8000-000000000002';
const MOD_ID = '00000000-0000-4000-8000-0000000000b2';

type Call = [method: string, args: unknown[]];

// A query builder where every method records its call and returns the builder, and the
// call named by `last` (or the first await, when null) resolves to `result`.
function stubQuery(result: unknown, last: string | null) {
  const calls: Call[] = [];
  const builder: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'is', 'order', 'range']) {
    builder[m] = (...args: unknown[]) => {
      calls.push([m, args]);
      return m === last ? Promise.resolve(result) : builder;
    };
  }
  if (last === null) builder.then = (resolve: (v: unknown) => unknown) => resolve(result);
  vi.mocked(supabaseAdmin!.from).mockReturnValue(builder as never);
  return calls;
}

beforeEach(() => {
  vi.mocked(supabaseAdmin!.from).mockReset();
  vi.mocked(supabaseAdmin!.rpc).mockReset();
});

describe('countDisputes', () => {
  it('counts only unresolved disputes, so a restored question does not re-quarantine on its next report', async () => {
    const calls = stubQuery({ count: 2, error: null }, 'is');
    await expect(countDisputes(Q_ID)).resolves.toBe(2);
    expect(supabaseAdmin!.from).toHaveBeenCalledWith('question_disputes');
    expect(calls).toContainEqual(['eq', ['question_id', Q_ID]]);
