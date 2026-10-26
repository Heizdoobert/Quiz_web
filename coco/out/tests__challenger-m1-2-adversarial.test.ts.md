# tests/challenger-m1-2-adversarial.test.ts
lines:525 exports:
---
// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  signUpWithEmail,
  signInWithEmail,
  requestVerificationCode,
  verifyVerificationCode,
  requestPasswordReset,
  verifyPasswordResetCode,
  updatePasswordWithReset,
} from '@/lib/actions/auth-actions';
import {
  setSessionAccount,
  getSessionAccount,
} from '@/lib/services/auth/session';
import {
  createResetToken,
  verifyResetToken,
} from '@/lib/services/auth/password-reset';
import {
  issueMobileAuthToken,
  verifyMobileAuthToken,
} from '@/lib/services/auth/mobile-auth';
import { supabase } from '@/lib/sdk/supabase';
import * as rateLimitModule from '@/lib/services/auth/rate-limit';

// Simulated cookie jar for Next.js cookies()
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
