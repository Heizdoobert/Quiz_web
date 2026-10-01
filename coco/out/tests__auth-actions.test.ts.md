# tests/auth-actions.test.ts
lines:146 exports:
---
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setSessionAccount, getSessionAccount, clearSessionAccount } from '../lib/session';
import {
  getAuthNonce,
  requestSignIn,
  signInWithWallet,
  signOutWallet,
  getSessionInfo,
} from '../lib/actions/auth-actions';
import { supabaseAdmin } from '../lib/supabase-admin';
import { publicClientFor } from '../lib/chain';

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

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

vi.mock('../lib/supabase-admin', () => ({
  supabaseAdmin: {
