# lib/chain.ts
lines:120 exports:REWARD_CHAIN_ID,getSignerAccount,newNonce,publicClientFor,isVoucherUsed,isContestVoucherUsed,isContestFundedOnChain,getContestOnChain
---
import 'server-only';
import crypto from 'crypto';
import { createPublicClient, http, type Chain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arbitrum, base, baseSepolia, mainnet, optimism, polygon } from 'viem/chains';
import { CONTEST_ESCROW_ADDRESS, QUIZ_BADGE_ADDRESS, QUIZ_TOKEN_ADDRESS, TARGET_CHAIN_ID } from '@/lib/contracts/addresses';
import { ContestEscrowABI } from '@/lib/contracts/ContestEscrowABI';
import { QuizBadgeNFTABI } from '@/lib/contracts/QuizBadgeNFTABI';
import { QuizTokenABI } from '@/lib/contracts/QuizTokenABI';

// The chains the wallet UI offers (components/Providers.tsx).
const CHAINS: Chain[] = [mainnet, polygon, optimism, arbitrum, base, baseSepolia];

export const REWARD_CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || String(TARGET_CHAIN_ID), 10);

export function getSignerAccount() {
  const key = process.env.REWARD_SIGNER_PRIVATE_KEY;
  if (!key || key === '0x_your_signer_private_key') {
    return null;
  }
  return privateKeyToAccount(key as `0x${string}`);
}

export function newNonce(): bigint {
  return BigInt('0x' + crypto.randomUUID().replace(/-/g, ''));
}

export { getContestId, CONTEST_DURATION_SECONDS } from '@/lib/contest';

export function publicClientFor(chainId: number) {
  const chain = CHAINS.find((c) => c.id === chainId);
  return chain ? createPublicClient({ chain, transport: http() }) : null;
}

// True once a claim voucher's nonce has been spent on-chain, i.e. the reward was minted.
export async function isVoucherUsed(
  claimType: 'token' | 'badge',
  recipient: string,
  nonce: string
): Promise<boolean> {
