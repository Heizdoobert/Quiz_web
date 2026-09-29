import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { getSessionAccount, setSessionAccount } from '../lib/session';
import { ensureAccountForWallet } from '../lib/users';
import {
  signInWithWallet,
  getSignedInWallet,
  requestEmailCode,
  verifyEmailCode,
  linkWallet,
} from '../lib/actions/auth-actions';
import { supabaseAdmin } from '../lib/supabase-admin';
import { supabase } from '../lib/supabase';

const ACCOUNT_ID = '11111111-2222-4333-8444-555555555555';
const OTHER_ID = '99999999-2222-4333-8444-555555555555';
const WALLET = '0x' + 'a'.repeat(40);
const MIXED_CASE_WALLET = '0x' + 'A'.repeat(40);

const state = vi.hoisted(() => ({ jar: new Map<string, string>(), siweValid: true }));

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (state.jar.has(name) ? { value: state.jar.get(name)! } : undefined),
    set: (name: string, value: string) => void state.jar.set(name, value),
    delete: (name: string) => void state.jar.delete(name),
  }),
  headers: async () => ({ get: (k: string) => (k === 'host' ? 'quiz.example.com' : null) }),
}));
vi.mock('../lib/supabase-admin', () => ({ supabaseAdmin: { from: vi.fn() } }));
vi.mock('../lib/supabase', () => ({
  supabase: { auth: { signInWithOtp: vi.fn(), verifyOtp: vi.fn() } },
}));
vi.mock('../lib/chain', () => ({
  publicClientFor: () => ({ verifySiweMessage: async () => state.siweValid }),
}));
vi.mock('viem/siwe', () => ({
  createSiweMessage: vi.fn(),
  generateSiweNonce: () => 'nonce',
  parseSiweMessage: () => ({ address: MIXED_CASE_WALLET, chainId: 84532 }),
}));

function mockUsersTable(lookup: { data: { id: string } | null; error: unknown }, upsertError: unknown = null) {
  const upsert = vi.fn().mockResolvedValue({ error: upsertError });
  const single = vi.fn().mockResolvedValue(lookup);
  const eq = vi.fn(() => ({ single }));
  (supabaseAdmin!.from as Mock).mockReturnValue({ upsert, select: () => ({ eq }) });
  return { upsert, eq };
}

function mockLinkWallet(existing: { id: string } | null, updateError: unknown = null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: existing, error: null });
  const update = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: updateError }) }));
  (supabaseAdmin!.from as Mock).mockReturnValue({
    select: () => ({ eq: () => ({ maybeSingle }) }),
    update,
  });
  return { update };
}

beforeEach(() => {
  vi.resetAllMocks();
  state.jar.clear();
  state.siweValid = true;
  process.env.SUPABASE_SECRET_KEY = 'test-secret';
});

afterEach(() => {
  vi.useRealTimers();
});

describe('session cookie', () => {
  it('round-trips an account with its wallet, lowercased', async () => {
    await setSessionAccount({ id: ACCOUNT_ID, wallet: MIXED_CASE_WALLET });

    expect(await getSessionAccount()).toEqual({ id: ACCOUNT_ID, wallet: WALLET });
  });

  it('round-trips an account without a wallet', async () => {
    await setSessionAccount({ id: ACCOUNT_ID, wallet: null });

    expect(await getSessionAccount()).toEqual({ id: ACCOUNT_ID, wallet: null });
  });

  it('rejects a cookie whose account id was changed', async () => {
    await setSessionAccount({ id: ACCOUNT_ID, wallet: WALLET });
    state.jar.set('quiz_session', state.jar.get('quiz_session')!.replace(ACCOUNT_ID, OTHER_ID));

    expect(await getSessionAccount()).toBeNull();
  });

  it('rejects a cookie whose wallet was changed', async () => {
    await setSessionAccount({ id: ACCOUNT_ID, wallet: null });
    state.jar.set('quiz_session', state.jar.get('quiz_session')!.replace('.-.', `.${WALLET}.`));

    expect(await getSessionAccount()).toBeNull();
  });

  it('rejects an expired cookie', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    await setSessionAccount({ id: ACCOUNT_ID, wallet: WALLET });
    vi.setSystemTime(Date.now() + 8 * 24 * 3600 * 1000);

    expect(await getSessionAccount()).toBeNull();
  });

  it('ignores the old wallet-only session cookie', async () => {
    state.jar.set('wallet_session', `${WALLET}.9999999999.sig`);

    expect(await getSessionAccount()).toBeNull();
  });

  it('cannot sign anyone in without the secret key', async () => {
    delete process.env.SUPABASE_SECRET_KEY;

    expect(await setSessionAccount({ id: ACCOUNT_ID, wallet: WALLET })).toBe(false);
    expect(await getSessionAccount()).toBeNull();
  });
});

