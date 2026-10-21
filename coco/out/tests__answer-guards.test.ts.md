# tests/answer-guards.test.ts
lines:373 exports:
---
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { submitAnswer, getAnswerHistory } from '../lib/actions/quiz-actions';
import { createQuestion, disputeQuestion, get5050EliminatedIndices } from '../lib/actions/question-actions';
import { supabaseAdmin } from '../lib/sdk/supabase-admin';
import { getSessionAccount } from '../lib/services/session';
import { validateQuestionInput } from '../lib/utils/validation';

let mockAnswerLimitHit = false;
const answerLimitCalls: unknown[][] = [];

vi.mock('../lib/sdk/supabase-admin', () => ({ supabaseAdmin: { from: vi.fn(), rpc: vi.fn() } }));
vi.mock('../lib/services/session', () => ({ getSessionAccount: vi.fn() }));
vi.mock('../lib/services/rate-limit', () => ({
  allowAttemptFromIp: async (...args: unknown[]) => {
    answerLimitCalls.push(args);
    return !mockAnswerLimitHit;
  },
}));

const ACCOUNT_ID = '00000000-0000-4000-8000-0000000000f1';
const ACCOUNT = { id: ACCOUNT_ID };
const Q_ID = '00000000-0000-4000-8000-000000000002';

type TableStubs = Record<
  string,
  { row?: unknown; rows?: unknown[]; insertError?: unknown; count?: number; queryError?: unknown }
>;

// A chainable query stub: every builder method returns the chain, and the terminal
// calls (single, maybeSingle, insert, await) resolve to what the test gives per table.
function stubFrom(fromMock: ReturnType<typeof vi.fn>, tables: TableStubs) {
  const inserts: Record<string, unknown[]> & { _updates?: Record<string, unknown[]> } = {};
  const updates: Record<string, unknown[]> = {};
  inserts._updates = updates;
  fromMock.mockImplementation((table: string) => {
    const t = tables[table] ?? {};
    const chain: Record<string, unknown> = {};
    for (const m of ['select', 'eq', 'neq', 'in', 'is', 'order', 'limit', 'gte']) chain[m] = () => chain;
    chain.single = async () => ({ data: t.row ?? null, error: t.row ? null : { code: 'PGRST116' } });
    chain.maybeSingle = async () => ({ data: t.row ?? null, error: null });
