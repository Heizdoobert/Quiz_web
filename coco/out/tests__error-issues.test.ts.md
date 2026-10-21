# tests/error-issues.test.ts
lines:95 exports:
---
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

