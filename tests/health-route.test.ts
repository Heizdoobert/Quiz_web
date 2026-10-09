import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../app/api/health/route';

const { query } = vi.hoisted(() => ({ query: vi.fn() }));

vi.mock('../lib/supabase/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        limit: () => ({ abortSignal: () => query() }),
      }),
    }),
  },
}));

describe('GET /api/health', () => {
  beforeEach(() => vi.resetAllMocks());

  it('answers 200 when the database answers', async () => {
    query.mockResolvedValue({ error: null });
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok' });
  });

  it('answers 503 without the error text when the database returns an error', async () => {
    query.mockResolvedValue({ error: { message: 'password authentication failed for user "postgres"' } });
    const res = await GET();
    expect(res.status).toBe(503);
    const body = JSON.stringify(await res.json());
    expect(body).toBe('{"status":"unavailable"}');
  });

  it('answers 503 when the query throws or times out', async () => {
    query.mockRejectedValue(new Error('timeout'));
    const res = await GET();
    expect(res.status).toBe(503);
  });
});
