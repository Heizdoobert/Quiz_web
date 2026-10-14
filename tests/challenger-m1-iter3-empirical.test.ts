// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as updatePasswordRoute } from '@/app/api/v1/auth/password/update/route';
import {
  createResetToken,
  verifyResetToken,
  clearUsedResetTokens,
  updatePasswordWithReset,
} from '@/lib/services/password-reset';
import { supabaseAdmin } from '@/lib/sdk/supabase-admin';


const TEST_SECRET = 'test-secret-key-12345678901234567890';

vi.mock('@/lib/sdk/supabase', () => ({
  supabase: {
    auth: {
      updateUser: vi.fn().mockResolvedValue({ data: { user: { id: 'usr-1' } }, error: null }),
      verifyOtp: vi.fn(),
      resetPasswordForEmail: vi.fn(),
    },
  },
}));

vi.mock('@/lib/sdk/supabase-admin', () => ({
  supabaseAdmin: {
    auth: {
      admin: {
        updateUserById: vi.fn().mockResolvedValue({
          data: { user: { id: 'usr-1', email: 'alice@example.com' } },
          error: null,
        }),
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

function postJson(url: string, body: unknown, headers?: Record<string, string>) {
  return new NextRequest(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

describe('Challenger M1 Iteration 3: Empirical Adversarial Challenge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('SUPABASE_SECRET_KEY', TEST_SECRET);
    clearUsedResetTokens();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('Probe 1: POST /api/v1/auth/password/update Route Authentication Integrity', () => {
    it('TC-CHALLENGE-I3-01: legitimate user password reset succeeds without x-admin-secret header', async () => {
      const validToken = createResetToken('usr-1', 'alice@example.com')!;
      expect(validToken).toBeTruthy();

      // End-user client resetting password with legitimate HMAC reset token
      const req = postJson('http://localhost:3000/api/v1/auth/password/update', {
        email: 'alice@example.com',
        resetToken: validToken,
        newPassword: 'BrandNewSecurePass123!',
      });

      const res = await updatePasswordRoute(req);
      const json = await res.json();

      // Per PROJECT.md and remediation tasks, cryptographic reset tokens must authenticate the request
      // without requiring x-admin-secret or PRIVATE_RESET_KEY.
      expect(res.status, 'Route rejected legitimate user request (likely due to residual admin secret requirement)').toBe(200);
      expect(json.success).toBe(true);
    });

    it('TC-CHALLENGE-I3-02: route rejects missing or empty parameters with 400 VALIDATION_ERROR', async () => {
      const req = postJson('http://localhost:3000/api/v1/auth/password/update', {
        email: 'alice@example.com',
        resetToken: '',
        newPassword: '',
      });

      const res = await updatePasswordRoute(req);
      const json = await res.json();
      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('VALIDATION_ERROR');
    });

    it('TC-CHALLENGE-I3-03: route enforces single-use token over HTTP (replay is rejected with 401)', async () => {
      // First ensure admin secret is provided if route currently requires it, so we can test HTTP replay
      vi.stubEnv('PRIVATE_RESET_KEY', 'temp-key');
      const token = createResetToken('usr-1', 'alice@example.com')!;

      const req1 = postJson('http://localhost:3000/api/v1/auth/password/update', {
        email: 'alice@example.com',
        resetToken: token,
        newPassword: 'BrandNewSecurePass123!',
      }, { 'x-admin-secret': 'temp-key' });

      const res1 = await updatePasswordRoute(req1);
      expect(res1.status).toBe(200);

      // Replay over HTTP
      const req2 = postJson('http://localhost:3000/api/v1/auth/password/update', {
        email: 'alice@example.com',
        resetToken: token,
        newPassword: 'AnotherPassword123!',
      }, { 'x-admin-secret': 'temp-key' });

      const res2 = await updatePasswordRoute(req2);
      expect(res2.status).toBe(401);
      const json2 = await res2.json();
      expect(json2.success).toBe(false);
      expect(json2.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('Probe 2: Token Replay Invariant Across Prefixes and Concurrency', () => {
    it('TC-CHALLENGE-I3-04: cannot consume unprefixed then prefixed token', async () => {
      const token = createResetToken('usr-1', 'alice@example.com')!;
      expect(token.startsWith('rst-')).toBe(true);
      const rawToken = token.slice(4);

      // Consume unprefixed form first
      const res1 = await updatePasswordWithReset('alice@example.com', rawToken, 'Pass123456!');
      expect(res1.ok).toBe(true);

      // Attempt replay with prefixed form
      const res2 = await updatePasswordWithReset('alice@example.com', token, 'Pass123456!');
      expect(res2.ok).toBe(false);
      expect(verifyResetToken(token, 'alice@example.com')).toBeNull();
      expect(verifyResetToken(rawToken, 'alice@example.com')).toBeNull();
    });

    it('TC-CHALLENGE-I3-05: concurrent resets with 5 simultaneous requests permit exactly 1 success', async () => {
      const token = createResetToken('usr-1', 'alice@example.com')!;

      vi.mocked(supabaseAdmin.auth.admin.updateUserById).mockImplementation(async () => {
        await new Promise((r) => setTimeout(r, 15));
        return { data: { user: { id: 'usr-1', email: 'alice@example.com' } as any }, error: null };
      });

      const promises = Array.from({ length: 5 }, (_, i) =>
        updatePasswordWithReset('alice@example.com', token, `ConcurrentPass${i}123!`)
      );

      const results = await Promise.all(promises);
      const successes = results.filter((r) => r.ok).length;
      expect(successes).toBe(1);
    });
  });
});
