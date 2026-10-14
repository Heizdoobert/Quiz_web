# tests/sdk-server-express.test.ts
lines:124 exports:
---
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
