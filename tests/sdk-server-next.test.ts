// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { withQuickQuizAuth } from '../packages/sdk/src/server/next';
import { createTokenVerifier, type TokenVerifier } from '../packages/sdk/src/server/verifier';

const alice = { id: 'acc-1', username: 'alice' };
const missing = { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication token required' } };
const invalid = { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } };
const upstream = {
  success: false,
  error: { code: 'UPSTREAM_UNAVAILABLE', message: 'Authentication service unavailable' },
};

const req = (authorization?: string) =>
  new Request('https://host.example/api/me', { headers: authorization ? { authorization } : {} });
const ctx = { params: Promise.resolve({}) };

function setup(verdict: 'alice' | 'null' | 'throw' = 'alice') {
  const verifier = {
    verify: vi.fn<TokenVerifier['verify']>(async () => {
      if (verdict === 'throw') throw new Error('quick quiz down');
      return verdict === 'alice' ? alice : null;
    }),
  };
  const handler = vi.fn(async () => Response.json({ hello: true }));
  return { verifier, handler };
}

describe('withQuickQuizAuth (required)', () => {
  it('answers 401 without calling the verifier when there is no token', async () => {
    const { verifier, handler } = setup();

    const res = await withQuickQuizAuth(verifier, handler)(req(), ctx);

    expect(res.status).toBe(401);
    expect(res.headers.get('content-type')).toContain('application/json');
    expect(await res.json()).toEqual(missing);
    expect(verifier.verify).not.toHaveBeenCalled();
    expect(handler).not.toHaveBeenCalled();
  });

  it('treats a non-Bearer scheme as no token', async () => {
    const { verifier, handler } = setup();

    const res = await withQuickQuizAuth(verifier, handler)(req('Basic abc'), ctx);

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual(missing);
  });

  it('answers 401 for a token Quick Quiz rejects', async () => {
    const { verifier, handler } = setup('null');

    const res = await withQuickQuizAuth(verifier, handler)(req('Bearer bad'), ctx);

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual(invalid);
    expect(handler).not.toHaveBeenCalled();
  });

  it('calls the handler with the request, context and account', async () => {
    const { verifier, handler } = setup();
    const request = req('Bearer good');

    const res = await withQuickQuizAuth(verifier, handler)(request, ctx);

    expect(verifier.verify).toHaveBeenCalledWith('good');
    expect(handler).toHaveBeenCalledWith(request, ctx, alice);
    expect(await res.json()).toEqual({ hello: true });
  });
});

describe('withQuickQuizAuth (optional)', () => {
  it('passes null when there is no token, without calling the verifier', async () => {
    const { verifier, handler } = setup();

    await withQuickQuizAuth(verifier, handler, { optional: true })(req(), ctx);

    expect(handler).toHaveBeenCalledWith(expect.any(Request), ctx, null);
    expect(verifier.verify).not.toHaveBeenCalled();
  });

  it('passes null for a token Quick Quiz rejects', async () => {
    const { verifier, handler } = setup('null');

    await withQuickQuizAuth(verifier, handler, { optional: true })(req('Bearer bad'), ctx);

    expect(handler).toHaveBeenCalledWith(expect.any(Request), ctx, null);
  });

  it('passes the account for a good token', async () => {
    const { verifier, handler } = setup();

    await withQuickQuizAuth(verifier, handler, { optional: true })(req('Bearer good'), ctx);

    expect(handler).toHaveBeenCalledWith(expect.any(Request), ctx, alice);
  });
});

describe('withQuickQuizAuth (Quick Quiz unreachable)', () => {
  it.each([[false], [true]])('answers 503 and skips the handler (optional: %s)', async (optional) => {
    const { verifier, handler } = setup('throw');
    const onError = vi.fn();

    const res = await withQuickQuizAuth(verifier, handler, { optional, onError })(req('Bearer good'), ctx);

    expect(res.status).toBe(503);
    expect(await res.json()).toEqual(upstream);
    expect(handler).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'quick quiz down' }));
  });

  it('still answers 503 when onError itself throws', async () => {
    const { verifier, handler } = setup('throw');
    const onError = () => {
      throw new Error('logger broke');
    };

    const res = await withQuickQuizAuth(verifier, handler, { onError })(req('Bearer good'), ctx);

    expect(res.status).toBe(503);
  });
});

describe('withQuickQuizAuth typing', () => {
  it('types the account as non-null when required and nullable when optional', async () => {
    const { verifier } = setup();

    const required = withQuickQuizAuth(verifier, (_req, _ctx, account) => Response.json(account.username));
    // @ts-expect-error account can be null in optional mode
    const optionalBad = withQuickQuizAuth(verifier, (_req, _ctx, account) => Response.json(account.username), {
      optional: true,
    });
    const optional = withQuickQuizAuth(verifier, (_req, _ctx, account) => Response.json(account?.username ?? null), {
      optional: true,
    });

    expect(await (await required(req('Bearer good'), ctx)).json()).toBe('alice');
    expect(await (await optional(req(), ctx)).json()).toBeNull();
    expect(optionalBad).toBeTypeOf('function');
  });
});

describe('withQuickQuizAuth with a real verifier', () => {
  it('turns an upstream 401 into a 401 envelope and a good session into the handler call', async () => {
    const fetchMock = vi.fn<typeof fetch>(async (_url, init) => {
      const auth = (init?.headers as Record<string, string>).Authorization;
      return auth === 'Bearer good'
        ? new Response(JSON.stringify({ success: true, data: alice }), { status: 200 })
        : new Response(
            JSON.stringify({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } }),
            { status: 401 },
          );
    });
    const verifier = createTokenVerifier({ baseUrl: 'https://quickquiz.app/api', fetch: fetchMock });
    const handler = vi.fn(async () => Response.json({ ok: true }));
    const route = withQuickQuizAuth(verifier, handler);

    expect((await route(req('Bearer bad'), ctx)).status).toBe(401);
    expect((await route(req('Bearer good'), ctx)).status).toBe(200);
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
