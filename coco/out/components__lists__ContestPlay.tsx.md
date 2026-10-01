# components/lists/ContestPlay.tsx
lines:369 exports:default
---
'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useSwitchChain, useChainId } from 'wagmi';
import { useWriteContracts, useCapabilities, useCallsStatus } from 'wagmi/experimental';
import { startListAttempt, completeListAttempt, claimListReward } from '@/lib/actions/question-list-actions';
import { useSession } from '@/hooks/shared/use-session';
import { confirmRewardClaim } from '@/lib/actions/reward-actions';
import { submitAnswer } from '@/lib/actions/quiz-actions';
import { ClientQuestion, QuestionListWithMeta, RewardVoucher } from '@/lib/types';
import { ContestEscrowABI } from '@/lib/contracts/ContestEscrowABI';
import { CONTEST_ESCROW_ADDRESS, TARGET_CHAIN_ID, TARGET_CHAIN_NAME } from '@/lib/contracts/addresses';
import { ArrowLeft, Loader2, Trophy, Coins, CheckCircle2, XCircle } from 'lucide-react';

type ClaimStep = 'idle' | 'signing' | 'submitting' | 'confirming' | 'done' | 'error';

function formatTokens(weiStr: string): string {
  const wei = BigInt(weiStr || '0');
  return (wei / (BigInt(10) ** BigInt(18))).toString();
}

export default function ContestPlay({
  list,
  onExit,
}: {
  list: QuestionListWithMeta;
  onExit: () => void;
}) {
  const [questions, setQuestions] = useState<ClientQuestion[] | null>(null);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; correctIndex: number } | null>(null);
  const [result, setResult] = useState<{ correctCount: number; rewardAmount: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [claimStep, setClaimStep] = useState<ClaimStep>('idle');
  const [claimError, setClaimError] = useState<string | null>(null);
  const [currentNonce, setCurrentNonce] = useState<string | null>(null);
  
  const [callId, setCallId] = useState<string | null>(null);
