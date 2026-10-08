# components/modals/rewards/RewardsTokensTab.tsx
lines:104 exports:RewardsTokensTab
---
import React from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, Loader2, Sparkles } from 'lucide-react';
import { ClaimableRewards } from '@/lib/types';
import useSound from 'use-sound';

export function RewardsTokensTab({
  rewards,
  claimStep,
  claimError,
  explorerUrl,
  mintingBadge,
  isWrongChain,
  isGasless,
  formatTokens,
  handleClaimTokens,
}: {
  rewards: ClaimableRewards;
  claimStep: string;
  claimError: string | null;
  explorerUrl: string | null;
  mintingBadge: number | null;
  isWrongChain: boolean;
  isGasless: boolean;
  formatTokens: (val: string) => string;
  handleClaimTokens: () => void;
}) {
  const [playCorrect] = useSound('/sounds/correct.mp3', { volume: 0.6 });

  React.useEffect(() => {
    if (claimStep === 'done') {
      playCorrect();
    }
  }, [claimStep, playCorrect]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <div className="p-4 bg-deep-space/70 border border-cyber-border rounded-xl text-center">
          <p className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Earned</p>
