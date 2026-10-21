// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as credentialsModule from '@/lib/services/auth/credentials';
import * as authActionsModule from '@/lib/actions/auth-actions';
import { supabase } from '@/lib/sdk/supabase';
import { supabaseAdmin } from '@/lib/sdk/supabase-admin';
import * as rateLimitModule from '@/lib/services/auth/rate-limit';

// Mocks
vi.mock('@/lib/sdk/supabase', () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
    },
  },
}));

vi.mock('@/lib/sdk/supabase-admin', () => ({
  supabaseAdmin: {
    auth: {
      admin: {
        createUser: vi.fn(),
      },
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'test-account-id' }, error: null }),
      upsert: vi.fn().mockResolvedValue({ error: null }),
    })),
  },
}));

vi.mock('@/lib/services/auth/rate-limit', () => ({
  allowAttempt: vi.fn().mockResolvedValue(true),
  allowAttemptFromIp: vi.fn().mockResolvedValue(true),
}));

// Contract Adapter for Sign-Up
type AuthResult = { ok: true; account?: { id: string } } | { ok: false; error: string };
type SignUpFn = (email: string, password: string, displayName?: string) => Promise<AuthResult & { requiresVerification?: boolean }>;

const getSignUpHandler = (): SignUpFn => {
  if (typeof (authActionsModule as any).signUpWithEmail === 'function') {
    return (authActionsModule as any).signUpWithEmail;
  }
  if (typeof (credentialsModule as any).signUpWithEmail === 'function') {
    return (credentialsModule as any).signUpWithEmail;
  }
  return async (email: string, password: string, displayName?: string) => {
    const trimmed = (displayName || email.split('@')[0] || email).trim();
    const res = await credentialsModule.signUpAccount(trimmed, password);
    if (!res.ok) return { ok: false, error: res.error };
    return { ok: true, account: res.account, requiresVerification: true };
  };
};

describe('Matrix 1: Sign-Up Flow (tests/auth-signup.test.ts)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('SUPABASE_SECRET_KEY', 'test-secret-key-12345678901234567890');
    vi.mocked(rateLimitModule.allowAttempt).mockResolvedValue(true);
    vi.mocked(rateLimitModule.allowAttemptFromIp).mockResolvedValue(true);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('Tier 1: Smoke & Happy Path', () => {
    it('TC-SU-01: successfully creates a new account with valid email and password', async () => {
      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: {
          user: {
            id: 'usr-valid-123',
            email: 'alice@example.com',
            user_metadata: { username: 'alice_quiz' },
          } as any,
          session: null,
        },
        error: null,
      });

      if (supabaseAdmin?.auth?.admin?.createUser) {
        vi.mocked(supabaseAdmin.auth.admin.createUser).mockResolvedValue({
          data: { user: { id: 'usr-valid-123' } as any },
          error: null,
        });
      }

      const signUp = getSignUpHandler();
      const result = await signUp('alice@example.com', 'ValidPass123!', 'alice_quiz');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.account).toBeDefined();
        expect(result.account?.id).toBeTruthy();
      }
    });
  });

  describe('Tier 2: Edge Cases & Input Validation', () => {
    it('TC-SU-03: rejects passwords that are shorter than 6 characters', async () => {
      const signUp = getSignUpHandler();
      const result = await signUp('bob@example.com', '12345', 'bob_quiz');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.toLowerCase()).toMatch(/password.*(?:at least|short|6)/);
      }
      expect(supabase.auth.signUp).not.toHaveBeenCalled();
    });

    it('TC-SU-04: rejects empty or invalid email/username formats', async () => {
      const signUp = getSignUpHandler();
      const result = await signUp('', 'ValidPass123!');

      expect(result.ok).toBe(false);
      expect(supabase.auth.signUp).not.toHaveBeenCalled();
    });

    it('TC-SU-08: normalizes whitespace in email/username inputs', async () => {
      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: {
          user: { id: 'usr-space-123', email: 'charlie@example.com' } as any,
          session: null,
        },
        error: null,
      });
      if (supabaseAdmin?.auth?.admin?.createUser) {
        vi.mocked(supabaseAdmin.auth.admin.createUser).mockResolvedValue({
          data: { user: { id: 'usr-space-123' } as any },
          error: null,
        });
      }

      const signUp = getSignUpHandler();
      const result = await signUp('  charlie@example.com  ', 'ValidPass123!', '  charlie_q  ');
      expect(result.ok).toBe(true);
    });
  });

  describe('Tier 3: Security & Collisions', () => {
    it('TC-SU-02: handles duplicate email/user collision cleanly without leaking internals', async () => {
      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'User already registered', name: 'AuthApiError', status: 400 } as any,
      });
      if (supabaseAdmin?.auth?.admin?.createUser) {
        vi.mocked(supabaseAdmin.auth.admin.createUser).mockResolvedValue({
          data: { user: null } as any,
          error: { message: 'User already registered', name: 'AuthApiError', status: 400 } as any,
        });
      }

      const signUp = getSignUpHandler();
      const result = await signUp('alice@example.com', 'ValidPass123!', 'alice_quiz');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toMatch(/(already (taken|registered)|exists)/i);
      }
    });

    it('TC-SU-06: blocks sign-up attempts when rate limit threshold is exceeded', async () => {
      vi.mocked(rateLimitModule.allowAttempt).mockResolvedValue(false);

      const signUp = getSignUpHandler();
      const result = await signUp('spammer@example.com', 'ValidPass123!', 'spammer');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toMatch(/(too many attempts|rate_limited|rate limit)/i);
      }
      expect(supabase.auth.signUp).not.toHaveBeenCalled();
    });
  });

  describe('Tier 4: Error Handling & Resilience', () => {
    it('TC-SU-07: handles upstream auth service downtime gracefully', async () => {
      vi.mocked(supabase.auth.signUp).mockRejectedValue(new Error('Network connection timeout'));
      if (supabaseAdmin?.auth?.admin?.createUser) {
        vi.mocked(supabaseAdmin.auth.admin.createUser).mockRejectedValue(new Error('Network connection timeout'));
      }

      const signUp = getSignUpHandler();
      const result = await signUp('dave@example.com', 'ValidPass123!', 'dave_quiz');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBeDefined();
      }
    });
  });
});
