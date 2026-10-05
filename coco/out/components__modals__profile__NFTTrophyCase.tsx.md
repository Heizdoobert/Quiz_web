# components/modals/profile/NFTTrophyCase.tsx
lines:99 exports:NFTTrophyCase
---
import React from 'react';
import { ClaimableRewards, BADGE_NAMES, BADGE_ICONS } from '@/lib/types';
import { Award, ShieldCheck, Lock } from 'lucide-react';

const BADGE_CRITERIA: Record<number, string> = {
  0: 'Reach Rank #1 on the Global Leaderboard',
  1: 'Achieve a correct answer streak of 5+',
  2: 'Answer 100 total quiz questions',
  3: 'Score 100% accuracy with at least 10 answered',
};

export function NFTTrophyCase({
  claimableRewards,
  onOpenRewards,
  onClose,
}: {
  claimableRewards: ClaimableRewards | null;
  onOpenRewards: () => void;
  onClose: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-black tracking-wider uppercase text-slate-300 flex items-center gap-1.5">
          <Award className="w-4 h-4 text-[#FFD166]" /> NFT Achievement Badges
        </h4>
        <span className="text-[11px] text-slate-400 font-mono">
          {(claimableRewards?.alreadyClaimedBadges?.length || 0)} / 4 Minted
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((badgeId) => {
          const name = BADGE_NAMES[badgeId] || `Badge #${badgeId}`;
          const icon = BADGE_ICONS[badgeId] || '🏅';
          const criteria = BADGE_CRITERIA[badgeId] || 'Complete quiz objectives';
          const isMinted = claimableRewards?.alreadyClaimedBadges?.includes(badgeId);
          const isEligible = claimableRewards?.eligibleBadges?.includes(badgeId);

          return (
