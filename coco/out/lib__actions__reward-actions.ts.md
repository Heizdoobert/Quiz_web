# lib/actions/reward-actions.ts
lines:430 exports:getClaimableRewards,generateTokenVoucher,generateBadgeVoucher,confirmRewardClaim
---
'use server';
import { logger } from "@/lib/logger";

import { supabase } from '@/lib/supabase/supabase';
import { supabaseAdmin } from '@/lib/supabase/supabase-admin';
import { getSessionAccount } from '@/lib/services/session';
import { ClaimableRewards, RewardVoucher } from '@/lib/types';
import { getGlobalLeaderboard } from '@/lib/actions/leaderboard-actions';
import { statsForAccount } from '@/lib/utils/stats';
import { QUIZ_TOKEN_ADDRESS, QUIZ_BADGE_ADDRESS } from '@/lib/contracts/addresses';
import {
  REWARD_CHAIN_ID,
  isVoucherUsed,
  isContestVoucherUsed,
  getSignerAccount,
  newNonce,
  getContestId,
} from '@/lib/utils/chain';

const TOKENS_PER_CORRECT = BigInt(10) * BigInt(10) ** BigInt(18); // 10 QUIZ tokens (in wei) per correct answer
const VOUCHER_TTL_SECONDS = 3600;

type PendingTokenClaim = { nonce: string; amount: string; deadline: string; signature: `0x${string}` };

// Settles a wallet's pending token vouchers against the chain: minted ones become
// 'claimed', ones past their deadline become 'expired'. Returns the voucher that is
// still open (at most one, enforced by a unique index), so it can be handed out again
// instead of signing a second one for the same balance.
async function settlePendingTokenClaims(accountId: string, wallet: string): Promise<PendingTokenClaim | null> {
  if (!supabaseAdmin) throw new Error('SUPABASE_SECRET_KEY is not set');
  const { data, error } = await supabaseAdmin
    .from('reward_claims')
    .select('id, nonce, amount::text, deadline, signature')
    .eq('user_id', accountId)
    .eq('claim_type', 'token')
    .eq('status', 'pending');
  if (error) throw error;

  const now = Math.floor(Date.now() / 1000);
  let open: PendingTokenClaim | null = null;
