import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db/client', () => ({ admin: vi.fn(), pub: {} }));

import { admin } from '@/lib/db/client';
import { quarantineQuestion } from '@/lib/db/questions';
import { DbError } from '@/lib/db/errors';

const Q_ID = '00000000-0000-4000-8000-0000000000d1';

beforeEach(() => vi.mocked(admin).mockReset());

describe('quarantineQuestion', () => {
  it('sets only the status; dispute_count is kept by the database', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({ eq });
    vi.mocked(admin).mockReturnValue({ from: vi.fn().mockReturnValue({ update }) } as never);

    await quarantineQuestion(Q_ID);

    expect(update).toHaveBeenCalledWith({ status: 'quarantined' });
    expect(eq).toHaveBeenCalledWith('id', Q_ID);
  });

  it('throws a DbError when the update fails', async () => {
    const eq = vi.fn().mockResolvedValue({ error: { message: 'boom' } });
    vi.mocked(admin).mockReturnValue({ from: vi.fn().mockReturnValue({ update: vi.fn().mockReturnValue({ eq }) }) } as never);

    await expect(quarantineQuestion(Q_ID)).rejects.toBeInstanceOf(DbError);
  });
});
