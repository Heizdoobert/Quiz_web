# tests/profile-actions.test.ts
lines:237 exports:
---
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getUserQuizzes, exportUserData } from '../lib/actions/profile-actions';
import { supabase } from '../lib/supabase/supabase';
import { supabaseAdmin } from '../lib/supabase/supabase-admin';
import { getSessionAccount } from '../lib/services/session';

// Mock the supabase module
vi.mock('../lib/supabase/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

// Export reads with the secret key, for the signed-in wallet only.
vi.mock('../lib/supabase/supabase-admin', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}));
vi.mock('../lib/services/session', () => ({
  getSessionAccount: vi.fn(),
}));

// Valid Ethereum address for testing (40 hex chars after 0x)
const VALID_ADDRESS = '0x1234567890abcdef1234567890abcdef12345678';
const VALID_ADDRESS_CHECKSUMMED = '0x1234567890ABCDEF1234567890abcdef12345678';
const ACCOUNT_ID = '00000000-0000-4000-8000-0000000000f1';
const ACCOUNT = { id: ACCOUNT_ID, wallet: VALID_ADDRESS };

describe('profile-actions', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('getUserQuizzes', () => {
    it('returns an error with code INVALID_ADDRESS if walletAddress is empty', async () => {
      const result = await getUserQuizzes('');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('A valid wallet address is required.');
