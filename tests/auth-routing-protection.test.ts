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

    it('TC-PRT-05: allows unauthenticated visitors to access public routes', () => {
      const publicUrls = [
        'http://localhost:3000/',
        'http://localhost:3000/q/sample-quiz-123',
        'http://localhost:3000/search?q=math',
        'http://localhost:3000/topics',
      ];

      for (const url of publicUrls) {
        const req = new NextRequest(url);
        const res = runMiddleware(req);
        expect(res.status).toBe(200);
        expect(res.headers.get('location')).toBeNull();
      }
    });
  });

  describe('Tier 2: Boundary & Static Asset Exclusion', () => {
    it('TC-PRT-06: static assets bypass route protection completely', () => {
      const staticUrls = [
        'http://localhost:3000/_next/static/chunks/app.js',
        'http://localhost:3000/favicon.ico',
        'http://localhost:3000/images/logo.png',
      ];

      for (const url of staticUrls) {
        const req = new NextRequest(url);
        const res = runMiddleware(req);
        expect(res.status).toBe(200);
        expect(res.headers.get('location')).toBeNull();
      }
    });

    it('TC-PRT-07: preserves full return path and query parameters in redirect URL', () => {
      const req = new NextRequest('http://localhost:3000/profile?tab=quizzes&view=history');
      const res = runMiddleware(req);

      expect(res.status).toBe(307);
      const location = res.headers.get('location');
      expect(location).toBeDefined();

      const parsed = new URL(location!);
      expect(parsed.pathname).toBe('/signin');
      expect(parsed.searchParams.get('redirect')).toBe('/profile?tab=quizzes&view=history');
    });
  });

  describe('Tier 3: Security & Admin RBAC Redirection', () => {
    it('TC-PRT-01: redirects unauthenticated requests to /profile with HTTP 307 to /signin', () => {
      const req = new NextRequest('http://localhost:3000/profile');
      const res = runMiddleware(req);

      expect(res.status).toBe(307);
      const location = res.headers.get('location');
      expect(location).toContain('/signin?redirect=%2Fprofile');
    });

    it('TC-PRT-03: redirects unauthenticated requests to /admin with HTTP 307 to /signin', () => {
      const req = new NextRequest('http://localhost:3000/admin/roles');
      const res = runMiddleware(req);

      expect(res.status).toBe(307);
      const location = res.headers.get('location');
      expect(location).toContain('/signin?redirect=%2Fadmin%2Froles');
    });

    it('TC-PRT-04: authenticated requests to /admin pass middleware to server layout for 403 RBAC evaluation', () => {
      // Authenticated player (non-admin) session passes middleware (does NOT redirect to /signin)
      // because authentication is valid; downstream authorization layer will enforce 403 Forbidden
      const req = new NextRequest('http://localhost:3000/admin/roles', {
        headers: {
          Cookie: `quiz_session=${createValidSessionCookie('player-user-id')}`,
        },
      });

      const res = runMiddleware(req);
      expect(res.status).toBe(200); // Allowed through to server layout
      expect(res.headers.get('location')).toBeNull();
    });

    it('TC-PRT-08: open redirect defense: sanitizes external redirect targets', () => {
      // Attacker passes evil redirect URLs
      expect(sanitizeRedirectUrl('https://evil.com/phish')).toBe('/profile');
      expect(sanitizeRedirectUrl('http://attacker.com')).toBe('/profile');
      expect(sanitizeRedirectUrl('//evil.com/bypass')).toBe('/profile');
      expect(sanitizeRedirectUrl('javascript:alert(1)')).toBe('/profile');

      // Valid internal relative path is preserved
      expect(sanitizeRedirectUrl('/profile?tab=quizzes')).toBe('/profile?tab=quizzes');
      expect(sanitizeRedirectUrl('/admin/dashboard')).toBe('/admin/dashboard');
    });
  });

  describe('Tier 4: Resilience & Corrupted Cookie Handling', () => {
    it('TC-PRT-09: corrupted or tampered session cookies are treated as unauthenticated and redirected to /signin', () => {
      const corruptedCookies = [
        'invalid.cookie',
        'usr.9999999999.badmac',
        '',
      ];

      for (const cookie of corruptedCookies) {
        const req = new NextRequest('http://localhost:3000/profile', {
          headers: {
            Cookie: `quiz_session=${cookie}`,
          },
        });

        const res = runMiddleware(req);
        expect(res.status).toBe(307);
        expect(res.headers.get('location')).toContain('/signin');
      }
    });
  });
});
