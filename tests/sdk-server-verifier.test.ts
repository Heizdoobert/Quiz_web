// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTokenVerifier, getBearerToken } from '../packages/sdk/src/server';
import { QuickQuizError } from '../packages/sdk/src/errors';

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

    await verifier.verify('tok-1');
    vi.advanceTimersByTime(29_999);
    await expect(verifier.verify('tok-1')).resolves.toEqual(alice);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('fetches again once the TTL has passed', async () => {
    const { fetchMock, verifier } = setup({ ttlMs: 30_000 });

    await verifier.verify('tok-1');
    vi.advanceTimersByTime(30_000);
    await verifier.verify('tok-1');

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('keeps separate verdicts per token', async () => {
    const { fetchMock, verifier } = setup();
    fetchMock.mockImplementation(async (_url, init) => {
      const auth = (init?.headers as Record<string, string>).Authorization;
      return ok({ id: auth, username: auth });
    });

    const a = await verifier.verify('tok-a');
    const b = await verifier.verify('tok-b');

    expect(a).toEqual({ id: 'Bearer tok-a', username: 'Bearer tok-a' });
    expect(b).toEqual({ id: 'Bearer tok-b', username: 'Bearer tok-b' });
  });

  it('returns null for a 401 and caches that verdict', async () => {
    const { fetchMock, verifier } = setup();
    fetchMock.mockImplementation(async () => fail(401, 'UNAUTHORIZED', 'Invalid or expired token'));

    await expect(verifier.verify('bad')).resolves.toBeNull();
    await expect(verifier.verify('bad')).resolves.toBeNull();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('throws on a network error and does not cache it', async () => {
    const { fetchMock, verifier } = setup();
    fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));

    await expect(verifier.verify('tok-1')).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
    await expect(verifier.verify('tok-1')).resolves.toEqual(alice);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each([
    [500, 'SERVER_ERROR'],
    [503, 'SERVICE_UNAVAILABLE'],
    [429, 'RATE_LIMITED'],
  ])('throws on upstream %i and does not cache it', async (status, code) => {
    const { fetchMock, verifier } = setup();
    fetchMock.mockImplementationOnce(async () => fail(status, code, 'nope'));

    const err = await verifier.verify('tok-1').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(QuickQuizError);
    expect(err).toMatchObject({ status });

    await expect(verifier.verify('tok-1')).resolves.toEqual(alice);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('throws when a 200 response is not an account', async () => {
    const { fetchMock, verifier } = setup();
    fetchMock.mockImplementation(async () => ok({ id: 7 }));

    await expect(verifier.verify('tok-1')).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
    await expect(verifier.verify('tok-1')).rejects.toBeInstanceOf(QuickQuizError);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('evicts the oldest entry once maxEntries is exceeded', async () => {
    const { fetchMock, verifier } = setup({ maxEntries: 2 });

    await verifier.verify('tok-a');
    await verifier.verify('tok-b');
    await verifier.verify('tok-c'); // evicts tok-a
    expect(fetchMock).toHaveBeenCalledTimes(3);

    await verifier.verify('tok-b');
    await verifier.verify('tok-c');
    expect(fetchMock).toHaveBeenCalledTimes(3); // still cached

    await verifier.verify('tok-a');
    expect(fetchMock).toHaveBeenCalledTimes(4); // refetched
  });
});

describe('getBearerToken', () => {
  it.each([
    ['Bearer abc', 'abc'],
    ['bearer abc', 'abc'],
    ['BEARER   abc  ', 'abc'],
    [['Bearer abc'], 'abc'],
  ])('reads %j', (header, token) => {
    expect(getBearerToken(header)).toBe(token);
  });

  it.each([
    [undefined],
    [null],
    [''],
    ['Bearer'],
    ['Bearer '],
    ['Basic abc'],
    ['Bearer abc def'],
    ['abc'],
    [['Bearer a', 'Bearer b']],
    [[]],
  ])('rejects %j', (header) => {
    expect(getBearerToken(header)).toBeNull();
  });
});
