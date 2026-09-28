import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ensureUserRow } from '../lib/users';
import { getOrCreateUser } from '../lib/actions/user-actions';
import { signInWithWallet } from '../lib/actions/auth-actions';
import { supabaseAdmin } from '../lib/supabase-admin';
import { supabase } from '../lib/supabase';
import { getSessionWallet, setSessionWallet } from '../lib/wallet-session';

const WALLET = '0x' + 'a'.repeat(40);

let mockSiweValid = true;

vi.mock('../lib/supabase-admin', () => ({ supabaseAdmin: { from: vi.fn() } }));
vi.mock('../lib/supabase', () => ({ supabase: { from: vi.fn() } }));
vi.mock('../lib/wallet-session', () => ({
  getSessionWallet: vi.fn(),
  setSessionWallet: vi.fn(),
}));
vi.mock('../lib/chain', () => ({
  publicClientFor: () => ({ verifySiweMessage: async () => mockSiweValid }),
}));
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (name === 'wallet_challenge' ? { value: 'nonce' } : undefined),
    set: () => {},
    delete: () => {},
  }),
  headers: async () => ({ get: (k: string) => (k === 'host' ? 'quiz.example.com' : null) }),
}));
vi.mock('viem/siwe', () => ({
  createSiweMessage: vi.fn(),
  generateSiweNonce: () => 'nonce',
  parseSiweMessage: () => ({ address: WALLET, chainId: 84532 }),
}));

describe('ensureUserRow', () => {
  beforeEach(() => vi.resetAllMocks());

  it('upserts the wallet, ignoring an existing row', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    (supabaseAdmin!.from as ReturnType<typeof vi.fn>).mockReturnValue({ upsert });

    await ensureUserRow(WALLET.toUpperCase());

    expect(upsert).toHaveBeenCalledWith(
      { wallet_address: WALLET, display_name: expect.stringContaining('0xaaaa') },
      { onConflict: 'wallet_address', ignoreDuplicates: true }
    );
  });
});

describe('getOrCreateUser', () => {
  beforeEach(() => vi.resetAllMocks());

  it('creates the row when the address matches the session wallet', async () => {
    (getSessionWallet as ReturnType<typeof vi.fn>).mockResolvedValue(WALLET);
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const maybeSingle = vi.fn().mockResolvedValue({ data: { wallet_address: WALLET, display_name: 'x', created_at: 'now' }, error: null });
    (supabaseAdmin!.from as ReturnType<typeof vi.fn>).mockReturnValue({ upsert });
    (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ select: () => ({ eq: () => ({ maybeSingle }) }) });

    await getOrCreateUser(WALLET);

    expect(upsert).toHaveBeenCalled();
  });

  it('never creates a row for an address that is not the session wallet', async () => {
    (getSessionWallet as ReturnType<typeof vi.fn>).mockResolvedValue('0x' + 'b'.repeat(40));
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ select: () => ({ eq: () => ({ maybeSingle }) }) });

    const result = await getOrCreateUser(WALLET);

    expect(supabaseAdmin!.from).not.toHaveBeenCalled();
    expect(result?.wallet_address).toBe(WALLET);
  });

  it('never creates a row with no session', async () => {
    (getSessionWallet as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ select: () => ({ eq: () => ({ maybeSingle }) }) });

    await getOrCreateUser(WALLET);

    expect(supabaseAdmin!.from).not.toHaveBeenCalled();
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

describe('signInWithWallet', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockSiweValid = true;
  });

  it('creates the users row once the signature verifies', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    (supabaseAdmin!.from as ReturnType<typeof vi.fn>).mockReturnValue({ upsert });
    (setSessionWallet as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    mockSiweValid = true;

    const ok = await signInWithWallet('message', ('0x' + 'c'.repeat(130)) as `0x${string}`);

    expect(ok).toBe(true);
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ wallet_address: WALLET }),
      expect.anything()
    );
  });

  it('does not create a row when the signature fails to verify', async () => {
    const upsert = vi.fn();
    (supabaseAdmin!.from as ReturnType<typeof vi.fn>).mockReturnValue({ upsert });
    (setSessionWallet as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    mockSiweValid = false;

    const ok = await signInWithWallet('message', ('0x' + 'c'.repeat(130)) as `0x${string}`);

    expect(ok).toBe(false);
    expect(upsert).not.toHaveBeenCalled();
  });
});
