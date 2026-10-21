import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authorize } from '@/lib/services/auth/authorize';
import { roleOf } from '../lib/db/roles';
import { getSessionAccount } from '@/lib/services/auth/session';
import { logger } from '../lib/logger';

vi.mock('../lib/db/roles', () => ({ roleOf: vi.fn() }));
vi.mock('@/lib/services/auth/session', () => ({ getSessionAccount: vi.fn() }));
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
    vi.mocked(getSessionAccount).mockResolvedValue(ACCOUNT);
    vi.mocked(roleOf).mockResolvedValue('moderator');
    const result = await authorize('disputes.resolve');
    expect(result).toEqual({ success: true, data: { account: ACCOUNT, role: 'moderator' } });
  });
});

describe('authorize: what the role allows', () => {
  it('allows an admin to grant roles', async () => {
    vi.mocked(roleOf).mockResolvedValue('admin');
    expect((await authorize('roles.grant', ACCOUNT)).success).toBe(true);
  });

  it('lets a moderator resolve disputes but not grant roles', async () => {
    vi.mocked(roleOf).mockResolvedValue('moderator');
    expect((await authorize('disputes.resolve', ACCOUNT)).success).toBe(true);
    denied(await authorize('roles.grant', ACCOUNT), 'NOT_ALLOWED');
  });

  it.each([['user'], ['owner'], [''], [null]])('denies the stored role %j with NOT_ALLOWED', async (role) => {
    vi.mocked(roleOf).mockResolvedValue(role);
    denied(await authorize('disputes.resolve', ACCOUNT), 'NOT_ALLOWED');
  });

  it('logs a denial with the account, role and permission', async () => {
    vi.mocked(roleOf).mockResolvedValue('user');
    await authorize('roles.grant', ACCOUNT);
    expect(logger.warn).toHaveBeenCalledWith('authorize_denied', {
      userId: ACCOUNT.id,
      role: 'user',
      permission: 'roles.grant',
    });
  });
});

describe('authorize: failures and revocation', () => {
  it('fails closed with SERVER_ERROR when the role cannot be read, and logs it', async () => {
    vi.mocked(roleOf).mockRejectedValue(new Error('db down'));
    denied(await authorize('roles.grant', ACCOUNT), 'SERVER_ERROR');
    expect(logger.error).toHaveBeenCalled();
  });

  it('reads the role on every call, so a revoked role stops working at once', async () => {
    vi.mocked(roleOf).mockResolvedValueOnce('admin').mockResolvedValueOnce('user');
    expect((await authorize('roles.grant', ACCOUNT)).success).toBe(true);
    denied(await authorize('roles.grant', ACCOUNT), 'NOT_ALLOWED');
    expect(roleOf).toHaveBeenCalledTimes(2);
  });
});
