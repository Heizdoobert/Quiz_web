# tests/auth-password-reset.test.ts
lines:287 exports:
---
// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as authActionsModule from '@/lib/actions/auth-actions';
import * as credentialsModule from '@/lib/services/auth/credentials';
import { supabase } from '@/lib/sdk/supabase';
import * as rateLimitModule from '@/lib/services/auth/rate-limit';
import { createResetToken, clearUsedResetTokens } from '@/lib/services/auth/password-reset';

// Mocks
vi.mock('@/lib/sdk/supabase', () => ({
  supabase: {
    auth: {
      resetPasswordForEmail: vi.fn(),
      verifyOtp: vi.fn(),
      updateUser: vi.fn(),
    },
  },
}));

vi.mock('@/lib/sdk/supabase-admin', () => ({
  supabaseAdmin: {
    auth: {
      admin: {
        updateUserById: vi.fn().mockResolvedValue({
          data: { user: { id: 'usr-reset-1', email: 'alice@example.com' } },
          error: null,
        }),
      },
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'usr-reset-1' }, error: null }),
      upsert: vi.fn().mockResolvedValue({ error: null }),
    })),
  },
}));

vi.mock('@/lib/services/auth/rate-limit', () => ({
  allowAttempt: vi.fn().mockResolvedValue(true),
