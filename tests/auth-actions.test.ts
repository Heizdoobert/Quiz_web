import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setSessionAccount, getSessionAccount, clearSessionAccount } from '../lib/services/session';
import {
  signOut,
  getSessionInfo,
  signUpWithUsername,
  signInWithUsername,
} from '../lib/actions/auth-actions';
import { supabase } from '../lib/supabase/supabase';
import { supabaseAdmin } from '../lib/supabase/supabase-admin';

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

vi.mock('../lib/supabase/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } }, error: null }),
      signUp: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } }, error: null }),
      signInWithOtp: vi.fn().mockResolvedValue({ data: {}, error: null }),
      verifyOtp: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } }, error: null }),
    },
  },
}));

vi.mock('../lib/supabase/supabase-admin', () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      upsert: vi.fn().mockResolvedValue({ error: null }),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'test-account-id' }, error: null }),
    })),
    auth: {
      admin: {
        createUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } }, error: null }),
      },
    },
  },
}));

const TEST_SECRET = 'test-secret-key-12345678901234567890';

describe('Auth & Session Foundations', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    cookieStore.clear();
    process.env.SUPABASE_SECRET_KEY = TEST_SECRET;

    (supabaseAdmin!.from as ReturnType<typeof vi.fn>).mockReturnValue({
      upsert: vi.fn().mockResolvedValue({ error: null }),
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: 'test-account-id' }, error: null }),
            }),
      }),
    });
    (supabaseAdmin!.auth.admin.createUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
      error: null,
    });
    (supabase.auth.signInWithPassword as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
      error: null,
    });
    (supabase.auth.signUp as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
      error: null,
    });
  });

  describe('session', () => {
    it('sets and retrieves the session account correctly', async () => {
      const ok = await setSessionAccount({ id: 'test-account-id' });
      expect(ok).toBe(true);

      const account = await getSessionAccount();
      expect(account).toEqual({ id: 'test-account-id' });
    });

    it('clearSessionAccount deletes the session cookie', async () => {
      await setSessionAccount({ id: 'test-account-id' });
      expect(cookieStore.has('quiz_session')).toBe(true);

      await clearSessionAccount();
      expect(cookieStore.has('quiz_session')).toBe(false);

      const account = await getSessionAccount();
      expect(account).toBeNull();
    });

    it('getSessionInfo returns the same account as getSessionAccount', async () => {
      await setSessionAccount({ id: 'test-account-id' });
      const info = await getSessionInfo();
      expect(info).toEqual({ id: 'test-account-id' });
    });
  });

  describe('auth-actions', () => {
    it('signOut clears the session cookie', async () => {
      await setSessionAccount({ id: 'test-account-id' });
      expect(cookieStore.has('quiz_session')).toBe(true);

      await signOut();
      expect(cookieStore.has('quiz_session')).toBe(false);
    });

    describe('signUpWithUsername', () => {
      it('rejects invalid username', async () => {
        const resShort = await signUpWithUsername('ab', 'secret123');
        expect(resShort.ok).toBe(false);
        expect(resShort.error).toContain('Username must be 3-20 characters');

        const resInvalid = await signUpWithUsername('user@invalid!', 'secret123');
        expect(resInvalid.ok).toBe(false);
        expect(resInvalid.error).toContain('Username must be 3-20 characters');
      });

      it('rejects short password', async () => {
        const res = await signUpWithUsername('valid_user', '12345');
        expect(res.ok).toBe(false);
        expect(res.error).toContain('Password must be at least 6 characters');
      });

      it('successfully registers new user and creates session', async () => {
        const res = await signUpWithUsername('test_player', 'secretpass123');
        expect(res.ok).toBe(true);
        expect(res.error).toBeUndefined();
        expect(cookieStore.has('quiz_session')).toBe(true);
        const account = await getSessionAccount();
        expect(account).toEqual({ id: 'test-account-id' });
      });

      it('handles duplicate username error', async () => {
        (supabaseAdmin!.auth.admin.createUser as ReturnType<typeof vi.fn>).mockResolvedValue({
          data: { user: null },
          error: { message: 'User already registered' },
        });

        const res = await signUpWithUsername('existing_player', 'secretpass123');
        expect(res.ok).toBe(false);
        expect(res.error).toContain('Username is already taken');
      });
    });

    describe('signInWithUsername', () => {
      it('rejects empty credentials', async () => {
        const res = await signInWithUsername('', '');
        expect(res.ok).toBe(false);
        expect(res.error).toContain('Username and password are required');
      });

      it('handles invalid credentials', async () => {
        (supabase.auth.signInWithPassword as ReturnType<typeof vi.fn>).mockResolvedValue({
          data: { user: null },
          error: { message: 'Invalid login credentials' },
        });

        const res = await signInWithUsername('test_player', 'wrong_password');
        expect(res.ok).toBe(false);
        expect(res.error).toBe('Invalid username or password.');
      });

      it('successfully signs in and establishes session', async () => {
        const res = await signInWithUsername('test_player', 'correct_password');
        expect(res.ok).toBe(true);
        expect(cookieStore.has('quiz_session')).toBe(true);
        const account = await getSessionAccount();
        expect(account).toEqual({ id: 'test-account-id' });
      });
    });
  });
});
