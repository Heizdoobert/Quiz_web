import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as password } from '@/app/api/mobile/v1/auth/password/route';
import { POST as google } from '@/app/api/mobile/v1/auth/google/route';
import { POST as wallet } from '@/app/api/mobile/v1/auth/wallet/route';
import { POST as verify } from '@/app/api/mobile/v1/auth/verify/route';
import { POST as nonce } from '@/app/api/mobile/v1/auth/nonce/route';
import { GET as questions } from '@/app/api/mobile/v1/quiz/questions/route';
import { issueMobileAuthToken, verifyMobileAuthToken, verifyMobileSiwe } from '@/lib/services/mobile-auth';
import { signInAccount, signInAccountWithGoogle, signUpAccount } from '@/lib/services/credentials';
import { ensureAccountForWallet, linkWalletToAccount } from '@/lib/services/users';
import { fetchRandomQuestion } from '@/lib/actions/question-actions';

vi.mock('@/lib/services/credentials');
vi.mock('@/lib/services/users');
vi.mock('@/lib/actions/question-actions');
vi.mock('@/lib/services/mobile-auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/services/mobile-auth')>()),
  verifyMobileSiwe: vi.fn(),
}));

const post = (body: unknown, bearer?: string) =>
  new NextRequest('http://localhost/api/mobile/v1/x', {
    method: 'POST',
    headers: bearer ? { Authorization: `Bearer ${bearer}` } : {},
    body: JSON.stringify(body),
  });

const ADDRESS = '0xabc0000000000000000000000000000000000001';
const SIWE = { message: 'm', signature: '0xsig', nonceToken: 'n.1.x' };

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('SUPABASE_SECRET_KEY', 'test-secret');
});
afterEach(() => vi.unstubAllEnvs());

