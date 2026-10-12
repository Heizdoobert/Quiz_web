import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/v1/moderation/questions/route';
import { POST } from '@/app/api/v1/moderation/questions/[id]/resolve/route';
import { issueMobileAuthToken } from '@/lib/services/mobile-auth';
import { roleOf } from '@/lib/db/roles';
import { answerKey, quarantinedQuestions, resolveQuarantined } from '@/lib/db/questions';
import { logger } from '@/lib/logger';

vi.mock('@/lib/db/roles', () => ({ roleOf: vi.fn(), setRole: vi.fn() }));
vi.mock('@/lib/db/questions', () => ({ answerKey: vi.fn(), quarantinedQuestions: vi.fn(), resolveQuarantined: vi.fn() }));
vi.mock('@/lib/services/session', () => ({ getSessionAccount: vi.fn().mockResolvedValue(null) }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));

const ADMIN = '00000000-0000-4000-8000-0000000000a1';
const MODERATOR = '00000000-0000-4000-8000-0000000000b2';
const PLAYER = '00000000-0000-4000-8000-0000000000c3';
const GHOST = '00000000-0000-4000-8000-0000000000d4';
const QUESTION = '00000000-0000-4000-8000-000000000002';

const ROLES: Record<string, string> = { [ADMIN]: 'admin', [MODERATOR]: 'moderator', [PLAYER]: 'user' };

function headers(callerId?: string) {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (callerId) h.Authorization = `Bearer ${issueMobileAuthToken({ id: callerId })}`;
  return h;
}

function list(callerId?: string, query = '') {
  return GET(new NextRequest(`http://localhost/api/v1/moderation/questions${query}`, { headers: headers(callerId) }));
}

function resolve(id: string, body: unknown, callerId?: string) {
  const req = new NextRequest(`http://localhost/api/v1/moderation/questions/${id}/resolve`, {
    method: 'POST',
    headers: headers(callerId),
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
  return POST(req, { params: Promise.resolve({ id }) });
}

async function code(res: Response) {
  return (await res.json()).error?.code;
}

const QUEUED = {
  id: QUESTION,
  category: 'Science',
  prompt: 'Which planet is closest to the sun?',
  options: ['Mercury', 'Venus', 'Earth', 'Mars'],
  correct_index: 0,
  explanation: 'It orbits at 0.39 AU.',
  dispute_count: 3,
  created_at: '2026-10-01T00:00:00Z',
  disputes: [{ id: 'd1', reason: 'Wrong answer', created_at: '2026-10-02T00:00:00Z' }],
};

beforeEach(() => {
  vi.mocked(roleOf).mockReset().mockImplementation(async (id) => ROLES[id] ?? null);
  vi.mocked(quarantinedQuestions).mockReset().mockResolvedValue([QUEUED]);
  vi.mocked(resolveQuarantined).mockReset().mockResolvedValue(true);
  vi.mocked(answerKey).mockReset().mockResolvedValue({ correct_index: 0, status: 'quarantined', list_id: null });
  vi.mocked(logger.info).mockReset();
  vi.mocked(logger.error).mockReset();
});

describe('GET /api/v1/moderation/questions', () => {
  it('returns 401 without a token and reads nothing', async () => {
    expect((await list()).status).toBe(401);
    expect(quarantinedQuestions).not.toHaveBeenCalled();
  });

  it.each([
    ['a player', PLAYER],
    ['an account with no users row', GHOST],
  ])('returns 403 NOT_ALLOWED for %s, so the answer key stays hidden', async (_who, caller) => {
    const res = await list(caller);
    expect(res.status).toBe(403);
    expect(await code(res)).toBe('NOT_ALLOWED');
    expect(quarantinedQuestions).not.toHaveBeenCalled();
  });

  it.each([
    ['a moderator', MODERATOR],
    ['an admin', ADMIN],
  ])('lets %s read the queue with the answer key and open dispute reasons', async (_who, caller) => {
    const res = await list(caller);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, data: { questions: [QUEUED], limit: 20, offset: 0 } });
    expect(JSON.stringify(QUEUED)).not.toContain('reporter');
  });

  it('pages with limit and offset, capped at 50', async () => {
    await list(MODERATOR, '?limit=10&offset=30');
    expect(quarantinedQuestions).toHaveBeenLastCalledWith(10, 30);
    await list(MODERATOR, '?limit=5000');
    expect(quarantinedQuestions).toHaveBeenLastCalledWith(50, 0);
  });

  it.each(['?limit=abc&offset=-4', '?limit=0', '?limit=-1&offset=x'])('falls back to the defaults for %s', async (query) => {
    await list(MODERATOR, query);
    expect(quarantinedQuestions).toHaveBeenLastCalledWith(20, 0);
  });

  it('returns 500 and logs when the read fails', async () => {
    vi.mocked(quarantinedQuestions).mockRejectedValueOnce(new Error('db down'));
    const res = await list(MODERATOR);
    expect(res.status).toBe(500);
    expect(logger.error).toHaveBeenCalled();
  });

  it('applies a revocation on the very next request', async () => {
    expect((await list(MODERATOR)).status).toBe(200);
    ROLES[MODERATOR] = 'user';
    try {
      expect((await list(MODERATOR)).status).toBe(403);
    } finally {
      ROLES[MODERATOR] = 'moderator';
    }
  });
});

