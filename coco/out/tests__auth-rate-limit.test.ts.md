# tests/auth-rate-limit.test.ts
lines:140 exports:
---
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { allowAttempt, allowAttemptFromIp, clientIp } from '../lib/services/rate-limit';
import {
  requestEmailCode,
  verifyEmailCode,
  signInWithUsername,
  signUpWithUsername,
} from '../lib/actions/auth-actions';
import { supabase } from '../lib/sdk/supabase';
import { supabaseAdmin } from '../lib/sdk/supabase-admin';

let forwardedFor: string | null = null;

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({ get: vi.fn(), set: vi.fn(), delete: vi.fn() })),
  headers: vi.fn(async () => {
    const h = new Headers({ host: 'localhost:3000' });
    if (forwardedFor) h.set('x-forwarded-for', forwardedFor);
    return h;
  }),
}));
vi.mock('../lib/sdk/supabase', () => ({
  supabase: {
    auth: { signInWithOtp: vi.fn(), verifyOtp: vi.fn(), signInWithPassword: vi.fn(), signUp: vi.fn() },
  },
}));
vi.mock('../lib/sdk/supabase-admin', () => ({
  supabaseAdmin: { rpc: vi.fn(), auth: { admin: { createUser: vi.fn() } } },
}));
vi.mock('../lib/services/session', () => ({
  getSessionAccount: vi.fn(),
  setSessionAccount: vi.fn(),
  clearSessionAccount: vi.fn(),
  shouldUseSecureCookies: vi.fn(),
}));
vi.mock('../lib/services/users', () => ({ ensureAccountForAuthUser: vi.fn() }));

const rpc = () => supabaseAdmin!.rpc as unknown as ReturnType<typeof vi.fn>;
const allow = () => rpc().mockResolvedValue({ data: true, error: null });
