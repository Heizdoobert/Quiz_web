import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { getSessionAccount, setSessionAccount } from '../lib/services/session';
import { requestEmailCode, verifyEmailCode } from '../lib/actions/auth-actions';
import { supabaseAdmin } from '../lib/supabase/supabase-admin';
import { supabase } from '../lib/supabase/supabase';

const ACCOUNT_ID = '11111111-2222-4333-8444-555555555555';
const OTHER_ID = '99999999-2222-4333-8444-555555555555';

const state = vi.hoisted(() => ({ jar: new Map<string, string>() }));

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (state.jar.has(name) ? { value: state.jar.get(name)! } : undefined),
    set: (name: string, value: string) => void state.jar.set(name, value),
    delete: (name: string) => void state.jar.delete(name),
  }),
  headers: async () => ({ get: (k: string) => (k === 'host' ? 'quiz.example.com' : null) }),
}));
vi.mock('../lib/supabase/supabase-admin', () => ({ supabaseAdmin: { from: vi.fn() } }));
vi.mock('../lib/supabase/supabase', () => ({
  supabase: { auth: { signInWithOtp: vi.fn(), verifyOtp: vi.fn() } },
}));

function mockUsersTable(lookup: { data: { id: string } | null; error: unknown }, upsertError: unknown = null) {
  const upsert = vi.fn().mockResolvedValue({ error: upsertError });
  const single = vi.fn().mockResolvedValue(lookup);
  const eq = vi.fn(() => ({ single }));
  (supabaseAdmin!.from as Mock).mockReturnValue({ upsert, select: () => ({ eq }) });
  return { upsert, eq };
}

beforeEach(() => {
  vi.resetAllMocks();
  state.jar.clear();
  process.env.SUPABASE_SECRET_KEY = 'test-secret';
});

afterEach(() => {
  vi.useRealTimers();
});

describe('session cookie', () => {
  it('round-trips an account', async () => {
    await setSessionAccount({ id: ACCOUNT_ID });

    expect(await getSessionAccount()).toEqual({ id: ACCOUNT_ID });
  });

  it('rejects a cookie whose account id was changed', async () => {
    await setSessionAccount({ id: ACCOUNT_ID });
    state.jar.set('quiz_session', state.jar.get('quiz_session')!.replace(ACCOUNT_ID, OTHER_ID));

    expect(await getSessionAccount()).toBeNull();
  });

  it('rejects an expired cookie', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    await setSessionAccount({ id: ACCOUNT_ID });
    vi.setSystemTime(Date.now() + 8 * 24 * 3600 * 1000);

    expect(await getSessionAccount()).toBeNull();
  });

  it('ignores a cookie in the old wallet-bearing format', async () => {
    state.jar.set('quiz_session', `${ACCOUNT_ID}.-.9999999999.sig`);

    expect(await getSessionAccount()).toBeNull();
  });

  it('cannot sign anyone in without the secret key', async () => {
    delete process.env.SUPABASE_SECRET_KEY;

    expect(await setSessionAccount({ id: ACCOUNT_ID })).toBe(false);
    expect(await getSessionAccount()).toBeNull();
  });
});

describe('requestEmailCode', () => {
  it('sends a code and returns sent:true for a well-formed email', async () => {
    const res = await requestEmailCode('player@example.com');

    expect(res).toEqual({ sent: true });
    expect(supabase.auth.signInWithOtp).toHaveBeenCalledWith({
      email: 'player@example.com',
      options: { shouldCreateUser: true },
    });
  });

  it('returns the same result for a malformed email, without calling Supabase', async () => {
    const res = await requestEmailCode('not-an-email');

    expect(res).toEqual({ sent: true });
    expect(supabase.auth.signInWithOtp).not.toHaveBeenCalled();
  });
});

describe('verifyEmailCode', () => {
  const AUTH_USER_ID = 'auth-user-1';

  it('creates the account by auth_user_id and sets the session on a valid code', async () => {
    (supabase.auth.verifyOtp as Mock).mockResolvedValue({ data: { user: { id: AUTH_USER_ID } }, error: null });
    const { upsert } = mockUsersTable({ data: { id: ACCOUNT_ID }, error: null });

    const res = await verifyEmailCode('player@example.com', '123456');

    expect(res).toEqual({ ok: true });
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ auth_user_id: AUTH_USER_ID }),
      { onConflict: 'auth_user_id', ignoreDuplicates: true }
    );
    expect(await getSessionAccount()).toEqual({ id: ACCOUNT_ID });
  });

  it('does not create an account or set the session on a wrong or expired code', async () => {
    (supabase.auth.verifyOtp as Mock).mockResolvedValue({ data: { user: null }, error: { message: 'invalid' } });
    const { upsert } = mockUsersTable({ data: { id: ACCOUNT_ID }, error: null });

    const res = await verifyEmailCode('player@example.com', '000000');

    expect(res).toEqual({ ok: false });
    expect(upsert).not.toHaveBeenCalled();
    expect(await getSessionAccount()).toBeNull();
  });

  it('does not set the session when the account cannot be created', async () => {
    (supabase.auth.verifyOtp as Mock).mockResolvedValue({ data: { user: { id: AUTH_USER_ID } }, error: null });
    mockUsersTable({ data: null, error: { message: 'db down' } });

    const res = await verifyEmailCode('player@example.com', '123456');

    expect(res).toEqual({ ok: false });
    expect(await getSessionAccount()).toBeNull();
  });
});
