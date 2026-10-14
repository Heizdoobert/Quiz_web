// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createResetToken,
  verifyResetToken,
  clearUsedResetTokens,
  requestPasswordReset,
  verifyPasswordResetCode,
  updatePasswordWithReset,
} from '@/lib/services/password-reset';
import {
  signUpWithEmail,
  signInWithEmail,
} from '@/lib/services/credentials';
import { supabase } from '@/lib/sdk/supabase';
import { supabaseAdmin } from '@/lib/sdk/supabase-admin';
import * as rateLimitModule from '@/lib/services/rate-limit';
import { createHmac, createHash } from 'node:crypto';

// In-memory cookie jar mock for server actions
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
        updateUserById: vi.fn().mockResolvedValue({ data: { user: { id: 'usr-reset-1', email: 'alice@example.com' } }, error: null }),
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

function makeValidHmacToken(userId: string, email: string, expOffsetSeconds = 900, secretKey = TEST_SECRET): string {
  const key = createHmac('sha256', secretKey).update('quiz-password-reset').digest();
  const exp = Math.floor(Date.now() / 1000) + expOffsetSeconds;
  const emailDigest = createHash('sha256').update(email.trim().toLowerCase()).digest('hex');
  const payload = `${userId}.${exp}.${emailDigest}`;
  const mac = createHmac('sha256', key).update(payload).digest('base64url');
  return `rst-${userId}.${exp}.${mac}`;
}

