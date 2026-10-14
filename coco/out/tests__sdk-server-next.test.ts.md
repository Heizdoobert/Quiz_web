# tests/sdk-server-next.test.ts
lines:173 exports:
---
// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { withQuickQuizAuth, createTokenVerifier, type TokenVerifier } from '../sdk/src/server';

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

