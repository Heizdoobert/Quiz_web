// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  setSessionAccount,
  getSessionAccount,
  clearSessionAccount,
} from '@/lib/services/auth/session';
import { createHmac } from 'crypto';

// In-memory cookie store simulating Next.js cookie jar
const cookieStore = new Map<string, { value: string; [key: string]: unknown }>();
let currentHeaders = new Headers({ host: 'localhost:3000', 'x-forwarded-proto': 'http' });

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
  headers: vi.fn(async () => currentHeaders),
}));

const TEST_SECRET = 'test-secret-key-12345678901234567890';

function makeValidCookieValue(id: string, expSecondsFromNow: number, secret: string = TEST_SECRET): string {
  const key = createHmac('sha256', secret).update('quiz-session').digest();
  const exp = Math.floor(Date.now() / 1000) + expSecondsFromNow;
  const payload = `${id}.${exp}`;
  const mac = createHmac('sha256', key).update(payload).digest('base64url');
  return `${payload}.${mac}`;
}

describe('Matrix 5: Web HTTP-Only Cookie Session (tests/auth-session-web.test.ts)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cookieStore.clear();
    currentHeaders = new Headers({ host: 'localhost:3000', 'x-forwarded-proto': 'http' });
    vi.stubEnv('SUPABASE_SECRET_KEY', TEST_SECRET);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('Tier 1: Smoke & Happy Path', () => {
    it('TC-SW-01: sets quiz_session cookie with strict security flags (httpOnly, sameSite, path, maxAge)', async () => {
      currentHeaders = new Headers({ host: 'example.com', 'x-forwarded-proto': 'https' });

      const ok = await setSessionAccount({ id: 'acc-web-001' });
      expect(ok).toBe(true);

      const cookie = cookieStore.get('quiz_session');
      expect(cookie).toBeDefined();
      expect(cookie?.httpOnly).toBe(true);
      expect(cookie?.sameSite).toBe('lax');
      expect(cookie?.path).toBe('/');
      expect(cookie?.maxAge).toBe(7 * 24 * 3600);
      expect(cookie?.secure).toBe(true);
    });

    it('TC-SW-04: clears session cookie upon sign-out', async () => {
      await setSessionAccount({ id: 'acc-web-001' });
      expect(cookieStore.has('quiz_session')).toBe(true);

      await clearSessionAccount();
      expect(cookieStore.has('quiz_session')).toBe(false);

      const session = await getSessionAccount();
      expect(session).toBeNull();
    });

    it('TC-SW-06: successfully retrieves session account from valid cookie', async () => {
      await setSessionAccount({ id: 'acc-web-002' });
      const session = await getSessionAccount();

      expect(session).toEqual({ id: 'acc-web-002' });
    });
  });

  describe('Tier 2: Boundaries & Expiration', () => {
    it('TC-SW-03: rejects cookie whose expiration timestamp has passed', async () => {
      const expiredValue = makeValidCookieValue('acc-web-003', -100); // 100 seconds in the past
      cookieStore.set('quiz_session', { value: expiredValue });

      const session = await getSessionAccount();
      expect(session).toBeNull();
    });

    it('TC-SW-10: accepts cookie near future expiration window', async () => {
      const nearFutureValue = makeValidCookieValue('acc-web-004', 3600); // 1 hour remaining
      cookieStore.set('quiz_session', { value: nearFutureValue });

      const session = await getSessionAccount();
      expect(session).toEqual({ id: 'acc-web-004' });
    });
  });

  describe('Tier 3: Security & Tamper Resistance', () => {
    it('TC-SW-02: detects tampering: modified account ID fails HMAC verification via timingSafeEqual', async () => {
      const validValue = makeValidCookieValue('attacker-target', 3600);
      const [, exp, mac] = validValue.split('.');
      const tamperedValue = `admin-account.${exp}.${mac}`;

      cookieStore.set('quiz_session', { value: tamperedValue });
      const session = await getSessionAccount();

      expect(session).toBeNull();
    });

    it('TC-SW-05: httpOnly guard ensures session cookie cannot be accessed via client-side script simulation', async () => {
      await setSessionAccount({ id: 'acc-web-protected' });
      const cookie = cookieStore.get('quiz_session');

      // httpOnly flag must be explicitly true
      expect(cookie?.httpOnly).toBe(true);
    });

    it('TC-SW-07: rejects cookies signed with forged or rotated secret key', async () => {
      const forgedValue = makeValidCookieValue('acc-web-005', 3600, 'wrong-secret-key-attacker');
      cookieStore.set('quiz_session', { value: forgedValue });

      const session = await getSessionAccount();
      expect(session).toBeNull();
    });
  });

  describe('Tier 4: Error Handling & Resilience', () => {
    it('TC-SW-08: safely handles malformed cookie values (missing parts, empty, non-numeric exp)', async () => {
      cookieStore.set('quiz_session', { value: '' });
      expect(await getSessionAccount()).toBeNull();

      cookieStore.set('quiz_session', { value: 'single-part' });
      expect(await getSessionAccount()).toBeNull();

      cookieStore.set('quiz_session', { value: 'acc.not-a-number.fake-mac' });
      expect(await getSessionAccount()).toBeNull();

      cookieStore.set('quiz_session', { value: 'acc.12345' });
      expect(await getSessionAccount()).toBeNull();
    });

    it('TC-SW-09: fails closed when server secret key is missing', async () => {
      vi.stubEnv('SUPABASE_SECRET_KEY', '');

      const setOk = await setSessionAccount({ id: 'acc-web-006' });
      expect(setOk).toBe(false);

      cookieStore.set('quiz_session', { value: makeValidCookieValue('acc-web-006', 3600) });
      const session = await getSessionAccount();
      expect(session).toBeNull();
    });
  });
});
