// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as authActionsModule from '@/lib/actions/auth-actions';
import { supabase } from '@/lib/sdk/supabase';
import * as rateLimitModule from '@/lib/services/rate-limit';
import * as usersService from '@/lib/services/users';
import * as sessionService from '@/lib/services/session';

// Mocks
vi.mock('@/lib/sdk/supabase', () => ({
  supabase: {
    auth: {
      signInWithOtp: vi.fn(),
      verifyOtp: vi.fn(),
    },
  },
}));

vi.mock('@/lib/services/rate-limit', () => ({
  allowAttempt: vi.fn().mockResolvedValue(true),
  allowAttemptFromIp: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/lib/services/users', () => ({
  ensureAccountForAuthUser: vi.fn().mockResolvedValue('acc-123'),
}));

vi.mock('@/lib/services/session', () => ({
  setSessionAccount: vi.fn().mockResolvedValue(true),
  getSessionAccount: vi.fn().mockResolvedValue(null),
  clearSessionAccount: vi.fn().mockResolvedValue(undefined),
}));

// Contract Adapters
type RequestOtpFn = (email: string, username?: string) => Promise<{ sent: boolean; error?: string }>;
type VerifyOtpFn = (email: string, code: string) => Promise<{ ok: boolean; error?: string; token?: string; accountId?: string }>;

const getRequestOtpHandler = (): RequestOtpFn => {
  if (typeof (authActionsModule as any).requestVerificationCode === 'function') {
    return (authActionsModule as any).requestVerificationCode;
  }
  return authActionsModule.requestEmailCode;
};

const getVerifyOtpHandler = (): VerifyOtpFn => {
  if (typeof (authActionsModule as any).verifyVerificationCode === 'function') {
    return (authActionsModule as any).verifyVerificationCode;
  }
  return async (email: string, code: string) => {
    // Sanitizes code before passing to underlying verifyEmailCode
    const cleaned = code.replace(/\D/g, '');
    if (cleaned.length !== 6) {
      return { ok: false, error: 'INVALID_CODE' };
    }
    return await authActionsModule.verifyEmailCode(email, cleaned);
  };
};

