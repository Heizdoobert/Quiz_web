# tests/sdk-server-verifier.test.ts
lines:159 exports:
---
// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTokenVerifier, getBearerToken } from '../sdk/src/server';
import { QuickQuizError } from '../sdk/src/errors';

const baseUrl = 'https://quickquiz.app/api';
const alice = { id: 'acc-1', username: 'alice' };

const ok = (data: unknown = alice) =>
  new Response(JSON.stringify({ success: true, data }), { status: 200 });
const fail = (status: number, code: string, message: string) =>
  new Response(JSON.stringify({ success: false, error: { code, message } }), { status });

function setup(options: { ttlMs?: number; maxEntries?: number } = {}) {
  const fetchMock = vi.fn<typeof fetch>(async () => ok());
  const verifier = createTokenVerifier({ baseUrl, fetch: fetchMock, ...options });
  return { fetchMock, verifier };
}

describe('createTokenVerifier', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('verifies a token against /v1/auth/session with a Bearer header', async () => {
    const { fetchMock, verifier } = setup();

    await expect(verifier.verify('tok-1')).resolves.toEqual(alice);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://quickquiz.app/api/v1/auth/session');
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer tok-1');
  });

  it('serves repeat calls inside the TTL from cache', async () => {
    const { fetchMock, verifier } = setup({ ttlMs: 30_000 });
