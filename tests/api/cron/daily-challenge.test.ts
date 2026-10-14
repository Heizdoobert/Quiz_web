import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/db/daily-challenge', () => ({ pickDailyChallenge: vi.fn() }));

import { pickDailyChallenge } from '@/lib/db/daily-challenge';
import { GET, POST } from '@/app/api/cron/daily-challenge/route';

const original = process.env.CRON_SECRET;
beforeEach(() => {
  process.env.CRON_SECRET = 's3cret';
  vi.mocked(pickDailyChallenge).mockReset();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-20T00:05:00Z'));
});
afterEach(() => {
  vi.useRealTimers();
  if (original === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = original;
});

const authed = () => new Request('https://quickquiz.app/api/cron/daily-challenge', { headers: { Authorization: 'Bearer s3cret' } });

describe('daily-challenge cron', () => {
  it('rejects an unauthenticated request and picks nothing', async () => {
    const res = await GET(new Request('https://quickquiz.app/api/cron/daily-challenge'));
    expect(res.status).toBe(401);
    expect(pickDailyChallenge).not.toHaveBeenCalled();
  });

  it('picks the challenge for today in UTC', async () => {
    vi.mocked(pickDailyChallenge).mockResolvedValue(10);
    const res = await POST(authed());
    expect(res.status).toBe(200);
    expect(pickDailyChallenge).toHaveBeenCalledWith('2026-11-20');
    expect(await res.json()).toEqual({ success: true, date: '2026-11-20', picked: 10 });
  });

  it('reports a failure without leaking the error', async () => {
    vi.mocked(pickDailyChallenge).mockRejectedValue(new Error('db down'));
    const res = await GET(authed());
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ success: false, error: 'Failed to pick the daily challenge' });
  });
});
