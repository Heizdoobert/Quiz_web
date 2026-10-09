import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { issueMobileAuthToken, verifyMobileAuthToken } from '@/lib/services/mobile-auth';

describe('mobile auth tokens', () => {
  beforeEach(() => {
    vi.stubEnv('SUPABASE_SECRET_KEY', 'test-secret');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it('round-trips an account', () => {
    const token = issueMobileAuthToken({ id: 'u1' })!;
    expect(verifyMobileAuthToken(token)).toEqual({ id: 'u1' });
  });

  it('rejects a token whose account id was edited', () => {
    const [, exp, mac] = issueMobileAuthToken({ id: 'u1' })!.split('.');
    expect(verifyMobileAuthToken(['u2', exp, mac].join('.'))).toBeNull();
  });

  it('rejects an expired token and a malformed one', () => {
    const token = issueMobileAuthToken({ id: 'u1' })!;
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 31 * 24 * 3600 * 1000);
    expect(verifyMobileAuthToken(token)).toBeNull();
    expect(verifyMobileAuthToken('not-a-token')).toBeNull();
  });

  it('issues nothing when the server secret is missing', () => {
    vi.stubEnv('SUPABASE_SECRET_KEY', '');
    expect(issueMobileAuthToken({ id: 'u1' })).toBeNull();
    expect(verifyMobileAuthToken('a.b.c')).toBeNull();
  });
});
