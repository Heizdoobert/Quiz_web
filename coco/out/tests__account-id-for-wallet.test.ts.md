# tests/account-id-for-wallet.test.ts
lines:36 exports:
---
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { accountIdForWallet } from '../lib/users';
import { supabase } from '../lib/supabase';

const WALLET = '0x' + 'a'.repeat(40);
const ACCOUNT_ID = '00000000-0000-4000-8000-0000000000f1';

vi.mock('../lib/supabase', () => ({ supabase: { from: vi.fn() } }));

function mockUsers(result: { data: unknown; error: unknown }) {
  const maybeSingle = vi.fn().mockResolvedValue(result);
  (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
    select: () => ({ eq: () => ({ maybeSingle }) }),
  });
  return maybeSingle;
}

describe('accountIdForWallet', () => {
  beforeEach(() => vi.resetAllMocks());

  it('returns the account id for a wallet that has one, lower-cased', async () => {
    mockUsers({ data: { id: ACCOUNT_ID }, error: null });
    expect(await accountIdForWallet(WALLET.toUpperCase())).toBe(ACCOUNT_ID);
    expect(supabase.from).toHaveBeenCalledWith('users');
  });

  it('returns null for a wallet with no account', async () => {
    mockUsers({ data: null, error: null });
    expect(await accountIdForWallet(WALLET)).toBeNull();
  });

  it('returns null and logs on a query error', async () => {
    mockUsers({ data: null, error: { message: 'db unavailable' } });
    expect(await accountIdForWallet(WALLET)).toBeNull();
  });
});
