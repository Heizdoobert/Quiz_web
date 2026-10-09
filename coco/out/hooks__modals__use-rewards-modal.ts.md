# hooks/modals/use-rewards-modal.ts
lines:360 exports:ClaimStep,useRewardsModal
---
'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSwitchChain, useChainId, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useWriteContracts, useCapabilities, useCallsStatus } from 'wagmi/experimental';
import { ClaimableRewards, RewardVoucher } from '@/lib/types';
import { useSession } from '@/hooks/shared/use-session';
import {
  getClaimableRewards,
  generateTokenVoucher,
  generateBadgeVoucher,
  confirmRewardClaim,
} from '@/lib/actions/reward-actions';
import { QuizTokenABI } from '@/lib/contracts/QuizTokenABI';
import { QuizBadgeNFTABI } from '@/lib/contracts/QuizBadgeNFTABI';
import {
  QUIZ_TOKEN_ADDRESS,
  QUIZ_BADGE_ADDRESS,
  TARGET_CHAIN_ID,
  TARGET_CHAIN_NAME,
  TARGET_EXPLORER_URL,
} from '@/lib/contracts/addresses';

export type ClaimStep = 'idle' | 'signing' | 'submitting' | 'confirming' | 'done' | 'error';

interface UseRewardsModalOptions {
  isOpen: boolean;
  walletAddress: string | null;
}

export function useRewardsModal({ isOpen, walletAddress }: UseRewardsModalOptions) {
  const [tab, setTab] = useState<'tokens' | 'badges'>('tokens');
  const [rewards, setRewards] = useState<ClaimableRewards | null>(null);
  const [loading, setLoading] = useState(false);
  const [claimStep, setClaimStep] = useState<ClaimStep>('idle');
  const [claimError, setClaimError] = useState<string | null>(null);
  const [currentNonce, setCurrentNonce] = useState<string | null>(null);
  const [callId, setCallId] = useState<string | null>(null);
  const [eoaTxHash, setEoaTxHash] = useState<`0x${string}` | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
