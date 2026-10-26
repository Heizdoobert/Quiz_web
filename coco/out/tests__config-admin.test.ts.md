# tests/config-admin.test.ts
lines:80 exports:
---
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setConfigValue } from '@/lib/services/admin/config-admin';
import { upsertConfigValue } from '@/lib/db/remote-config';
import { roleOf } from '@/lib/db/roles';
import { logger } from '@/lib/logger';
import { supabaseAdmin } from '@/lib/sdk/supabase-admin';

vi.mock('@/lib/db/remote-config', () => ({ upsertConfigValue: vi.fn() }));
vi.mock('@/lib/db/roles', () => ({ roleOf: vi.fn() }));
vi.mock('@/lib/services/auth/session', () => ({ getSessionAccount: vi.fn().mockResolvedValue(null) }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));
vi.mock('@/lib/sdk/supabase-admin', () => ({ supabaseAdmin: { from: vi.fn() } }));

const ADMIN = { id: '00000000-0000-4000-8000-0000000000a1' };
const MODERATOR = { id: '00000000-0000-4000-8000-0000000000b2' };

beforeEach(() => {
  vi.mocked(upsertConfigValue).mockReset();
  vi.mocked(roleOf).mockReset().mockImplementation(async (id) => (id === ADMIN.id ? 'admin' : 'moderator'));
});

describe('setConfigValue', () => {
  it('writes a registered key with a valid value and logs who did it', async () => {
    const res = await setConfigValue({ key: 'maintenance_mode', value: true }, ADMIN);
    expect(res).toEqual({ success: true, data: { key: 'maintenance_mode', value: true } });
    expect(upsertConfigValue).toHaveBeenCalledWith('maintenance_mode', true);
    expect(logger.info).toHaveBeenCalledWith('config_changed', { actorId: ADMIN.id, key: 'maintenance_mode', value: true });
  });

  it('denies a moderator and never reaches the database', async () => {
    const res = await setConfigValue({ key: 'maintenance_mode', value: true }, MODERATOR);
    expect(res).toMatchObject({ success: false, error: { code: 'NOT_ALLOWED' } });
    expect(upsertConfigValue).not.toHaveBeenCalled();
  });

  it('denies a guest (no session) before it validates anything', async () => {
    const res = await setConfigValue({ key: 'nope', value: 1 });
    expect(res).toMatchObject({ success: false, error: { code: 'UNAUTHORIZED' } });
    expect(upsertConfigValue).not.toHaveBeenCalled();
  });
