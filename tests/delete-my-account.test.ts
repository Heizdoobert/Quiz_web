import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deleteMyAccount } from '../lib/actions/profile-actions';
import { getSessionAccount, clearSessionAccount } from '../lib/services/session';
import { deleteAccount } from '../lib/services/account-deletion';

vi.mock('../lib/services/session', () => ({
  getSessionAccount: vi.fn(),
  clearSessionAccount: vi.fn(),
}));
vi.mock('../lib/services/account-deletion', () => ({ deleteAccount: vi.fn() }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn() } }));

const ACCOUNT = { id: '00000000-0000-4000-8000-0000000000f1' };

describe('deleteMyAccount', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('refuses without a session and deletes nothing', async () => {
    vi.mocked(getSessionAccount).mockResolvedValue(null);
    expect(await deleteMyAccount()).toMatchObject({ success: false, code: 'UNAUTHORIZED' });
    expect(deleteAccount).not.toHaveBeenCalled();
    expect(clearSessionAccount).not.toHaveBeenCalled();
  });

  it('deletes the account from the session and clears the cookie', async () => {
    vi.mocked(getSessionAccount).mockResolvedValue(ACCOUNT);
    vi.mocked(deleteAccount).mockResolvedValue({ success: true });
    expect(await deleteMyAccount()).toEqual({ success: true });
    expect(deleteAccount).toHaveBeenCalledWith(ACCOUNT);
    expect(clearSessionAccount).toHaveBeenCalledOnce();
  });

  it('keeps the session so the user can retry when deletion fails', async () => {
    vi.mocked(getSessionAccount).mockResolvedValue(ACCOUNT);
    vi.mocked(deleteAccount).mockResolvedValue({ success: false, error: 'Could not delete your account. Try again.', code: 'DELETE_FAILED' });
    expect(await deleteMyAccount()).toMatchObject({ success: false, code: 'DELETE_FAILED' });
    expect(clearSessionAccount).not.toHaveBeenCalled();
  });
});
