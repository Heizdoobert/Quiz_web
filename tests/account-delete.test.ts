import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deleteAccount } from '../lib/services/account-deletion';
import { deleteAuthUser } from '../lib/db/auth';
import { authUserIdOf, deleteUserRow } from '../lib/db/users';

vi.mock('../lib/db/auth', () => ({ deleteAuthUser: vi.fn() }));
vi.mock('../lib/db/users', () => ({ authUserIdOf: vi.fn(), deleteUserRow: vi.fn() }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn() } }));

const ACCOUNT = { id: '00000000-0000-4000-8000-0000000000f1' };
const AUTH_ID = '00000000-0000-4000-8000-0000000000a1';

describe('deleteAccount', () => {
  const order: string[] = [];

  beforeEach(() => {
    vi.resetAllMocks();
    order.length = 0;
    vi.mocked(authUserIdOf).mockResolvedValue(AUTH_ID);
    vi.mocked(deleteAuthUser).mockImplementation(async () => {
      order.push('auth');
      return { data: { user: null }, error: null } as never;
    });
    vi.mocked(deleteUserRow).mockImplementation(async () => {
      order.push('row');
    });
  });

  it('deletes the auth user before the users row', async () => {
    expect(await deleteAccount(ACCOUNT)).toEqual({ success: true });
    expect(deleteAuthUser).toHaveBeenCalledWith(AUTH_ID);
    expect(deleteUserRow).toHaveBeenCalledWith(ACCOUNT.id);
    expect(order).toEqual(['auth', 'row']);
  });

  it('counts an auth user that is already gone as done', async () => {
    vi.mocked(deleteAuthUser).mockResolvedValue({ data: { user: null }, error: { status: 404, code: 'user_not_found' } } as never);
    expect(await deleteAccount(ACCOUNT)).toEqual({ success: true });
    expect(deleteUserRow).toHaveBeenCalledWith(ACCOUNT.id);
  });

  it('skips the auth step for an account with no auth identity', async () => {
    vi.mocked(authUserIdOf).mockResolvedValue(null);
    expect(await deleteAccount(ACCOUNT)).toEqual({ success: true });
    expect(deleteAuthUser).not.toHaveBeenCalled();
    expect(deleteUserRow).toHaveBeenCalled();
  });

  it('is a no-op success when the row is already gone', async () => {
    vi.mocked(authUserIdOf).mockResolvedValue(undefined);
    expect(await deleteAccount(ACCOUNT)).toEqual({ success: true });
    expect(deleteAuthUser).not.toHaveBeenCalled();
  });

  it('keeps the users row and returns a generic error when the auth delete fails', async () => {
    vi.mocked(deleteAuthUser).mockResolvedValue({ data: { user: null }, error: { status: 500, message: 'db down: secret detail' } } as never);
    const result = await deleteAccount(ACCOUNT);
    expect(result).toMatchObject({ success: false, code: 'DELETE_FAILED' });
    expect(JSON.stringify(result)).not.toContain('secret detail');
    expect(deleteUserRow).not.toHaveBeenCalled();
  });

  it('returns an error when the row delete fails, so the caller keeps the session', async () => {
    vi.mocked(deleteUserRow).mockRejectedValue(new Error('fk'));
    expect(await deleteAccount(ACCOUNT)).toMatchObject({ success: false, code: 'DELETE_FAILED' });
  });

  it('returns an error when the lookup throws', async () => {
    vi.mocked(authUserIdOf).mockRejectedValue(new Error('boom'));
    expect(await deleteAccount(ACCOUNT)).toMatchObject({ success: false, code: 'DELETE_FAILED' });
    expect(deleteAuthUser).not.toHaveBeenCalled();
  });
});
