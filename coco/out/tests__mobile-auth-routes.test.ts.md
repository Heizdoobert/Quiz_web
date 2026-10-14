# tests/mobile-auth-routes.test.ts
lines:111 exports:
---
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as password } from '@/app/api/mobile/v1/auth/password/route';
import { POST as google } from '@/app/api/mobile/v1/auth/google/route';
import { GET as questions } from '@/app/api/mobile/v1/quiz/questions/route';
import { verifyMobileAuthToken } from '@/lib/services/mobile-auth';
import { signInAccount, signInAccountWithGoogle, signUpAccount } from '@/lib/services/credentials';
import { fetchRandomQuestion } from '@/lib/actions/question-actions';

vi.mock('@/lib/services/credentials');
vi.mock('@/lib/actions/question-actions');

const post = (body: unknown, bearer?: string) =>
  new NextRequest('http://localhost/api/mobile/v1/x', {
    method: 'POST',
    headers: bearer ? { Authorization: `Bearer ${bearer}` } : {},
    body: JSON.stringify(body),
  });

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('SUPABASE_SECRET_KEY', 'test-secret');
});
afterEach(() => vi.unstubAllEnvs());

describe('POST auth/password', () => {
  it('signs in and returns a token', async () => {
    vi.mocked(signInAccount).mockResolvedValue({ ok: true, account: { id: 'u1' } });

    const res = await password(post({ mode: 'signin', username: 'ada', password: 'secret1' }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toMatchObject({ accountId: 'u1' });
    expect(verifyMobileAuthToken(json.token)).toEqual({ id: 'u1' });
  });

  it('signs up through signUpAccount', async () => {
    vi.mocked(signUpAccount).mockResolvedValue({ ok: true, account: { id: 'u2' } });

