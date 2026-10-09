import { describe, it, expect, vi, beforeEach } from 'vitest';
import { allowAttempt, allowAttemptFromIp, clientIp } from '../lib/services/rate-limit';
import {
  requestEmailCode,
  verifyEmailCode,
  signInWithUsername,
  signUpWithUsername,
} from '../lib/actions/auth-actions';
import { supabase } from '../lib/supabase/supabase';
import { supabaseAdmin } from '../lib/supabase/supabase-admin';

let forwardedFor: string | null = null;

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({ get: vi.fn(), set: vi.fn(), delete: vi.fn() })),
  headers: vi.fn(async () => {
    const h = new Headers({ host: 'localhost:3000' });
    if (forwardedFor) h.set('x-forwarded-for', forwardedFor);
    return h;
  }),
}));
vi.mock('../lib/supabase/supabase', () => ({
  supabase: {
    auth: { signInWithOtp: vi.fn(), verifyOtp: vi.fn(), signInWithPassword: vi.fn(), signUp: vi.fn() },
  },
}));
vi.mock('../lib/supabase/supabase-admin', () => ({
  supabaseAdmin: { rpc: vi.fn(), auth: { admin: { createUser: vi.fn() } } },
}));
vi.mock('../lib/services/session', () => ({
  getSessionAccount: vi.fn(),
  setSessionAccount: vi.fn(),
  clearSessionAccount: vi.fn(),
  shouldUseSecureCookies: vi.fn(),
}));
vi.mock('../lib/services/users', () => ({ ensureAccountForAuthUser: vi.fn() }));

const rpc = () => supabaseAdmin!.rpc as unknown as ReturnType<typeof vi.fn>;
const allow = () => rpc().mockResolvedValue({ data: true, error: null });
const block = () => rpc().mockResolvedValue({ data: false, error: null });

beforeEach(() => {
  vi.resetAllMocks();
  forwardedFor = null;
  allow();
});

describe('allowAttempt', () => {
  it('passes the limits through and hashes the identifier into the key', async () => {
    expect(await allowAttempt('email-code', ' Alice@Example.com ', 5, 3600)).toBe(true);
    const args = rpc().mock.calls[0][1];
    expect(args).toMatchObject({ p_max: 5, p_window_seconds: 3600 });
    expect(args.p_key).toMatch(/^email-code:[0-9a-f]{64}$/);
    expect(args.p_key).not.toContain('alice');
  });

  it('treats the same address in any case as one key', async () => {
    await allowAttempt('s', 'Bob@x.io', 1, 60);
    await allowAttempt('s', ' bob@X.io', 1, 60);
    expect(rpc().mock.calls[0][1].p_key).toBe(rpc().mock.calls[1][1].p_key);
  });

  it('refuses when the database says the limit is spent', async () => {
    block();
    expect(await allowAttempt('signin', 'bob', 10, 900)).toBe(false);
  });

  it('fails open when the counter errors or throws', async () => {
    rpc().mockResolvedValue({ data: null, error: { message: 'function does not exist' } });
    expect(await allowAttempt('signin', 'bob', 10, 900)).toBe(true);
    rpc().mockRejectedValue(new Error('network'));
    expect(await allowAttempt('signin', 'bob', 10, 900)).toBe(true);
  });
});

describe('clientIp / allowAttemptFromIp', () => {
  it('takes the first x-forwarded-for hop', async () => {
    forwardedFor = '203.0.113.9, 10.0.0.1';
    expect(await clientIp()).toBe('203.0.113.9');
  });

  it('skips the limit entirely when there is no IP', async () => {
    expect(await allowAttemptFromIp('signup-ip', 30, 600)).toBe(true);
    expect(rpc()).not.toHaveBeenCalled();
  });

  it('counts when an IP is present', async () => {
    forwardedFor = '203.0.113.9';
    block();
    expect(await allowAttemptFromIp('signup-ip', 30, 600)).toBe(false);
  });
});

describe('auth actions behind the limiter', () => {
  it('requestEmailCode sends a code under the limit', async () => {
    (supabase.auth.signInWithOtp as ReturnType<typeof vi.fn>).mockResolvedValue({ error: null });
    expect(await requestEmailCode('a@b.co')).toEqual({ sent: true });
    expect(supabase.auth.signInWithOtp).toHaveBeenCalled();
    expect(rpc().mock.calls[0][1]).toMatchObject({ p_max: 5, p_window_seconds: 3600 });
  });

  it('requestEmailCode returns RATE_LIMITED without sending mail', async () => {
    block();
    expect(await requestEmailCode('a@b.co')).toEqual({ sent: false, error: 'RATE_LIMITED' });
    expect(supabase.auth.signInWithOtp).not.toHaveBeenCalled();
  });

  it('requestEmailCode does not count an invalid address', async () => {
    expect(await requestEmailCode('nope')).toEqual({ sent: true });
    expect(rpc()).not.toHaveBeenCalled();
  });

  it('verifyEmailCode returns RATE_LIMITED without checking the code', async () => {
    block();
    expect(await verifyEmailCode('a@b.co', '123456')).toEqual({ ok: false, error: 'RATE_LIMITED' });
    expect(supabase.auth.verifyOtp).not.toHaveBeenCalled();
  });

  it('signInWithUsername refuses over the limit without calling the password check', async () => {
    block();
    const res = await signInWithUsername('bob', 'secret1');
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/too many attempts/i);
    expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it('signInWithUsername does not count an empty submission', async () => {
    await signInWithUsername('', '');
    expect(rpc()).not.toHaveBeenCalled();
  });

  it('signUpWithUsername refuses over the limit without creating a user', async () => {
    block();
    const res = await signUpWithUsername('newplayer', 'secret1');
    expect(res.ok).toBe(false);
    expect(supabaseAdmin!.auth.admin.createUser).not.toHaveBeenCalled();
    expect(supabase.auth.signUp).not.toHaveBeenCalled();
  });
});
