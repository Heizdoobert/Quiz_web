import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listAccounts, roleOf, setRole } from '../lib/db/roles';
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

// from('users').select().order().order().range() [.ilike()] awaited, resolving to `result`.
function stubList(result: { data: unknown; error: { message: string } | null }) {
  const chain: Record<string, unknown> = {};
  for (const m of ['select', 'order', 'range']) chain[m] = vi.fn().mockReturnValue(chain);
  chain.ilike = vi.fn().mockReturnValue(chain);
  chain.then = (resolve: (v: unknown) => unknown) => resolve(result);
  vi.mocked(supabaseAdmin!.from).mockReturnValue(chain as never);
  return chain as { select: ReturnType<typeof vi.fn>; range: ReturnType<typeof vi.fn>; ilike: ReturnType<typeof vi.fn> };
}

describe('listAccounts', () => {
  it('pages the newest accounts without a filter when there is no search', async () => {
    const rows = [{ id: ID, display_name: 'Ann', role: 'user', created_at: '2026-10-01' }];
    const chain = stubList({ data: rows, error: null });
    await expect(listAccounts('', 20, 40)).resolves.toEqual(rows);
    expect(chain.select).toHaveBeenCalledWith('id, display_name, role, created_at');
    expect(chain.range).toHaveBeenCalledWith(40, 59);
    expect(chain.ilike).not.toHaveBeenCalled();
  });

  it('escapes LIKE wildcards in the search term', async () => {
    const chain = stubList({ data: [], error: null });
    await listAccounts('50%_off\\', 20, 0);
    expect(chain.ilike).toHaveBeenCalledWith('display_name', '%50\\%\\_off\\\\%');
  });

  it('throws a DbError when the read fails', async () => {
    stubList({ data: null, error: { message: 'boom' } });
    await expect(listAccounts('', 20, 0)).rejects.toBeInstanceOf(DbError);
  });
});
