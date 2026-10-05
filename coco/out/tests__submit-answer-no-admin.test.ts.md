# tests/submit-answer-no-admin.test.ts
lines:14 exports:
---
import { describe, it, expect, vi } from 'vitest';
import { submitAnswer } from '../lib/actions/quiz-actions';

// Isolated from answer-and-list-guards.test.ts because it needs supabaseAdmin
// to be null for the whole file, not toggled mid-test.
vi.mock('../lib/supabase/supabase-admin', () => ({ supabaseAdmin: null }));
vi.mock('../lib/services/session', () => ({ getSessionAccount: async () => null }));

describe('submitAnswer with no secret key configured', () => {
  it('fails closed instead of signing without the admin client', async () => {
    const res = await submitAnswer({ questionId: '00000000-0000-4000-8000-000000000002', answerIndex: 0 });
    expect(res).toEqual({ isCorrect: false, correctIndex: 0, explanation: null, recorded: false, notSavedReason: 'error' });
  });
});
