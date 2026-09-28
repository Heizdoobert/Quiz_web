import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getOrCreateUser } from '../lib/actions/user-actions';
import { supabase } from '../lib/supabase';
import { getSessionWallet } from '../lib/wallet-session';
import { ensureAccountForWallet } from '../lib/users';

const WALLET = '0x' + 'a'.repeat(40);

vi.mock('../lib/supabase', () => ({ supabase: { from: vi.fn() } }));
vi.mock('../lib/wallet-session', () => ({ getSessionWallet: vi.fn() }));
vi.mock('../lib/users', () => ({ ensureAccountForWallet: vi.fn() }));

describe('getOrCreateUser', () => {
  beforeEach(() => vi.resetAllMocks());

  it('creates the account when the address matches the session wallet', async () => {
    (getSessionWallet as ReturnType<typeof vi.fn>).mockResolvedValue(WALLET);
    const maybeSingle = vi.fn().mockResolvedValue({ data: { wallet_address: WALLET, display_name: 'x', created_at: 'now' }, error: null });
    (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ select: () => ({ eq: () => ({ maybeSingle }) }) });

    await getOrCreateUser(WALLET);

    expect(ensureAccountForWallet).toHaveBeenCalledWith(WALLET);
  });

  it('never creates an account for an address that is not the session wallet', async () => {
    (getSessionWallet as ReturnType<typeof vi.fn>).mockResolvedValue('0x' + 'b'.repeat(40));
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ select: () => ({ eq: () => ({ maybeSingle }) }) });

    const result = await getOrCreateUser(WALLET);

    expect(ensureAccountForWallet).not.toHaveBeenCalled();
    expect(result?.wallet_address).toBe(WALLET);
  });

  it('never creates an account with no session', async () => {
    (getSessionWallet as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ select: () => ({ eq: () => ({ maybeSingle }) }) });

    await getOrCreateUser(WALLET);

    expect(ensureAccountForWallet).not.toHaveBeenCalled();
  });

  it('falls back to a placeholder user when the fetch errors', async () => {
    (getSessionWallet as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: { message: 'db down' } });
    (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ select: () => ({ eq: () => ({ maybeSingle }) }) });

    const result = await getOrCreateUser(WALLET);

    expect(result).toEqual({ wallet_address: WALLET, display_name: null, created_at: expect.any(String) });
  });

  it('falls back to a placeholder user when the lookup throws', async () => {
    (getSessionWallet as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('session lookup failed'));

    const result = await getOrCreateUser(WALLET);

    expect(result).toEqual({ wallet_address: WALLET, display_name: null, created_at: expect.any(String) });
  });
});
