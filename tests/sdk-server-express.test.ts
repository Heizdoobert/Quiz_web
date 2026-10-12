// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { quickQuizAuth, type QuickQuizRequest, type TokenVerifier } from '../sdk/src/server';

const alice = { id: 'acc-1', username: 'alice' };
const missing = { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication token required' } };
const invalid = { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } };
const upstream = {
  success: false,
  error: { code: 'UPSTREAM_UNAVAILABLE', message: 'Authentication service unavailable' },
};

function setup(verdict: 'alice' | 'null' | 'throw' = 'alice', authorization?: string) {
  const verifier = {
    verify: vi.fn<TokenVerifier['verify']>(async () => {
      if (verdict === 'throw') throw new Error('quick quiz down');
      return verdict === 'alice' ? alice : null;
    }),
  };
  const req: QuickQuizRequest = { headers: authorization ? { authorization } : {} };
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  const next = vi.fn();
  return { verifier, req, res: { status }, json, status, next };
}

describe('quickQuizAuth (required)', () => {
  it('answers 401 and does not call next when there is no token', async () => {
    const { verifier, req, res, status, json, next } = setup('alice');

    await quickQuizAuth(verifier)(req, res, next);

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith(missing);
    expect(next).not.toHaveBeenCalled();
    expect(verifier.verify).not.toHaveBeenCalled();
  });

  it('answers 401 for a token Quick Quiz rejects', async () => {
    const { verifier, req, res, status, json, next } = setup('null', 'Bearer bad');

    await quickQuizAuth(verifier)(req, res, next);

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith(invalid);
    expect(next).not.toHaveBeenCalled();
  });

  it('sets req.quickQuizAccount and calls next once for a good token', async () => {
    const { verifier, req, res, status, next } = setup('alice', 'Bearer good');

    await quickQuizAuth(verifier)(req, res, next);

    expect(verifier.verify).toHaveBeenCalledWith('good');
    expect(req.quickQuizAccount).toEqual(alice);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
    expect(status).not.toHaveBeenCalled();
  });
});

describe('quickQuizAuth (optional)', () => {
  it.each([
    ['no token', 'alice', undefined],
    ['a rejected token', 'null', 'Bearer bad'],
  ] as const)('sets null and calls next for %s', async (_label, verdict, authorization) => {
    const { verifier, req, res, status, next } = setup(verdict, authorization);

    await quickQuizAuth(verifier, { optional: true })(req, res, next);

    expect(req.quickQuizAccount).toBeNull();
    expect(next).toHaveBeenCalledTimes(1);
    expect(status).not.toHaveBeenCalled();
  });

  it('sets the account for a good token', async () => {
    const { verifier, req, res, next } = setup('alice', 'Bearer good');

    await quickQuizAuth(verifier, { optional: true })(req, res, next);

    expect(req.quickQuizAccount).toEqual(alice);
    expect(next).toHaveBeenCalledTimes(1);
  });
});

describe('quickQuizAuth (Quick Quiz unreachable)', () => {
  it('required: answers 503, never calls next, and does not reject', async () => {
    const { verifier, req, res, status, json, next } = setup('throw', 'Bearer good');
    const onError = vi.fn();

    await expect(quickQuizAuth(verifier, { onError })(req, res, next)).resolves.toBeUndefined();

    expect(status).toHaveBeenCalledWith(503);
    expect(json).toHaveBeenCalledWith(upstream);
    expect(next).not.toHaveBeenCalled();
    expect(req.quickQuizAccount).toBeUndefined();
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'quick quiz down' }));
  });

  it('optional: continues as anonymous and still reports the error', async () => {
    const { verifier, req, res, status, next } = setup('throw', 'Bearer good');
    const onError = vi.fn();

    await quickQuizAuth(verifier, { optional: true, onError })(req, res, next);

    expect(req.quickQuizAccount).toBeNull();
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
    expect(status).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'quick quiz down' }));
  });

  it.each([[false], [true]])('survives a throwing onError (optional: %s)', async (optional) => {
    const { verifier, req, res, status, next } = setup('throw', 'Bearer good');
    const onError = () => {
      throw new Error('logger broke');
    };

    await expect(quickQuizAuth(verifier, { optional, onError })(req, res, next)).resolves.toBeUndefined();

    if (optional) expect(next).toHaveBeenCalledTimes(1);
    else expect(status).toHaveBeenCalledWith(503);
  });
});
