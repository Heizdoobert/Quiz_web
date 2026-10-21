# tests/question-analytics.test.ts
lines:39 exports:
---
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db/client', () => ({ admin: vi.fn(), pub: { rpc: vi.fn() } }));

import { admin, pub } from '@/lib/db/client';
import { incrementAiGeneration, questionAnalytics } from '@/lib/db/rpc';

const ACCOUNT = '00000000-0000-4000-8000-0000000000a1';

beforeEach(() => {
  vi.mocked(admin).mockReset();
  vi.mocked(pub.rpc).mockReset();
});

describe('questionAnalytics', () => {
  it('calls get_question_analytics with the secret key, never the public one', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [{ question_id: 'q1' }], error: null });
    vi.mocked(admin).mockReturnValue({ rpc } as never);

    const rows = await questionAnalytics(ACCOUNT);

    expect(rpc).toHaveBeenCalledWith('get_question_analytics', { p_user_id: ACCOUNT });
    expect(pub.rpc).not.toHaveBeenCalled();
    expect(rows).toEqual([{ question_id: 'q1' }]);
  });
});

describe('incrementAiGeneration', () => {
  it('calls increment_ai_generation with the secret key, never the public one', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: 3, error: null });
    vi.mocked(admin).mockReturnValue({ rpc } as never);

    const count = await incrementAiGeneration(ACCOUNT);

    expect(rpc).toHaveBeenCalledWith('increment_ai_generation', { p_user_id: ACCOUNT });
    expect(pub.rpc).not.toHaveBeenCalled();
    expect(count).toBe(3);
  });
});
