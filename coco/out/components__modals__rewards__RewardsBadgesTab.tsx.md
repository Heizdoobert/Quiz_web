# components/modals/rewards/RewardsBadgesTab.tsx
lines:109 exports:RewardsBadgesTab
---
import React from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, Loader2, Sparkles, Check, Lock, Target, Trophy, Flame, Award } from 'lucide-react';
import { BADGE_NAMES, ClaimableRewards } from '@/lib/types';

const BADGE_COMPONENTS: Record<number, React.ReactNode> = {
  0: <Trophy className="w-8 h-8 text-[#FFD166] mx-auto" />,
  1: <Flame className="w-8 h-8 text-[#FF4757] mx-auto" />,
  2: <Award className="w-8 h-8 text-[#00FFCC] mx-auto" />,
  3: <Sparkles className="w-8 h-8 text-[#6C5CE7] mx-auto" />,
};

export function RewardsBadgesTab({
  rewards,
  claimStep,
  claimError,
  explorerUrl,
  mintingBadge,
  isWrongChain,
  isGasless,
  handleMintBadge,
}: {
  rewards: ClaimableRewards;
  claimStep: string;
  claimError: string | null;
  explorerUrl: string | null;
  mintingBadge: number | null;
  isWrongChain: boolean;
  isGasless: boolean;
  handleMintBadge: (badgeType: number) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {[0, 1, 2, 3].map((badgeType) => {
        const isClaimed = rewards.alreadyClaimedBadges.includes(badgeType);
        const isEligible = rewards.eligibleBadges.includes(badgeType);
        const isMinting = mintingBadge === badgeType && claimStep !== 'idle' && claimStep !== 'done' && claimStep !== 'error';

        return (
          <div
