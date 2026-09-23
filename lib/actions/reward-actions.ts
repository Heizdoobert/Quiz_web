'use server';

import { supabase } from '@/lib/supabase';
import { ClaimableRewards, RewardVoucher } from '@/lib/types';
import { getGlobalLeaderboard } from '@/lib/actions/leaderboard-actions';
import { getUserStats } from '@/lib/actions/quiz-actions';
import { QUIZ_TOKEN_ADDRESS, QUIZ_BADGE_ADDRESS } from '@/lib/contracts/addresses';
import { privateKeyToAccount } from 'viem/accounts';
import crypto from 'crypto';

const TOKENS_PER_CORRECT = BigInt(10) * BigInt(10) ** BigInt(18); // 10 QUIZ tokens (in wei) per correct answer

function getSignerAccount() {
  const key = process.env.REWARD_SIGNER_PRIVATE_KEY;
  if (!key || key === '0x_your_signer_private_key') {
    return null;
  }
  return privateKeyToAccount(key as `0x${string}`);
}

// Shared EIP-712 token-claim signing, reused by the global per-answer claim
// flow (generateTokenVoucher) and the list-contest claim flow
// (claimListReward in question-list-actions.ts) so both pay out through the
// same QuizToken voucher mechanism.
export async function buildTokenClaimVoucher(
  walletAddress: string,
  amount: bigint,
  listId?: string
): Promise<RewardVoucher | { error: string }> {
  try {
    if (!walletAddress) return { error: 'Wallet address required' };
    if (amount <= BigInt(0)) return { error: 'Nothing to claim' };

    const account = getSignerAccount();
    if (!account) return { error: 'Reward signing not configured' };

    const normalized = walletAddress.toLowerCase();
    const nonce = crypto.randomUUID();
    const nonceUint = BigInt('0x' + nonce.replace(/-/g, ''));
    const nonceStr = nonceUint.toString();
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);

    const chainId = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '84532', 10);

    const signature = await account.signTypedData({
      domain: {
        name: 'QuizToken',
        version: '1',
        chainId: BigInt(chainId),
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
        amount,
        nonce: nonceUint,
        deadline,
      },
    });

    await supabase.from('reward_claims').insert({
      wallet_address: normalized,
      claim_type: 'token',
      amount: amount.toString(),
      nonce: nonceStr,
      status: 'pending',
      ...(listId ? { list_id: listId } : {}),
    });

    return {
      recipient: normalized,
      amount: amount.toString(),
      nonce: nonceStr,
      deadline: deadline.toString(),
      signature,
      contractAddress: QUIZ_TOKEN_ADDRESS,
    };
  } catch (err) {
    console.error('buildTokenClaimVoucher error:', err);
    return { error: 'Failed to generate voucher' };
  }
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

    // Get total correct answers
    const { data: results, error: rErr } = await supabase
      .from('quiz_results')
      .select('is_correct')
      .eq('wallet_address', normalized);

    if (rErr || !results) return empty;

    const totalCorrect = results.filter((r) => r.is_correct).length;
    const totalEarned = BigInt(totalCorrect) * TOKENS_PER_CORRECT;

    // Get total already-claimed tokens
    const { data: claims, error: cErr } = await supabase
      .from('reward_claims')
      .select('amount')
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
    const stats = await getUserStats(walletAddress);
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
  if (!walletAddress) return { error: 'Wallet address required' };
  const rewards = await getClaimableRewards(walletAddress);
  return buildTokenClaimVoucher(walletAddress, BigInt(rewards.claimableTokens));
}

export async function generateBadgeVoucher(
  walletAddress: string,
  badgeType: number
): Promise<RewardVoucher | { error: string }> {
  try {
    if (!walletAddress) return { error: 'Wallet address required' };

    const account = getSignerAccount();
    if (!account) return { error: 'Reward signing not configured' };

    const rewards = await getClaimableRewards(walletAddress);
    if (!rewards.eligibleBadges.includes(badgeType)) {
      return { error: 'Badge not eligible or already claimed' };
    }

    const normalized = walletAddress.toLowerCase();
    const nonce = crypto.randomUUID();
    const nonceUint = BigInt('0x' + nonce.replace(/-/g, ''));
    const nonceStr = nonceUint.toString();
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);

    const chainId = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '84532', 10);

    const signature = await account.signTypedData({
      domain: {
        name: 'QuizBadgeNFT',
        version: '1',
        chainId: BigInt(chainId),
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
        nonce: nonceUint,
        deadline,
      },
    });

    // Record pending claim
    await supabase.from('reward_claims').insert({
      wallet_address: normalized,
      claim_type: 'badge',
      badge_type: badgeType,
      nonce: nonceStr,
      status: 'pending',
    });

    return {
      recipient: normalized,
      amount: '0',
      badgeType,
      nonce: nonceStr,
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
    if (!walletAddress || !nonce || !txHash) return { success: false };
    const normalized = walletAddress.toLowerCase();

    const { data, error } = await supabase
      .from('reward_claims')
      .update({ status: 'claimed', tx_hash: txHash })
      .eq('wallet_address', normalized)
      .eq('nonce', nonce)
      .eq('status', 'pending')
      .select('id');

    if (error || !data || data.length === 0) return { success: false };

    return { success: true };
  } catch (err) {
    console.error('confirmRewardClaim error:', err);
    return { success: false };
  }
}
