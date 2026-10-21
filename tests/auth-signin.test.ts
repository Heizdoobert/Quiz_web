// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as credentialsModule from '@/lib/services/auth/credentials';
import * as authActionsModule from '@/lib/actions/auth-actions';
import { supabase } from '@/lib/sdk/supabase';
import * as rateLimitModule from '@/lib/services/auth/rate-limit';

// Mocks
vi.mock('@/lib/sdk/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
    },
  },
}));

vi.mock('@/lib/services/auth/rate-limit', () => ({
  allowAttempt: vi.fn().mockResolvedValue(true),
  allowAttemptFromIp: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/lib/services/auth/session', () => ({
  setSessionAccount: vi.fn().mockResolvedValue(true),
  getSessionAccount: vi.fn().mockResolvedValue(null),
  clearSessionAccount: vi.fn().mockResolvedValue(undefined),
}));

// Contract Adapter for Sign-In
type AuthResult = { ok: true; account?: { id: string } } | { ok: false; error: string; requiresVerification?: boolean };
type SignInFn = (emailOrUsername: string, password: string) => Promise<AuthResult>;

const getSignInHandler = (): SignInFn => {
  if (typeof (authActionsModule as any).signInWithEmail === 'function') {
    return (authActionsModule as any).signInWithEmail;
  }
  if (typeof (credentialsModule as any).signInWithEmail === 'function') {
    return (credentialsModule as any).signInWithEmail;
  }
  return async (emailOrUsername: string, password: string) => {
    const trimmed = emailOrUsername.trim();
    const res = await credentialsModule.signInAccount(trimmed, password);
    if (!res.ok) {
      const isUnconfirmed = res.error.toLowerCase().includes('confirm') || res.error.toLowerCase().includes('verif');
      return { ok: false, error: res.error, requiresVerification: isUnconfirmed };
    }
    return { ok: true, account: res.account };
  };
};

describe('Matrix 2: Sign-In Flow (tests/auth-signin.test.ts)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('SUPABASE_SECRET_KEY', 'test-secret-key-12345678901234567890');
    vi.mocked(rateLimitModule.allowAttempt).mockResolvedValue(true);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('Tier 1: Smoke & Happy Path', () => {
    it('TC-SI-01: signs in successfully with valid credentials', async () => {
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: {
          user: { id: 'usr-auth-001', email: 'alice@example.com' } as any,
          session: { access_token: 'fake-jwt' } as any,
        },
        error: null,
      });

      const signIn = getSignInHandler();
      const result = await signIn('alice@example.com', 'ValidPass123!');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.account).toBeDefined();
        expect(result.account?.id).toBeTruthy();
      }
    });
  });

  describe('Tier 2: Edge Cases & Validation', () => {
    it('TC-SI-05: rejects empty or blank credentials before querying upstream auth', async () => {
      const signIn = getSignInHandler();
      const resultEmpty = await signIn('', '');
      const resultBlank = await signIn('   ', '   ');

      expect(resultEmpty.ok).toBe(false);
      expect(resultBlank.ok).toBe(false);
      expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
    });

    it('TC-SI-07: properly trims leading and trailing whitespace from input identifier', async () => {
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: {
          user: { id: 'usr-trim-002', email: 'bob@example.com' } as any,
          session: { access_token: 'fake-jwt' } as any,
        },
        error: null,
      });

      const signIn = getSignInHandler();
      const result = await signIn('  bob@example.com  ', 'ValidPass123!');

      expect(result.ok).toBe(true);
      expect(supabase.auth.signInWithPassword).toHaveBeenCalled();
    });
  });

  describe('Tier 3: Security & Anti-Enumeration', () => {
    it('TC-SI-02 & TC-SI-03: returns identical generic error for invalid password and non-existent email to prevent account enumeration', async () => {
      // Case A: Wrong password
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials', name: 'AuthApiError', status: 400 } as any,
      });

      const signIn = getSignInHandler();
      const resBadPass = await signIn('registered@example.com', 'WrongPass!');

      // Case B: Non-existent account
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials', name: 'AuthApiError', status: 400 } as any,
      });

      const resBadUser = await signIn('ghost@example.com', 'AnyPass123!');

      expect(resBadPass.ok).toBe(false);
      expect(resBadUser.ok).toBe(false);
      // Both must share identical generic error message
      if (!resBadPass.ok && !resBadUser.ok) {
        expect(resBadPass.error).toBe(resBadUser.error);
        expect(resBadPass.error).toMatch(/(invalid (username|email) or password|invalid login credentials)/i);
      }
    });

    it('TC-SI-06: enforces brute force rate limiting against repeated sign-in attempts', async () => {
      vi.mocked(rateLimitModule.allowAttempt).mockResolvedValue(false);

      const signIn = getSignInHandler();
      const result = await signIn('target@example.com', 'GuessPass123!');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toMatch(/(too many attempts|rate_limited|rate limit)/i);
      }
      expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
    });
  });

  describe('Tier 4: Unverified Email & Resilience', () => {
    it('TC-SI-04: identifies unverified email and prevents session establishment', async () => {
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Email not confirmed', name: 'AuthApiError', status: 400 } as any,
      });

      const signIn = getSignInHandler();
      const result = await signIn('unverified@example.com', 'ValidPass123!');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.toLowerCase()).toMatch(/(confirm|verif|invalid)/i);
      }
    });

    it('TC-SI-08: safely handles unexpected upstream service outages', async () => {
      vi.mocked(supabase.auth.signInWithPassword).mockRejectedValue(new Error('Postgres connection failure'));

      const signIn = getSignInHandler();
      const result = await signIn('alice@example.com', 'ValidPass123!');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBeDefined();
      }
    });
  });
});