describe('ensureAccountForWallet', () => {
  it("creates the wallet's account if missing and returns its id", async () => {
    const { upsert, eq } = mockUsersTable({ data: { id: ACCOUNT_ID }, error: null });

    const id = await ensureAccountForWallet(MIXED_CASE_WALLET);

    expect(id).toBe(ACCOUNT_ID);
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ wallet_address: WALLET, display_name: '0xaaaa...aaaa' }),
      { onConflict: 'wallet_address', ignoreDuplicates: true }
    );
    expect(eq).toHaveBeenCalledWith('wallet_address', WALLET);
  });

  it('returns null when the account cannot be created', async () => {
    mockUsersTable({ data: { id: ACCOUNT_ID }, error: null }, { message: 'db down' });

    expect(await ensureAccountForWallet(WALLET)).toBeNull();
  });

  it('returns null when the account cannot be read back', async () => {
    mockUsersTable({ data: null, error: { message: 'no rows' } });

    expect(await ensureAccountForWallet(WALLET)).toBeNull();
  });
});

describe('signInWithWallet', () => {
  beforeEach(() => state.jar.set('wallet_challenge', 'nonce'));

  it("signs in the wallet's account once the signature verifies", async () => {
    mockUsersTable({ data: { id: ACCOUNT_ID }, error: null });

    const ok = await signInWithWallet('message', ('0x' + 'c'.repeat(130)) as `0x${string}`);

    expect(ok).toBe(true);
    expect(await getSessionAccount()).toEqual({ id: ACCOUNT_ID, wallet: WALLET });
    expect(await getSignedInWallet()).toBe(WALLET);
  });

  it('does not sign in or create an account when the signature fails to verify', async () => {
    const { upsert } = mockUsersTable({ data: { id: ACCOUNT_ID }, error: null });
    state.siweValid = false;

    const ok = await signInWithWallet('message', ('0x' + 'c'.repeat(130)) as `0x${string}`);

    expect(ok).toBe(false);
    expect(upsert).not.toHaveBeenCalled();
    expect(await getSessionAccount()).toBeNull();
  });

  it('does not sign in when the account cannot be created', async () => {
    mockUsersTable({ data: null, error: { message: 'db down' } });

    const ok = await signInWithWallet('message', ('0x' + 'c'.repeat(130)) as `0x${string}`);

    expect(ok).toBe(false);
    expect(await getSessionAccount()).toBeNull();
  });

  it('allows only one attempt per challenge', async () => {
    mockUsersTable({ data: { id: ACCOUNT_ID }, error: null });
    await signInWithWallet('message', ('0x' + 'c'.repeat(130)) as `0x${string}`);
    state.jar.delete('quiz_session');

    const again = await signInWithWallet('message', ('0x' + 'c'.repeat(130)) as `0x${string}`);

    expect(again).toBe(false);
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
    expect(await getSessionAccount()).toEqual({ id: ACCOUNT_ID, wallet: null });
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

describe('linkWallet', () => {
  beforeEach(async () => {
    state.jar.set('wallet_challenge', 'nonce');
    await setSessionAccount({ id: ACCOUNT_ID, wallet: null });
  });

  it("sets the wallet and wallet_linked_at once the signature verifies", async () => {
    const { update } = mockLinkWallet(null);

    const res = await linkWallet('message', ('0x' + 'c'.repeat(130)) as `0x${string}`);

    expect(res).toEqual({ ok: true });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ wallet_address: WALLET, wallet_linked_at: expect.any(String) })
    );
    expect(await getSessionAccount()).toEqual({ id: ACCOUNT_ID, wallet: WALLET });
  });

  it('returns WALLET_IN_USE and changes nothing for a wallet on another account', async () => {
    const { update } = mockLinkWallet({ id: OTHER_ID });

    const res = await linkWallet('message', ('0x' + 'c'.repeat(130)) as `0x${string}`);

    expect(res).toEqual({ ok: false, code: 'WALLET_IN_USE' });
    expect(update).not.toHaveBeenCalled();
    expect(await getSessionAccount()).toEqual({ id: ACCOUNT_ID, wallet: null });
  });

  it('refuses an account that already has a wallet', async () => {
    await setSessionAccount({ id: ACCOUNT_ID, wallet: WALLET });
    const { update } = mockLinkWallet(null);

    const res = await linkWallet('message', ('0x' + 'c'.repeat(130)) as `0x${string}`);

    expect(res).toEqual({ ok: false });
    expect(update).not.toHaveBeenCalled();
  });

  it('reports WALLET_IN_USE when two signatures race for the same new wallet', async () => {
    const { update } = mockLinkWallet(null, { code: '23505', message: 'duplicate key' });

    const res = await linkWallet('message', ('0x' + 'c'.repeat(130)) as `0x${string}`);

    expect(res).toEqual({ ok: false, code: 'WALLET_IN_USE' });
    expect(update).toHaveBeenCalled();
    expect(await getSessionAccount()).toEqual({ id: ACCOUNT_ID, wallet: null });
  });

  it('does not link when the signature fails to verify', async () => {
    const { update } = mockLinkWallet(null);
    state.siweValid = false;

    const res = await linkWallet('message', ('0x' + 'c'.repeat(130)) as `0x${string}`);

    expect(res).toEqual({ ok: false });
    expect(update).not.toHaveBeenCalled();
    expect(await getSessionAccount()).toEqual({ id: ACCOUNT_ID, wallet: null });
  });
});
