'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Modal from '../Modal';
import { useProfileModal } from '@/hooks/modals/use-profile-modal';
import { UserStats, ClaimableRewards, BADGE_NAMES, BADGE_ICONS } from '@/lib/types';
import {
  User,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Lock,
  Trophy,
  Flame,
  Award,
  Coins,
  Sparkles,
} from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  address?: string;
  stats: UserStats;
  claimableRewards: ClaimableRewards | null;
  onOpenRewards: () => void;
}

const BADGE_CRITERIA: Record<number, string> = {
  0: 'Reach Rank #1 on the Global Leaderboard',
  1: 'Achieve a correct answer streak of 5+',
  2: 'Answer 100 total quiz questions',
  3: 'Score 100% accuracy with at least 10 answered',
};

export default function ProfileModal({
  isOpen,
  onClose,
  address,
  stats,
  claimableRewards,
  onOpenRewards,
}: ProfileModalProps) {
  const { copied, handleCopy, tier, formattedAddress } = useProfileModal({
    address,
    totalAnswered: stats.totalAnswered,
    score: stats.score,
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Web3 Player Profile"
      icon={<User className="w-5 h-5 text-[#6C5CE7]" />}
      maxWidth="max-w-xl"
    >
      <div className="space-y-7">
        {/* User Identity Card */}
        <div className="p-5 rounded-2xl bg-[#0A1128]/90 border border-[#2D305A] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#6C5CE7] to-[#00FFCC] flex items-center justify-center font-heading font-black text-xl text-[#0A1128] shadow-lg">
              {address ? address.slice(2, 4).toUpperCase() : '??'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-heading font-bold text-slate-100 text-sm">
                  {formattedAddress}
                </span>
                {address && (
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="p-1 rounded-lg hover:bg-[#25284D] text-slate-400 hover:text-[#00FFCC] transition-colors cursor-pointer active:scale-90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00FFCC]"
                    title="Copy address"
                    aria-label="Copy address"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-[#00FFCC]" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                )}
                {address && (
                  <a
                    href={`https://sepolia.basescan.org/address/${address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 rounded-lg hover:bg-[#25284D] text-slate-400 hover:text-[#6C5CE7] transition-colors cursor-pointer active:scale-90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#6C5CE7]"
                    title="View on BaseScan"
                    aria-label="View on BaseScan"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span
                  style={{ color: tier.color }}
                  className="text-xs font-heading font-black tracking-wider uppercase"
                >
                  {tier.title}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">Base Sepolia</span>
              </div>
            </div>
          </div>

          <div className="sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-[#2D305A]">
            <div className="text-[11px] text-slate-400 font-medium">On-Chain Rewards</div>
            <div className="flex items-center sm:justify-end gap-1.5 mt-0.5">
              <Coins className="w-4 h-4 text-[#FFD166]" />
              <span className="font-heading font-black text-sm text-[#FFD166]">
                {claimableRewards?.totalEarned || '0'} $QUIZ
              </span>
            </div>
          </div>
        </div>

        {/* 4 Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl bg-[#0A1128]/70 border border-[#2D305A] text-center">
            <div className="text-[11px] text-slate-400 font-medium flex items-center justify-center gap-1">
              <Trophy className="w-3 h-3 text-[#00FFCC]" /> Score
            </div>
            <div className="mt-1 font-heading font-black text-lg text-[#00FFCC]">{stats.score}</div>
          </div>

          <div className="p-4 rounded-2xl bg-[#0A1128]/70 border border-[#2D305A] text-center">
            <div className="text-[11px] text-slate-400 font-medium flex items-center justify-center gap-1">
              <Award className="w-3 h-3 text-[#6C5CE7]" /> Accuracy
            </div>
            <div className="mt-1 font-heading font-black text-lg text-[#6C5CE7]">{stats.accuracy}%</div>
          </div>

          <div className="p-4 rounded-2xl bg-[#0A1128]/70 border border-[#2D305A] text-center">
            <div className="text-[11px] text-slate-400 font-medium flex items-center justify-center gap-1">
              <Flame className="w-3 h-3 text-[#FFD166]" /> Streak
            </div>
            <div className="mt-1 font-heading font-black text-lg text-[#FFD166]">{stats.streak}</div>
          </div>

          <div className="p-4 rounded-2xl bg-[#0A1128]/70 border border-[#2D305A] text-center">
            <div className="text-[11px] text-slate-400 font-medium flex items-center justify-center gap-1">
              <Sparkles className="w-3 h-3 text-[#FF4757]" /> Best Streak
            </div>
            <div className="mt-1 font-heading font-black text-lg text-[#FF4757]">{stats.bestStreak}</div>
          </div>
        </div>

        {/* NFT Trophy Case */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h5 className="text-xs font-black tracking-wider uppercase text-slate-300 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-[#FFD166]" /> NFT Achievement Badges
            </h5>
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
                <div
                  key={badgeId}
                  className={`p-4 rounded-2xl border transition-all flex items-start gap-3 ${
                    isMinted
                      ? 'bg-[#FFD166]/10 border-[#FFD166]/50'
                      : isEligible
                      ? 'bg-[#00FFCC]/10 border-[#00FFCC]/50'
                      : 'bg-[#0A1128]/60 border-[#2D305A]/70 opacity-75'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${
                      isMinted
                        ? 'bg-[#FFD166]/20 border border-[#FFD166]/40'
                        : isEligible
                        ? 'bg-[#00FFCC]/20 border border-[#00FFCC]/40'
                        : 'bg-[#25284D]/40 border border-[#2D305A]'
                    }`}
                  >
                    {icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-heading font-bold text-xs text-slate-200 truncate">
                        {name}
                      </span>
                      {isMinted ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-[#FFD166] shrink-0">
                          <ShieldCheck className="w-3 h-3" /> Minted
                        </span>
                      ) : isEligible ? (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onOpenRewards();
                          }}
                          className="px-2 py-0.5 rounded-md bg-[#00FFCC] text-[#0A1128] font-heading font-black text-[10px] hover:bg-[#00FFCC]/90 active:scale-95 transition-all cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFCC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A1B35]"
                        >
                          Mint Now
                        </button>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] text-slate-500 shrink-0">
                          <Lock className="w-3 h-3" /> Locked
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {criteria}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Claim Rewards CTA Banner */}
        {BigInt(claimableRewards?.claimableTokens || '0') > BigInt(0) && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-[#00FFCC]/15 to-[#6C5CE7]/15 border border-[#00FFCC]/30 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-[#00FFCC] animate-bounce" />
              <span className="text-xs text-slate-200 font-medium">
                You have{' '}
                <strong className="text-[#00FFCC]">{claimableRewards?.claimableTokens} $QUIZ</strong>{' '}
                unclaimed!
              </span>
            </div>
            <motion.button
              type="button"
              onClick={() => {
                onClose();
                onOpenRewards();
              }}
              whileHover={{ filter: 'brightness(1.1)' }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 450, damping: 25 }}
              className="px-3 py-1.5 rounded-xl bg-[#00FFCC] text-[#0A1128] font-heading font-black text-xs transition-all cursor-pointer shadow-[0_0_12px_rgba(0,255,204,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFCC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A1B35]"
            >
              Claim All
            </motion.button>
          </div>
        )}
      </div>
    </Modal>
  );
}
