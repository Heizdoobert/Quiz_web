'use server';

import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getSessionWallet } from '@/lib/wallet-session';
import { ClaimableRewards, RewardVoucher } from '@/lib/types';
import { getGlobalLeaderboard } from '@/lib/actions/leaderboard-actions';
import { getUserStats } from '@/lib/actions/quiz-actions';
import { QUIZ_TOKEN_ADDRESS, QUIZ_BADGE_ADDRESS } from '@/lib/contracts/addresses';
import {
  REWARD_CHAIN_ID,
  isVoucherUsed,
  isContestVoucherUsed,
  getSignerAccount,
  newNonce,
  getContestId,
} from '@/lib/chain';

const TOKENS_PER_CORRECT = BigInt(10) * BigInt(10) ** BigInt(18); // 10 QUIZ tokens (in wei) per correct answer
const VOUCHER_TTL_SECONDS = 3600;
// An unused voucher past its deadline can never be minted. The margin covers
// the gap between block time and this server's clock.
const EXPIRY_MARGIN_SECONDS = 300;

type PendingTokenClaim = { nonce: string; amount: string; deadline: string; signature: `0x${string}` };

// Settles a wallet's pending token vouchers against the chain: minted ones become
// 'claimed', ones past their deadline become 'expired'. Returns the voucher that is
// still open (at most one, enforced by a unique index), so it can be handed out again
// instead of signing a second one for the same balance.
async function settlePendingTokenClaims(wallet: string): Promise<PendingTokenClaim | null> {
  if (!supabaseAdmin) throw new Error('SUPABASE_SECRET_KEY is not set');
  const { data, error } = await supabaseAdmin
    .from('reward_claims')
    .select('id, nonce, amount::text, deadline, signature')
    .eq('wallet_address', wallet)
    .eq('claim_type', 'token')
    .eq('status', 'pending');
  if (error) throw error;

  const now = Math.floor(Date.now() / 1000);
  let open: PendingTokenClaim | null = null;
  for (const claim of data) {
    let status: 'claimed' | 'expired' | null = null;
    if (await isVoucherUsed('token', wallet, claim.nonce)) status = 'claimed';
    else if (!claim.deadline || Number(claim.deadline) + EXPIRY_MARGIN_SECONDS < now) status = 'expired';

    if (status) {
      const { error: updErr } = await supabaseAdmin
        .from('reward_claims')
        .update({ status })
        .eq('id', claim.id)
        .eq('status', 'pending');
      if (updErr) throw updErr;
    } else {
      open = {
        nonce: claim.nonce,
        amount: claim.amount,
        deadline: String(claim.deadline),
        signature: claim.signature,
      };
    }
  }
  return open;
}

function tokenVoucher(wallet: string, claim: PendingTokenClaim): RewardVoucher {
  return {
    recipient: wallet,
    amount: claim.amount,
    nonce: claim.nonce,
    deadline: claim.deadline,
    signature: claim.signature,
    contractAddress: QUIZ_TOKEN_ADDRESS,
  };
}

