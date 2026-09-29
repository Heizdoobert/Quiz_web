import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setSessionAccount, getSessionAccount, clearSessionAccount } from '../lib/session';
import {
  getAuthNonce,
  requestSignIn,
  signInWithWallet,
  signOutWallet,
  getSessionInfo,
} from '../lib/actions/auth-actions';
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
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

vi.mock('../lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      upsert: vi.fn().mockResolvedValue({ error: null }),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'test-account-id' }, error: null }),
    })),
  },
}));

vi.mock('../lib/chain', () => ({
  publicClientFor: vi.fn(),
}));

const TEST_SECRET = 'test-secret-key-12345678901234567890';
const TEST_WALLET = '0x1234567890123456789012345678901234567890';

describe('Auth & Session Foundations', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    cookieStore.clear();
    process.env.SUPABASE_SECRET_KEY = TEST_SECRET;
  });

  describe('session', () => {
    it('sets and retrieves the session account correctly', async () => {
      const ok = await setSessionAccount({ id: 'test-account-id', wallet: TEST_WALLET });
      expect(ok).toBe(true);

      const account = await getSessionAccount();
      expect(account).toEqual({ id: 'test-account-id', wallet: TEST_WALLET.toLowerCase() });
    });

    it('clearSessionAccount deletes the session cookie', async () => {
      await setSessionAccount({ id: 'test-account-id', wallet: TEST_WALLET });
      expect(cookieStore.has('quiz_session')).toBe(true);

      await clearSessionAccount();
      expect(cookieStore.has('quiz_session')).toBe(false);

      const account = await getSessionAccount();
      expect(account).toBeNull();
    });

    it('getSessionInfo returns the same account as getSessionAccount', async () => {
      await setSessionAccount({ id: 'test-account-id', wallet: TEST_WALLET });
      const info = await getSessionInfo();
      expect(info).toEqual({ id: 'test-account-id', wallet: TEST_WALLET.toLowerCase() });
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

    it('signOutWallet calls clearSessionAccount', async () => {
      await setSessionAccount({ id: 'test-account-id', wallet: TEST_WALLET });
      expect(cookieStore.has('quiz_session')).toBe(true);

      await signOutWallet();
      expect(cookieStore.has('quiz_session')).toBe(false);
    });

    it('signInWithWallet returns false if challenge cookie is missing', async () => {
      const ok = await signInWithWallet('test-message', '0x123' as `0x${string}`);
      expect(ok).toBe(false);
    });

    it('signInWithWallet verifies signature, sets session cookie, and calls ensureAccountForWallet', async () => {
      const message = await requestSignIn(TEST_WALLET, 1);

      const mockClient = {
        verifySiweMessage: vi.fn().mockResolvedValue(true),
      };
      (publicClientFor as ReturnType<typeof vi.fn>).mockReturnValue(mockClient);

      const upsertMock = vi.fn().mockResolvedValue({ error: null });
      const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: 'test-account-id' }, error: null }),
        }),
      });

      (supabaseAdmin!.from as ReturnType<typeof vi.fn>).mockReturnValue({
        upsert: upsertMock,
        select: selectMock,
      });

      const ok = await signInWithWallet(message, '0xdeadbeef' as `0x${string}`);
      expect(ok).toBe(true);
      expect(cookieStore.has('quiz_session')).toBe(true);
      expect(supabaseAdmin!.from).toHaveBeenCalledWith('users');
      expect(upsertMock).toHaveBeenCalled();
    });
  });
});
