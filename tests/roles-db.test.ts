import { describe, it, expect, vi, beforeEach } from 'vitest';
import { roleOf, setRole } from '../lib/db/roles';
import { DbError } from '../lib/db/errors';
import { supabaseAdmin } from '../lib/sdk/supabase-admin';

vi.mock('../lib/sdk/supabase-admin', () => ({ supabaseAdmin: { from: vi.fn() } }));

const ID = '00000000-0000-4000-8000-0000000000a1';

// from('users').select(...).eq(...).single() resolving to `result`.
function stubUsers(result: { data: unknown; error: { message: string; code?: string } | null }) {
  const single = vi.fn().mockResolvedValue(result);
  const eq = vi.fn().mockReturnValue({ single });
  const select = vi.fn().mockReturnValue({ eq });
  vi.mocked(supabaseAdmin!.from).mockReturnValue({ select } as never);
  return { select, eq };
}

beforeEach(() => vi.mocked(supabaseAdmin!.from).mockReset());

describe('roleOf', () => {
  it('reads only the role column of the account by id', async () => {
    const { select, eq } = stubUsers({ data: { role: 'moderator' }, error: null });
    await expect(roleOf(ID)).resolves.toBe('moderator');
    expect(supabaseAdmin!.from).toHaveBeenCalledWith('users');
    expect(select).toHaveBeenCalledWith('role');
    expect(eq).toHaveBeenCalledWith('id', ID);
  });

  it('returns null when the account has no users row', async () => {
    stubUsers({ data: null, error: { message: 'no rows', code: 'PGRST116' } });
    await expect(roleOf(ID)).resolves.toBeNull();
  });

  it('throws a DbError on any other database error', async () => {
    stubUsers({ data: null, error: { message: 'boom', code: '08006' } });
    await expect(roleOf(ID)).rejects.toBeInstanceOf(DbError);
  });
});

// from('users').update(...).eq(...).select(...) resolving to `result`.
function stubUpdate(result: { data: unknown; error: { message: string; code?: string } | null }) {
  const select = vi.fn().mockResolvedValue(result);
  const eq = vi.fn().mockReturnValue({ select });
  const update = vi.fn().mockReturnValue({ eq });
  vi.mocked(supabaseAdmin!.from).mockReturnValue({ update } as never);
  return { update, eq, select };
}

describe('setRole', () => {
  it('updates only the role of the account by id and reports a row changed', async () => {
    const { update, eq } = stubUpdate({ data: [{ id: ID }], error: null });
    await expect(setRole(ID, 'moderator')).resolves.toBe(true);
    expect(supabaseAdmin!.from).toHaveBeenCalledWith('users');
    expect(update).toHaveBeenCalledWith({ role: 'moderator' });
    expect(eq).toHaveBeenCalledWith('id', ID);
  });

  it('reports false when no row matched', async () => {
    stubUpdate({ data: [], error: null });
    await expect(setRole(ID, 'user')).resolves.toBe(false);
  });

  it('throws a DbError on a database error, such as the role check constraint', async () => {
    stubUpdate({ data: null, error: { message: 'violates check constraint "users_role_check"', code: '23514' } });
    await expect(setRole(ID, 'owner')).rejects.toBeInstanceOf(DbError);
  });
});