export async function getClaimableRewards(walletAddress: string): Promise<ClaimableRewards> {
  const empty: ClaimableRewards = {
    claimableTokens: '0',
    eligibleBadges: [],
    alreadyClaimedBadges: [],
    totalEarned: '0',
    totalClaimed: '0',
  };

  try {
    if (!walletAddress) return empty;
    const normalized = walletAddress.toLowerCase();

    // Bring claim statuses up to date with the chain before totalling them.
    await settlePendingTokenClaims(normalized).catch((err) =>
      console.error('getClaimableRewards settle error:', err)
    );

    // One stats read covers both the token total and badge checks.
    // On error getUserStats returns zeros, so nothing becomes claimable.
    const stats = await getUserStats(walletAddress);
    const totalEarned = BigInt(stats.score) * TOKENS_PER_CORRECT;

    // Get total already-claimed tokens. Read as text: JSON numbers lose precision past 2^53.
    const { data: claims, error: cErr } = await supabase
      .from('reward_claims')
      .select('amount::text')
      .eq('wallet_address', normalized)
      .eq('claim_type', 'token')
      .eq('status', 'claimed');

    let totalClaimed = BigInt(0);
    if (!cErr && claims) {
      for (const c of claims) {
        totalClaimed += BigInt(c.amount || 0);
      }
    }

    const claimableTokens = totalEarned > totalClaimed ? totalEarned - totalClaimed : BigInt(0);

    // Check badge eligibility
    const leaderboard = await getGlobalLeaderboard(3);
    const isTop3 = leaderboard.some(
      (e) => e.wallet_address === normalized && e.rank <= 3
    );

    const eligibleBadges: number[] = [];
    if (isTop3) eligibleBadges.push(0);
    if (stats.bestStreak >= 10) eligibleBadges.push(1);
    if (stats.totalAnswered >= 100) eligibleBadges.push(2);
    if (stats.bestStreak >= 10) eligibleBadges.push(3);

    // Check already-claimed badges
    const { data: badgeClaims } = await supabase
      .from('reward_claims')
      .select('badge_type')
      .eq('wallet_address', normalized)
      .eq('claim_type', 'badge')
      .eq('status', 'claimed');

    const alreadyClaimedBadges = (badgeClaims || [])
      .map((c) => c.badge_type as number)
      .filter((b): b is number => b !== null);

    // Remove already-claimed from eligible
    const filteredEligible = eligibleBadges.filter(
      (b) => !alreadyClaimedBadges.includes(b)
    );

    return {
      claimableTokens: claimableTokens.toString(),
      eligibleBadges: filteredEligible,
      alreadyClaimedBadges,
      totalEarned: totalEarned.toString(),
      totalClaimed: totalClaimed.toString(),
    };
  } catch (err) {
    console.error('getClaimableRewards error:', err);
    return empty;
  }
}

