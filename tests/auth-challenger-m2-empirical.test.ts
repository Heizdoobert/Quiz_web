// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { createHmac } from 'crypto';
import { middleware } from '../middleware';
import { sanitizeRedirectUrl } from '../lib/utils/redirect';

const TEST_SECRET = 'challenger-m2-secret-key-32byteslong!';

function createSessionCookie(
  id: string,
  expDeltaSeconds: number = 7 * 24 * 3600,
  secret: string = TEST_SECRET
): string {
  const key = createHmac('sha256', secret).update('quiz-session').digest();
  const exp = Math.floor(Date.now() / 1000) + expDeltaSeconds;
  const payload = `${id}.${exp}`;
  const mac = createHmac('sha256', key).update(payload).digest('base64url');
  return `${payload}.${mac}`;
}

describe('Challenger M2 Empirical Stress Harness', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('SUPABASE_SECRET_KEY', TEST_SECRET);
  });

  describe('Adversarial Challenge 1: Open Redirect Boundary & Parser Evasion', () => {
    it('rejects protocol-relative URL variants', () => {
      const protocolRelativePayloads = [
        '//attacker.com',
        '//attacker.com/path',
        '//attacker.com:443/login',
        '///attacker.com',
        '////attacker.com',
        '//attacker.com?foo=bar',
        '//google.com',
      ];

      for (const payload of protocolRelativePayloads) {
        expect(sanitizeRedirectUrl(payload), `Failed to sanitize: ${payload}`).toBe('/profile');
      }
    });

    it('rejects backslash-based parser evasion attacks', () => {
      const backslashPayloads = [
        '/\\attacker.com',
        '/\\attacker.com/path',
        '/\\\\attacker.com',
        '\\attacker.com',
        '\\\\attacker.com',
        '/\\/attacker.com',
      ];

      for (const payload of backslashPayloads) {
        expect(sanitizeRedirectUrl(payload), `Failed to sanitize backslash attack: ${payload}`).toBe('/profile');
      }
    });

    it('rejects external schemes (http, https, ftp, file, etc.)', () => {
      const schemePayloads = [
        'https://phish.com',
        'http://phish.com',
        'https://attacker.com/login',
        'http://localhost:8080/evil',
        'ftp://files.attacker.com',
        'file:///etc/passwd',
      ];

      for (const payload of schemePayloads) {
        expect(sanitizeRedirectUrl(payload), `Failed to block scheme: ${payload}`).toBe('/profile');
      }
    });

    it('rejects active content schemes (javascript, data, vbscript, etc.)', () => {
      const xssPayloads = [
        'javascript:alert(1)',
        'javascript:alert(document.cookie)',
        'javascript:window.location="http://evil.com"',
        'data:text/html,<script>alert(1)</script>',
        'vbscript:msgbox(1)',
        'blob:https://evil.com/1234-uuid',
        'about:blank',
      ];

      for (const payload of xssPayloads) {
        expect(sanitizeRedirectUrl(payload), `Failed to block script injection: ${payload}`).toBe('/profile');
      }
    });

    it('rejects null, undefined, empty, and whitespace-only inputs', () => {
      expect(sanitizeRedirectUrl(null)).toBe('/profile');
      expect(sanitizeRedirectUrl(undefined)).toBe('/profile');
      expect(sanitizeRedirectUrl('')).toBe('/profile');
      expect(sanitizeRedirectUrl('   ')).toBe('/profile');
      expect(sanitizeRedirectUrl('\t\n\r')).toBe('/profile');
      expect(sanitizeRedirectUrl(' \t \n ')).toBe('/profile');
    });

    it('rejects leading whitespace disguising evil URLs', () => {
      expect(sanitizeRedirectUrl('  //attacker.com')).toBe('/profile');
      expect(sanitizeRedirectUrl('  /\\attacker.com')).toBe('/profile');
      expect(sanitizeRedirectUrl('\thttps://attacker.com')).toBe('/profile');
      expect(sanitizeRedirectUrl(' \r\njavascript:alert(1)')).toBe('/profile');
    });

    it('rejects relative path traversal without leading slash', () => {
      const traversalPayloads = [
        '../profile',
        './profile',
        'profile',
        'admin/roles',
        '....//attacker.com',
      ];

      for (const payload of traversalPayloads) {
        expect(sanitizeRedirectUrl(payload), `Failed to reject non-slash path: ${payload}`).toBe('/profile');
      }
    });

    it('preserves valid internal paths and query parameters', () => {
      const validInternalPaths = [
        '/profile',
        '/profile?tab=quizzes&view=history',
        '/admin/roles',
        '/admin/roles?sort=asc&page=2#heading',
        '/q/sample-quiz-123',
        '/search?q=biology+101',
        '/topics/javascript',
      ];

      for (const path of validInternalPaths) {
        expect(sanitizeRedirectUrl(path)).toBe(path);
      }
    });

    it('respects custom fallback targets for blocked URLs', () => {
      expect(sanitizeRedirectUrl('//evil.com', '/custom-fallback')).toBe('/custom-fallback');
      expect(sanitizeRedirectUrl(null, '/custom-fallback')).toBe('/custom-fallback');
      expect(sanitizeRedirectUrl('', '/custom-fallback')).toBe('/custom-fallback');
      expect(sanitizeRedirectUrl('https://phish.com', '/dashboard')).toBe('/dashboard');
    });
  });

  describe('Adversarial Challenge 2: Route Protection & Exclusion Matrix', () => {
    it('redirects unauthenticated requests on protected routes with HTTP 307', () => {
      const protectedRoutes = [
        'http://localhost:3000/profile',
        'http://localhost:3000/profile/',
        'http://localhost:3000/profile/settings',
        'http://localhost:3000/profile/history/2026',
        'http://localhost:3000/admin',
        'http://localhost:3000/admin/',
        'http://localhost:3000/admin/roles',
        'http://localhost:3000/admin/users/123/edit',
      ];

      for (const url of protectedRoutes) {
        const req = new NextRequest(url);
        const res = middleware(req);

        expect(res.status, `Failed status check for ${url}`).toBe(307);
        const loc = res.headers.get('location');
        expect(loc).toBeDefined();

        const parsed = new URL(loc!);
        expect(parsed.pathname).toBe('/signin');
        const expectedReturn = new URL(url).pathname;
        expect(parsed.searchParams.get('redirect')).toBe(expectedReturn);
      }
    });

    it('preserves full path and query string including complex characters in redirect URL', () => {
      const complexUrl = 'http://localhost:3000/profile?category=science&tags=astro%2Bphysics&page=3';
      const req = new NextRequest(complexUrl);
      const res = middleware(req);

      expect(res.status).toBe(307);
      const loc = res.headers.get('location');
      expect(loc).toBeDefined();

      const parsed = new URL(loc!);
      expect(parsed.pathname).toBe('/signin');
      expect(parsed.searchParams.get('redirect')).toBe('/profile?category=science&tags=astro%2Bphysics&page=3');
    });

    it('allows static asset routes through unconditionally', () => {
      const staticUrls = [
        'http://localhost:3000/_next/static/chunks/main.js',
        'http://localhost:3000/_next/image?url=%2Flogo.png&w=64&q=75',
        'http://localhost:3000/favicon.ico',
        'http://localhost:3000/images/badge.svg',
        'http://localhost:3000/public/manifest.json',
      ];

      for (const url of staticUrls) {
        const req = new NextRequest(url);
        const res = middleware(req);
        expect(res.status, `Static route blocked: ${url}`).toBe(200);
        expect(res.headers.get('location')).toBeNull();
      }
    });

    it('allows unauthenticated visitors access to public application routes', () => {
      const publicUrls = [
        'http://localhost:3000/',
        'http://localhost:3000/signin',
        'http://localhost:3000/search?q=math',
        'http://localhost:3000/q/quiz-abc-xyz',
        'http://localhost:3000/topics',
      ];

      for (const url of publicUrls) {
        const req = new NextRequest(url);
        const res = middleware(req);
        expect(res.status, `Public route blocked: ${url}`).toBe(200);
        expect(res.headers.get('location')).toBeNull();
      }
    });
  });

  describe('Adversarial Challenge 3: Session Cookie Cryptographic Robustness', () => {
    it('allows valid active session cookies on protected routes', () => {
      const cookie = createSessionCookie('usr-valid-999');
      const req = new NextRequest('http://localhost:3000/profile', {
        headers: {
          Cookie: `quiz_session=${cookie}`,
        },
      });

      const res = middleware(req);
      expect(res.status).toBe(200);
      expect(res.headers.get('location')).toBeNull();
    });

    it('rejects expired session cookies even with valid HMAC', () => {
      // Expired 60 seconds ago
      const expiredCookie = createSessionCookie('usr-valid-999', -60);
      const req = new NextRequest('http://localhost:3000/profile', {
        headers: {
          Cookie: `quiz_session=${expiredCookie}`,
        },
      });

      const res = middleware(req);
      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toContain('/signin?redirect=%2Fprofile');
    });

    it('rejects cookies signed with mismatched or wrong secret', () => {
      const rogueCookie = createSessionCookie('usr-valid-999', 3600, 'rogue-attacker-secret-key-12345');
      const req = new NextRequest('http://localhost:3000/profile', {
        headers: {
          Cookie: `quiz_session=${rogueCookie}`,
        },
      });

      const res = middleware(req);
      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toContain('/signin');
    });

    it('rejects tampered session IDs or expiration values (payload modification)', () => {
      const originalCookie = createSessionCookie('usr-original-111');
      const [id, exp, mac] = originalCookie.split('.');

      // Tamper ID
      const tamperedIdCookie = `usr-hacked-999.${exp}.${mac}`;
      const req1 = new NextRequest('http://localhost:3000/profile', {
        headers: { Cookie: `quiz_session=${tamperedIdCookie}` },
      });
      expect(middleware(req1).status).toBe(307);

      // Tamper Expiration
      const tamperedExpCookie = `${id}.${Number(exp) + 1000}.${mac}`;
      const req2 = new NextRequest('http://localhost:3000/profile', {
        headers: { Cookie: `quiz_session=${tamperedExpCookie}` },
      });
      expect(middleware(req2).status).toBe(307);
    });

    it('rejects tampered or truncated HMAC signatures', () => {
      const originalCookie = createSessionCookie('usr-valid-222');
      const [id, exp, mac] = originalCookie.split('.');

      // Bit flip in MAC
      const flippedMac = mac.slice(0, -1) + (mac.endsWith('A') ? 'B' : 'A');
      const req1 = new NextRequest('http://localhost:3000/profile', {
        headers: { Cookie: `quiz_session=${id}.${exp}.${flippedMac}` },
      });
      expect(middleware(req1).status).toBe(307);

      // Truncated MAC (buffer length mismatch test for timingSafeEqual)
      const truncatedMac = mac.slice(0, 10);
      const req2 = new NextRequest('http://localhost:3000/profile', {
        headers: { Cookie: `quiz_session=${id}.${exp}.${truncatedMac}` },
      });
      expect(middleware(req2).status).toBe(307);

      // Empty MAC
      const req3 = new NextRequest('http://localhost:3000/profile', {
        headers: { Cookie: `quiz_session=${id}.${exp}.` },
      });
      expect(middleware(req3).status).toBe(307);
    });

    it('rejects malformed cookie tokens (fuzzing syntax)', () => {
      const malformedTokens = [
        '',
        '   ',
        'randomjunk',
        'only.two',
        'four.parts.are.invalid',
        'id.nonnumericexp.mac',
        'id.NaN.mac',
        'id.-9999.mac',
        'id.0.mac',
        '.emptyid.mac',
        'id..mac',
      ];

      for (const token of malformedTokens) {
        const req = new NextRequest('http://localhost:3000/profile', {
          headers: { Cookie: `quiz_session=${token}` },
        });
        const res = middleware(req);
        expect(res.status, `Failed to reject malformed token: ${token}`).toBe(307);
        expect(res.headers.get('location')).toContain('/signin');
      }
    });

    it('fails closed when SUPABASE_SECRET_KEY is missing from environment', () => {
      vi.stubEnv('SUPABASE_SECRET_KEY', '');
      const validCookie = createSessionCookie('usr-valid-333');
      const req = new NextRequest('http://localhost:3000/profile', {
        headers: { Cookie: `quiz_session=${validCookie}` },
      });

      const res = middleware(req);
      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toContain('/signin');
    });
  });

  describe('Adversarial Challenge 4: RBAC & Permission Separation', () => {
    it('passes authenticated player through /admin to server layout (does not redirect to /signin)', () => {
      const playerCookie = createSessionCookie('player-user-777');
      const req = new NextRequest('http://localhost:3000/admin/settings', {
        headers: {
          Cookie: `quiz_session=${playerCookie}`,
        },
      });

      const res = middleware(req);
      // Middleware verifies session exists, allows request to proceed (status 200)
      // The server layout (AdminLayout) handles role authorization and rendering HTTP 403 <AdminDenied />
      expect(res.status).toBe(200);
      expect(res.headers.get('location')).toBeNull();
    });

    it('redirects unauthenticated visitor requesting /admin directly to /signin', () => {
      const req = new NextRequest('http://localhost:3000/admin/settings');
      const res = middleware(req);

      expect(res.status).toBe(307);
      const loc = res.headers.get('location');
      expect(loc).toBeDefined();
      const parsed = new URL(loc!);
      expect(parsed.pathname).toBe('/signin');
      expect(parsed.searchParams.get('redirect')).toBe('/admin/settings');
    });
  });
});
