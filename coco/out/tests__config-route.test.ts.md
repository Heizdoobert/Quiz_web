# tests/config-route.test.ts
lines:51 exports:
---
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET } from '../app/api/config/route';

const { select } = vi.hoisted(() => ({ select: vi.fn() }));

vi.mock('../lib/sdk/supabase', () => ({
  supabase: { from: () => ({ select: () => ({ abortSignal: () => select() }) }) },
}));

describe('GET /api/config', () => {
  let errorLog: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    vi.resetAllMocks();
    errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => errorLog.mockRestore());

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
    expect(errorLog).toHaveBeenCalledTimes(1);
    expect(String(errorLog.mock.calls[0][0])).toContain('remote_config_failed');
  });
