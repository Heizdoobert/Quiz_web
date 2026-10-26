# tests/auth-signup.test.ts
lines:196 exports:
---
// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as credentialsModule from '@/lib/services/auth/credentials';
import * as authActionsModule from '@/lib/actions/auth-actions';
import { supabase } from '@/lib/sdk/supabase';
import { supabaseAdmin } from '@/lib/sdk/supabase-admin';
import * as rateLimitModule from '@/lib/services/auth/rate-limit';

// Mocks
vi.mock('@/lib/sdk/supabase', () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
    },
  },
}));

vi.mock('@/lib/sdk/supabase-admin', () => ({
  supabaseAdmin: {
    auth: {
      admin: {
        createUser: vi.fn(),
      },
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'test-account-id' }, error: null }),
      upsert: vi.fn().mockResolvedValue({ error: null }),
    })),
  },
}));

vi.mock('@/lib/services/auth/rate-limit', () => ({
  allowAttempt: vi.fn().mockResolvedValue(true),
  allowAttemptFromIp: vi.fn().mockResolvedValue(true),
}));

// Contract Adapter for Sign-Up
