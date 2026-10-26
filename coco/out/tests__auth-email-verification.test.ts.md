# tests/auth-email-verification.test.ts
lines:217 exports:
---
// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as authActionsModule from '@/lib/actions/auth-actions';
import { supabase } from '@/lib/sdk/supabase';
import * as rateLimitModule from '@/lib/services/auth/rate-limit';
import * as usersService from '@/lib/services/users/users';
import * as sessionService from '@/lib/services/auth/session';

// Mocks
vi.mock('@/lib/sdk/supabase', () => ({
  supabase: {
    auth: {
      signInWithOtp: vi.fn(),
      verifyOtp: vi.fn(),
    },
  },
}));

vi.mock('@/lib/services/auth/rate-limit', () => ({
  allowAttempt: vi.fn().mockResolvedValue(true),
  allowAttemptFromIp: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/lib/services/users/users', () => ({
  ensureAccountForAuthUser: vi.fn().mockResolvedValue('acc-123'),
}));

vi.mock('@/lib/services/auth/session', () => ({
  setSessionAccount: vi.fn().mockResolvedValue(true),
  getSessionAccount: vi.fn().mockResolvedValue(null),
  clearSessionAccount: vi.fn().mockResolvedValue(undefined),
}));

// Contract Adapters
type RequestOtpFn = (email: string, username?: string) => Promise<{ sent: boolean; error?: string }>;
type VerifyOtpFn = (email: string, code: string) => Promise<{ ok: boolean; error?: string; token?: string; accountId?: string }>;

const getRequestOtpHandler = (): RequestOtpFn => {
  if (typeof (authActionsModule as any).requestVerificationCode === 'function') {
    return (authActionsModule as any).requestVerificationCode;
