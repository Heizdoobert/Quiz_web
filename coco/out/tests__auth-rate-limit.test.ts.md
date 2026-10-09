# tests/auth-rate-limit.test.ts
lines:163 exports:
---
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { allowAttempt, allowAttemptFromIp, clientIp } from '../lib/services/rate-limit';
import {
  requestEmailCode,
  verifyEmailCode,
  signInWithUsername,
  signUpWithUsername,
  signInWithWallet,
  linkWallet,
} from '../lib/actions/auth-actions';
import { supabase } from '../lib/supabase/supabase';
import { supabaseAdmin } from '../lib/supabase/supabase-admin';
import { publicClientFor } from '../lib/services/chain';
import { getSessionAccount } from '../lib/services/session';

let forwardedFor: string | null = null;

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({ get: vi.fn(), set: vi.fn(), delete: vi.fn() })),
  headers: vi.fn(async () => {
    const h = new Headers({ host: 'localhost:3000' });
    if (forwardedFor) h.set('x-forwarded-for', forwardedFor);
    return h;
  }),
}));
vi.mock('../lib/supabase/supabase', () => ({
  supabase: {
    auth: { signInWithOtp: vi.fn(), verifyOtp: vi.fn(), signInWithPassword: vi.fn(), signUp: vi.fn() },
  },
}));
vi.mock('../lib/supabase/supabase-admin', () => ({
  supabaseAdmin: { rpc: vi.fn(), auth: { admin: { createUser: vi.fn() } } },
}));
vi.mock('../lib/services/chain', () => ({ publicClientFor: vi.fn() }));
vi.mock('../lib/services/session', () => ({
  getSessionAccount: vi.fn(),
  setSessionAccount: vi.fn(),
  clearSessionAccount: vi.fn(),
  shouldUseSecureCookies: vi.fn(),
}));
