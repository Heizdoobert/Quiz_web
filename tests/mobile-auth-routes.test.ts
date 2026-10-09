import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as password } from '@/app/api/mobile/v1/auth/password/route';
import { POST as google } from '@/app/api/mobile/v1/auth/google/route';
import { GET as questions } from '@/app/api/mobile/v1/quiz/questions/route';
import { verifyMobileAuthToken } from '@/lib/services/mobile-auth';
import { signInAccount, signInAccountWithGoogle, signUpAccount } from '@/lib/services/credentials';
import { fetchRandomQuestion } from '@/lib/actions/question-actions';

vi.mock('@/lib/services/credentials');
vi.mock('@/lib/actions/question-actions');

const post = (body: unknown, bearer?: string) =>
  new NextRequest('http://localhost/api/mobile/v1/x', {
    method: 'POST',
    headers: bearer ? { Authorization: `Bearer ${bearer}` } : {},
    body: JSON.stringify(body),
  });

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('SUPABASE_SECRET_KEY', 'test-secret');
});
afterEach(() => vi.unstubAllEnvs());

describe('POST auth/password', () => {
  it('signs in and returns a token', async () => {
    vi.mocked(signInAccount).mockResolvedValue({ ok: true, account: { id: 'u1' } });

    const res = await password(post({ mode: 'signin', username: 'ada', password: 'secret1' }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toMatchObject({ accountId: 'u1' });
    expect(verifyMobileAuthToken(json.token)).toEqual({ id: 'u1' });
  });

  it('signs up through signUpAccount', async () => {
    vi.mocked(signUpAccount).mockResolvedValue({ ok: true, account: { id: 'u2' } });

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
    vi.mocked(signInAccount).mockResolvedValue({ ok: true, account: { id: 'u1' } });

    expect((await password(post({ mode: 'signin', username: 'ada', password: 'secret1' }))).status).toBe(500);
  });

  it('answers 500 when the body is not JSON', async () => {
    const res = await password(new NextRequest('http://localhost/x', { method: 'POST', body: 'nope' }));
    expect(res.status).toBe(500);
  });
});

describe('POST auth/google', () => {
  it('returns a token for a valid ID token', async () => {
    vi.mocked(signInAccountWithGoogle).mockResolvedValue({ ok: true, account: { id: 'g1' } });

    const res = await google(post({ idToken: 'id-token' }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(verifyMobileAuthToken(json.token)).toEqual({ id: 'g1' });
  });

  it('rejects a missing token and a refused one', async () => {
    expect((await google(post({}))).status).toBe(400);

    vi.mocked(signInAccountWithGoogle).mockResolvedValue({ ok: false, error: 'Google sign-in failed' });
    expect((await google(post({ idToken: 'bad' }))).status).toBe(401);
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
