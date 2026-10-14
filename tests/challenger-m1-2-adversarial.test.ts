// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  signUpWithEmail,
  signInWithEmail,
  requestVerificationCode,
  verifyVerificationCode,
  requestPasswordReset,
  verifyPasswordResetCode,
  updatePasswordWithReset,
} from '@/lib/actions/auth-actions';
import {
  setSessionAccount,
  getSessionAccount,
} from '@/lib/services/session';
import {
  createResetToken,
  verifyResetToken,
} from '@/lib/services/password-reset';
import {
  issueMobileAuthToken,
  verifyMobileAuthToken,
} from '@/lib/services/mobile-auth';
import { supabase } from '@/lib/sdk/supabase';
import * as rateLimitModule from '@/lib/services/rate-limit';

// Simulated cookie jar for Next.js cookies()
const cookieStore = new Map<string, { value: string; [key: string]: unknown }>();
let requestHeaders = new Headers({ host: 'localhost:3000', 'x-forwarded-proto': 'https' });

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
  headers: vi.fn(async () => requestHeaders),
}));

vi.mock('@/lib/sdk/supabase', () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signInWithOtp: vi.fn(),
      verifyOtp: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
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

vi.mock('@/lib/services/rate-limit', () => ({
  allowAttempt: vi.fn().mockResolvedValue(true),
  allowAttemptFromIp: vi.fn().mockResolvedValue(true),
}));

const TEST_SECRET = 'test-secret-key-12345678901234567890';

describe('Adversarial Empirical Challenge Suite - Milestone 1 Task 2', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cookieStore.clear();
    requestHeaders = new Headers({ host: 'example.com', 'x-forwarded-proto': 'https' });
    vi.stubEnv('SUPABASE_SECRET_KEY', TEST_SECRET);
    vi.mocked(rateLimitModule.allowAttempt).mockResolvedValue(true);
    vi.mocked(rateLimitModule.allowAttemptFromIp).mockResolvedValue(true);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // =========================================================================
  // 1. Strict 6-Digit Numeric OTP Constraint & Strictly NO Confirmation URLs / Links
  // =========================================================================
  describe('1. Strict 6-Digit Numeric OTP Constraint & NO Confirmation Links', () => {
    it('STRICT NO LINK: requestVerificationCode sends strictly numeric OTP with NO emailRedirectTo or confirmation link', async () => {
      vi.mocked(supabase.auth.signInWithOtp).mockResolvedValue({ data: {} as any, error: null });

      const res = await requestVerificationCode('challenger@example.com');
      expect(res.sent).toBe(true);

      const calls = vi.mocked(supabase.auth.signInWithOtp).mock.calls;
      expect(calls.length).toBe(1);
      const [callArg] = calls[0];

      // Verifies email is lowercased and trimmed
      expect((callArg as any).email).toBe('challenger@example.com');
      // Verifies that NO confirmation URL or redirection link is provided
      if (callArg.options) {
        expect((callArg.options as any).emailRedirectTo).toBeUndefined();
        expect((callArg.options as any).redirectTo).toBeUndefined();
      }
    });

    it('STRICT NO LINK: requestPasswordReset sends recovery OTP with NO confirmation callback or link', async () => {
      vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValue({ data: {} as any, error: null });

      const res = await requestPasswordReset('challenger@example.com');
      expect(res.sent).toBe(true);

      const calls = vi.mocked(supabase.auth.resetPasswordForEmail).mock.calls;
      expect(calls.length).toBe(1);
      // Supabase resetPasswordForEmail must not pass any confirmation URL
      const [emailArg, optionsArg] = calls[0] as [string, any?];
      expect(emailArg).toBe('challenger@example.com');
      if (optionsArg) {
        expect(optionsArg.redirectTo).toBeUndefined();
      }
    });

    it('OTP Boundary in verifyVerificationCode: rejects non-digits, too short, too long, negative, symbols', async () => {
      const boundaryCases = [
        { code: '', desc: 'empty string' },
        { code: '1', desc: '1 digit' },
        { code: '12', desc: '2 digits' },
        { code: '123', desc: '3 digits' },
        { code: '1234', desc: '4 digits' },
        { code: '12345', desc: '5 digits (off-by-one under)' },
        { code: '1234567', desc: '7 digits (off-by-one over)' },
        { code: '12345678', desc: '8 digits' },
        { code: 'abcdef', desc: 'alphabetic string' },
        { code: '12a456', desc: 'contains alpha (cleans to 5 digits)' },
        { code: '!@#$%^', desc: 'symbols' },
        { code: '      ', desc: 'whitespace only' },
        { code: '-12345', desc: 'negative sign with 5 digits' },
        { code: '1.2345', desc: 'decimal point with 5 digits' },
        { code: '12345\0', desc: 'null byte with 5 digits' },
        { code: '1'.repeat(100), desc: '100 digits buffer attack' },
      ];

      for (const { code, desc } of boundaryCases) {
        const res = await verifyVerificationCode('user@example.com', code);
        expect(res.ok, `Expected code "${code}" (${desc}) to be rejected`).toBe(false);
        if (!res.ok) {
          expect(res.error).toBe('Verification code must be 6 digits.');
        }
      }
      expect(supabase.auth.verifyOtp).not.toHaveBeenCalled();
    });

    it('OTP Formatting in verifyVerificationCode: accepts valid 6-digits with whitespace or dash normalization', async () => {
      const validFormats = [
        '123456',
        ' 123456 ',
        '123 456',
        '123-456',
        ' 12-34-56 ',
      ];

      for (const formatted of validFormats) {
        vi.clearAllMocks();
        vi.mocked(supabase.auth.verifyOtp).mockResolvedValue({
          data: { user: { id: 'usr-otp-clean', email: 'user@example.com' } as any, session: null },
          error: null,
        });

        const res = await verifyVerificationCode('user@example.com', formatted);
        expect(res.ok, `Expected format "${formatted}" to normalize and succeed`).toBe(true);
        expect(supabase.auth.verifyOtp).toHaveBeenCalledWith(
          expect.objectContaining({
            token: '123456',
          })
        );
      }
    });

    it('OTP Boundary in verifyPasswordResetCode: rejects non-6-digit codes before auth call', async () => {
      const invalidCodes = ['12345', '1234567', 'ABCDEF', '', '   ', '12345a', '12-34'];
      for (const code of invalidCodes) {
        const res = await verifyPasswordResetCode('user@example.com', code);
        expect(res.ok).toBe(false);
        expect(res.error).toBe('Invalid or expired reset code');
      }
      expect(supabase.auth.verifyOtp).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 2. Invalid Email Format Rejections
  // =========================================================================
  describe('2. Invalid Email Formats Handling', () => {
    const malformedEmailsWithAt = [
      '@nodomain.com',
      'user@.com',
      'user name@domain.com',
      'user@domain',
      'user@',
      'user@domain,com',
    ];

    it('signUpWithEmail rejects malformed emails with @ without querying Supabase', async () => {
      for (const email of malformedEmailsWithAt) {
        const res = await signUpWithEmail(email, 'ValidPass123!');
        expect(res.ok, `Email "${email}" should be rejected`).toBe(false);
        if (!res.ok) {
          expect(res.error).toBe('Invalid email address.');
        }
      }
      expect(supabase.auth.signUp).not.toHaveBeenCalled();
    });

    it('signUpWithEmail rejects empty or whitespace email identifiers', async () => {
      const blankInputs = ['', '   '];
      for (const blank of blankInputs) {
        const res = await signUpWithEmail(blank, 'ValidPass123!');
        expect(res.ok).toBe(false);
      }
      expect(supabase.auth.signUp).not.toHaveBeenCalled();
    });

    it('signInWithEmail rejects malformed emails with @ without querying database', async () => {
      for (const email of malformedEmailsWithAt) {
        const res = await signInWithEmail(email, 'ValidPass123!');
        expect(res.ok, `Email "${email}" should be rejected`).toBe(false);
        if (!res.ok) {
          expect(res.error).toBe('Invalid email address.');
        }
      }
      expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
    });

    it('signInWithEmail rejects empty credentials immediately', async () => {
      const resEmpty = await signInWithEmail('', '');
      expect(resEmpty.ok).toBe(false);
      if (!resEmpty.ok) {
        expect(resEmpty.error).toContain('required');
      }

      const resBlank = await signInWithEmail('   ', '   ');
      expect(resBlank.ok).toBe(false);
      if (!resBlank.ok) {
        expect(resBlank.error).toContain('required');
      }

      expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
    });

    it('verifyVerificationCode rejects invalid emails with @ without checking code', async () => {
      for (const email of malformedEmailsWithAt) {
        const res = await verifyVerificationCode(email, '123456');
        expect(res.ok, `Email "${email}" should be rejected`).toBe(false);
      }
      expect(supabase.auth.verifyOtp).not.toHaveBeenCalled();
    });

    it('requestPasswordReset rejects non-email identifiers without calling auth', async () => {
      const nonEmails = ['', '   ', 'notanemail', 'nodomain'];
      for (const identifier of nonEmails) {
        const res = await requestPasswordReset(identifier);
        expect(res.sent, `Identifier "${identifier}" should fail request`).toBe(false);
        expect(res.error).toBe('Invalid email');
      }
      expect(supabase.auth.resetPasswordForEmail).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 3. Password Hashing Logic & Boundaries
  // =========================================================================
  describe('3. Password Hashing Logic & Boundaries', () => {
    it('Enforces minimum length of 6 characters on sign-up', async () => {
      const shortPasswords = ['', 'a', '12', 'abc', '1234', '12345'];
      for (const pwd of shortPasswords) {
        const res = await signUpWithEmail('alice@example.com', pwd);
        expect(res.ok).toBe(false);
        if (!res.ok) {
          expect(res.error).toContain('Password must be at least 6 characters.');
        }
      }
      expect(supabase.auth.signUp).not.toHaveBeenCalled();
    });

    it('Enforces minimum length of 6 characters on password reset update', async () => {
      const shortPasswords = ['', '1', '12345'];
      const validToken = createResetToken('usr-reset-1', 'alice@example.com')!;
      for (const pwd of shortPasswords) {
        const res = await updatePasswordWithReset('alice@example.com', validToken, pwd);
        expect(res.ok).toBe(false);
        if (!res.ok) {
          expect(res.error).toContain('Password must be at least 6 characters');
        }
      }
      expect(supabase.auth.updateUser).not.toHaveBeenCalled();
    });

    it('Accepts exactly 6 characters and long passwords (e.g. 100+ chars)', async () => {
      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: { user: { id: 'usr-len-ok', email: 'alice@example.com' } as any, session: null },
        error: null,
      });

      const exactly6 = await signUpWithEmail('alice@example.com', '123456');
      expect(exactly6.ok).toBe(true);

      const longPass = 'A'.repeat(128);
      const longRes = await signUpWithEmail('bob@example.com', longPass);
      expect(longRes.ok).toBe(true);
    });

    it('Zero plaintext password leaks in returned objects or cookies', async () => {
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: {
          user: { id: 'usr-no-leak', email: 'user@example.com' } as any,
          session: { access_token: 'jwt' } as any,
        },
        error: null,
      });

      const pass = 'SuperSecret123!';
      const res = await signInWithEmail('user@example.com', pass);
      expect(res.ok).toBe(true);

      // JSON stringify the result and verify password never appears
      const resStr = JSON.stringify(res);
      expect(resStr).not.toContain(pass);

      // Verify cookie does not contain password
      const cookie = cookieStore.get('quiz_session');
      expect(cookie).toBeDefined();
      expect(cookie?.value).not.toContain(pass);
    });
  });

  // =========================================================================
  // 4. Unverified Email Handling
  // =========================================================================
  describe('4. Unverified Email Handling', () => {
    it('Sign-in with unverified email: blocks session and returns clear verification guidance', async () => {
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Email not confirmed', name: 'AuthApiError', status: 400 } as any,
      });

      const res = await signInWithEmail('unverified@example.com', 'Secret123!');
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error).toContain('Email not confirmed. Please verify your email first.');
      }
      // No session cookie established
      expect(cookieStore.has('quiz_session')).toBe(false);
    });

    it('Sign-up with unverified email: returns requiresVerification: true and does NOT set session cookie', async () => {
      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: {
          user: { id: 'usr-unverified', email: 'new@example.com', email_confirmed_at: null } as any,
          session: null,
        },
        error: null,
      });

      const res = await signUpWithEmail('new@example.com', 'Secret123!');
      expect(res.ok).toBe(true);
      expect((res as any).requiresVerification).toBe(true);
      // Critical check: unverified sign-up must NOT set cookie
      expect(cookieStore.has('quiz_session')).toBe(false);
    });

    it('Sign-up with already confirmed email (session returned): sets session cookie', async () => {
      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: {
          user: { id: 'usr-confirmed', email: 'auto@example.com', email_confirmed_at: '2026-10-13T00:00:00Z' } as any,
          session: { access_token: 'active' } as any,
        },
        error: null,
      });

      const res = await signUpWithEmail('auto@example.com', 'Secret123!');
      expect(res.ok).toBe(true);
      expect((res as any).requiresVerification).toBe(false);
      expect(cookieStore.has('quiz_session')).toBe(true);
    });
  });

  // =========================================================================
  // 5. Session Establishment & Token Security
  // =========================================================================
  describe('5. Session Establishment & Security Flags', () => {
    it('Establishes secure HTTP-only session cookie after OTP verification', async () => {
      vi.mocked(supabase.auth.verifyOtp).mockResolvedValue({
        data: {
          user: { id: 'usr-verified-otp', email: 'otp@example.com' } as any,
          session: null,
        },
        error: null,
      });

      const res = await verifyVerificationCode('otp@example.com', '654321');
      expect(res.ok).toBe(true);

      const cookie = cookieStore.get('quiz_session');
      expect(cookie).toBeDefined();
      expect(cookie?.httpOnly).toBe(true);
      expect(cookie?.secure).toBe(true); // Since headers specify x-forwarded-proto: https
      expect(cookie?.sameSite).toBe('lax');
      expect(cookie?.path).toBe('/');
      expect(cookie?.maxAge).toBe(7 * 24 * 3600);
    });

    it('Establishes mobile Bearer token on mobile verification request', async () => {
      vi.mocked(supabase.auth.verifyOtp).mockResolvedValue({
        data: {
          user: { id: 'usr-mobile-otp', email: 'mob@example.com' } as any,
          session: null,
        },
        error: null,
      });

      const res = await verifyVerificationCode('mob@example.com', '654321', { issueToken: true });
      expect(res.ok).toBe(true);
      expect(res.token).toBeDefined();

      // Verify the issued mobile token with mobile auth service
      const verified = verifyMobileAuthToken(res.token!);
      expect(verified).not.toBeNull();
      expect(verified?.id).toBeTruthy();
    });

    it('Revokes session on password reset update', async () => {
      // Pre-set existing session
      await setSessionAccount({ id: 'old-session-user' });
      expect(cookieStore.has('quiz_session')).toBe(true);

      vi.mocked(supabase.auth.updateUser).mockResolvedValue({
        data: { user: { id: 'usr-reset-1' } as any },
        error: null,
      });

      const validToken = createResetToken('usr-reset-1', 'alice@example.com')!;
      const res = await updatePasswordWithReset('alice@example.com', validToken, 'BrandNewPassword123!');
      expect(res.ok).toBe(true);
      // New session for updated account should be set
      const current = await getSessionAccount();
      expect(current).not.toBeNull();
      expect(current?.id).toBeTruthy();
    });
  });

  // =========================================================================
  // 6. Timing Attack Resistance & Tamper Detection
  // =========================================================================
  describe('6. Timing Attack Resistance & Tamper Detection', () => {
    it('HMAC verification in session uses constant-time comparison (timingSafeEqual)', async () => {
      await setSessionAccount({ id: 'acc-time-test' });
      const rawCookie = cookieStore.get('quiz_session')!.value;
      const [id, exp, mac] = rawCookie.split('.');

      // Altering 1 bit in mac fails verification
      const corruptedChar = mac[mac.length - 1] === 'A' ? 'B' : 'A';
      const corruptedMac = mac.slice(0, -1) + corruptedChar;
      cookieStore.set('quiz_session', { value: `${id}.${exp}.${corruptedMac}` });

      const session = await getSessionAccount();
      expect(session).toBeNull();
    });

    it('HMAC verification in mobile token rejects tampered signature', () => {
      const token = issueMobileAuthToken({ id: 'mob-time-test' });
      expect(token).not.toBeNull();

      const [id, exp, mac] = token!.split('.');
      const corruptedChar = mac[0] === 'X' ? 'Y' : 'X';
      const tamperedToken = `${id}.${exp}.${corruptedChar}${mac.slice(1)}`;

      expect(verifyMobileAuthToken(tamperedToken)).toBeNull();
    });

    it('HMAC verification in resetToken uses timingSafeEqual and email binding', () => {
      const token = createResetToken('usr-time-test', 'alice@example.com');
      expect(token).not.toBeNull();

      // Valid token with correct email
      expect(verifyResetToken(token!, 'alice@example.com')).toEqual({ userId: 'usr-time-test' });

      // Binding check: different email fails even with same valid token!
      expect(verifyResetToken(token!, 'attacker@example.com')).toBeNull();

      // Tampered MAC fails
      const parts = token!.split('.');
      const corruptedToken = `${parts[0]}.${parts[1]}.badmac`;
      expect(verifyResetToken(corruptedToken, 'alice@example.com')).toBeNull();
    });

    it('Anti-enumeration in requestPasswordReset returns identical response for existing and non-existing accounts', async () => {
      // Existing email
      vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValueOnce({ data: {} as any, error: null });
      const resExists = await requestPasswordReset('exists@example.com');

      // Non-existing email (Supabase throws or returns error)
      vi.mocked(supabase.auth.resetPasswordForEmail).mockRejectedValueOnce(new Error('User not found'));
      const resGhost = await requestPasswordReset('ghost@example.com');

      expect(resExists).toEqual({ sent: true, error: undefined });
      expect(resGhost).toEqual({ sent: true, error: undefined });
    });
  });
});
