// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { issueMobileAuthToken, verifyMobileAuthToken } from '@/lib/services/auth/mobile-auth';

// Mock Mobile Storage and Local Database Adapter simulating FlutterSecureStorage & sqflite
interface QueuedAnswer {
  questionId: string;
  answerIndex: number;
  timestamp: number;
  accountId: string;
}

class MobileClientStorageMock {
  // Simulates FlutterSecureStorage
  private secureStorage = new Map<string, string>();
  // Simulates SQLite sqflite database ('quiz_app.db')
  private sqliteAnswerQueue: QueuedAnswer[] = [];
  public sessionExpired = false;

  async saveSession(token: string, accountId: string) {
    const prevAccountId = this.secureStorage.get('account_id');
    // Account switch check (SPEC-flutter-mobile.md lines 40-44 & Survey 2 line 59)
    if (prevAccountId && prevAccountId !== accountId) {
      this.clearAllQueuedAnswers();
    }
    this.secureStorage.set('jwt_token', token);
    this.secureStorage.set('account_id', accountId);
    this.sessionExpired = false;
  }

  async getToken(): Promise<string | null> {
    return this.secureStorage.get('jwt_token') || null;
  }

  async getAccountId(): Promise<string | null> {
    return this.secureStorage.get('account_id') || null;
  }

  async handle401Unauthorized() {
    // 401 invalidates token, flags sessionExpired, but retains sqliteAnswerQueue
    this.secureStorage.delete('jwt_token');
    this.sessionExpired = true;
  }

  async enqueueAnswer(questionId: string, answerIndex: number) {
    const accountId = (await this.getAccountId()) || 'anonymous';
    this.sqliteAnswerQueue.push({
      questionId,
      answerIndex,
      timestamp: Date.now(),
      accountId,
    });
  }

  getQueuedAnswers(): QueuedAnswer[] {
    return [...this.sqliteAnswerQueue];
  }

  clearAllQueuedAnswers() {
    this.sqliteAnswerQueue = [];
  }

  async signOut() {
    this.secureStorage.clear();
    this.sessionExpired = false;
  }
}

