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
    expect(calls).toContainEqual(['is', ['resolved_at', null]]);
  });
});

describe('quarantinedQuestions', () => {
  const ROW = {
    id: Q_ID,
    category: 'Science',
    prompt: 'Which planet is closest to the sun?',
    options: ['Mercury', 'Venus', 'Earth', 'Mars'],
    correct_index: 0,
    explanation: 'It orbits at 0.39 AU.',
    dispute_count: 3,
    created_at: '2026-10-01T00:00:00Z',
    question_disputes: [{ id: 'd1', reason: 'Wrong answer', created_at: '2026-10-02T00:00:00Z' }],
  };

  it('lists quarantined questions with their open disputes, most reported first, and never asks for reporters', async () => {
    const calls = stubQuery({ data: [ROW], error: null }, 'range');
    const rows = await quarantinedQuestions(20, 40);

    expect(supabaseAdmin!.from).toHaveBeenCalledWith('questions');
    const selected = String(calls.find(([m]) => m === 'select')![1][0]);
    expect(selected).toContain('correct_index');
    expect(selected).toContain('question_disputes');
    expect(selected).not.toContain('reporter');
    expect(calls).toContainEqual(['eq', ['status', 'quarantined']]);
    expect(calls).toContainEqual(['is', ['question_disputes.resolved_at', null]]);
    expect(calls).toContainEqual(['order', ['dispute_count', { ascending: false }]]);
    expect(calls).toContainEqual(['range', [40, 59]]);

    expect(rows).toEqual([
      {
        id: Q_ID,
        category: 'Science',
        prompt: ROW.prompt,
        options: ROW.options,
        correct_index: 0,
        explanation: ROW.explanation,
        dispute_count: 3,
        created_at: ROW.created_at,
        disputes: ROW.question_disputes,
      },
    ]);
  });

  it('returns an empty list when nothing is quarantined', async () => {
    stubQuery({ data: null, error: null }, 'range');
    await expect(quarantinedQuestions(20, 0)).resolves.toEqual([]);
  });

  it('throws a DbError on a database error', async () => {
    stubQuery({ data: null, error: { message: 'boom' } }, 'range');
    await expect(quarantinedQuestions(20, 0)).rejects.toBeInstanceOf(DbError);
  });
});

describe('resolveQuarantined', () => {
  it.each([[true], [false]])('passes the outcome to the database function and returns %s', async (won) => {
    vi.mocked(supabaseAdmin!.rpc).mockResolvedValue({ data: won, error: null } as never);
    await expect(resolveQuarantined(Q_ID, 'restored', MOD_ID, 'looks fine')).resolves.toBe(won);
    expect(supabaseAdmin!.rpc).toHaveBeenCalledWith('resolve_quarantined_question', {
      p_question_id: Q_ID,
      p_outcome: 'restored',
      p_moderator: MOD_ID,
      p_note: 'looks fine',
    });
  });

  it('sends a missing note as null', async () => {
    vi.mocked(supabaseAdmin!.rpc).mockResolvedValue({ data: true, error: null } as never);
    await resolveQuarantined(Q_ID, 'retired', MOD_ID, null);
    expect(supabaseAdmin!.rpc).toHaveBeenCalledWith('resolve_quarantined_question', expect.objectContaining({ p_outcome: 'retired', p_note: null }));
  });

  it('throws a DbError when the function fails', async () => {
    vi.mocked(supabaseAdmin!.rpc).mockResolvedValue({ data: null, error: { message: 'boom' } } as never);
    await expect(resolveQuarantined(Q_ID, 'restored', MOD_ID, null)).rejects.toBeInstanceOf(DbError);
  });
});
