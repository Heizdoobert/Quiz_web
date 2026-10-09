import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  issueMobileAuthToken,
  issueMobileNonceToken,
  verifyMobileAuthToken,
  verifyMobileNonceToken,
  verifyMobileSiwe,
} from '@/lib/services/mobile-auth';
import { publicClientFor } from '@/lib/services/chain';

vi.mock('@/lib/services/chain', () => ({ publicClientFor: vi.fn() }));

const ADDRESS = '0x1234567890AbCdEf1234567890aBcDeF12345678';

function siwe(nonce: string, address = ADDRESS) {
  return [
    'quiz.player.quiz wants you to sign in with your Ethereum account:',
    address,
    '',
    'Sign in to Quick Quiz so your answers count.',
    '',
    'URI: https://quiz.player.quiz',
    'Version: 1',
    'Chain ID: 1',
    `Nonce: ${nonce}`,
    'Issued At: 2026-01-01T00:00:00.000Z',
  ].join('\n');
}

describe('mobile auth tokens', () => {
  beforeEach(() => {
    vi.stubEnv('SUPABASE_SECRET_KEY', 'test-secret');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it('round-trips an account without a wallet', () => {
    const token = issueMobileAuthToken({ id: 'u1', wallet: null })!;
    expect(verifyMobileAuthToken(token)).toEqual({ id: 'u1', wallet: null });
  });

  it('carries the wallet in lowercase', () => {
    const token = issueMobileAuthToken({ id: 'u1', wallet: ADDRESS })!;
    expect(verifyMobileAuthToken(token)).toEqual({ id: 'u1', wallet: ADDRESS.toLowerCase() });
  });

  it('rejects a token whose wallet segment was edited', () => {
    const [id, , exp, mac] = issueMobileAuthToken({ id: 'u1', wallet: null })!.split('.');
    expect(verifyMobileAuthToken([id, '0xevil', exp, mac].join('.'))).toBeNull();
  });

  it('rejects an expired token and a malformed one', () => {
    const token = issueMobileAuthToken({ id: 'u1', wallet: null })!;
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 31 * 24 * 3600 * 1000);
    expect(verifyMobileAuthToken(token)).toBeNull();
    expect(verifyMobileAuthToken('not-a-token')).toBeNull();
  });

  it('issues nothing when the server secret is missing', () => {
    vi.stubEnv('SUPABASE_SECRET_KEY', '');
    expect(issueMobileAuthToken({ id: 'u1', wallet: null })).toBeNull();
    expect(issueMobileNonceToken('abc12345')).toBeNull();
    expect(verifyMobileAuthToken('a.b.c.d')).toBeNull();
    expect(verifyMobileNonceToken('a.b.c')).toBeNull();
  });

  it('round-trips a nonce and rejects a tampered or expired one', () => {
    const token = issueMobileNonceToken('abc12345')!;
    expect(verifyMobileNonceToken(token)).toBe('abc12345');
    expect(verifyMobileNonceToken(token.replace('abc12345', 'zzz99999'))).toBeNull();
    expect(verifyMobileNonceToken('bad')).toBeNull();
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 11 * 60 * 1000);
    expect(verifyMobileNonceToken(token)).toBeNull();
  });
});

describe('verifyMobileSiwe', () => {
  const verifySiweMessage = vi.fn();

  beforeEach(() => {
    vi.stubEnv('SUPABASE_SECRET_KEY', 'test-secret');
    vi.mocked(publicClientFor).mockReturnValue({ verifySiweMessage } as never);
    verifySiweMessage.mockReset();
  });
  afterEach(() => vi.unstubAllEnvs());

  it('rejects a nonce token we did not issue', async () => {
    expect(await verifyMobileSiwe(siwe('abc12345'), '0xsig', 'forged')).toEqual({
      error: 'Invalid or expired nonce token',
      status: 401,
    });
  });

  it('rejects a message signed over a different nonce', async () => {
    const nonceToken = issueMobileNonceToken('abc12345')!;
    expect(await verifyMobileSiwe(siwe('other9999'), '0xsig', nonceToken)).toEqual({ error: 'Nonce mismatch', status: 401 });
  });

  it('rejects a message for a chain we have no client for', async () => {
    vi.mocked(publicClientFor).mockReturnValue(null as never);
    const nonceToken = issueMobileNonceToken('abc12345')!;
    expect(await verifyMobileSiwe(siwe('abc12345'), '0xsig', nonceToken)).toEqual({ error: 'Invalid SIWE message', status: 400 });
  });

  it('rejects a bad signature', async () => {
    verifySiweMessage.mockResolvedValue(false);
    const nonceToken = issueMobileNonceToken('abc12345')!;
    expect(await verifyMobileSiwe(siwe('abc12345'), '0xsig', nonceToken)).toEqual({ error: 'Invalid signature', status: 401 });
  });

  it('returns the proven address in lowercase', async () => {
    verifySiweMessage.mockResolvedValue(true);
    const nonceToken = issueMobileNonceToken('abc12345')!;
    expect(await verifyMobileSiwe(siwe('abc12345'), '0xsig', nonceToken)).toEqual({ address: ADDRESS.toLowerCase() });
  });
});
