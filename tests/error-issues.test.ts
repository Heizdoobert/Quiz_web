import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { listErrorIssues } from '@/lib/services/error-issues';
import { roleOf } from '@/lib/db/roles';
import { logger } from '@/lib/logger';

vi.mock('@/lib/db/roles', () => ({ roleOf: vi.fn() }));
vi.mock('@/lib/services/session', () => ({ getSessionAccount: vi.fn().mockResolvedValue(null) }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));

const ADMIN = { id: '00000000-0000-4000-8000-0000000000a1' };
const MODERATOR = { id: '00000000-0000-4000-8000-0000000000b2' };
const fetchMock = vi.fn();
const env = { ...process.env };

function sentryIssue(over: Record<string, unknown> = {}) {
  return { id: '1', title: 'TypeError: x', level: 'error', count: '150', lastSeen: '2026-10-13T08:00:00Z', permalink: 'https://sentry.io/o/p/issues/1/', ...over };
}
const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body });

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  vi.mocked(roleOf).mockReset().mockImplementation(async (id) => (id === ADMIN.id ? 'admin' : 'moderator'));
  vi.mocked(logger.error).mockClear();
  process.env.SENTRY_AUTH_TOKEN = 'secret-token';
  process.env.SENTRY_ORG = 'my-org';
  process.env.SENTRY_PROJECT = 'my-project';
});
afterEach(() => {
  vi.unstubAllGlobals();
  process.env = { ...env };
});

describe('listErrorIssues', () => {
  it('denies a moderator and a guest without calling Sentry', async () => {
    expect(await listErrorIssues(MODERATOR)).toMatchObject({ success: false, error: { code: 'NOT_ALLOWED' } });
    expect(await listErrorIssues()).toMatchObject({ success: false, error: { code: 'UNAUTHORIZED' } });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(['SENTRY_AUTH_TOKEN', 'SENTRY_ORG', 'SENTRY_PROJECT'])('is not configured when %s is missing, and does not call Sentry', async (name) => {
    delete process.env[name];
    expect(await listErrorIssues(ADMIN)).toEqual({ success: true, data: { configured: false } });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('asks the organization endpoint for the top unresolved issues with a bearer token', async () => {
    fetchMock.mockResolvedValue(ok([sentryIssue()]));
    const res = await listErrorIssues(ADMIN);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://sentry.io/api/0/organizations/my-org/issues/?project=my-project&query=is%3Aunresolved&sort=freq&limit=25');
    expect(init.headers.Authorization).toBe('Bearer secret-token');
    expect(init.cache).toBe('no-store');
    expect(res).toEqual({
      success: true,
      data: { configured: true, issues: [{ id: '1', title: 'TypeError: x', level: 'error', count: 150, lastSeen: '2026-10-13T08:00:00Z', link: 'https://sentry.io/o/p/issues/1/' }] },
    });
  });

  it('encodes the org and project into the URL', async () => {
    process.env.SENTRY_ORG = 'a/b?c';
    fetchMock.mockResolvedValue(ok([]));
    await listErrorIssues(ADMIN);
    expect(fetchMock.mock.calls[0][0]).toContain('/organizations/a%2Fb%3Fc/issues/');
  });

  it.each(['javascript:alert(1)', 'http://sentry.io/x', 'data:text/html,x', ''])('drops the unsafe link %j', async (permalink) => {
    fetchMock.mockResolvedValue(ok([sentryIssue({ permalink })]));
    const res = await listErrorIssues(ADMIN);
    expect(res).toMatchObject({ success: true, data: { issues: [{ link: null }] } });
  });

  it('skips items that are not objects and survives a non-numeric count and a non-string title', async () => {
    fetchMock.mockResolvedValue(ok([null, 'x', sentryIssue({ count: 'many', title: 42 })]));
    const res = await listErrorIssues(ADMIN);
    expect(res).toMatchObject({ success: true, data: { issues: [{ id: '1', count: 0, title: '' }] } });
    expect(res.success && res.data.configured && res.data.issues).toHaveLength(1);
  });

  it('fails generically, with no body and no token, on a non-2xx answer', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 401, json: async () => ({ detail: 'secret-token rejected' }) });
    const res = await listErrorIssues(ADMIN);
    expect(res).toEqual({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to load error tracking.' } });
    expect(JSON.stringify(vi.mocked(logger.error).mock.calls)).not.toContain('secret-token');
  });

  it('fails generically when the answer is not a list, when fetch throws, and on a bad body', async () => {
    fetchMock.mockResolvedValueOnce(ok({ detail: 'x' }));
    expect(await listErrorIssues(ADMIN)).toMatchObject({ success: false });
    fetchMock.mockRejectedValueOnce(new Error('network down'));
    expect(await listErrorIssues(ADMIN)).toMatchObject({ success: false, error: { message: 'Failed to load error tracking.' } });
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200, json: async () => { throw new Error('bad json'); } });
    expect(await listErrorIssues(ADMIN)).toMatchObject({ success: false });
  });
});
