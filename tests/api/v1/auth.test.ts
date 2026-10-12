import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as signup } from '@/app/api/v1/auth/signup/route';
import { POST as signin } from '@/app/api/v1/auth/signin/route';
import { POST as googleSignin } from '@/app/api/v1/auth/signin/google/route';
import { POST as requestEmail } from '@/app/api/v1/auth/email/request/route';
import { POST as verifyEmail } from '@/app/api/v1/auth/email/verify/route';
import { GET as session } from '@/app/api/v1/auth/session/route';
import { POST as signout } from '@/app/api/v1/auth/signout/route';

import { signUpAccount, signInAccount, signInAccountWithGoogle } from '@/lib/services/credentials';
import { issueMobileAuthToken, verifyMobileAuthToken } from '@/lib/services/mobile-auth';
import { requestEmailCode, verifyEmailCode, getSessionInfo, signOut } from '@/lib/actions/auth-actions';

vi.mock('@/lib/services/credentials');
vi.mock('@/lib/actions/auth-actions', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/actions/auth-actions')>();
  return {
    ...actual,
    requestEmailCode: vi.fn(),
    verifyEmailCode: vi.fn(),
    signOut: vi.fn(),
  };
});

function post(url: string, body: unknown, bearer?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (bearer) headers['Authorization'] = `Bearer ${bearer}`;
  return new NextRequest(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

function get(url: string, bearer?: string) {
  const headers: Record<string, string> = {};
  if (bearer) headers['Authorization'] = `Bearer ${bearer}`;
  return new NextRequest(url, {
    method: 'GET',
    headers,
  });
}

const TEST_SECRET = 'test-secret-key-12345678901234567890';

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('SUPABASE_SECRET_KEY', TEST_SECRET);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('POST /api/v1/auth/signup', () => {
  it('successfully signs up, returning 200 with token and accountId', async () => {
    vi.mocked(signUpAccount).mockResolvedValue({ ok: true, account: { id: 'u1' } });

    const res = await signup(post('http://localhost/api/v1/auth/signup', { username: 'ada', password: 'secretpassword' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.accountId).toBe('u1');
    expect(verifyMobileAuthToken(json.data.token)).toEqual({ id: 'u1' });
    expect(signUpAccount).toHaveBeenCalledWith('ada', 'secretpassword');
  });

  it('rejects missing or invalid username or password with 400 VALIDATION_ERROR', async () => {
    const res1 = await signup(post('http://localhost/api/v1/auth/signup', { username: 'ada' }));
    expect(res1.status).toBe(400);
    const json1 = await res1.json();
    expect(json1.success).toBe(false);
    expect(json1.error.code).toBe('VALIDATION_ERROR');

    const res2 = await signup(post('http://localhost/api/v1/auth/signup', {}));
    expect(res2.status).toBe(400);
  });

  it('returns 409 CONFLICT if username is already taken', async () => {
    vi.mocked(signUpAccount).mockResolvedValue({ ok: false, error: 'Username is already taken.' });

    const res = await signup(post('http://localhost/api/v1/auth/signup', { username: 'ada', password: 'secretpassword' }));
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('CONFLICT');
  });

  it('returns 429 RATE_LIMITED when rate limit is exceeded', async () => {
    vi.mocked(signUpAccount).mockResolvedValue({ ok: false, error: 'Too many attempts. Please try again later.' });

    const res = await signup(post('http://localhost/api/v1/auth/signup', { username: 'ada', password: 'secretpassword' }));
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('RATE_LIMITED');
  });

  it('returns 400 VALIDATION_ERROR when credentials validation fails', async () => {
    vi.mocked(signUpAccount).mockResolvedValue({ ok: false, error: 'Password must be at least 6 characters.' });

    const res = await signup(post('http://localhost/api/v1/auth/signup', { username: 'ada', password: '123' }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 500 when secret key is missing and token cannot be issued', async () => {
    vi.stubEnv('SUPABASE_SECRET_KEY', '');
    vi.mocked(signUpAccount).mockResolvedValue({ ok: true, account: { id: 'u1' } });

    const res = await signup(post('http://localhost/api/v1/auth/signup', { username: 'ada', password: 'secretpassword' }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('SERVER_ERROR');
  });
});

describe('POST /api/v1/auth/signin', () => {
  it('successfully signs in, returning 200 with token and accountId', async () => {
    vi.mocked(signInAccount).mockResolvedValue({ ok: true, account: { id: 'u1' } });

    const res = await signin(post('http://localhost/api/v1/auth/signin', { username: 'ada', password: 'secretpassword' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.accountId).toBe('u1');
    expect(verifyMobileAuthToken(json.data.token)).toEqual({ id: 'u1' });
    expect(signInAccount).toHaveBeenCalledWith('ada', 'secretpassword');
  });

  it('rejects missing parameters with 400 VALIDATION_ERROR', async () => {
    const res = await signin(post('http://localhost/api/v1/auth/signin', { username: 'ada' }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 401 UNAUTHORIZED on invalid credentials', async () => {
    vi.mocked(signInAccount).mockResolvedValue({ ok: false, error: 'Invalid username or password.' });

    const res = await signin(post('http://localhost/api/v1/auth/signin', { username: 'ada', password: 'wrong' }));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 429 RATE_LIMITED when rate limit is exceeded', async () => {
    vi.mocked(signInAccount).mockResolvedValue({ ok: false, error: 'Too many attempts. Please try again later.' });

    const res = await signin(post('http://localhost/api/v1/auth/signin', { username: 'ada', password: 'wrong' }));
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('RATE_LIMITED');
  });
});

describe('POST /api/v1/auth/signin/google', () => {
  it('successfully signs in with google idToken', async () => {
    vi.mocked(signInAccountWithGoogle).mockResolvedValue({ ok: true, account: { id: 'g1' } });

    const res = await googleSignin(post('http://localhost/api/v1/auth/signin/google', { idToken: 'valid-google-token' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.accountId).toBe('g1');
    expect(verifyMobileAuthToken(json.data.token)).toEqual({ id: 'g1' });
  });

  it('rejects missing idToken with 400 VALIDATION_ERROR', async () => {
    const res = await googleSignin(post('http://localhost/api/v1/auth/signin/google', {}));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 401 UNAUTHORIZED on failed google sign-in', async () => {
    vi.mocked(signInAccountWithGoogle).mockResolvedValue({ ok: false, error: 'Google sign-in failed.' });

    const res = await googleSignin(post('http://localhost/api/v1/auth/signin/google', { idToken: 'invalid' }));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 429 RATE_LIMITED when google sign-in is rate limited', async () => {
    vi.mocked(signInAccountWithGoogle).mockResolvedValue({ ok: false, error: 'Too many attempts. Please try again later.' });

    const res = await googleSignin(post('http://localhost/api/v1/auth/signin/google', { idToken: 'some-token' }));
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('RATE_LIMITED');
  });
});

describe('POST /api/v1/auth/email/request', () => {
  it('requests email OTP code successfully', async () => {
    vi.mocked(requestEmailCode).mockResolvedValue({ sent: true });

    const res = await requestEmail(post('http://localhost/api/v1/auth/email/request', { email: 'player@example.com' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toEqual({ sent: true });
    expect(requestEmailCode).toHaveBeenCalledWith('player@example.com');
  });

  it('rejects missing email with 400 VALIDATION_ERROR', async () => {
    const res = await requestEmail(post('http://localhost/api/v1/auth/email/request', {}));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 429 RATE_LIMITED on rate limit', async () => {
    vi.mocked(requestEmailCode).mockResolvedValue({ sent: false, error: 'RATE_LIMITED' });

    const res = await requestEmail(post('http://localhost/api/v1/auth/email/request', { email: 'player@example.com' }));
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('RATE_LIMITED');
  });
});

describe('POST /api/v1/auth/email/verify', () => {
  it('successfully verifies email code, returns 200 with ok, token, and accountId', async () => {
    vi.mocked(verifyEmailCode).mockResolvedValue({
      ok: true,
      token: 'issued-token-123',
      accountId: 'acc-email-1',
    });

    const res = await verifyEmail(post('http://localhost/api/v1/auth/email/verify', { email: 'player@example.com', code: '123456' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.ok).toBe(true);
    expect(json.data.token).toBe('issued-token-123');
    expect(json.data.accountId).toBe('acc-email-1');
    expect(verifyEmailCode).toHaveBeenCalledWith('player@example.com', '123456', { issueToken: true });
  });

  it('rejects missing parameters with 400 VALIDATION_ERROR', async () => {
    const res = await verifyEmail(post('http://localhost/api/v1/auth/email/verify', { email: 'player@example.com' }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 401 UNAUTHORIZED for invalid code', async () => {
    vi.mocked(verifyEmailCode).mockResolvedValue({ ok: false });

    const res = await verifyEmail(post('http://localhost/api/v1/auth/email/verify', { email: 'player@example.com', code: '000000' }));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 429 RATE_LIMITED on rate limit', async () => {
    vi.mocked(verifyEmailCode).mockResolvedValue({ ok: false, error: 'RATE_LIMITED' });

    const res = await verifyEmail(post('http://localhost/api/v1/auth/email/verify', { email: 'player@example.com', code: '123456' }));
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('RATE_LIMITED');
  });
});

describe('GET /api/v1/auth/session', () => {
  it('returns 401 UNAUTHORIZED when no token is provided', async () => {
    const res = await session(get('http://localhost/api/v1/auth/session'));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 UNAUTHORIZED when invalid token is provided', async () => {
    const res = await session(get('http://localhost/api/v1/auth/session', 'invalid-token'));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 200 with session account id when valid token is provided', async () => {
    const token = issueMobileAuthToken({ id: 'u1' });
    const res = await session(get('http://localhost/api/v1/auth/session', token!));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.id).toBe('u1');
  });
});

describe('POST /api/v1/auth/signout', () => {
  it('returns 401 UNAUTHORIZED when no token is provided', async () => {
    const res = await signout(post('http://localhost/api/v1/auth/signout', {}));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 200 with ok: true when valid token is provided', async () => {
    const token = issueMobileAuthToken({ id: 'u1' });
    const res = await signout(post('http://localhost/api/v1/auth/signout', {}, token!));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toEqual({ ok: true });
    expect(signOut).toHaveBeenCalled();
  });
});

describe('getSessionInfo with optional authAccount', () => {
  it('returns the passed authAccount directly without reading cookies', async () => {
    const passedAccount = { id: 'custom-account-123' };
    const result = await getSessionInfo(passedAccount);
    expect(result).toEqual(passedAccount);
  });
});
