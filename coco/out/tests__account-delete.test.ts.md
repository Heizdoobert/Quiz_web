# tests/account-delete.test.ts
lines:73 exports:
---
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deleteAccount } from '@/lib/services/admin/account-deletion';
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
