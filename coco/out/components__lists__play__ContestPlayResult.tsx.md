# components/lists/play/ContestPlayResult.tsx
lines:227 exports:ContestPlayResult
---
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useSwitchChain, useChainId } from 'wagmi';
import { useWriteContracts, useCapabilities, useCallsStatus } from 'wagmi/experimental';
import { Trophy } from 'lucide-react';
import { claimListReward } from '@/lib/actions/question-list-actions';
import { confirmRewardClaim } from '@/lib/actions/reward-actions';
import { RewardVoucher } from '@/lib/types';
import { ContestEscrowABI } from '@/lib/contracts/ContestEscrowABI';
import { CONTEST_ESCROW_ADDRESS, TARGET_CHAIN_ID, TARGET_CHAIN_NAME } from '@/lib/contracts/addresses';
import { ContestPlayClaimButton, ClaimStep } from './ContestPlayClaimButton';
import { logger } from '@/lib/logger';

function formatTokens(weiStr: string): string {
  const wei = BigInt(weiStr || '0');
  return (wei / (BigInt(10) ** BigInt(18))).toString();
}

export function ContestPlayResult({
  listId,
  result,
  totalQuestions,
  onExit,
  walletAddress,
}: {
  listId: string;
  result: { correctCount: number; rewardAmount: string; claimed?: boolean };
  totalQuestions: number;
  onExit: () => void;
  walletAddress: string | null | undefined;
}) {
  const [claimStep, setClaimStep] = useState<ClaimStep>(result.claimed ? 'done' : 'idle');
  const [claimError, setClaimError] = useState<string | null>(null);
  const [currentNonce, setCurrentNonce] = useState<string | null>(null);
  
  const [callId, setCallId] = useState<string | null>(null);
  const [eoaTxHash, setEoaTxHash] = useState<`0x${string}` | null>(null);
  const confirmingNonceRef = useRef<string | null>(null);

  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
