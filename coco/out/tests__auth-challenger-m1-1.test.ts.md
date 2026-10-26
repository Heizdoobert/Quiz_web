# tests/auth-challenger-m1-1.test.ts
lines:563 exports:
---
// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createResetToken,
  verifyResetToken,
  requestPasswordReset,
  verifyPasswordResetCode,
  updatePasswordWithReset,
} from '@/lib/services/auth/password-reset';
import {
  signUpWithEmail,
  signInWithEmail,
  signUpAccount,
} from '@/lib/services/auth/credentials';
import {
  requestPasswordReset as actionRequestPasswordReset,
  verifyPasswordResetCode as actionVerifyPasswordResetCode,
  updatePasswordWithReset as actionUpdatePasswordWithReset,
  signUpWithEmail as actionSignUpWithEmail,
  signInWithEmail as actionSignInWithEmail,
} from '@/lib/actions/auth-actions';
import { supabase } from '@/lib/sdk/supabase';
import * as rateLimitModule from '@/lib/services/auth/rate-limit';
import { createHmac, createHash } from 'node:crypto';

// In-memory cookie jar mock
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
  headers: vi.fn(async () => new Headers({ host: 'localhost:3000', 'x-forwarded-proto': 'https' })),
}));

