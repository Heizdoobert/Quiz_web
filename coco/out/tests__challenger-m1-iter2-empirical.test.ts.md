# tests/challenger-m1-iter2-empirical.test.ts
lines:464 exports:
---
// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createResetToken,
  verifyResetToken,
  clearUsedResetTokens,
  requestPasswordReset,
  verifyPasswordResetCode,
  updatePasswordWithReset,
} from '@/lib/services/auth/password-reset';
import {
  signUpWithEmail,
  signInWithEmail,
} from '@/lib/services/auth/credentials';
import { supabase } from '@/lib/sdk/supabase';
import { supabaseAdmin } from '@/lib/sdk/supabase-admin';
import * as rateLimitModule from '@/lib/services/auth/rate-limit';
import { createHmac, createHash } from 'node:crypto';

// In-memory cookie jar mock for server actions
const cookieStore = new Map<string, { value: string; [key: string]: unknown }>();
let requestHeaders = new Headers({ host: 'localhost:3000', 'x-forwarded-proto': 'https' });

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
  headers: vi.fn(async () => requestHeaders),
}));

vi.mock('@/lib/sdk/supabase', () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
