# tests/authorize.test.ts
lines:89 exports:
---
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authorize } from '../lib/services/authorize';
import { roleOf } from '../lib/db/roles';
import { getSessionAccount } from '../lib/services/session';
import { logger } from '../lib/logger';

vi.mock('../lib/db/roles', () => ({ roleOf: vi.fn() }));
vi.mock('../lib/services/session', () => ({ getSessionAccount: vi.fn() }));
vi.mock('../lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));

const ACCOUNT = { id: '00000000-0000-4000-8000-0000000000a1' };

function denied(result: Awaited<ReturnType<typeof authorize>>, code: string) {
  expect(result.success).toBe(false);
  if (!result.success) expect(result.error.code).toBe(code);
}

beforeEach(() => {
  vi.mocked(roleOf).mockReset();
  vi.mocked(getSessionAccount).mockReset();
  vi.mocked(logger.warn).mockReset();
  vi.mocked(logger.error).mockReset();
});

describe('authorize: who is asking', () => {
  it('returns UNAUTHORIZED without a session or a passed account, and reads no role', async () => {
    vi.mocked(getSessionAccount).mockResolvedValue(null);
    denied(await authorize('roles.grant'), 'UNAUTHORIZED');
    expect(roleOf).not.toHaveBeenCalled();
  });

  it('uses the account it is given and does not read the session cookie', async () => {
    vi.mocked(roleOf).mockResolvedValue('admin');
    const result = await authorize('roles.grant', ACCOUNT);
    expect(getSessionAccount).not.toHaveBeenCalled();
    expect(roleOf).toHaveBeenCalledWith(ACCOUNT.id);
    expect(result).toEqual({ success: true, data: { account: ACCOUNT, role: 'admin' } });
  });

  it('falls back to the session account', async () => {