export async function generateTokenVoucher(
  walletAddress: string
): Promise<RewardVoucher | { error: string }> {
  try {
    if (!walletAddress) return { error: 'Wallet address required' };

    const sessionWallet = await getSessionWallet();
    if (!sessionWallet || sessionWallet.toLowerCase() !== walletAddress.toLowerCase()) {
      return { error: 'Sign in with your wallet first.' };
    }

    const account = getSignerAccount();
    if (!account || !supabaseAdmin) return { error: 'Reward signing not configured' };

    const normalized = walletAddress.toLowerCase();

    // One open voucher per wallet: hand back the unspent one rather than signing
    // another for the same balance (which would let it be minted twice).
    const open = await settlePendingTokenClaims(normalized);
    if (open) return tokenVoucher(normalized, open);

    const rewards = await getClaimableRewards(walletAddress);
    const claimable = BigInt(rewards.claimableTokens);
    if (claimable <= BigInt(0)) return { error: 'Nothing to claim' };

    const nonce = newNonce();
    const deadline = BigInt(Math.floor(Date.now() / 1000) + VOUCHER_TTL_SECONDS);

    const signature = await account.signTypedData({
      domain: {
        name: 'QuizToken',
        version: '1',
        chainId: BigInt(REWARD_CHAIN_ID),
        verifyingContract: QUIZ_TOKEN_ADDRESS,
      },
      types: {
        ClaimTokens: [
          { name: 'recipient', type: 'address' },
          { name: 'amount', type: 'uint256' },
          { name: 'nonce', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
        ],
      },
      primaryType: 'ClaimTokens',
      message: {
        recipient: normalized as `0x${string}`,
        amount: claimable,
        nonce,
        deadline,
      },
    });

    const claim: PendingTokenClaim = {
      nonce: nonce.toString(),
      amount: claimable.toString(),
      deadline: deadline.toString(),
      signature,
    };

    // A voucher we can't record can never be marked claimed, so don't hand it out.
    const { error: insertErr } = await supabaseAdmin.from('reward_claims').insert({
      wallet_address: normalized,
      claim_type: 'token',
      status: 'pending',
      ...claim,
    });
    if (insertErr) {
      // A concurrent request recorded its voucher first: serve that one instead.
      if (insertErr.code === '23505') {
        const winner = await settlePendingTokenClaims(normalized);
        if (winner) return tokenVoucher(normalized, winner);
      }
      console.error('generateTokenVoucher record error:', insertErr);
      return { error: 'Failed to generate voucher' };
    }

    return tokenVoucher(normalized, claim);
  } catch (err) {
    console.error('generateTokenVoucher error:', err);
    return { error: 'Failed to generate voucher' };
  }
}

export async function generateBadgeVoucher(
  walletAddress: string,
  badgeType: number
): Promise<RewardVoucher | { error: string }> {
  try {
    if (!walletAddress) return { error: 'Wallet address required' };

    const sessionWallet = await getSessionWallet();
    if (!sessionWallet || sessionWallet.toLowerCase() !== walletAddress.toLowerCase()) {
      return { error: 'Sign in with your wallet first.' };
    }

    const account = getSignerAccount();
    if (!account || !supabaseAdmin) return { error: 'Reward signing not configured' };

    const rewards = await getClaimableRewards(walletAddress);
    if (!rewards.eligibleBadges.includes(badgeType)) {
      return { error: 'Badge not eligible or already claimed' };
    }

    // Repeat badge vouchers are harmless: the contract mints each badge type once per wallet.
    const normalized = walletAddress.toLowerCase();
    const nonce = newNonce();
    const deadline = BigInt(Math.floor(Date.now() / 1000) + VOUCHER_TTL_SECONDS);

    const signature = await account.signTypedData({
      domain: {
        name: 'QuizBadgeNFT',
        version: '1',
        chainId: BigInt(REWARD_CHAIN_ID),
        verifyingContract: QUIZ_BADGE_ADDRESS,
      },
      types: {
        MintBadge: [
          { name: 'recipient', type: 'address' },
          { name: 'badgeType', type: 'uint256' },
          { name: 'nonce', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
        ],
      },
      primaryType: 'MintBadge',
      message: {
        recipient: normalized as `0x${string}`,
        badgeType: BigInt(badgeType),
        nonce,
        deadline,
      },
    });

    // A voucher we can't record can never be marked claimed, so don't hand it out.
    const { error: insertErr } = await supabaseAdmin.from('reward_claims').insert({
      wallet_address: normalized,
      claim_type: 'badge',
      badge_type: badgeType,
      nonce: nonce.toString(),
      deadline: deadline.toString(),
      signature,
      status: 'pending',
    });
    if (insertErr) {
      console.error('generateBadgeVoucher record error:', insertErr);
      return { error: 'Failed to generate badge voucher' };
    }

    return {
      recipient: normalized,
      amount: '0',
      badgeType,
      nonce: nonce.toString(),
      deadline: deadline.toString(),
      signature,
      contractAddress: QUIZ_BADGE_ADDRESS,
    };
  } catch (err) {
    console.error('generateBadgeVoucher error:', err);
    return { error: 'Failed to generate badge voucher' };
  }
}

export async function confirmRewardClaim(
  walletAddress: string,
  nonce: string,
  txHash: string
): Promise<{ success: boolean }> {
  try {
    if (!walletAddress || !nonce || !txHash || !supabaseAdmin) return { success: false };
    const sessionWallet = await getSessionWallet();
    const normalized = walletAddress.toLowerCase();
    if (!sessionWallet || sessionWallet.toLowerCase() !== normalized) return { success: false };

    const { data: claim } = await supabaseAdmin
      .from('reward_claims')
      .select('id, claim_type, list_id')
      .eq('wallet_address', normalized)
      .eq('nonce', nonce)
      .eq('status', 'pending')
      .maybeSingle();
    if (!claim) return { success: false };

    // Trust the chain, not the caller: only a spent nonce means the reward was minted / claimed.
    if (claim.list_id) {
      const { data: qList } = await supabaseAdmin
        .from('question_lists')
        .select('owner_wallet')
        .eq('id', claim.list_id)
        .maybeSingle();
      const contestId = getContestId(claim.list_id, qList?.owner_wallet);
      const usedOnEscrow = await isContestVoucherUsed(contestId, normalized, nonce);
      if (!usedOnEscrow) return { success: false };
    } else {
      if (!(await isVoucherUsed(claim.claim_type as 'token' | 'badge', normalized, nonce))) return { success: false };
    }

    const { data, error } = await supabaseAdmin
      .from('reward_claims')
      .update({ status: 'claimed', tx_hash: txHash })
      .eq('id', claim.id)
      .eq('status', 'pending')
      .select('id');

    if (error || !data || data.length === 0) return { success: false };

    if (claim.list_id) {
      await supabaseAdmin
        .from('list_entries')
        .update({ status: 'claimed' })
        .eq('list_id', claim.list_id)
        .eq('wallet_address', normalized);
    }

    return { success: true };
  } catch (err) {
    console.error('confirmRewardClaim error:', err);
    return { success: false };
  }
}
