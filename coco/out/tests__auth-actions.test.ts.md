# tests/auth-actions.test.ts
lines:191 exports:
---
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setSessionAccount, getSessionAccount, clearSessionAccount } from '../lib/services/session';
import {
  signOut,
  getSessionInfo,
  signUpWithUsername,
  signInWithUsername,
} from '../lib/actions/auth-actions';
import { supabase } from '../lib/sdk/supabase';
import { supabaseAdmin } from '../lib/sdk/supabase-admin';

// In-memory cookie store
const cookieStore = new Map<string, { value: string; [key: string]: unknown }>();

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: vi.fn((name: string) => cookieStore.get(name)),
    set: vi.fn((name: string, value: string, options?: Record<string, unknown>) => {
      cookieStore.set(name, { value, ...options });
    }),
    delete: vi.fn((name: string) => {
      cookieStore.delete(name);
    }),
  })),
  headers: vi.fn(async () => new Headers({ host: 'localhost:3000', 'x-forwarded-proto': 'http' })),
}));

vi.mock('../lib/sdk/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } }, error: null }),
      signUp: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } }, error: null }),
      signInWithOtp: vi.fn().mockResolvedValue({ data: {}, error: null }),
      verifyOtp: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } }, error: null }),
    },
