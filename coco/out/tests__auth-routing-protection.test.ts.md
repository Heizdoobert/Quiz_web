# tests/auth-routing-protection.test.ts
lines:156 exports:
---
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { createHmac } from 'crypto';

const TEST_SECRET = 'test-secret-key-routing-1234567890';

function createValidSessionCookie(id: string, secret: string = TEST_SECRET): string {
  const key = createHmac('sha256', secret).update('quiz-session').digest();
  const exp = Math.floor(Date.now() / 1000) + 7 * 24 * 3600;
  const payload = `${id}.${exp}`;
  const mac = createHmac('sha256', key).update(payload).digest('base64url');
  return `${payload}.${mac}`;
}

import { middleware } from '../middleware';
import { sanitizeRedirectUrl } from '../lib/utils/redirect';

const runMiddleware = (req: NextRequest) => {
  return middleware(req);
};

describe('Matrix 7: Route Protection & Redirection (tests/auth-routing-protection.test.ts)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('SUPABASE_SECRET_KEY', TEST_SECRET);
  });

  describe('Tier 1: Smoke & Happy Path', () => {
    it('TC-PRT-02: allows authenticated requests to /profile with valid session cookie', () => {
      const req = new NextRequest('http://localhost:3000/profile', {
        headers: {
          Cookie: `quiz_session=${createValidSessionCookie('usr-profile-001')}`,
        },
      });

      const res = runMiddleware(req);
      expect(res.status).toBe(200); // NextResponse.next()
      expect(res.headers.get('location')).toBeNull();
    });