describe('Matrix 6: Mobile Session & Local Database Handling (tests/auth-session-mobile.test.ts)', () => {
  let mobileStorage: MobileClientStorageMock;

  beforeEach(() => {
    vi.stubEnv('SUPABASE_SECRET_KEY', 'test-secret-key-mobile-1234567890');
    mobileStorage = new MobileClientStorageMock();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  describe('Tier 1: Smoke & Happy Path', () => {
    it('TC-SM-01: generates 30-day mobile Bearer token with id.exp.mac format', () => {
      const token = issueMobileAuthToken({ id: 'mob-user-001' });
      expect(token).toBeDefined();

      const parts = token!.split('.');
      expect(parts).toHaveLength(3);
      expect(parts[0]).toBe('mob-user-001');

      const exp = Number(parts[1]);
      const now = Math.floor(Date.now() / 1000);
      const expected30Days = 30 * 24 * 3600;
      // Allow slight timing tolerance (within 5 seconds)
      expect(exp - now).toBeGreaterThanOrEqual(expected30Days - 5);
      expect(exp - now).toBeLessThanOrEqual(expected30Days + 5);
    });

    it('TC-SM-02: local storage adapter stores session token and maintains offline queue', async () => {
      const token = issueMobileAuthToken({ id: 'mob-user-002' })!;
      await mobileStorage.saveSession(token, 'mob-user-002');

      expect(await mobileStorage.getToken()).toBe(token);
      expect(await mobileStorage.getAccountId()).toBe('mob-user-002');

      await mobileStorage.enqueueAnswer('q101', 2);
      const queue = mobileStorage.getQueuedAnswers();
      expect(queue).toHaveLength(1);
      expect(queue[0].questionId).toBe('q101');
      expect(queue[0].accountId).toBe('mob-user-002');
    });

    it('TC-SM-03: validates active mobile Bearer token and resolves account identity', () => {
      const token = issueMobileAuthToken({ id: 'mob-user-003' })!;
      const verified = verifyMobileAuthToken(token);

      expect(verified).toEqual({ id: 'mob-user-003' });
    });
  });

  describe('Tier 2: Lifespan & Expiration Boundaries', () => {
    it('TC-SM-07: rejects token after 30-day expiration window has elapsed', () => {
      const token = issueMobileAuthToken({ id: 'mob-user-004' })!;
      expect(verifyMobileAuthToken(token)).toEqual({ id: 'mob-user-004' });

      vi.useFakeTimers();
      // Fast forward 31 days
      vi.setSystemTime(Date.now() + 31 * 24 * 3600 * 1000);

      expect(verifyMobileAuthToken(token)).toBeNull();
    });

    it('TC-SM-08: rejects malformed or random string Bearer tokens', () => {
      expect(verifyMobileAuthToken('random-malformed-string')).toBeNull();
      expect(verifyMobileAuthToken('u1.only-two-parts')).toBeNull();
      expect(verifyMobileAuthToken('')).toBeNull();
    });
  });

  describe('Tier 3: Security & Offline Queue Isolation', () => {
    it('TC-SM-04: on HTTP 401 Unauthorized, mobile client invalidates token but preserves SQLite answer queue', async () => {
      const token = issueMobileAuthToken({ id: 'player-a' })!;
      await mobileStorage.saveSession(token, 'player-a');

      // Player queues answers offline
      await mobileStorage.enqueueAnswer('q201', 0);
      await mobileStorage.enqueueAnswer('q202', 1);
      expect(mobileStorage.getQueuedAnswers()).toHaveLength(2);

      // Server returns 401 (e.g. token expired)
      await mobileStorage.handle401Unauthorized();

      // Token deleted, user notified, but queue preserved for same-account re-login
      expect(await mobileStorage.getToken()).toBeNull();
      expect(mobileStorage.sessionExpired).toBe(true);
      expect(mobileStorage.getQueuedAnswers()).toHaveLength(2);

      // Player re-authenticates with same account
      const newToken = issueMobileAuthToken({ id: 'player-a' })!;
      await mobileStorage.saveSession(newToken, 'player-a');

      // Queue is still intact and ready to sync!
      expect(mobileStorage.getQueuedAnswers()).toHaveLength(2);
      expect(await mobileStorage.getToken()).toBe(newToken);
    });

    it('TC-SM-05: account switch purges offline queue to prevent cross-account answer leaks', async () => {
      const tokenA = issueMobileAuthToken({ id: 'player-a' })!;
      await mobileStorage.saveSession(tokenA, 'player-a');
      await mobileStorage.enqueueAnswer('q301', 3);

      expect(mobileStorage.getQueuedAnswers()).toHaveLength(1);

      // Session expires
      await mobileStorage.handle401Unauthorized();

      // Player B logs in on same device
      const tokenB = issueMobileAuthToken({ id: 'player-b' })!;
      await mobileStorage.saveSession(tokenB, 'player-b');

      // Player A's queue MUST be purged!
      expect(mobileStorage.getQueuedAnswers()).toHaveLength(0);
      expect(await mobileStorage.getAccountId()).toBe('player-b');
    });

    it('TC-SM-09: HMAC tampering detection: modifying account ID fails verification', () => {
      const token = issueMobileAuthToken({ id: 'legit-user' })!;
      const [, exp, mac] = token.split('.');
      const tampered = ['hacked-user', exp, mac].join('.');

      expect(verifyMobileAuthToken(tampered)).toBeNull();
    });
  });

  describe('Tier 4: Resilience & Edge Cases', () => {
    it('TC-SM-06: explicit sign-out completely clears local security state', async () => {
      const token = issueMobileAuthToken({ id: 'mob-user-005' })!;
      await mobileStorage.saveSession(token, 'mob-user-005');
      await mobileStorage.signOut();

      expect(await mobileStorage.getToken()).toBeNull();
      expect(await mobileStorage.getAccountId()).toBeNull();
    });

    it('TC-SM-10: returns null gracefully when server secret key is absent', () => {
      vi.stubEnv('SUPABASE_SECRET_KEY', '');

      expect(issueMobileAuthToken({ id: 'mob-user-006' })).toBeNull();
      expect(verifyMobileAuthToken('a.b.c')).toBeNull();
    });
  });
});
