# tests/rewards-payee.test.ts
lines:270 exports:
---
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getClaimableRewards,
  generateTokenVoucher,
  generateBadgeVoucher,
} from '../lib/actions/reward-actions';
import { getSessionAccount } from '../lib/services/session';
import { statsForAccount } from '../lib/utils/stats';
import { getGlobalLeaderboard } from '../lib/actions/leaderboard-actions';
import { supabase } from '../lib/supabase/supabase';
import { supabaseAdmin } from '../lib/supabase/supabase-admin';
import { getSignerAccount, isVoucherUsed } from '../lib/utils/chain';

vi.mock('../lib/services/session', () => ({
  getSessionAccount: vi.fn(),
}));

vi.mock('../lib/utils/stats', () => ({
  statsForAccount: vi.fn(),
}));

vi.mock('../lib/actions/leaderboard-actions', () => ({
  getGlobalLeaderboard: vi.fn(),
}));

vi.mock('../lib/utils/chain', () => ({
  REWARD_CHAIN_ID: 84532,
  isVoucherUsed: vi.fn(),
  isContestVoucherUsed: vi.fn(),
  getSignerAccount: vi.fn(),
  newNonce: vi.fn().mockReturnValue('123456789'),
  getContestId: vi.fn(),
}));

vi.mock('../lib/supabase/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

