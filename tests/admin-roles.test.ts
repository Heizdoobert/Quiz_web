import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { PUT } from '@/app/api/v1/admin/roles/route';
import { issueMobileAuthToken } from '@/lib/services/mobile-auth';
import { roleOf, setRole } from '@/lib/db/roles';
import { logger } from '@/lib/logger';

vi.mock('@/lib/db/roles', () => ({ roleOf: vi.fn(), setRole: vi.fn() }));
vi.mock('@/lib/services/session', () => ({ getSessionAccount: vi.fn().mockResolvedValue(null) }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));

const ADMIN = '00000000-0000-4000-8000-0000000000a1';
const MODERATOR = '00000000-0000-4000-8000-0000000000b2';
const PLAYER = '00000000-0000-4000-8000-0000000000c3';
const GHOST = '00000000-0000-4000-8000-0000000000d4';

let roles: Record<string, string>;

function put(body: unknown, callerId?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (callerId) headers.Authorization = `Bearer ${issueMobileAuthToken({ id: callerId })}`;
  return new NextRequest('http://localhost/api/v1/admin/roles', {
    method: 'PUT',
    headers,
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

async function code(res: Response) {
  return (await res.json()).error?.code;
}

beforeEach(() => {
  roles = { [ADMIN]: 'admin', [MODERATOR]: 'moderator', [PLAYER]: 'user' };
  vi.mocked(roleOf).mockReset().mockImplementation(async (id) => roles[id] ?? null);
  vi.mocked(setRole).mockReset().mockImplementation(async (id, role) => {
    if (!(id in roles)) return false;
    roles[id] = role;
    return true;
  });
  vi.mocked(logger.info).mockReset();
  vi.mocked(logger.error).mockReset();
});

describe('PUT /api/v1/admin/roles: who may call it', () => {
  it('returns 401 without a token and changes nothing', async () => {
    const res = await PUT(put({ accountId: PLAYER, role: 'moderator' }));
    expect(res.status).toBe(401);
    expect(setRole).not.toHaveBeenCalled();
  });

  it('returns 401 for a forged token', async () => {
    const req = put({ accountId: PLAYER, role: 'admin' });
    req.headers.set('Authorization', `Bearer ${ADMIN}.9999999999.forged`);
    expect((await PUT(req)).status).toBe(401);
    expect(setRole).not.toHaveBeenCalled();
  });

  it.each([
    ['a player', PLAYER],
    ['a moderator', MODERATOR],
    ['an account with no users row', GHOST],
  ])('returns 403 NOT_ALLOWED for %s', async (_who, caller) => {
    const res = await PUT(put({ accountId: PLAYER, role: 'admin' }, caller));
    expect(res.status).toBe(403);
    expect(await code(res)).toBe('NOT_ALLOWED');
    expect(setRole).not.toHaveBeenCalled();
  });

  it('returns 403 before validating, so a player learns nothing from the error', async () => {
    const res = await PUT(put({ accountId: 'nope', role: 'owner' }, PLAYER));
    expect(res.status).toBe(403);
  });

  it('ignores an account supplied in the body', async () => {
    const res = await PUT(put({ accountId: PLAYER, role: 'admin', authAccount: { id: ADMIN }, account: { id: ADMIN } }, PLAYER));
    expect(res.status).toBe(403);
    expect(setRole).not.toHaveBeenCalled();
  });

  it('returns 500 and changes nothing when the caller role cannot be read', async () => {
    vi.mocked(roleOf).mockRejectedValueOnce(new Error('db down'));
    const res = await PUT(put({ accountId: PLAYER, role: 'moderator' }, ADMIN));
    expect(res.status).toBe(500);
    expect(setRole).not.toHaveBeenCalled();
  });
});

describe('PUT /api/v1/admin/roles: validation', () => {
  it.each([
    ['a non-uuid account id', { accountId: 'nope', role: 'moderator' }],
    ['an unknown role', { accountId: PLAYER, role: 'owner' }],
    ['a role in the wrong case', { accountId: PLAYER, role: 'Admin' }],
    ['a missing role', { accountId: PLAYER }],
    ['a missing account id', { role: 'moderator' }],
    ['a body that is not an object', 'null'],
    ['a body that is not JSON', '{oops'],
  ])('returns 400 for %s', async (_what, body) => {
    const res = await PUT(put(body, ADMIN));
    expect(res.status).toBe(400);
    expect(await code(res)).toBe('VALIDATION_ERROR');
    expect(setRole).not.toHaveBeenCalled();
  });

  it('returns 409 when an admin changes their own role, in any letter case', async () => {
    for (const id of [ADMIN, ADMIN.toUpperCase()]) {
      const res = await PUT(put({ accountId: id, role: 'user' }, ADMIN));
      expect(res.status).toBe(409);
      expect(await code(res)).toBe('CONFLICT');
    }
    expect(setRole).not.toHaveBeenCalled();
    expect(roles[ADMIN]).toBe('admin');
  });

  it('returns 404 when the target account does not exist', async () => {
    const res = await PUT(put({ accountId: GHOST, role: 'moderator' }, ADMIN));
    expect(res.status).toBe(404);
    expect(await code(res)).toBe('NOT_FOUND');
    expect(setRole).not.toHaveBeenCalled();
  });

  it('returns 404 when the account disappears between the read and the write', async () => {
    vi.mocked(setRole).mockResolvedValueOnce(false);
    const res = await PUT(put({ accountId: PLAYER, role: 'moderator' }, ADMIN));
    expect(res.status).toBe(404);
  });
});

describe('PUT /api/v1/admin/roles: changing a role', () => {
  it('lets an admin grant moderator and logs who changed what', async () => {
    const res = await PUT(put({ accountId: PLAYER, role: 'moderator' }, ADMIN));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, data: { accountId: PLAYER, role: 'moderator' } });
    expect(setRole).toHaveBeenCalledWith(PLAYER, 'moderator');
    expect(roles[PLAYER]).toBe('moderator');
    expect(logger.info).toHaveBeenCalledWith('role_changed', { actorId: ADMIN, targetId: PLAYER, from: 'user', to: 'moderator' });
  });

  it('lets an admin revoke a role back to user', async () => {
    const res = await PUT(put({ accountId: MODERATOR, role: 'user' }, ADMIN));
    expect(res.status).toBe(200);
    expect(roles[MODERATOR]).toBe('user');
  });

  it('lets an admin grant admin to another account', async () => {
    expect((await PUT(put({ accountId: PLAYER, role: 'admin' }, ADMIN))).status).toBe(200);
    expect(roles[PLAYER]).toBe('admin');
  });

  it('accepts an upper-case account id and acts on the same account', async () => {
    const res = await PUT(put({ accountId: PLAYER.toUpperCase(), role: 'moderator' }, ADMIN));
    expect(res.status).toBe(200);
    expect(setRole).toHaveBeenCalledWith(PLAYER, 'moderator');
  });

  it('succeeds without writing or logging when the role is already set', async () => {
    const res = await PUT(put({ accountId: MODERATOR, role: 'moderator' }, ADMIN));
    expect(res.status).toBe(200);
    expect(setRole).not.toHaveBeenCalled();
    expect(logger.info).not.toHaveBeenCalled();
  });

  it('returns 500 and logs when the write fails', async () => {
    vi.mocked(setRole).mockRejectedValueOnce(new Error('db down'));
    const res = await PUT(put({ accountId: PLAYER, role: 'moderator' }, ADMIN));
    expect(res.status).toBe(500);
    expect(await code(res)).toBe('SERVER_ERROR');
    expect(logger.error).toHaveBeenCalled();
  });

  it('applies a revocation on the very next request', async () => {
    await PUT(put({ accountId: MODERATOR, role: 'admin' }, ADMIN));
    expect((await PUT(put({ accountId: PLAYER, role: 'moderator' }, MODERATOR))).status).toBe(200);
    await PUT(put({ accountId: MODERATOR, role: 'user' }, ADMIN));
    expect((await PUT(put({ accountId: PLAYER, role: 'user' }, MODERATOR))).status).toBe(403);
  });
});
