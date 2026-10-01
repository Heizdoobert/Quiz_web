# tests/rewards-payee.test.ts
lines:270 exports:
---
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getClaimableRewards,
  generateTokenVoucher,
  generateBadgeVoucher,
} from '../lib/actions/reward-actions';
import { getSessionAccount } from '../lib/session';
import { statsForAccount } from '../lib/stats';
import { getGlobalLeaderboard } from '../lib/actions/leaderboard-actions';
import { supabase } from '../lib/supabase';
import { supabaseAdmin } from '../lib/supabase-admin';
import { getSignerAccount, isVoucherUsed } from '../lib/chain';

vi.mock('../lib/session', () => ({
  getSessionAccount: vi.fn(),
}));

vi.mock('../lib/stats', () => ({
  statsForAccount: vi.fn(),
}));

vi.mock('../lib/actions/leaderboard-actions', () => ({
  getGlobalLeaderboard: vi.fn(),
}));

vi.mock('../lib/chain', () => ({
  REWARD_CHAIN_ID: 84532,
  isVoucherUsed: vi.fn(),
  isContestVoucherUsed: vi.fn(),
  getSignerAccount: vi.fn(),
  newNonce: vi.fn().mockReturnValue('123456789'),
  getContestId: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

