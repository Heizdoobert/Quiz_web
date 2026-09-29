'use server';

import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getSessionAccount } from '@/lib/session';
import { ClaimableRewards, RewardVoucher } from '@/lib/types';
import { getGlobalLeaderboard } from '@/lib/actions/leaderboard-actions';
import { statsForAccount } from '@/lib/stats';
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

export async function getClaimableRewards(): Promise<ClaimableRewards> {
  const empty: ClaimableRewards = {
    claimableTokens: '0',
    eligibleBadges: [],
    alreadyClaimedBadges: [],
    totalEarned: '0',
    totalClaimed: '0',
  };

  try {
    const account = await getSessionAccount();
    if (!account) return empty;

    // Only a wallet account could have vouchers signed on-chain to settle.
    if (account.wallet) {
      await settlePendingTokenClaims(account.id, account.wallet).catch((err) =>
        console.error('getClaimableRewards settle error:', err)
      );
    }

    let treasurySweptCount = 0;
    if (supabaseAdmin) {
      const q = supabaseAdmin
        .from('users')
        .select('treasury_swept_count')
        .eq('id', account.id);
      const res = typeof q.maybeSingle === 'function' ? await q.maybeSingle() : await q;
      const userRow = Array.isArray(res?.data) ? res.data[0] : res?.data;
      if (userRow?.treasury_swept_count) {
        treasurySweptCount = Number(userRow.treasury_swept_count) || 0;
      }
    }

    const treasuryAddress = process.env.TREASURY_WALLET_ADDRESS?.trim().toLowerCase();
    const isTreasury = Boolean(
      treasuryAddress && account.wallet && account.wallet.toLowerCase() === treasuryAddress
    );

    let treasuryPoolEntitlement = BigInt(0);
    if (isTreasury && supabaseAdmin) {
      await supabaseAdmin.rpc('sweep_to_treasury');
      const { data: poolCount } = await supabaseAdmin.rpc('get_treasury_entitled_count');
      if (poolCount) {
        treasuryPoolEntitlement = BigInt(poolCount) * TOKENS_PER_CORRECT;
      }
    }

    const stats = await statsForAccount(account.id);
    const effectiveCorrect = Math.max(0, stats.score - treasurySweptCount);
    const ownEarned = BigInt(effectiveCorrect) * TOKENS_PER_CORRECT;
    const totalEarned = ownEarned + (isTreasury ? treasuryPoolEntitlement : BigInt(0));

    // Get total already-claimed tokens. Read as text: JSON numbers lose precision past 2^53.
    const { data: claims, error: cErr } = await supabase
      .from('reward_claims')
      .select('amount::text')
      .eq('user_id', account.id)
      .eq('claim_type', 'token')
      .eq('status', 'claimed');

    let totalClaimed = BigInt(0);
    if (!cErr && claims) {
      for (const c of claims) {
        totalClaimed += BigInt(c.amount || 0);
      }
    }

    let claimableTokens = BigInt(0);
    let heldTokens: string | undefined = undefined;
    let sweepsAt: string | null | undefined = undefined;

    if (account.wallet) {
      claimableTokens = totalEarned > totalClaimed ? totalEarned - totalClaimed : BigInt(0);
    } else {
      // Accounts without a wallet: 0 claimable tokens; earnings held until wallet is added
      claimableTokens = BigInt(0);
      const held = totalEarned > totalClaimed ? totalEarned - totalClaimed : BigInt(0);
      heldTokens = held.toString();

      // Find when the oldest unswept correct answer will sweep (180 days after answered_at)
      sweepsAt = null;
      if (supabaseAdmin) {
        const { data } = await supabaseAdmin
          .from('quiz_results')
          .select('answered_at')
          .eq('user_id', account.id)
          .eq('is_correct', true)
          .order('answered_at', { ascending: true })
          .range(treasurySweptCount, treasurySweptCount)
          .maybeSingle();

        const oldestAns = Array.isArray(data)
          ? (data[0] as { answered_at?: string } | undefined)
          : (data as { answered_at?: string } | null);

        if (oldestAns?.answered_at) {
          const d = new Date(oldestAns.answered_at);
          d.setDate(d.getDate() + 180);
          sweepsAt = d.toISOString();
        }
      }
    }

    // Check badge eligibility. Leaderboard rows are keyed by account id.
    const leaderboard = await getGlobalLeaderboard(3);
    const isTop3 = leaderboard.some((e) => e.user_id === account.id && e.rank <= 3);

    const eligibleBadges: number[] = [];
    if (isTop3) eligibleBadges.push(0);
    if (stats.bestStreak >= 10) eligibleBadges.push(1);
    if (stats.totalAnswered >= 100) eligibleBadges.push(2);
    if (stats.bestStreak >= 10) eligibleBadges.push(3);

    // Check already-claimed badges
    const { data: badgeClaims } = await supabase
      .from('reward_claims')
      .select('badge_type')
      .eq('user_id', account.id)
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
      heldTokens,
      sweepsAt,
    };
  } catch (err) {
    console.error('getClaimableRewards error:', err);
    return empty;
  }
}