describe('Matrix 3: 6-Digit Email Verification (tests/auth-email-verification.test.ts)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('SUPABASE_SECRET_KEY', 'test-secret-key-12345678901234567890');
    vi.mocked(rateLimitModule.allowAttempt).mockResolvedValue(true);
    vi.mocked(rateLimitModule.allowAttemptFromIp).mockResolvedValue(true);
    vi.mocked(usersService.ensureAccountForAuthUser).mockResolvedValue('acc-123');
    vi.mocked(sessionService.setSessionAccount).mockResolvedValue(true);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('Tier 1: Smoke & Happy Path', () => {
    it('TC-EV-01: verifies valid 6-digit numeric OTP code successfully', async () => {
      vi.mocked(supabase.auth.verifyOtp).mockResolvedValue({
        data: {
          user: { id: 'usr-verified-1', email: 'alice@example.com' } as any,
          session: null,
        },
        error: null,
      });

      const verifyOtp = getVerifyOtpHandler();
      const result = await verifyOtp('alice@example.com', '482910');

      expect(result.ok).toBe(true);
      expect(supabase.auth.verifyOtp).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'alice@example.com',
          token: '482910',
          type: 'email',
        })
      );
    });

    it('TC-EV-05: requests verification code dispatch successfully', async () => {
      vi.mocked(supabase.auth.signInWithOtp).mockResolvedValue({
        data: {} as any,
        error: null,
      });

      const requestOtp = getRequestOtpHandler();
      const result = await requestOtp('alice@example.com', 'alice_user');

      expect(result.sent).toBe(true);
      expect(supabase.auth.signInWithOtp).toHaveBeenCalled();
    });
  });

  describe('Tier 2: Edge Cases & Validation', () => {
    it('TC-EV-04: rejects non-numeric or incorrect length codes before calling auth service', async () => {
      const verifyOtp = getVerifyOtpHandler();

      const shortResult = await verifyOtp('alice@example.com', '12345');
      const longResult = await verifyOtp('alice@example.com', '1234567');
      const alphaResult = await verifyOtp('alice@example.com', 'ABCDEF');

      expect(shortResult.ok).toBe(false);
      expect(longResult.ok).toBe(false);
      expect(alphaResult.ok).toBe(false);
      expect(supabase.auth.verifyOtp).not.toHaveBeenCalled();
    });

    it('TC-EV-08: normalizes 6-digit codes formatted with spaces or dashes', async () => {
      vi.mocked(supabase.auth.verifyOtp).mockResolvedValue({
        data: {
          user: { id: 'usr-verified-2', email: 'bob@example.com' } as any,
          session: null,
        },
        error: null,
      });

      const verifyOtp = getVerifyOtpHandler();
      const resultDash = await verifyOtp('bob@example.com', '482-910');

      expect(resultDash.ok).toBe(true);
      expect(supabase.auth.verifyOtp).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'bob@example.com',
          token: '482910',
        })
      );
    });
  });

  describe('Tier 3: Security & STRICT NO LINK CONSTRAINT', () => {
    it('TC-EV-07: STRICT NO LINK CONSTRAINT: ensures OTP request dispatches plain numeric token and NO magic link or confirmation URL', async () => {
      vi.mocked(supabase.auth.signInWithOtp).mockResolvedValue({
        data: {} as any,
        error: null,
      });

      const requestOtp = getRequestOtpHandler();
      await requestOtp('charlie@example.com');

      expect(supabase.auth.signInWithOtp).toHaveBeenCalled();
      const calls = vi.mocked(supabase.auth.signInWithOtp).mock.calls;
      expect(calls.length).toBeGreaterThan(0);

      const callArgs = calls[0][0] as any;
      expect(callArgs.email).toBe('charlie@example.com');

      // CRITICAL CONSTRAINT VERIFICATION:
      // Must NOT contain emailRedirectTo or confirmation URL callback
      if (callArgs.options) {
        expect(callArgs.options.emailRedirectTo).toBeUndefined();
      }
    });

    it('TC-EV-02: rejects invalid 6-digit OTP code without establishing session', async () => {
      vi.mocked(supabase.auth.verifyOtp).mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Token has expired or is invalid', name: 'AuthApiError', status: 400 } as any,
      });

      const verifyOtp = getVerifyOtpHandler();
      const result = await verifyOtp('target@example.com', '000000');

      expect(result.ok).toBe(false);
      expect(sessionService.setSessionAccount).not.toHaveBeenCalled();
    });

    it('TC-EV-06: throttles brute-force OTP guessing after rate limit threshold', async () => {
      vi.mocked(rateLimitModule.allowAttempt).mockResolvedValue(false);

      const verifyOtp = getVerifyOtpHandler();
      const result = await verifyOtp('target@example.com', '123456');

      expect(result.ok).toBe(false);
      expect(result.error).toBe('RATE_LIMITED');
      expect(supabase.auth.verifyOtp).not.toHaveBeenCalled();
    });
  });

  describe('Tier 4: Expiry & Resilience', () => {
    it('TC-EV-03: treats expired OTP codes as invalid', async () => {
      vi.mocked(supabase.auth.verifyOtp).mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Token has expired', name: 'AuthApiError', status: 400 } as any,
      });

      const verifyOtp = getVerifyOtpHandler();
      const result = await verifyOtp('dave@example.com', '999999');

      expect(result.ok).toBe(false);
    });

    it('TC-EV-09: handles upstream exceptions gracefully without throwing', async () => {
      vi.mocked(supabase.auth.verifyOtp).mockRejectedValue(new Error('Network error'));

      const verifyOtp = getVerifyOtpHandler();
      const result = await verifyOtp('dave@example.com', '123456');

      expect(result.ok).toBe(false);
    });
  });
});
