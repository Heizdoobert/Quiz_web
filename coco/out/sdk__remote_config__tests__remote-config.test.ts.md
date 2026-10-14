# sdk/remote_config/tests/remote-config.test.ts
lines:62 exports:
---
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DbError } from '@/lib/db/errors';
import { getRemoteConfig, REMOTE_CONFIG_DEFAULTS } from '../index';

const { select, abortSignal } = vi.hoisted(() => ({ select: vi.fn(), abortSignal: vi.fn() }));

vi.mock('@/lib/sdk/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({ abortSignal: (signal: AbortSignal) => (abortSignal(signal), select()) }),
    }),
  },
}));

describe('getRemoteConfig', () => {
  beforeEach(() => vi.resetAllMocks());

  it('gives the defaults when the table is empty', async () => {
    select.mockResolvedValue({ data: [], error: null });
    expect(await getRemoteConfig()).toEqual({ maintenance_mode: false });
    expect(REMOTE_CONFIG_DEFAULTS).toEqual({ maintenance_mode: false });
  });

  it('passes an abort signal so a hung database times out', async () => {
    select.mockResolvedValue({ data: [], error: null });
    await getRemoteConfig();
    expect(abortSignal).toHaveBeenCalledWith(expect.any(AbortSignal));
  });

  it('uses a stored value over the default', async () => {
    select.mockResolvedValue({ data: [{ key: 'maintenance_mode', value: true }], error: null });
    expect(await getRemoteConfig()).toEqual({ maintenance_mode: true });
  });

  it('falls back to the default for a value of the wrong type', async () => {
    select.mockResolvedValue({ data: [{ key: 'maintenance_mode', value: 'yes' }], error: null });
    expect(await getRemoteConfig()).toEqual({ maintenance_mode: false });
  });

  it('drops keys that are not registered', async () => {