export async function generateTokenVoucher(): Promise<RewardVoucher | { error: string; code?: 'WALLET_REQUIRED' }> {
  try {
    const account = await getSessionAccount();
    if (!account) return { error: 'Sign in first.' };
    if (!account.wallet) return { error: 'Add a wallet to claim rewards.', code: 'WALLET_REQUIRED' };
    const wallet = account.wallet;

    const signer = getSignerAccount();
    if (!signer || !supabaseAdmin) return { error: 'Reward signing not configured' };

    // One open voucher per account: hand back the unspent one rather than signing
    // another for the same balance (which would let it be minted twice).
    const open = await settlePendingTokenClaims(account.id, wallet);
    if (open) return tokenVoucher(wallet, open);

    const rewards = await getClaimableRewards();
    const claimable = BigInt(rewards.claimableTokens);
    if (claimable <= BigInt(0)) return { error: 'Nothing to claim' };

    const nonce = newNonce();
    const deadline = BigInt(Math.floor(Date.now() / 1000) + VOUCHER_TTL_SECONDS);

    const signature = await signer.signTypedData({
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
        recipient: wallet as `0x${string}`,
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
    // wallet_address is bridged in from user_id by the DB trigger, so it isn't set here.
    const { error: insertErr } = await supabaseAdmin.from('reward_claims').insert({
      user_id: account.id,
      claim_type: 'token',
      status: 'pending',
      ...claim,
    });
    if (insertErr) {
      // A concurrent request recorded its voucher first: serve that one instead.
      if (insertErr.code === '23505') {
        const winner = await settlePendingTokenClaims(account.id, wallet);
        if (winner) return tokenVoucher(wallet, winner);
      }
      console.error('generateTokenVoucher record error:', insertErr);
      return { error: 'Failed to generate voucher' };
    }

    return tokenVoucher(wallet, claim);
  } catch (err) {
    console.error('generateTokenVoucher error:', err);
    return { error: 'Failed to generate voucher' };
  }
}

export async function generateBadgeVoucher(
  badgeType: number
): Promise<RewardVoucher | { error: string; code?: 'WALLET_REQUIRED' }> {
  try {
    const account = await getSessionAccount();
    if (!account) return { error: 'Sign in first.' };
    if (!account.wallet) return { error: 'Add a wallet to claim rewards.', code: 'WALLET_REQUIRED' };
    const wallet = account.wallet;

    const signer = getSignerAccount();
    if (!signer || !supabaseAdmin) return { error: 'Reward signing not configured' };

    const rewards = await getClaimableRewards();
    if (!rewards.eligibleBadges.includes(badgeType)) {
      return { error: 'Badge not eligible or already claimed' };
    }

    // Repeat badge vouchers are harmless: the contract mints each badge type once per wallet.
    const nonce = newNonce();
    const deadline = BigInt(Math.floor(Date.now() / 1000) + VOUCHER_TTL_SECONDS);

    const signature = await signer.signTypedData({
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
        recipient: wallet as `0x${string}`,
        badgeType: BigInt(badgeType),
        nonce,
        deadline,
      },
    });

    // A voucher we can't record can never be marked claimed, so don't hand it out.
    // wallet_address is bridged in from user_id by the DB trigger, so it isn't set here.
    const { error: insertErr } = await supabaseAdmin.from('reward_claims').insert({
      user_id: account.id,
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
      recipient: wallet,
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
  nonce: string,
  txHash: string
): Promise<{ success: boolean }> {
  try {
    if (!nonce || !txHash || !supabaseAdmin) return { success: false };
    const account = await getSessionAccount();
    if (!account || !account.wallet) return { success: false };
    const wallet = account.wallet;

    const { data: claim } = await supabaseAdmin
      .from('reward_claims')
      .select('id, claim_type, list_id')
      .eq('user_id', account.id)
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
      const usedOnEscrow = await isContestVoucherUsed(contestId, wallet, nonce);
      if (!usedOnEscrow) return { success: false };
    } else {
      if (!(await isVoucherUsed(claim.claim_type as 'token' | 'badge', wallet, nonce))) return { success: false };
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
        .eq('user_id', account.id);
    }

    return { success: true };
  } catch (err) {
    console.error('confirmRewardClaim error:', err);
    return { success: false };
  }
}
