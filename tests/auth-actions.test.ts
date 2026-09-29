import { describe, it, expect, vi, beforeEach } from 'vitest';
import { clearSessionWallet, setSessionWallet, getSessionWallet } from '../lib/wallet-session';
import { getAuthNonce, requestSignIn, signInWithWallet, signOutWallet } from '../lib/actions/auth-actions';
import { getOrCreateUser } from '../lib/actions/user-actions';
import { supabaseAdmin } from '../lib/supabase-admin';
import { publicClientFor } from '../lib/chain';

// In-memory cookie store
const cookieStore = new Map<string, { value: string; [key: string]: unknown }>();

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: vi.fn((name: string) => cookieStore.get(name)),
    set: vi.fn((name: string, value: string, options?: Record<string, unknown>) => {
      cookieStore.set(name, { value, ...options });
    }),
    delete: vi.fn((name: string) => {
      cookieStore.delete(name);
    }),
  })),
  headers: vi.fn(async () => new Headers({ host: 'localhost:3000', 'x-forwarded-proto': 'http' })),
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock('../lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}));

vi.mock('../lib/chain', () => ({
  publicClientFor: vi.fn(),
}));

const TEST_SECRET = 'test-secret-key-12345678901234567890';
const TEST_WALLET = '0x1234567890123456789012345678901234567890';

describe('Auth & Session Foundations (Task 1)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    cookieStore.clear();
    process.env.SUPABASE_SECRET_KEY = TEST_SECRET;
  });

  describe('wallet-session', () => {
    it('sets and retrieves session wallet correctly', async () => {
      const ok = await setSessionWallet(TEST_WALLET);
      expect(ok).toBe(true);

      const wallet = await getSessionWallet();
      expect(wallet).toBe(TEST_WALLET.toLowerCase());
    });

    it('clearSessionWallet deletes the session cookie', async () => {
      await setSessionWallet(TEST_WALLET);
      expect(cookieStore.has('wallet_session')).toBe(true);

      await clearSessionWallet();
      expect(cookieStore.has('wallet_session')).toBe(false);

      const wallet = await getSessionWallet();
      expect(wallet).toBeNull();
    });
  });

  describe('user-actions: getOrCreateUser', () => {
    it('returns null if no walletAddress provided', async () => {
      const user = await getOrCreateUser('');
      expect(user).toBeNull();
    });

    it('returns existing user if already found in database', async () => {
      const existing = {
        wallet_address: TEST_WALLET.toLowerCase(),
        display_name: 'ExistingUser',
        created_at: '2026-01-01T00:00:00Z',
      };

      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: existing, error: null }),
      };
      (supabaseAdmin!.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const user = await getOrCreateUser(TEST_WALLET);
      expect(user).toEqual(existing);
      expect(supabaseAdmin!.from).toHaveBeenCalledWith('users');
    });

    it('inserts and returns new user if not found in database', async () => {
      let callCount = 0;
      const inserted = {
        wallet_address: TEST_WALLET.toLowerCase(),
        display_name: `${TEST_WALLET.slice(0, 6)}...${TEST_WALLET.slice(-4)}`.toLowerCase(),
        created_at: new Date().toISOString(),
      };

      (supabaseAdmin!.from as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        return {
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: inserted, error: null }),
        };
      });

      const user = await getOrCreateUser(TEST_WALLET);
      expect(user?.wallet_address).toBe(TEST_WALLET.toLowerCase());
      expect(user?.display_name).toContain('...');
    });

    it('falls back to in-memory user if insert error occurs', async () => {
      let callCount = 0;
      (supabaseAdmin!.from as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        return {
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB down' } }),
        };
      });

      const user = await getOrCreateUser(TEST_WALLET);
      expect(user?.wallet_address).toBe(TEST_WALLET.toLowerCase());
      expect(user?.display_name).toContain('...');
    });
  });

  describe('auth-actions', () => {
    it('getAuthNonce sets challenge cookie and returns nonce', async () => {
      const nonce = await getAuthNonce();
      expect(typeof nonce).toBe('string');
      expect(nonce.length).toBeGreaterThan(8);
      expect(cookieStore.get('wallet_challenge')?.value).toBe(nonce);
    });

    it('requestSignIn returns valid SIWE message with nonce', async () => {
      const message = await requestSignIn(TEST_WALLET, 1);
      expect(message).toContain('Sign in to Quick Quiz');
      expect(message).toContain(TEST_WALLET);
      expect(cookieStore.has('wallet_challenge')).toBe(true);
    });

    it('signOutWallet calls clearSessionWallet', async () => {
      await setSessionWallet(TEST_WALLET);
      expect(cookieStore.has('wallet_session')).toBe(true);

      await signOutWallet();
      expect(cookieStore.has('wallet_session')).toBe(false);
    });

    it('signInWithWallet returns false if challenge cookie is missing', async () => {
      const ok = await signInWithWallet('test-message', '0x123' as `0x${string}`);
      expect(ok).toBe(false);
    });

    it('signInWithWallet verifies signature, sets session cookie, and calls getOrCreateUser', async () => {
      const message = await requestSignIn(TEST_WALLET, 1);

      const mockClient = {
        verifySiweMessage: vi.fn().mockResolvedValue(true),
      };
      (publicClientFor as ReturnType<typeof vi.fn>).mockReturnValue(mockClient);

      const existingUser = {
        wallet_address: TEST_WALLET.toLowerCase(),
        display_name: 'AuthUser',
        created_at: new Date().toISOString(),
      };
      (supabaseAdmin!.from as ReturnType<typeof vi.fn>).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: existingUser, error: null }),
      });

      const ok = await signInWithWallet(message, '0xdeadbeef' as `0x${string}`);
      expect(ok).toBe(true);
      expect(cookieStore.has('wallet_session')).toBe(true);
      expect(supabaseAdmin!.from).toHaveBeenCalledWith('users');
    });
  });
});
