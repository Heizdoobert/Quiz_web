'use client';

import React, { useEffect, useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useSwitchChain, useChainId } from 'wagmi';
import {
  startListAttempt,
  completeListAttempt,
  claimListReward,
  markListRewardClaimed,
} from '@/lib/actions/question-list-actions';
import { confirmRewardClaim } from '@/lib/actions/reward-actions';
import { submitAnswer } from '@/lib/actions/quiz-actions';
import { ClientQuestion, QuestionListWithMeta, RewardVoucher } from '@/lib/types';
import { QuizTokenABI } from '@/lib/contracts/QuizTokenABI';
import { QUIZ_TOKEN_ADDRESS } from '@/lib/contracts/addresses';
import { ArrowLeft, Loader2, Trophy, Coins, CheckCircle2, XCircle } from 'lucide-react';

const TARGET_CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '84532', 10);

type ClaimStep = 'idle' | 'signing' | 'submitting' | 'confirming' | 'done' | 'error';

function formatTokens(weiStr: string): string {
  const wei = BigInt(weiStr || '0');
  return (wei / (BigInt(10) ** BigInt(18))).toString();
}

export default function ContestPlay({
  list,
  wallet,
  onExit,
}: {
  list: QuestionListWithMeta;
  wallet: string;
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
  const [txHash, setTxHash] = useState<string | null>(null);

  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const { isSuccess: txConfirmed } = useWaitForTransactionReceipt({ hash: txHash as `0x${string}` | undefined });

  useEffect(() => {
    startListAttempt(list.id, wallet).then((res) => {
      if (!res.success) {
        setError(res.error || 'Failed to start contest.');
        return;
      }
      setQuestions(res.questions || []);
    });
  }, [list.id, wallet]);

  useEffect(() => {
    if (txConfirmed && currentNonce && txHash) {
      confirmRewardClaim(wallet, currentNonce, txHash).then(async (res) => {
        if (res?.success) {
          await markListRewardClaimed(list.id, wallet);
          setClaimStep('done');
        } else {
          setClaimStep('error');
          setClaimError('Failed to confirm reward claim with backend');
        }
        setCurrentNonce(null);
      });
    }
  }, [txConfirmed, currentNonce, txHash, wallet, list.id]);

  const isWrongChain = chainId !== TARGET_CHAIN_ID;

  const handleSelect = async (optionIdx: number) => {
    if (selected !== null || !questions) return;
    setSelected(optionIdx);
    const res = await submitAnswer({ questionId: questions[index].id, answerIndex: optionIdx, walletAddress: wallet });
    setFeedback({ isCorrect: res.isCorrect, correctIndex: res.correctIndex });
  };

  const handleNext = async () => {
    if (!questions) return;
    setSelected(null);
    setFeedback(null);
    if (index + 1 < questions.length) {
      setIndex(index + 1);
      return;
    }
    const res = await completeListAttempt(list.id, wallet);
    if (!res.success) {
      setError(res.error || 'Failed to finalize contest.');
      return;
    }
    setResult({ correctCount: res.correctCount || 0, rewardAmount: res.rewardAmount || '0' });
  };

  const handleClaim = async () => {
    setClaimError(null);
    setClaimStep('signing');
    const voucher: RewardVoucher | { error: string } = await claimListReward(list.id, wallet);
    if ('error' in voucher) {
      setClaimError(voucher.error);
      setClaimStep('error');
      return;
    }
    setCurrentNonce(voucher.nonce);
    setClaimStep('submitting');
    try {
      const hash = await writeContractAsync({
        address: QUIZ_TOKEN_ADDRESS,
        abi: QuizTokenABI,
        functionName: 'claimTokens',
        args: [
          voucher.recipient as `0x${string}`,
          BigInt(voucher.amount),
          BigInt(voucher.nonce),
          BigInt(voucher.deadline),
          voucher.signature as `0x${string}`,
        ],
      });
      setTxHash(hash);
      setClaimStep('confirming');
    } catch (err) {
      console.error('Claim tx failed:', err);
      setClaimError('Transaction failed or was rejected');
      setClaimStep('error');
    }
  };

  if (error) {
    return (
      <div className="max-w-xl mx-auto p-6 text-center space-y-3">
        <p className="text-sm text-[#FF4757]">{error}</p>
        <button onClick={onExit} className="text-sm text-[#00FFCC] cursor-pointer">
          Back to contests
        </button>
      </div>
    );
  }

  if (result) {
    return (
      <div className="max-w-xl mx-auto p-6 text-center space-y-4">
        <Trophy className="w-10 h-10 text-[#FFD166] mx-auto" />
        <h2 className="text-xl font-black text-white">Contest Complete!</h2>
        <p className="text-slate-300 text-sm">
          {result.correctCount} / {questions?.length ?? 0} correct
        </p>
        <p className="text-2xl font-black text-[#00FFCC]">{formatTokens(result.rewardAmount)} QUIZ</p>

        {isWrongChain ? (
          <button
            onClick={() => switchChain({ chainId: TARGET_CHAIN_ID })}
            className="px-4 py-2 bg-[#FF4757] text-white rounded-xl font-bold text-sm cursor-pointer"
          >
            Switch to Base Sepolia
          </button>
        ) : claimStep === 'done' ? (
          <p className="text-[#00FFCC] font-bold text-sm flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" /> Reward claimed!
          </p>
        ) : (
          <button
            onClick={handleClaim}
            disabled={claimStep === 'signing' || claimStep === 'submitting' || claimStep === 'confirming' || BigInt(result.rewardAmount) <= BigInt(0)}
            className="px-5 py-2.5 bg-gradient-to-r from-[#00FFCC] to-[#6C5CE7] disabled:opacity-40 text-[#0A1128] rounded-xl font-black text-sm flex items-center justify-center gap-2 mx-auto cursor-pointer"
          >
            {(claimStep === 'signing' || claimStep === 'submitting' || claimStep === 'confirming') && (
              <Loader2 className="w-4 h-4 animate-spin" />
            )}
            <Coins className="w-4 h-4" /> Claim Reward
          </button>
        )}
        {claimError && <p className="text-xs text-[#FF4757]">{claimError}</p>}

        <button onClick={onExit} className="block mx-auto text-sm text-slate-400 hover:text-white cursor-pointer">
          Back to contests
        </button>
      </div>
    );
  }

  if (!questions) {
    return <p className="text-center text-slate-400 py-12">Loading contest...</p>;
  }

  const question = questions[index];

  return (
    <div className="max-w-xl mx-auto p-4 sm:p-6 space-y-4">
      <button onClick={onExit} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white cursor-pointer">
        <ArrowLeft className="w-4 h-4" /> Exit contest
      </button>
      <p className="text-xs text-slate-500 font-mono">
        Question {index + 1} / {questions.length}
      </p>
      <h2 className="text-lg font-bold text-white">{question.prompt}</h2>
      <div className="space-y-2">
        {question.options.map((opt, idx) => {
          const isSelected = selected === idx;
          const isCorrectAnswer = feedback && idx === feedback.correctIndex;
          const showWrong = feedback && isSelected && !feedback.isCorrect;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelect(idx)}
              disabled={selected !== null}
              className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all cursor-pointer ${
                isCorrectAnswer
                  ? 'bg-[#00FFCC]/15 border-[#00FFCC] text-[#00FFCC]'
                  : showWrong
                  ? 'bg-[#FF4757]/15 border-[#FF4757] text-[#FF4757]'
                  : 'bg-[#1A1B35] border-[#2D305A] text-white hover:border-[#6C5CE7]/50'
              }`}
            >
              <span className="flex items-center justify-between">
                {opt}
                {isCorrectAnswer && <CheckCircle2 className="w-4 h-4" />}
                {showWrong && <XCircle className="w-4 h-4" />}
              </span>
            </button>
          );
        })}
      </div>
      {feedback && (
        <button
          onClick={handleNext}
          className="w-full py-2.5 bg-gradient-to-r from-[#00FFCC] to-[#6C5CE7] text-[#0A1128] rounded-xl font-black text-sm cursor-pointer"
        >
          {index + 1 < questions.length ? 'Next Question' : 'Finish Contest'}
        </button>
      )}
    </div>
  );
}
