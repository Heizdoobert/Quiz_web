import 'server-only';
import { createPublicClient, http, type Chain } from 'viem';
import { arbitrum, base, baseSepolia, mainnet, optimism, polygon } from 'viem/chains';
import { QUIZ_BADGE_ADDRESS, QUIZ_TOKEN_ADDRESS } from '@/lib/contracts/addresses';
import { QuizBadgeNFTABI } from '@/lib/contracts/QuizBadgeNFTABI';
import { QuizTokenABI } from '@/lib/contracts/QuizTokenABI';

// The chains the wallet UI offers (components/Providers.tsx).
const CHAINS: Chain[] = [mainnet, polygon, optimism, arbitrum, base, baseSepolia];

export const REWARD_CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '84532', 10);

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
