# tests/identity-accounts.test.ts
lines:135 exports:
---
import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { getSessionAccount, setSessionAccount } from '../lib/services/session';
import { requestEmailCode, verifyEmailCode } from '../lib/actions/auth-actions';
import { supabaseAdmin } from '../lib/sdk/supabase-admin';
import { supabase } from '../lib/sdk/supabase';

const ACCOUNT_ID = '11111111-2222-4333-8444-555555555555';
const OTHER_ID = '99999999-2222-4333-8444-555555555555';

const state = vi.hoisted(() => ({ jar: new Map<string, string>() }));

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (state.jar.has(name) ? { value: state.jar.get(name)! } : undefined),
    set: (name: string, value: string) => void state.jar.set(name, value),
    delete: (name: string) => void state.jar.delete(name),
  }),
  headers: async () => ({ get: (k: string) => (k === 'host' ? 'quiz.example.com' : null) }),
}));
vi.mock('../lib/sdk/supabase-admin', () => ({ supabaseAdmin: { from: vi.fn() } }));
vi.mock('../lib/sdk/supabase', () => ({
  supabase: { auth: { signInWithOtp: vi.fn(), verifyOtp: vi.fn() } },
}));

function mockUsersTable(lookup: { data: { id: string } | null; error: unknown }, upsertError: unknown = null) {
  const upsert = vi.fn().mockResolvedValue({ error: upsertError });
  const single = vi.fn().mockResolvedValue(lookup);
  const eq = vi.fn(() => ({ single }));
  (supabaseAdmin!.from as Mock).mockReturnValue({ upsert, select: () => ({ eq }) });
  return { upsert, eq };
}

beforeEach(() => {
  vi.resetAllMocks();
  state.jar.clear();
  process.env.SUPABASE_SECRET_KEY = 'test-secret';
});

afterEach(() => {
  vi.useRealTimers();
