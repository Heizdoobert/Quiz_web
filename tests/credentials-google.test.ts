import { describe, it, expect, vi, beforeEach } from 'vitest';
import { signInAccountWithGoogle } from '@/lib/services/credentials';
import { ensureAccountForAuthUser } from '@/lib/services/users';
import { allowAttemptFromIp } from '@/lib/services/rate-limit';
import { supabase } from '@/lib/supabase/supabase';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/services/users', () => ({ ensureAccountForAuthUser: vi.fn() }));
vi.mock('@/lib/services/rate-limit', () => ({ allowAttempt: vi.fn(), allowAttemptFromIp: vi.fn() }));
vi.mock('@/lib/supabase/supabase', () => ({ supabase: { auth: { signInWithIdToken: vi.fn() } } }));
vi.mock('@/lib/supabase/supabase-admin', () => ({ supabaseAdmin: null }));

const signInWithIdToken = vi.mocked(supabase.auth.signInWithIdToken);

describe('signInAccountWithGoogle', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(allowAttemptFromIp).mockResolvedValue(true);
  });

  it('turns a verified Google user into an account, named from the Google profile', async () => {
    signInWithIdToken.mockResolvedValue({ data: { user: { id: 'auth1', user_metadata: { name: 'Ada' } } }, error: null } as never);
    vi.mocked(ensureAccountForAuthUser).mockResolvedValue('acct1');

    const result = await signInAccountWithGoogle('id-token');

    expect(signInWithIdToken).toHaveBeenCalledWith({ provider: 'google', token: 'id-token' });
    expect(ensureAccountForAuthUser).toHaveBeenCalledWith('auth1', 'Ada');
    expect(result).toEqual({ ok: true, account: { id: 'acct1', wallet: null } });
  });

  it('refuses without asking Supabase when the address is rate limited', async () => {
    vi.mocked(allowAttemptFromIp).mockResolvedValue(false);

    expect(await signInAccountWithGoogle('id-token')).toEqual({ ok: false, error: 'Too many attempts. Please try again later.' });
    expect(signInWithIdToken).not.toHaveBeenCalled();
  });

  it('fails when Supabase rejects the token', async () => {
    signInWithIdToken.mockResolvedValue({ data: { user: null }, error: { message: 'bad token' } } as never);

    expect(await signInAccountWithGoogle('forged')).toEqual({ ok: false, error: 'Google sign-in failed.' });
    expect(ensureAccountForAuthUser).not.toHaveBeenCalled();
  });

  it('fails when no account can be created, and when Supabase throws', async () => {
    signInWithIdToken.mockResolvedValue({ data: { user: { id: 'auth1', user_metadata: {} } }, error: null } as never);
    vi.mocked(ensureAccountForAuthUser).mockResolvedValue(null);
    expect(await signInAccountWithGoogle('id-token')).toEqual({ ok: false, error: 'Account not found.' });

    signInWithIdToken.mockRejectedValue(new Error('network'));
    expect(await signInAccountWithGoogle('id-token')).toEqual({
      ok: false,
      error: 'An unexpected error occurred during sign-in.',
    });
  });
});
