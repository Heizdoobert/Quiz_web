# tests/achievements-db.test.ts
lines:23 exports:
---
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db/client', () => ({ admin: vi.fn(), pub: {} }));

import { admin } from '@/lib/db/client';
import { awardAchievements } from '@/lib/db/achievements';

const ACCOUNT = '00000000-0000-4000-8000-0000000000a1';
beforeEach(() => vi.mocked(admin).mockReset());

describe('awardAchievements', () => {
  it('returns the slugs unlocked by this call', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: ['first_answer', 'streak_5'], error: null });
    vi.mocked(admin).mockReturnValue({ rpc } as never);
    await expect(awardAchievements(ACCOUNT)).resolves.toEqual(['first_answer', 'streak_5']);
    expect(rpc).toHaveBeenCalledWith('award_achievements', { p_user: ACCOUNT });
  });

  it('returns an empty list when nothing unlocked', async () => {
    vi.mocked(admin).mockReturnValue({ rpc: vi.fn().mockResolvedValue({ data: null, error: null }) } as never);
    await expect(awardAchievements(ACCOUNT)).resolves.toEqual([]);
  });
});
