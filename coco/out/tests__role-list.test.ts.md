# tests/role-list.test.ts
lines:52 exports:
---
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listAccountsForAdmin } from '@/lib/services/role-admin';
import { listAccounts, roleOf } from '@/lib/db/roles';
import { logger } from '@/lib/logger';

vi.mock('@/lib/db/roles', () => ({ roleOf: vi.fn(), setRole: vi.fn(), listAccounts: vi.fn() }));
vi.mock('@/lib/services/session', () => ({ getSessionAccount: vi.fn().mockResolvedValue(null) }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));

const ADMIN = { id: '00000000-0000-4000-8000-0000000000a1' };
const MODERATOR = { id: '00000000-0000-4000-8000-0000000000b2' };

beforeEach(() => {
  vi.mocked(listAccounts).mockReset().mockResolvedValue([]);
  vi.mocked(roleOf).mockReset().mockImplementation(async (id) => (id === ADMIN.id ? 'admin' : 'moderator'));
});

describe('listAccountsForAdmin', () => {
  it('denies a moderator and never reads accounts', async () => {
    const res = await listAccountsForAdmin({ search: '', limit: 20, offset: 0 }, MODERATOR);
    expect(res).toMatchObject({ success: false, error: { code: 'NOT_ALLOWED' } });
    expect(listAccounts).not.toHaveBeenCalled();
  });

  it('denies a guest', async () => {
    const res = await listAccountsForAdmin({ search: '', limit: 20, offset: 0 });
    expect(res).toMatchObject({ success: false, error: { code: 'UNAUTHORIZED' } });
    expect(listAccounts).not.toHaveBeenCalled();
  });

  it('trims and caps the search and passes paging through', async () => {
    const res = await listAccountsForAdmin({ search: `  ${'a'.repeat(80)}  `, limit: 20, offset: 40 }, ADMIN);
    expect(res).toMatchObject({ success: true, data: { limit: 20, offset: 40 } });
    expect(listAccounts).toHaveBeenCalledWith('a'.repeat(50), 20, 40);
  });

  it.each([
    [{ search: 7, limit: 'x', offset: -1 }, ['', 20, 0]],
    [{ search: null, limit: 5000, offset: 1.5 }, ['', 50, 0]],
    [{ search: undefined, limit: 0, offset: undefined }, ['', 20, 0]],
