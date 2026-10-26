# tests/challenger-m1-iter3-empirical.test.ts
lines:170 exports:
---
// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as updatePasswordRoute } from '@/app/api/v1/auth/password/update/route';
import {
  createResetToken,
  verifyResetToken,
  clearUsedResetTokens,
  updatePasswordWithReset,
} from '@/lib/services/auth/password-reset';
import { supabaseAdmin } from '@/lib/sdk/supabase-admin';


const TEST_SECRET = 'test-secret-key-12345678901234567890';

vi.mock('@/lib/sdk/supabase', () => ({
  supabase: {
    auth: {
      updateUser: vi.fn().mockResolvedValue({ data: { user: { id: 'usr-1' } }, error: null }),
      verifyOtp: vi.fn(),
      resetPasswordForEmail: vi.fn(),
    },
  },
}));

vi.mock('@/lib/sdk/supabase-admin', () => ({
  supabaseAdmin: {
    auth: {
      admin: {
        updateUserById: vi.fn().mockResolvedValue({
          data: { user: { id: 'usr-1', email: 'alice@example.com' } },
          error: null,
        }),
      },
    },
    from: vi.fn(() => ({
      upsert: vi.fn().mockResolvedValue({ error: null }),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'test-account-id' }, error: null }),