describe('POST /api/v1/moderation/questions/[id]/resolve: who may call it', () => {
  it('returns 401 without a token and changes nothing', async () => {
    expect((await resolve(QUESTION, { outcome: 'restore' })).status).toBe(401);
    expect(resolveQuarantined).not.toHaveBeenCalled();
  });

  it.each([
    ['a player', PLAYER],
    ['an account with no users row', GHOST],
  ])('returns 403 NOT_ALLOWED for %s', async (_who, caller) => {
    const res = await resolve(QUESTION, { outcome: 'restore' }, caller);
    expect(res.status).toBe(403);
    expect(await code(res)).toBe('NOT_ALLOWED');
    expect(resolveQuarantined).not.toHaveBeenCalled();
  });

  it('returns 403 before validating, so a player learns nothing from the error', async () => {
    expect((await resolve('nope', { outcome: 'bogus' }, PLAYER)).status).toBe(403);
  });

  it('ignores a moderator id supplied in the body', async () => {
    await resolve(QUESTION, { outcome: 'restore', moderatorId: ADMIN, resolvedBy: ADMIN }, MODERATOR);
    expect(resolveQuarantined).toHaveBeenCalledWith(QUESTION, 'restored', MODERATOR, null);
  });

  it('returns 500 and changes nothing when the caller role cannot be read', async () => {
    vi.mocked(roleOf).mockRejectedValueOnce(new Error('db down'));
    expect((await resolve(QUESTION, { outcome: 'restore' }, MODERATOR)).status).toBe(500);
    expect(resolveQuarantined).not.toHaveBeenCalled();
  });
});

describe('POST /api/v1/moderation/questions/[id]/resolve: validation', () => {
  it.each([
    ['a non-uuid question id', 'nope', { outcome: 'restore' }],
    ['an unknown outcome', QUESTION, { outcome: 'delete' }],
    ['an outcome in the wrong case', QUESTION, { outcome: 'Restore' }],
    ['the database spelling of an outcome', QUESTION, { outcome: 'restored' }],
    ['a missing outcome', QUESTION, {}],
    ['a note that is not a string', QUESTION, { outcome: 'retire', note: 42 }],
    ['a note over 500 characters', QUESTION, { outcome: 'retire', note: 'x'.repeat(501) }],
    ['a body that is not an object', QUESTION, 'null'],
    ['a body that is not JSON', QUESTION, '{oops'],
  ])('returns 400 for %s', async (_what, id, body) => {
    const res = await resolve(id, body, MODERATOR);
    expect(res.status).toBe(400);
    expect(await code(res)).toBe('VALIDATION_ERROR');
    expect(resolveQuarantined).not.toHaveBeenCalled();
  });
});

describe('POST /api/v1/moderation/questions/[id]/resolve: resolving', () => {
  it.each([
    ['a moderator', MODERATOR],
    ['an admin', ADMIN],
  ])('lets %s restore a question, recording who did it', async (_who, caller) => {
    const res = await resolve(QUESTION, { outcome: 'restore' }, caller);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, data: { questionId: QUESTION, outcome: 'restored' } });
    expect(resolveQuarantined).toHaveBeenCalledWith(QUESTION, 'restored', caller, null);
    expect(logger.info).toHaveBeenCalledWith('dispute_resolved', { moderatorId: caller, questionId: QUESTION, outcome: 'restored' });
  });

  it('retires a question and passes the trimmed note on', async () => {
    const res = await resolve(QUESTION, { outcome: 'retire', note: '  answer key is wrong  ' }, MODERATOR);
    expect(res.status).toBe(200);
    expect((await res.json()).data.outcome).toBe('retired');
    expect(resolveQuarantined).toHaveBeenCalledWith(QUESTION, 'retired', MODERATOR, 'answer key is wrong');
  });

  it.each([[undefined], [null], [''], ['   ']])('treats the note %j as no note', async (note) => {
    await resolve(QUESTION, { outcome: 'restore', note }, MODERATOR);
    expect(resolveQuarantined).toHaveBeenLastCalledWith(QUESTION, 'restored', MODERATOR, null);
  });

  it('accepts a note of exactly 500 characters', async () => {
    const note = 'x'.repeat(500);
    expect((await resolve(QUESTION, { outcome: 'restore', note }, MODERATOR)).status).toBe(200);
    expect(resolveQuarantined).toHaveBeenCalledWith(QUESTION, 'restored', MODERATOR, note);
  });

  it('accepts an upper-case question id and acts on the same question', async () => {
    await resolve(QUESTION.toUpperCase(), { outcome: 'restore' }, MODERATOR);
    expect(resolveQuarantined).toHaveBeenCalledWith(QUESTION, 'restored', MODERATOR, null);
  });

  it('returns 409 when the question is not quarantined or was already resolved', async () => {
    vi.mocked(resolveQuarantined).mockResolvedValueOnce(false);
    const res = await resolve(QUESTION, { outcome: 'restore' }, MODERATOR);
    expect(res.status).toBe(409);
    expect(await code(res)).toBe('CONFLICT');
    expect(logger.info).not.toHaveBeenCalled();
  });

  it('returns 404 when the question does not exist', async () => {
    vi.mocked(resolveQuarantined).mockResolvedValueOnce(false);
    vi.mocked(answerKey).mockResolvedValueOnce(null);
    const res = await resolve(QUESTION, { outcome: 'restore' }, MODERATOR);
    expect(res.status).toBe(404);
    expect(await code(res)).toBe('NOT_FOUND');
  });

  it('returns 500 and logs when the write fails', async () => {
    vi.mocked(resolveQuarantined).mockRejectedValueOnce(new Error('db down'));
    const res = await resolve(QUESTION, { outcome: 'restore' }, MODERATOR);
    expect(res.status).toBe(500);
    expect(await code(res)).toBe('SERVER_ERROR');
    expect(logger.error).toHaveBeenCalled();
  });
});
