# tests/profile-actions.test.ts
lines:218 exports:
---
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getUserQuizzes, exportUserData } from '../lib/actions/profile-actions';
import { supabase } from '../lib/sdk/supabase';
import { supabaseAdmin } from '../lib/sdk/supabase-admin';
import { getSessionAccount } from '@/lib/services/auth/session';
import { TOPIC_EMBED } from '../lib/db/topics';

// Mock the supabase module
vi.mock('../lib/sdk/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

// Export reads with the secret key, for the signed-in account only.
vi.mock('../lib/sdk/supabase-admin', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}));
vi.mock('@/lib/services/auth/session', () => ({
  getSessionAccount: vi.fn(),
}));

const ACCOUNT_ID = '00000000-0000-4000-8000-0000000000f1';
const ACCOUNT = { id: ACCOUNT_ID };

describe('profile-actions', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('getUserQuizzes', () => {
    it('refuses without a session, without querying', async () => {
      (getSessionAccount as import("vitest").Mock).mockResolvedValue(null);
      const result = await getUserQuizzes();
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Sign in to see your quizzes.');
