# components/lists/play/ContestPlayClaimButton.tsx
lines:58 exports:ClaimStep,ContestPlayClaimButton
---
import React from 'react';
import { Loader2, Coins, CheckCircle2 } from 'lucide-react';

export type ClaimStep = 'idle' | 'signing' | 'submitting' | 'confirming' | 'done' | 'error';

export function ContestPlayClaimButton({
  isWrongChain,
  claimStep,
  claimError,
  isGasless,
  rewardAmount,
  onSwitchChain,
  onClaim,
  targetChainName,
}: {
  isWrongChain: boolean;
  claimStep: ClaimStep;
  claimError: string | null;
  isGasless: boolean;
  rewardAmount: string;
  onSwitchChain: () => void;
  onClaim: () => void;
  targetChainName: string;
}) {
  return (
    <div className="space-y-4">
      {isWrongChain ? (
        <button
          onClick={onSwitchChain}
          className="px-4 py-2 bg-[#FF4757] text-white rounded-xl font-bold text-sm cursor-pointer"
        >
          Switch to {targetChainName}
        </button>
      ) : claimStep === 'done' ? (
        <p className="text-[#00FFCC] font-bold text-sm flex items-center justify-center gap-1.5">
          <CheckCircle2 className="w-4 h-4" /> Reward claimed!
        </p>
      ) : (
        <button
          onClick={onClaim}
