# tests/mobile-profile-delete-api.test.ts
lines:45 exports:
---
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { DELETE } from '@/app/api/mobile/v1/profile/route';
import * as mobileAuth from '@/lib/services/mobile-auth';
import * as deletion from '@/lib/services/account-deletion';

vi.mock('@/lib/services/mobile-auth');
vi.mock('@/lib/services/account-deletion');

const URL = 'http://localhost/api/mobile/v1/profile';
const call = (headers?: Record<string, string>) => DELETE(new NextRequest(URL, { method: 'DELETE', headers }));

describe('DELETE /api/mobile/v1/profile', () => {
  beforeEach(() => vi.resetAllMocks());

  it('needs a token and deletes nothing without one', async () => {
    expect((await call()).status).toBe(401);
    expect(deletion.deleteAccount).not.toHaveBeenCalled();
  });

  it('rejects a bad token', async () => {
    vi.mocked(mobileAuth.verifyMobileAuthToken).mockReturnValue(null);
    expect((await call({ Authorization: 'Bearer stale' })).status).toBe(401);
    expect(deletion.deleteAccount).not.toHaveBeenCalled();
  });

  it('deletes the account named by the token', async () => {
    vi.mocked(mobileAuth.verifyMobileAuthToken).mockReturnValue({ id: 'user1' });
    vi.mocked(deletion.deleteAccount).mockResolvedValue({ success: true });

    const res = await call({ Authorization: 'Bearer good' });

    expect(deletion.deleteAccount).toHaveBeenCalledWith({ id: 'user1' });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, data: { deleted: true } });
  });

  it('reports a failed delete as a server error', async () => {
    vi.mocked(mobileAuth.verifyMobileAuthToken).mockReturnValue({ id: 'user1' });
    vi.mocked(deletion.deleteAccount).mockResolvedValue({ success: false, error: 'Could not delete your account. Try again.', code: 'DELETE_FAILED' });