describe('Challenger M1 Iteration 2: Empirical Stress Verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cookieStore.clear();
    requestHeaders = new Headers({ host: 'localhost:3000', 'x-forwarded-proto': 'https' });
    vi.stubEnv('SUPABASE_SECRET_KEY', TEST_SECRET);
    vi.mocked(rateLimitModule.allowAttempt).mockResolvedValue(true);
    vi.mocked(rateLimitModule.allowAttemptFromIp).mockResolvedValue(true);
    clearUsedResetTokens();

    vi.mocked(supabaseAdmin.auth.admin.updateUserById).mockResolvedValue({
      data: { user: { id: 'usr-reset-1', email: 'alice@example.com' } as any },
      error: null,
    });
    vi.mocked(supabase.auth.updateUser).mockResolvedValue({
      data: { user: { id: 'usr-reset-1' } as any },
      error: null,
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // =========================================================================
  // 1. Token Tampering Stress Tests
  // =========================================================================
  describe('1. Token Tampering Stress Tests', () => {
    it('TC-CHALLENGE-01: rejects token with tampered userId in payload', async () => {
      const validToken = makeValidHmacToken('usr-attacker', 'alice@example.com');
      // Attacker replaces their userId with victim's userId
      const parts = validToken.slice(4).split('.');
      const tamperedToken = `rst-usr-victim.${parts[1]}.${parts[2]}`;

      const res = verifyResetToken(tamperedToken, 'alice@example.com');
      expect(res).toBeNull();

      const updateRes = await updatePasswordWithReset('alice@example.com', tamperedToken, 'NewSecurePass123!');
      expect(updateRes.ok).toBe(false);
      expect((updateRes as any).error).toBe('UNAUTHORIZED');
    });

    it('TC-CHALLENGE-02: rejects token with tampered expiration timestamp', () => {
      const validToken = makeValidHmacToken('usr-reset-1', 'alice@example.com', 60);
      const parts = validToken.slice(4).split('.');
      // Attacker extends expiration to year 2099
      const tamperedExp = String(Math.floor(Date.now() / 1000) + 99999999);
      const tamperedToken = `rst-${parts[0]}.${tamperedExp}.${parts[2]}`;

      expect(verifyResetToken(tamperedToken, 'alice@example.com')).toBeNull();
    });

    it('TC-CHALLENGE-03: rejects token verified with mismatched email binding', () => {
      const validToken = makeValidHmacToken('usr-reset-1', 'alice@example.com');

      // Attempting to use Alice's token for Bob or attacker
      expect(verifyResetToken(validToken, 'bob@example.com')).toBeNull();
      expect(verifyResetToken(validToken, 'attacker@example.com')).toBeNull();
      expect(verifyResetToken(validToken, 'alice@another.com')).toBeNull();
    });

    it('TC-CHALLENGE-04: rejects HMAC signature bit flips, truncation, and byte injection', () => {
      const validToken = makeValidHmacToken('usr-reset-1', 'alice@example.com');
      const parts = validToken.slice(4).split('.');
      const mac = parts[2];

      // Single character flip at start, middle, and end
      const flipStart = (mac[0] === 'a' ? 'b' : 'a') + mac.slice(1);
      const flipEnd = mac.slice(0, -1) + (mac[mac.length - 1] === 'z' ? 'y' : 'z');
      const flipMid = mac.slice(0, 10) + 'X' + mac.slice(11);

      expect(verifyResetToken(`rst-${parts[0]}.${parts[1]}.${flipStart}`, 'alice@example.com')).toBeNull();
      expect(verifyResetToken(`rst-${parts[0]}.${parts[1]}.${flipEnd}`, 'alice@example.com')).toBeNull();
      expect(verifyResetToken(`rst-${parts[0]}.${parts[1]}.${flipMid}`, 'alice@example.com')).toBeNull();

      // Truncated MAC
      expect(verifyResetToken(`rst-${parts[0]}.${parts[1]}.${mac.slice(0, -1)}`, 'alice@example.com')).toBeNull();
      expect(verifyResetToken(`rst-${parts[0]}.${parts[1]}.${mac.slice(0, 10)}`, 'alice@example.com')).toBeNull();

      // Appended bytes to MAC
      expect(verifyResetToken(`rst-${parts[0]}.${parts[1]}.${mac}extra`, 'alice@example.com')).toBeNull();
    });

    it('TC-CHALLENGE-05: handles malformed token structures gracefully without throwing', () => {
      const malformedCases = [
        '',
        '   ',
        'rst-',
        'rst-onlyonepart',
        'rst-two.parts',
        'rst-too.many.parts.here.extra',
        '..',
        '...',
        'rst-user.notanumber.mac',
        'rst-user.NaN.mac',
        'rst-\0.\0.\0',
        'rst-user.12345.\u0000badmac',
      ];

      for (const malformed of malformedCases) {
        expect(() => verifyResetToken(malformed, 'alice@example.com')).not.toThrow();
        expect(verifyResetToken(malformed, 'alice@example.com')).toBeNull();
      }
    });

    it('TC-CHALLENGE-06: fails closed when SUPABASE_SECRET_KEY is absent', () => {
      vi.stubEnv('SUPABASE_SECRET_KEY', '');
      expect(createResetToken('usr-1', 'alice@example.com')).toBeNull();

      const validToken = makeValidHmacToken('usr-1', 'alice@example.com');
      expect(verifyResetToken(validToken, 'alice@example.com')).toBeNull();
    });
  });

  // =========================================================================
  // 2. Signature Forgery Stress Tests
  // =========================================================================
  describe('2. Signature Forgery Stress Tests', () => {
    it('TC-CHALLENGE-07: rejects signatures forged with arbitrary or weak secrets', () => {
      const attackerSecrets = [
        'attacker-secret-key-1234567890',
        'default-secret',
        'quiz-secret',
        'secret',
        '',
      ];

      for (const secret of attackerSecrets) {
        const forgedToken = makeValidHmacToken('usr-reset-1', 'alice@example.com', 900, secret);
        expect(verifyResetToken(forgedToken, 'alice@example.com')).toBeNull();
      }
    });

    it('TC-CHALLENGE-08: rejects signatures computed without the quiz-password-reset subkey context', () => {
      // Attacker signs payload directly with process.env.SUPABASE_SECRET_KEY without hashing with 'quiz-password-reset'
      const exp = Math.floor(Date.now() / 1000) + 900;
      const emailDigest = createHash('sha256').update('alice@example.com').digest('hex');
      const payload = `usr-reset-1.${exp}.${emailDigest}`;
      const naiveMac = createHmac('sha256', TEST_SECRET).update(payload).digest('base64url');
      const naiveToken = `rst-usr-reset-1.${exp}.${naiveMac}`;

      expect(verifyResetToken(naiveToken, 'alice@example.com')).toBeNull();
    });
  });

  // =========================================================================
  // 3. Expired Timestamps Stress Tests
  // =========================================================================
  describe('3. Expired Timestamps Stress Tests', () => {
    it('TC-CHALLENGE-09: rejects token expired by exactly 1 second', () => {
      const expiredToken = makeValidHmacToken('usr-reset-1', 'alice@example.com', -1);
      expect(verifyResetToken(expiredToken, 'alice@example.com')).toBeNull();
    });

    it('TC-CHALLENGE-10: rejects token with zero or negative epoch timestamps', () => {
      const key = createHmac('sha256', TEST_SECRET).update('quiz-password-reset').digest();
      const emailDigest = createHash('sha256').update('alice@example.com').digest('hex');

      for (const exp of [0, -1000, -86400]) {
        const payload = `usr-reset-1.${exp}.${emailDigest}`;
        const mac = createHmac('sha256', key).update(payload).digest('base64url');
        const token = `rst-usr-reset-1.${exp}.${mac}`;
        expect(verifyResetToken(token, 'alice@example.com')).toBeNull();
      }
    });

    it('TC-CHALLENGE-11: accepts valid token within unexpired window', () => {
      const freshToken = makeValidHmacToken('usr-reset-1', 'alice@example.com', 30);
      expect(verifyResetToken(freshToken, 'alice@example.com')).toEqual({ userId: 'usr-reset-1' });
    });
  });

  // =========================================================================
  // 4. Replay Attacks & Canonicalization Vulnerability Tests
  // =========================================================================
  describe('4. Replay Attacks & Canonicalization', () => {
    it('TC-CHALLENGE-12: rejects exact sequential replay with identical token', async () => {
      const token = createResetToken('usr-reset-1', 'alice@example.com')!;
      expect(token).toBeTruthy();

      const firstUse = await updatePasswordWithReset('alice@example.com', token, 'FirstPassword123!');
      expect(firstUse.ok).toBe(true);

      const replayAttempt = await updatePasswordWithReset('alice@example.com', token, 'SecondPassword123!');
      expect(replayAttempt.ok).toBe(false);
      expect((replayAttempt as any).error).toBe('UNAUTHORIZED');
    });

    it('TC-CHALLENGE-13 (VULNERABILITY PROBE): checks if stripping/adding prefix allows token replay', async () => {
      const token = createResetToken('usr-reset-1', 'alice@example.com')!;
      expect(token.startsWith('rst-')).toBe(true);

      // Consume the token with 'rst-' prefix
      const firstUse = await updatePasswordWithReset('alice@example.com', token, 'FirstPassword123!');
      expect(firstUse.ok).toBe(true);

      // Now attempt replay by stripping the 'rst-' prefix:
      const strippedToken = token.slice(4);

      // Does verifyResetToken reject or accept the stripped token?
      const verifyAfterConsume = verifyResetToken(strippedToken, 'alice@example.com');
      
      // Attempt replay password update with stripped prefix:
      const replayResult = await updatePasswordWithReset('alice@example.com', strippedToken, 'AttackerPassword123!');

      // An airtight single-use token system MUST reject replay regardless of prefix formatting:
      // If replayResult.ok === true, this empirically PROVES the prefix-stripping replay vulnerability!
      const isReplayVulnerable = replayResult.ok === true || verifyAfterConsume !== null;
      expect(isReplayVulnerable, 'VULNERABILITY DETECTED: Token can be replayed by stripping rst- prefix!').toBe(false);
    });

    it('TC-CHALLENGE-14 (VULNERABILITY PROBE): checks for check-then-act race window in concurrent resets', async () => {
      const token = createResetToken('usr-reset-1', 'alice@example.com')!;

      vi.mocked(supabaseAdmin.auth.admin.updateUserById).mockImplementation(async () => {
        await new Promise((r) => setTimeout(r, 20));
        return { data: { user: { id: 'usr-reset-1', email: 'alice@example.com' } as any }, error: null };
      });

      // Fire 2 concurrent password resets with the exact same token
      const [res1, res2] = await Promise.all([
        updatePasswordWithReset('alice@example.com', token, 'PassConcurrent1!'),
        updatePasswordWithReset('alice@example.com', token, 'PassConcurrent2!'),
      ]);

      // Exactly ONE request should succeed; the concurrent duplicate MUST be rejected
      const successes = [res1.ok, res2.ok].filter(Boolean).length;
      expect(successes, 'VULNERABILITY DETECTED: Concurrent requests both succeeded with the same single-use token!').toBe(1);
    });
  });

  // =========================================================================
  // 5. Malformed Email Inputs & Inconsistencies
  // =========================================================================
  describe('5. Malformed Email Inputs & Inconsistencies', () => {
    const malformedEmails = [
      '@nodomain.com',
      'user@.com',
      'user name@domain.com',
      'user@domain',
      'user@',
      'user@domain,com',
      'plainaddress',
      'user@@domain.com',
    ];

    it('TC-CHALLENGE-15: signUpWithEmail rejects all malformed emails before auth call', async () => {
      for (const email of malformedEmails) {
        const res = await signUpWithEmail(email, 'ValidPass123!');
        expect(res.ok, `signUpWithEmail should reject "${email}"`).toBe(false);
        if (!res.ok) {
          expect(res.error).toBe('Invalid email address.');
        }
      }
      expect(supabase.auth.signUp).not.toHaveBeenCalled();
    });

    it('TC-CHALLENGE-16: signInWithEmail rejects all malformed emails before auth call', async () => {
      for (const email of malformedEmails) {
        const res = await signInWithEmail(email, 'ValidPass123!');
        expect(res.ok, `signInWithEmail should reject "${email}"`).toBe(false);
        if (!res.ok) {
          expect(res.error).toBe('Invalid email address.');
        }
      }
      expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
    });

    it('TC-CHALLENGE-17: verifyPasswordResetCode rejects malformed emails via RESET_EMAIL_RE', async () => {
      for (const email of malformedEmails) {
        const res = await verifyPasswordResetCode(email, '123456');
        expect(res.ok, `verifyPasswordResetCode should reject "${email}"`).toBe(false);
      }
      expect(supabase.auth.verifyOtp).not.toHaveBeenCalled();
    });

    it('TC-CHALLENGE-18 (DEFECT PROBE): requestPasswordReset email validation consistency with RESET_EMAIL_RE', async () => {
      // In lib/services/password-reset.ts, requestPasswordReset checks !trimmed.includes('@')
      // instead of RESET_EMAIL_RE.test(trimmed), accepting malformed emails like 'user@domain' or 'user@'
      const malformedWithAt = ['user@domain', 'user@', '@nodomain.com', 'user@.com'];

      for (const email of malformedWithAt) {
        vi.clearAllMocks();
        vi.mocked(rateLimitModule.allowAttempt).mockResolvedValue(true);
        vi.mocked(rateLimitModule.allowAttemptFromIp).mockResolvedValue(true);

        const res = await requestPasswordReset(email);
        // A strictly validated service should reject malformed emails with { ok: false, sent: false, error: 'Invalid email' }
        // If it accepted the email and called resetPasswordForEmail, it is inconsistent with RESET_EMAIL_RE:
        expect(res.ok, `DEFECT: requestPasswordReset accepted malformed email "${email}"`).toBe(false);
      }
    });

    it('TC-CHALLENGE-19: Email normalization is case-insensitive and trims surrounding whitespace', () => {
      const token1 = createResetToken('usr-reset-1', '  ALICE@EXAMPLE.COM  ')!;
      expect(verifyResetToken(token1, 'alice@example.com')).toEqual({ userId: 'usr-reset-1' });

      const token2 = createResetToken('usr-reset-1', 'alice@example.com')!;
      expect(verifyResetToken(token2, '  Alice@Example.Com  ')).toEqual({ userId: 'usr-reset-1' });
    });
  });

  // =========================================================================
  // 6. Rate-Limit Boundaries Stress Tests
  // =========================================================================
  describe('6. Rate-Limit Boundaries Stress Tests', () => {
    it('TC-CHALLENGE-20: requestPasswordReset enforces exactly 5 attempts per hour per email', async () => {
      let callCount = 0;
      vi.mocked(rateLimitModule.allowAttempt).mockImplementation(async (scope) => {
        if (scope === 'password-reset') {
          callCount++;
          return callCount <= 5;
        }
        return true;
      });

      // 5 allowed calls
      for (let i = 1; i <= 5; i++) {
        const res = await requestPasswordReset('rate@example.com');
        expect(res.ok).toBe(true);
      }

      // 6th call rejected
      const limitedRes = await requestPasswordReset('rate@example.com');
      expect(limitedRes.ok).toBe(false);
      expect(limitedRes.error).toBe('RATE_LIMITED');
    });

    it('TC-CHALLENGE-21: requestPasswordReset enforces IP rate limit of 20 attempts per hour', async () => {
      vi.mocked(rateLimitModule.allowAttempt).mockResolvedValue(true);
      let ipCount = 0;
      vi.mocked(rateLimitModule.allowAttemptFromIp).mockImplementation(async (scope) => {
        if (scope === 'password-reset-ip') {
          ipCount++;
          return ipCount <= 20;
        }
        return true;
      });

      for (let i = 1; i <= 20; i++) {
        const res = await requestPasswordReset(`user${i}@example.com`);
        expect(res.ok).toBe(true);
      }

      // 21st attempt blocked by IP rate limit
      const blockedRes = await requestPasswordReset('user21@example.com');
      expect(blockedRes.ok).toBe(false);
      expect(blockedRes.error).toBe('RATE_LIMITED');
    });

    it('TC-CHALLENGE-22: verifyPasswordResetCode enforces rate limit of 10 attempts per hour', async () => {
      let verifyAttempts = 0;
      vi.mocked(rateLimitModule.allowAttempt).mockImplementation(async (scope) => {
        if (scope === 'password-reset-verify' || scope === 'reset-verify') {
          verifyAttempts++;
          return verifyAttempts <= 10;
        }
        return true;
      });

      vi.mocked(supabase.auth.verifyOtp).mockResolvedValue({
        data: { user: { id: 'usr-1' } as any, session: null },
        error: null,
      });

      for (let i = 1; i <= 10; i++) {
        const res = await verifyPasswordResetCode('rate@example.com', '123456');
        expect(res.ok).toBe(true);
      }

      // 11th attempt blocked
      const blockedRes = await verifyPasswordResetCode('rate@example.com', '123456');
      expect(blockedRes.ok).toBe(false);
      expect(blockedRes.error).toBe('RATE_LIMITED');
    });
  });
});
