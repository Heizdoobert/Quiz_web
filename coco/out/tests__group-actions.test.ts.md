# tests/group-actions.test.ts
lines:134 exports:
---
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
