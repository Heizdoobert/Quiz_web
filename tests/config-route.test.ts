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