describe('POST auth/password', () => {
  it('signs in and returns a token with no wallet', async () => {
    vi.mocked(signInAccount).mockResolvedValue({ ok: true, account: { id: 'u1', wallet: null } });

    const res = await password(post({ mode: 'signin', username: 'ada', password: 'secret1' }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toMatchObject({ accountId: 'u1', wallet: null });
    expect(verifyMobileAuthToken(json.token)).toEqual({ id: 'u1', wallet: null });
  });

  it('signs up through signUpAccount', async () => {
    vi.mocked(signUpAccount).mockResolvedValue({ ok: true, account: { id: 'u2', wallet: null } });

    const res = await password(post({ mode: 'signup', username: 'ada', password: 'secret1' }));

    expect(res.status).toBe(200);
    expect(signUpAccount).toHaveBeenCalledWith('ada', 'secret1');
    expect(signInAccount).not.toHaveBeenCalled();
  });

  it('passes the failure message through as a 401', async () => {
    vi.mocked(signInAccount).mockResolvedValue({ ok: false, error: 'Wrong username or password' });

    const res = await password(post({ mode: 'signin', username: 'ada', password: 'nope' }));

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Wrong username or password' });
  });

  it('rejects a body with a bad mode or missing fields', async () => {
    expect((await password(post({ mode: 'reset', username: 'a', password: 'b' }))).status).toBe(400);
    expect((await password(post({ mode: 'signin', username: 'a' }))).status).toBe(400);
  });

  it('fails with 500 when the server secret is missing', async () => {
    vi.stubEnv('SUPABASE_SECRET_KEY', '');
    vi.mocked(signInAccount).mockResolvedValue({ ok: true, account: { id: 'u1', wallet: null } });

    expect((await password(post({ mode: 'signin', username: 'ada', password: 'secret1' }))).status).toBe(500);
  });

  it('answers 500 when the body is not JSON', async () => {
    const res = await password(new NextRequest('http://localhost/x', { method: 'POST', body: 'nope' }));
    expect(res.status).toBe(500);
  });
});

describe('POST auth/google', () => {
  it('returns a token for a valid ID token', async () => {
    vi.mocked(signInAccountWithGoogle).mockResolvedValue({ ok: true, account: { id: 'g1', wallet: ADDRESS } });

    const res = await google(post({ idToken: 'id-token' }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(verifyMobileAuthToken(json.token)).toEqual({ id: 'g1', wallet: ADDRESS });
  });

  it('rejects a missing token and a refused one', async () => {
    expect((await google(post({}))).status).toBe(400);

    vi.mocked(signInAccountWithGoogle).mockResolvedValue({ ok: false, error: 'Google sign-in failed' });
    expect((await google(post({ idToken: 'bad' }))).status).toBe(401);
  });
});

describe('POST auth/wallet', () => {
  const token = () => issueMobileAuthToken({ id: 'u1', wallet: null })!;

  it('needs a signed-in account', async () => {
    expect((await wallet(post(SIWE))).status).toBe(401);
    expect((await wallet(post(SIWE, 'garbage'))).status).toBe(401);
  });

  it('refuses an account that already has a wallet', async () => {
    const res = await wallet(post(SIWE, issueMobileAuthToken({ id: 'u1', wallet: ADDRESS })!));
    expect(res.status).toBe(409);
  });

  it('rejects a body with missing fields', async () => {
    expect((await wallet(post({ message: 'm' }, token()))).status).toBe(400);
  });

  it('passes a failed SIWE check through', async () => {
    vi.mocked(verifyMobileSiwe).mockResolvedValue({ error: 'Invalid signature', status: 401 });
    const res = await wallet(post(SIWE, token()));
    expect(res.status).toBe(401);
    expect(linkWalletToAccount).not.toHaveBeenCalled();
  });

  it('links the proven wallet and returns a token that carries it', async () => {
    vi.mocked(verifyMobileSiwe).mockResolvedValue({ address: ADDRESS });
    vi.mocked(linkWalletToAccount).mockResolvedValue('ok');

    const res = await wallet(post(SIWE, token()));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(linkWalletToAccount).toHaveBeenCalledWith('u1', ADDRESS);
    expect(verifyMobileAuthToken(json.token)).toEqual({ id: 'u1', wallet: ADDRESS });
  });

  it('answers 409 when the wallet belongs to another account and 500 on other failures', async () => {
    vi.mocked(verifyMobileSiwe).mockResolvedValue({ address: ADDRESS });

    vi.mocked(linkWalletToAccount).mockResolvedValue('in_use');
    expect((await wallet(post(SIWE, token()))).status).toBe(409);

    vi.mocked(linkWalletToAccount).mockResolvedValue('error');
    expect((await wallet(post(SIWE, token()))).status).toBe(500);
  });
});

describe('POST auth/verify (wallet-only sign-in)', () => {
  it('creates or finds the wallet account and returns a token', async () => {
    vi.mocked(verifyMobileSiwe).mockResolvedValue({ address: ADDRESS });
    vi.mocked(ensureAccountForWallet).mockResolvedValue('w1');

    const res = await verify(post(SIWE));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(verifyMobileAuthToken(json.token)).toEqual({ id: 'w1', wallet: ADDRESS });
  });

  it('rejects missing fields, a failed SIWE check and a failed account lookup', async () => {
    expect((await verify(post({}))).status).toBe(400);

    vi.mocked(verifyMobileSiwe).mockResolvedValue({ error: 'Nonce mismatch', status: 401 });
    expect((await verify(post(SIWE))).status).toBe(401);

    vi.mocked(verifyMobileSiwe).mockResolvedValue({ address: ADDRESS });
    vi.mocked(ensureAccountForWallet).mockResolvedValue(null);
    expect((await verify(post(SIWE))).status).toBe(500);
  });
});

describe('POST auth/nonce', () => {
  it('returns a nonce with a signed token, or 500 without the secret', async () => {
    const json = await (await nonce()).json();
    expect(json.nonce).toBeTruthy();
    expect(json.nonceToken.startsWith(`${json.nonce}.`)).toBe(true);

    vi.stubEnv('SUPABASE_SECRET_KEY', '');
    expect((await nonce()).status).toBe(500);
  });
});

describe('GET quiz/questions', () => {
  it('serves guests: no token needed, ten distinct picks at most', async () => {
    let n = 0;
    vi.mocked(fetchRandomQuestion).mockImplementation(async () => ({ id: `q${++n}` }) as never);

    const res = await questions();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.questions).toHaveLength(10);
    expect(new Set(json.questions.map((q: { id: string }) => q.id)).size).toBe(10);
  });

  it('returns what it found when the bank runs dry', async () => {
    vi.mocked(fetchRandomQuestion).mockResolvedValue(null);
    expect((await (await questions()).json()).questions).toEqual([]);
  });
});
