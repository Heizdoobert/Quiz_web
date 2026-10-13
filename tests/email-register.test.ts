import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requestEmailCode, verifyEmailCode } from '../lib/actions/auth-actions';
import { usernameTaken } from '../lib/db/users';
import { ensureAccountForAuthUser } from '../lib/services/users';
import { setSessionAccount } from '../lib/services/session';
import { supabase } from '../lib/sdk/supabase';

vi.mock('../lib/sdk/supabase', () => ({ supabase: { auth: { signInWithOtp: vi.fn(), verifyOtp: vi.fn() } } }));
vi.mock('../lib/db/users', () => ({ usernameTaken: vi.fn() }));
vi.mock('../lib/services/users', () => ({ ensureAccountForAuthUser: vi.fn() }));
vi.mock('../lib/services/session', () => ({
  getSessionAccount: vi.fn(),
  setSessionAccount: vi.fn(),
  clearSessionAccount: vi.fn(),
}));
vi.mock('../lib/services/rate-limit', () => ({
  allowAttempt: vi.fn().mockResolvedValue(true),
  allowAttemptFromIp: vi.fn().mockResolvedValue(true),
}));

const otp = () => supabase.auth.signInWithOtp as ReturnType<typeof vi.fn>;

beforeEach(() => vi.clearAllMocks());

describe('requestEmailCode with a username', () => {
  it('stores the username on the new auth user', async () => {
    vi.mocked(usernameTaken).mockResolvedValue(false);

    expect(await requestEmailCode('a@b.co', 'quiz_champ')).toEqual({ sent: true });
    expect(otp()).toHaveBeenCalledWith({
      email: 'a@b.co',
      options: { shouldCreateUser: true, data: { username: 'quiz_champ' } },
    });
  });

  it('rejects a taken username before any mail is sent', async () => {
    vi.mocked(usernameTaken).mockResolvedValue(true);

    expect(await requestEmailCode('a@b.co', 'quiz_champ')).toEqual({ sent: false, error: 'USERNAME_TAKEN' });
    expect(otp()).not.toHaveBeenCalled();
  });

  it('rejects an invalid username without touching the database', async () => {
    expect(await requestEmailCode('a@b.co', 'no spaces!')).toEqual({ sent: false, error: 'INVALID_USERNAME' });
    expect(usernameTaken).not.toHaveBeenCalled();
    expect(otp()).not.toHaveBeenCalled();
  });
});

describe('verifyEmailCode', () => {
  it('names the account after the username saved at registration', async () => {
    vi.mocked(supabase.auth.verifyOtp as never as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { user: { id: 'u1', user_metadata: { username: 'quiz_champ' } } },
      error: null,
    });
    vi.mocked(ensureAccountForAuthUser).mockResolvedValue('acc1');
    vi.mocked(setSessionAccount).mockResolvedValue(true);

    expect(await verifyEmailCode('a@b.co', '123456')).toEqual({ ok: true });
    expect(ensureAccountForAuthUser).toHaveBeenCalledWith('u1', 'quiz_champ');
  });
});
