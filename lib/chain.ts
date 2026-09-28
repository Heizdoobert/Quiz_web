import 'server-only';
import crypto from 'crypto';
import { createPublicClient, http, type Chain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arbitrum, base, baseSepolia, mainnet, optimism, polygon } from 'viem/chains';
import { CONTEST_ESCROW_ADDRESS, QUIZ_BADGE_ADDRESS, QUIZ_TOKEN_ADDRESS } from '@/lib/contracts/addresses';
import { ContestEscrowABI } from '@/lib/contracts/ContestEscrowABI';
import { QuizBadgeNFTABI } from '@/lib/contracts/QuizBadgeNFTABI';
import { QuizTokenABI } from '@/lib/contracts/QuizTokenABI';

// The chains the wallet UI offers (components/Providers.tsx).
const CHAINS: Chain[] = [mainnet, polygon, optimism, arbitrum, base, baseSepolia];

export const REWARD_CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '84532', 10);

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
  const client = publicClientFor(REWARD_CHAIN_ID);
  if (!client) throw new Error(`Unsupported reward chain ${REWARD_CHAIN_ID}`);
  const args = [recipient as `0x${string}`, BigInt(nonce)] as const;
  return claimType === 'token'
    ? client.readContract({ address: QUIZ_TOKEN_ADDRESS, abi: QuizTokenABI, functionName: 'usedNonces', args })
    : client.readContract({ address: QUIZ_BADGE_ADDRESS, abi: QuizBadgeNFTABI, functionName: 'usedNonces', args });
}

// True once a contest claim voucher's nonce has been spent on ContestEscrow.
export async function isContestVoucherUsed(
  contestId: `0x${string}`,
  recipient: string,
  nonce: string
): Promise<boolean> {
  const client = publicClientFor(REWARD_CHAIN_ID);
  if (!client) throw new Error(`Unsupported reward chain ${REWARD_CHAIN_ID}`);
  if (CONTEST_ESCROW_ADDRESS === '0x0000000000000000000000000000000000000000') return false;
  try {
    return (await client.readContract({
      address: CONTEST_ESCROW_ADDRESS,
      abi: ContestEscrowABI,
      functionName: 'isNonceUsed',
      args: [contestId, recipient as `0x${string}`, BigInt(nonce)],
    })) as boolean;
  } catch {
    return false;
  }
}

// True if the contest has been initialized with escrowed funds on-chain.
export async function isContestFundedOnChain(
  contestId: `0x${string}`,
  creator: string,
  minPoolWei: bigint
): Promise<boolean> {
  const client = publicClientFor(REWARD_CHAIN_ID);
  if (!client || !CONTEST_ESCROW_ADDRESS || CONTEST_ESCROW_ADDRESS === '0x0000000000000000000000000000000000000000') {
    return false;
  }
  try {
    const contest = (await client.readContract({
      address: CONTEST_ESCROW_ADDRESS,
      abi: ContestEscrowABI,
      functionName: 'contests',
      args: [contestId],
    })) as [string, bigint, bigint, bigint, bigint, boolean];
    const [cCreator, totalPool, , , , active] = contest;
    return active && cCreator.toLowerCase() === creator.toLowerCase() && totalPool >= minPoolWei;
  } catch {
    return false;
  }
}

// Fetches live on-chain status of a contest from ContestEscrow.
export async function getContestOnChain(contestId: `0x${string}`): Promise<{
  creator: string;
  totalPool: bigint;
  remainingPool: bigint;
  createdAt: bigint;
  expiresAt: bigint;
  active: boolean;
} | null> {
  const client = publicClientFor(REWARD_CHAIN_ID);
  if (!client || !CONTEST_ESCROW_ADDRESS || CONTEST_ESCROW_ADDRESS === '0x0000000000000000000000000000000000000000') {
    return null;
  }
  try {
    const contest = (await client.readContract({
      address: CONTEST_ESCROW_ADDRESS,
      abi: ContestEscrowABI,
      functionName: 'contests',
      args: [contestId],
    })) as [string, bigint, bigint, bigint, bigint, boolean];
    const [creator, totalPool, remainingPool, createdAt, expiresAt, active] = contest;
    return { creator, totalPool, remainingPool, createdAt, expiresAt, active };
  } catch {
    return null;
  }
}

