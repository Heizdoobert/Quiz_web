# tests/auth-signin.test.ts
lines:180 exports:
---
// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as credentialsModule from '@/lib/services/credentials';
import * as authActionsModule from '@/lib/actions/auth-actions';
import { supabase } from '@/lib/sdk/supabase';
import * as rateLimitModule from '@/lib/services/rate-limit';

// Mocks
vi.mock('@/lib/sdk/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
    },
  },
}));

vi.mock('@/lib/services/rate-limit', () => ({
  allowAttempt: vi.fn().mockResolvedValue(true),
  allowAttemptFromIp: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/lib/services/session', () => ({
  setSessionAccount: vi.fn().mockResolvedValue(true),
  getSessionAccount: vi.fn().mockResolvedValue(null),
  clearSessionAccount: vi.fn().mockResolvedValue(undefined),
}));

// Contract Adapter for Sign-In
type AuthResult = { ok: true; account?: { id: string } } | { ok: false; error: string; requiresVerification?: boolean };
type SignInFn = (emailOrUsername: string, password: string) => Promise<AuthResult>;

const getSignInHandler = (): SignInFn => {
  if (typeof (authActionsModule as any).signInWithEmail === 'function') {
    return (authActionsModule as any).signInWithEmail;
  }
  if (typeof (credentialsModule as any).signInWithEmail === 'function') {
    return (credentialsModule as any).signInWithEmail;
  }
  return async (emailOrUsername: string, password: string) => {
    const trimmed = emailOrUsername.trim();
