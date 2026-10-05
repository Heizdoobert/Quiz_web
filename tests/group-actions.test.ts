import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createGroup, joinGroup, leaveGroup, getUserGroups } from '../lib/actions/group-actions';
import { supabase } from '../lib/supabase/supabase';
import { supabaseAdmin } from '../lib/supabase/supabase-admin';
import { getSessionAccount } from '../lib/services/session';

vi.mock('../lib/supabase/supabase', () => ({ supabase: { from: vi.fn() } }));
vi.mock('../lib/supabase/supabase-admin', () => ({ supabaseAdmin: { from: vi.fn() } }));
vi.mock('../lib/services/session', () => ({ getSessionAccount: vi.fn() }));

const WALLET = '0x' + 'a'.repeat(40);
const ACCOUNT_ID = '00000000-0000-4000-8000-0000000000f1';
const ACCOUNT = { id: ACCOUNT_ID, wallet: WALLET };
const GROUP_ID = '00000000-0000-4000-8000-000000000009';

type TableStubs = Record<
  string,
  { row?: unknown; rows?: unknown[]; insertError?: unknown; queryError?: unknown }
>;

function stubFrom(fromMock: ReturnType<typeof vi.fn>, tables: TableStubs) {
  const inserts: Record<string, unknown[]> = {};
  fromMock.mockImplementation((table: string) => {
    const t = tables[table] ?? {};
    const chain: Record<string, unknown> = {};
    for (const m of ['select', 'eq', 'delete']) chain[m] = () => chain;
    chain.single = async () => ({
      data: t.insertError ? null : t.row ?? null,
      error: t.insertError ?? (t.row ? null : { code: 'PGRST116' }),
    });
    chain.insert = (row: unknown) => {
      (inserts[table] ??= []).push(row);
      return chain;
    };
    chain.then = (resolve: (val: unknown) => unknown) =>
      resolve({ data: t.queryError ? null : t.rows ?? [], error: t.insertError ?? t.queryError ?? null });
    return chain;
  });
  return inserts;
}

function mockTables(tables: TableStubs) {
  return stubFrom(supabaseAdmin!.from as ReturnType<typeof vi.fn>, tables);
}

// getUserGroups reads through the public client.
function mockPublicTables(tables: TableStubs) {
  return stubFrom(supabase.from as ReturnType<typeof vi.fn>, tables);
}

describe('group action guards', () => {
  beforeEach(() => vi.resetAllMocks());

  it('refuses createGroup without a session', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await createGroup({ name: 'Friends' });
    expect(res).toEqual({ success: false, error: 'Sign in to manage groups.' });
  });

  it('creates a group and adds the owner as a member, keyed by account id', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(ACCOUNT);
    const inserts = mockTables({
      groups: { row: { id: GROUP_ID, name: 'Friends', description: null } },
      group_members: {},
    });
    const res = await createGroup({ name: 'Friends' });
    expect(res).toEqual({ success: true, group: { id: GROUP_ID, name: 'Friends', description: null } });
    expect(inserts.groups[0]).toMatchObject({ owner_user: ACCOUNT_ID, owner_wallet: WALLET });
    expect(inserts.group_members[0]).toMatchObject({
      group_id: GROUP_ID,
      user_id: ACCOUNT_ID,
      wallet_address: WALLET,
    });
  });

  it('reports a friendly error when the group name is taken', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(ACCOUNT);
    mockTables({ groups: { insertError: { code: '23505' } } });
    const res = await createGroup({ name: 'Friends' });
    expect(res).toEqual({ success: false, error: 'That group name is taken.' });
  });

  it('refuses joinGroup without a session', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await joinGroup(GROUP_ID);
    expect(res).toEqual({ success: false, error: 'Sign in to manage groups.' });
  });

  it('joins a group keyed by account id', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(ACCOUNT);
    const inserts = mockTables({ group_members: {} });
    const res = await joinGroup(GROUP_ID);
    expect(res).toEqual({ success: true });
    expect(inserts.group_members[0]).toMatchObject({
      group_id: GROUP_ID,
      user_id: ACCOUNT_ID,
      wallet_address: WALLET,
    });
  });

  it('reports already-joined on a duplicate membership', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(ACCOUNT);
    mockTables({ group_members: { insertError: { code: '23505' } } });
    const res = await joinGroup(GROUP_ID);
    expect(res).toEqual({ success: false, error: 'You are already in this group.' });
  });

  it('rejects joinGroup for a malformed group id', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(ACCOUNT);
    const res = await joinGroup('not-a-uuid');
    expect(res).toEqual({ success: false, error: 'Group not found.' });
  });

  it('leaves a group keyed by account id', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(ACCOUNT);
    mockTables({ group_members: {} });
    const res = await leaveGroup(GROUP_ID);
    expect(res).toEqual({ success: true });
  });

  it('getUserGroups returns nothing without a session', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    expect(await getUserGroups()).toEqual([]);
  });

  it("getUserGroups returns the signed-in account's own groups", async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(ACCOUNT);
    mockPublicTables({
      group_members: { rows: [{ group_id: GROUP_ID, groups: { id: GROUP_ID, name: 'Friends' } }] },
    });
    const groups = await getUserGroups();
    expect(groups).toEqual([{ id: GROUP_ID, name: 'Friends' }]);
  });
});
