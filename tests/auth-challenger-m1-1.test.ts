// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createResetToken,
  verifyResetToken,
  requestPasswordReset,
  verifyPasswordResetCode,
  updatePasswordWithReset,
} from '@/lib/services/auth/password-reset';
import {
  signUpWithEmail,
  signInWithEmail,
  signUpAccount,
} from '@/lib/services/auth/credentials';
import {
  requestPasswordReset as actionRequestPasswordReset,
  verifyPasswordResetCode as actionVerifyPasswordResetCode,
  updatePasswordWithReset as actionUpdatePasswordWithReset,
  signUpWithEmail as actionSignUpWithEmail,
  signInWithEmail as actionSignInWithEmail,
} from '@/lib/actions/auth-actions';
import { supabase } from '@/lib/sdk/supabase';
import * as rateLimitModule from '@/lib/services/auth/rate-limit';
import { createHmac, createHash } from 'node:crypto';

// In-memory cookie jar mock
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
  headers: vi.fn(async () => new Headers({ host: 'localhost:3000', 'x-forwarded-proto': 'https' })),
}));

vi.mock('@/lib/sdk/supabase', () => ({
  supabase: {
    auth: {
      resetPasswordForEmail: vi.fn(),
      verifyOtp: vi.fn(),
      updateUser: vi.fn(),
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signInWithOtp: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

vi.mock('@/lib/sdk/supabase-admin', () => ({
  supabaseAdmin: {
    auth: {
      admin: {
        createUser: vi.fn().mockResolvedValue({ data: { user: { id: 'admin-created-user' } }, error: null }),
        updateUserById: vi.fn().mockResolvedValue({ data: { user: { id: 'admin-updated-user' } }, error: null }),
      },
    },
    from: vi.fn(() => ({
      upsert: vi.fn().mockResolvedValue({ error: null }),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'test-account-id' }, error: null }),
    })),
  },
}));

vi.mock('@/lib/services/auth/rate-limit', () => ({
  allowAttempt: vi.fn().mockResolvedValue(true),
  allowAttemptFromIp: vi.fn().mockResolvedValue(true),
}));

const TEST_SECRET = 'test-secret-key-12345678901234567890';

function makeValidHmacToken(userId: string, email: string, expOffsetSeconds = 900, secretKey = TEST_SECRET): string {
  const key = createHmac('sha256', secretKey).update('quiz-password-reset').digest();
  const exp = Math.floor(Date.now() / 1000) + expOffsetSeconds;
  const emailDigest = createHash('sha256').update(email.trim().toLowerCase()).digest('hex');
  const payload = `${userId}.${exp}.${emailDigest}`;
  const mac = createHmac('sha256', key).update(payload).digest('base64url');
  return `rst-${userId}.${exp}.${mac}`;
}

describe('Challenger M1-1: Empirical Stress Tests for Backend Auth & Password Reset', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cookieStore.clear();
    vi.stubEnv('SUPABASE_SECRET_KEY', TEST_SECRET);
    vi.mocked(rateLimitModule.allowAttempt).mockResolvedValue(true);
    vi.mocked(rateLimitModule.allowAttemptFromIp).mockResolvedValue(true);

    // Default safe rejects
    vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValue({ data: {} as any, error: null });
    vi.mocked(supabase.auth.verifyOtp).mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Invalid OTP' } as any,
    });
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Invalid credentials' } as any,
    });
    vi.mocked(supabase.auth.signUp).mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Sign-up error' } as any,
    });
    vi.mocked(supabase.auth.updateUser).mockResolvedValue({
      data: { user: null },
      error: { message: 'Update error' } as any,
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // =========================================================================
  // 1. Token Tampering & Cryptographic Integrity
  // =========================================================================
  describe('1. Token Tampering', () => {
    it('rejects token when MAC has flipped bits or characters', () => {
      const email = 'alice@example.com';
      const token = makeValidHmacToken('usr-tamper-target', email);
      const parts = token.split('.');
      expect(parts.length).toBe(3);

      // Mutate 1 character in MAC
      const origMac = parts[2];
      const tamperedMac = origMac.slice(0, -1) + (origMac.endsWith('a') ? 'b' : 'a');
      const tamperedToken = `${parts[0]}.${parts[1]}.${tamperedMac}`;

      const res = verifyResetToken(tamperedToken, email);
      expect(res).toBeNull();
    });

    it('rejects token when user ID is substituted with an attacker victim ID', () => {
      const email = 'victim@example.com';
      const token = makeValidHmacToken('usr-alice-legit', email);
      const parts = token.split('.');

      // Attacker swaps userId in token prefix to victim's ID
      const tamperedToken = `rst-usr-victim-target.${parts[1]}.${parts[2]}`;
      const res = verifyResetToken(tamperedToken, email);
      expect(res).toBeNull();
    });

    it('rejects token when expiration is tampered with', () => {
      const email = 'alice@example.com';
      const token = makeValidHmacToken('usr-alice', email, 900);
      const parts = token.split('.');

      // Attacker extends exp by +100000s
      const tamperedExp = String(Number(parts[1]) + 100000);
      const tamperedToken = `${parts[0]}.${tamperedExp}.${parts[2]}`;

      const res = verifyResetToken(tamperedToken, email);
      expect(res).toBeNull();
    });

    it('rejects structurally malformed token shapes', () => {
      const email = 'alice@example.com';
      const malformed = [
        '',
        '   ',
        'rst-',
        'rst-user',
        'rst-user.12345',
        'rst-user.12345.mac.extra',
        'rst-user..mac',
        'rst-.12345.mac',
        'not-a-token',
        'rst-user.123.456.789',
      ];

      for (const tok of malformed) {
        expect(verifyResetToken(tok, email), `Expected "${tok}" to be rejected`).toBeNull();
      }
    });

    it('rejects valid token if submitted against a different email (token binding failure)', () => {
      const token = makeValidHmacToken('usr-alice-target', 'alice@example.com');
      // Attacker attempts to use Alice's token to reset their own or Bob's email
      expect(verifyResetToken(token, 'bob@example.com')).toBeNull();
      expect(verifyResetToken(token, 'mallory@attacker.com')).toBeNull();
      expect(verifyResetToken(token, 'alice@example.org')).toBeNull();
    });
  });

  // =========================================================================
  // 2. Forged Signatures
  // =========================================================================
  describe('2. Forged Signatures', () => {
    it('rejects signature generated with an unknown or attacker-controlled secret key', () => {
      const forgedToken = makeValidHmacToken(
        'usr-victim',
        'victim@example.com',
        900,
        'attacker-secret-key-99999999999999999999'
      );
      const res = verifyResetToken(forgedToken, 'victim@example.com');
      expect(res).toBeNull();
    });

    it('rejects tokens when server SUPABASE_SECRET_KEY is missing (fails closed)', () => {
      // In production mode with empty secret
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('SUPABASE_SECRET_KEY', '');

      const token = createResetToken('usr-1', 'alice@example.com');
      expect(token).toBeNull();

      const verifyRes = verifyResetToken('rst-usr-1.12345.fake', 'alice@example.com');
      expect(verifyRes).toBeNull();
    });
  });

  // =========================================================================
  // 3. Expired Timestamps
  // =========================================================================
  describe('3. Expired Timestamps', () => {
    it('rejects reset tokens with past expiration timestamp', () => {
      const email = 'alice@example.com';
      // Token expired 60 seconds ago
      const expiredToken = makeValidHmacToken('usr-alice-expired', email, -60);
      const res = verifyResetToken(expiredToken, email);
      expect(res).toBeNull();
    });

    it('rejects reset tokens with zero or negative expiration timestamps', () => {
      const email = 'alice@example.com';
      const key = createHmac('sha256', TEST_SECRET).update('quiz-password-reset').digest();
      const emailDigest = createHash('sha256').update(email).digest('hex');

      for (const zeroExp of ['0', '-1', '-9999999999']) {
        const payload = `usr-alice.${zeroExp}.${emailDigest}`;
        const mac = createHmac('sha256', key).update(payload).digest('base64url');
        const token = `rst-usr-alice.${zeroExp}.${mac}`;
        expect(verifyResetToken(token, email), `Exp ${zeroExp} must fail`).toBeNull();
      }
    });

    it('handles verification of freshly generated tokens within 15-minute TTL', () => {
      const email = 'valid@example.com';
      const token = createResetToken('usr-fresh', email);
      expect(token).not.toBeNull();
      const verified = verifyResetToken(token!, email);
      expect(verified).toEqual({ userId: 'usr-fresh' });
    });
  });

  // =========================================================================
  // 4. Replay Attacks
  // =========================================================================
  describe('4. Replay Attacks', () => {
    it('strictly forbids single-use token reuse after password update', async () => {
      const email = 'alice@example.com';
      const token = makeValidHmacToken('usr-alice-replay', email);

      vi.mocked(supabase.auth.updateUser).mockResolvedValue({
        data: { user: { id: 'usr-alice-replay' } as any },
        error: null,
      });

      // First use: must succeed
      const firstUse = await updatePasswordWithReset(email, token, 'NewSecurePass123!');
      expect(firstUse.ok).toBe(true);

      // Replay attempt with the exact same token: must fail with UNAUTHORIZED
      const replayAttempt = await updatePasswordWithReset(email, token, 'SecondPassAttempt123!');
      expect(replayAttempt.ok).toBe(false);
      expect((replayAttempt as any).error).toBe('UNAUTHORIZED');

      // Verify updateUser was only called once
      expect(supabase.auth.updateUser).toHaveBeenCalledTimes(1);
    });

    it('prevents replay attack even if email case or whitespace differs on reuse', async () => {
      const email = 'bob@example.com';
      const token = makeValidHmacToken('usr-bob-case', email);

      vi.mocked(supabase.auth.updateUser).mockResolvedValue({
        data: { user: { id: 'usr-bob-case' } as any },
        error: null,
      });

      const firstUse = await updatePasswordWithReset('  BOB@EXAMPLE.COM  ', token, 'NewSecurePass123!');
      expect(firstUse.ok).toBe(true);

      const replayUse = await updatePasswordWithReset('bob@example.com', token, 'HackedPass123!');
      expect(replayUse.ok).toBe(false);
      expect((replayUse as any).error).toBe('UNAUTHORIZED');
    });

    it('does NOT consume reset token if password update validation fails', async () => {
      const email = 'carol@example.com';
      const token = makeValidHmacToken('usr-carol-validation', email);

      // Password too short (< 6 chars)
      const invalidPassRes = await updatePasswordWithReset(email, token, '123');
      expect(invalidPassRes.ok).toBe(false);
      expect((invalidPassRes as any).error).toContain('at least 6 characters');

      // Correct password on retry: should succeed because token was not burned by validation failure
      vi.mocked(supabase.auth.updateUser).mockResolvedValue({
        data: { user: { id: 'usr-carol-validation' } as any },
        error: null,
      });

      const retryRes = await updatePasswordWithReset(email, token, 'ValidPass123!');
      expect(retryRes.ok).toBe(true);
    });
  });

  // =========================================================================
  // 5. Concurrent Reset Requests & Race Conditions
  // =========================================================================
  describe('5. Concurrent Reset Requests', () => {
    it('handles multiple reset code requests without crashing or corrupting state', async () => {
      vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValue({
        data: {} as any,
        error: null,
      });

      // Rapid sequential / concurrent requests
      const reqs = await Promise.all([
        requestPasswordReset('user@example.com'),
        requestPasswordReset('user@example.com'),
        requestPasswordReset('user@example.com'),
      ]);

      for (const res of reqs) {
        expect(res.sent).toBe(true);
      }
      expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledTimes(3);
    });

    it('issues distinct valid reset tokens for successive OTP verifications', async () => {
      vi.mocked(supabase.auth.verifyOtp).mockResolvedValue({
        data: { user: { id: 'usr-multi', email: 'multi@example.com' } as any, session: null },
        error: null,
      });

      const res1 = await verifyPasswordResetCode('multi@example.com', '111111');
      const res2 = await verifyPasswordResetCode('multi@example.com', '222222');

      expect(res1.ok).toBe(true);
      expect(res2.ok).toBe(true);
      expect(res1.resetToken).toBeDefined();
      expect(res2.resetToken).toBeDefined();

      // Both tokens are validly verifiable
      expect(verifyResetToken(res1.resetToken!, 'multi@example.com')).toEqual({ userId: 'usr-multi' });
      expect(verifyResetToken(res2.resetToken!, 'multi@example.com')).toEqual({ userId: 'usr-multi' });
    });
  });

  // =========================================================================
  // 6. Malformed Email Inputs & Injection Payloads
  // =========================================================================
  describe('6. Malformed Email Inputs & Injection Payloads', () => {
    const invalidEmailsViolatingRegex = [
      '',
      '   ',
      'plainaddress',
      '@missingusername.com',
      'username@.com',
      'username@domain',
      'username@domain.',
      'user name@domain.com',
      "' OR '1'='1",
      "admin'--",
      'user@test.com\nBcc: evil@attacker.com',
      'user@test.com\r\nSet-Cookie: evil=1',
    ];

    it('rejects non-email strings (missing @) in requestPasswordReset without calling auth', async () => {
      const nonEmailsWithoutAt = ['', '   ', 'plainaddress', "' OR '1'='1", "admin'--"];
      for (const email of nonEmailsWithoutAt) {
        const res = await requestPasswordReset(email);
        expect(res.sent, `Email "${email}" should fail request`).toBe(false);
        expect(res.error).toBe('Invalid email');
      }
      expect(supabase.auth.resetPasswordForEmail).not.toHaveBeenCalled();
    });

    it('rejects invalid emails in verifyPasswordResetCode before calling verifyOtp', async () => {
      for (const email of invalidEmailsViolatingRegex) {
        const res = await verifyPasswordResetCode(email, '123456');
        expect(res.ok, `Email "${email}" should fail verify`).toBe(false);
        expect(res.error).toBe('Invalid or expired reset code');
      }
      expect(supabase.auth.verifyOtp).not.toHaveBeenCalled();
    });

    it('rejects malformed email inputs with @ in signUpWithEmail before calling Supabase', async () => {
      const malformedEmailsWithAt = [
        '@nodomain.com',
        'user@.com',
        'user name@domain.com',
        'user@domain',
        'user@',
      ];
      for (const email of malformedEmailsWithAt) {
        const res = await signUpWithEmail(email, 'ValidPassword123!');
        expect(res.ok, `Email "${email}" should fail in sign up`).toBe(false);
        expect((res as any).error).toBe('Invalid email address.');
      }
      expect(supabase.auth.signUp).not.toHaveBeenCalled();
    });

    it('rejects malformed email inputs with @ in signInWithEmail before querying database', async () => {
      const malformedEmailsWithAt = [
        '@nodomain.com',
        'user@.com',
        'user name@domain.com',
        'user@domain',
        'user@',
      ];
      for (const email of malformedEmailsWithAt) {
        const res = await signInWithEmail(email, 'ValidPassword123!');
        expect(res.ok, `Email "${email}" should fail in sign in`).toBe(false);
        expect((res as any).error).toBe('Invalid email address.');
      }
      expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
    });

    it('rejects empty or blank credentials in signInWithEmail and signUpWithEmail', async () => {
      const blankInputs = ['', '   '];
      for (const blank of blankInputs) {
        const resUp = await signUpWithEmail(blank, 'ValidPassword123!');
        expect(resUp.ok).toBe(false);

        const resIn = await signInWithEmail(blank, 'ValidPassword123!');
        expect(resIn.ok).toBe(false);
      }
      expect(supabase.auth.signUp).not.toHaveBeenCalled();
      expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
    });

    it('signUpAccount enforces USERNAME_RE for non-email identifiers (rejecting injection strings)', async () => {
      const maliciousNonEmails = [
        "' OR '1'='1",
        "admin'--",
        '<script>alert(1)</script>',
        'a',
        'toolongusername12345678901234567890',
      ];
      for (const input of maliciousNonEmails) {
        const res = await signUpAccount(input, 'ValidPass123!');
        expect(res.ok, `Input "${input}" must fail username regex`).toBe(false);
        expect((res as any).error).toContain('Username must be 3-20 characters');
      }
      expect(supabase.auth.signUp).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 7. Rate-Limit Boundaries
  // =========================================================================
  describe('7. Rate-Limit Boundaries', () => {
    it('requestPasswordReset: enforces 5 attempts/hour boundary', async () => {
      let callCount = 0;
      vi.mocked(rateLimitModule.allowAttempt).mockImplementation(async (_action, _key, maxAttempts) => {
        callCount++;
        return callCount <= maxAttempts;
      });

      vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValue({
        data: {} as any,
        error: null,
      });

      // Attempts 1 to 5: must succeed
      for (let i = 1; i <= 5; i++) {
        const res = await requestPasswordReset('ratelimit@example.com');
        expect(res.sent, `Attempt ${i} should be allowed`).toBe(true);
      }

      // Attempt 6: must be rate-limited
      const res6 = await requestPasswordReset('ratelimit@example.com');
      expect(res6.sent).toBe(false);
      expect(res6.error).toBe('RATE_LIMITED');
      expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledTimes(5);
    });

    it('verifyPasswordResetCode: enforces 10 attempts/hour boundary', async () => {
      let callCount = 0;
      vi.mocked(rateLimitModule.allowAttempt).mockImplementation(async () => {
        callCount++;
        return callCount <= 10;
      });

      vi.mocked(supabase.auth.verifyOtp).mockResolvedValue({
        data: { user: { id: 'usr-1', email: 'test@example.com' } as any, session: null },
        error: null,
      });

      // Attempts 1 to 10: allowed
      for (let i = 1; i <= 10; i++) {
        const res = await verifyPasswordResetCode('test@example.com', '123456');
        expect(res.ok, `Attempt ${i} should be allowed`).toBe(true);
      }

      // Attempt 11: rate-limited
      const res11 = await verifyPasswordResetCode('test@example.com', '123456');
      expect(res11.ok).toBe(false);
      expect(res11.error).toBe('RATE_LIMITED');
      expect(supabase.auth.verifyOtp).toHaveBeenCalledTimes(10);
    });

    it('Server Actions proxy rate limit rejections cleanly to caller', async () => {
      vi.mocked(rateLimitModule.allowAttempt).mockResolvedValue(false);

      const reqRes = await actionRequestPasswordReset('user@example.com');
      expect(reqRes.sent).toBe(false);
      expect(reqRes.error).toBe('RATE_LIMITED');

      const verifyRes = await actionVerifyPasswordResetCode('user@example.com', '123456');
      expect(verifyRes.ok).toBe(false);
      expect(verifyRes.error).toBe('RATE_LIMITED');

      const signUpRes = await actionSignUpWithEmail('user@example.com', 'ValidPass123!');
      expect(signUpRes.ok).toBe(false);
      expect((signUpRes as any).error).toContain('Too many attempts');

      const signInRes = await actionSignInWithEmail('user@example.com', 'ValidPass123!');
      expect(signInRes.ok).toBe(false);
      expect((signInRes as any).error).toContain('Too many attempts');
    });
  });

  // =========================================================================
  // 8. Server Actions Interface Contracts Verification
  // =========================================================================
  describe('8. Server Actions Interface Contracts & Session Integration', () => {
    it('actionUpdatePasswordWithReset clears old session and sets new session upon success', async () => {
      const email = 'user@example.com';
      const token = makeValidHmacToken('usr-action-target', email);

      vi.mocked(supabase.auth.updateUser).mockResolvedValue({
        data: { user: { id: 'usr-action-target' } as any },
        error: null,
      });

      const res = await actionUpdatePasswordWithReset(email, token, 'NewPassword123!');
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.account?.id).toBeDefined();
      }

      // Check cookie was set
      const cookie = cookieStore.get('quiz_session');
      expect(cookie).toBeDefined();
    });
  });
});
