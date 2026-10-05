'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Modal from '../Modal';
import { useProfileModal } from '@/hooks/modals/use-profile-modal';
import Link from 'next/link';
import { UserStats, ClaimableRewards } from '@/lib/types';
import { TARGET_CHAIN_NAME, TARGET_EXPLORER_URL } from '@/lib/contracts/addresses';
import {
  User,
  Copy,
  Check,
  ExternalLink,
  Trophy,
  Flame,
  Award,
  Coins,
  Sparkles,
} from 'lucide-react';
import { NFTTrophyCase } from './profile/NFTTrophyCase';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  address?: string;
  stats: UserStats;
  claimableRewards: ClaimableRewards | null;
  onOpenRewards: () => void;
}

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
      icon={<User className="w-5 h-5 text-electric-indigo" />}
      maxWidth="max-w-xl"
    >
      <div className="space-y-7">
        {/* User Identity Card */}
        <div className="p-5 rounded-2xl bg-deep-space/90 border border-cyber-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-electric-indigo to-neo-mint flex items-center justify-center font-heading font-black text-xl text-deep-space shadow-lg">
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
                    className="p-1 rounded-lg hover:bg-cyber-violet-light text-slate-400 hover:text-neo-mint transition-colors cursor-pointer active:scale-90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neo-mint"
                    title="Copy address"
                    aria-label="Copy address"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-neo-mint" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                )}
                {address && (
                  <a
                    href={`${TARGET_EXPLORER_URL}/address/${address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 rounded-lg hover:bg-cyber-violet-light text-slate-400 hover:text-electric-indigo transition-colors cursor-pointer active:scale-90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-electric-indigo"
                    title="View on Explorer"
                    aria-label="View on Explorer"
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
                <span className="text-[10px] text-slate-500 font-mono">{TARGET_CHAIN_NAME}</span>
              </div>
            </div>
          </div>

          <div className="sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-cyber-border">
            <div className="text-[11px] text-slate-400 font-medium">On-Chain Rewards</div>
            <div className="flex items-center sm:justify-end gap-1.5 mt-0.5">
              <Coins className="w-4 h-4 text-crypto-gold" />
              <span className="font-heading font-black text-sm text-crypto-gold">
                {claimableRewards?.totalEarned || '0'} $QUIZ
              </span>
            </div>
          </div>
        </div>

        {/* 4 Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl bg-deep-space/70 border border-cyber-border text-center">
            <div className="text-[11px] text-slate-400 font-medium flex items-center justify-center gap-1">
              <Trophy className="w-3 h-3 text-neo-mint" /> Score
            </div>
            <div className="mt-1 font-heading font-black text-lg text-neo-mint">{stats.score}</div>
          </div>

          <div className="p-4 rounded-2xl bg-deep-space/70 border border-cyber-border text-center">
            <div className="text-[11px] text-slate-400 font-medium flex items-center justify-center gap-1">
              <Award className="w-3 h-3 text-electric-indigo" /> Accuracy
            </div>
            <div className="mt-1 font-heading font-black text-lg text-electric-indigo">{stats.accuracy}%</div>
          </div>

          <div className="p-4 rounded-2xl bg-deep-space/70 border border-cyber-border text-center">
            <div className="text-[11px] text-slate-400 font-medium flex items-center justify-center gap-1">
              <Flame className="w-3 h-3 text-crypto-gold" /> Streak
            </div>
            <div className="mt-1 font-heading font-black text-lg text-crypto-gold">{stats.streak}</div>
          </div>

          <div className="p-4 rounded-2xl bg-deep-space/70 border border-cyber-border text-center">
            <div className="text-[11px] text-slate-400 font-medium flex items-center justify-center gap-1">
              <Sparkles className="w-3 h-3 text-pop-coral" /> Best Streak
            </div>
            <div className="mt-1 font-heading font-black text-lg text-pop-coral">{stats.bestStreak}</div>
          </div>
        </div>

        {/* Creator Dashboard Link */}
        <div className="pt-2">
          <Link
            href="/profile"
            onClick={onClose}
            className="w-full flex items-center justify-between p-4 rounded-xl bg-electric-indigo/10 hover:bg-electric-indigo/20 border border-electric-indigo/30 text-white transition-all group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric-indigo"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-electric-indigo/20 text-electric-indigo group-hover:scale-110 transition-transform">
                <User className="w-5 h-5" />
              </div>
              <div className="text-left">
                <div className="font-bold font-heading">Creator Dashboard & Backups</div>
                <div className="text-xs text-electric-indigo">Manage your quizzes and data</div>
              </div>
            </div>
          </Link>
        </div>

        <NFTTrophyCase
          claimableRewards={claimableRewards}
          onOpenRewards={onOpenRewards}
          onClose={onClose}
        />

        {/* Claim Rewards CTA Banner */}
        {BigInt(claimableRewards?.claimableTokens || '0') > BigInt(0) && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-neo-mint/15 to-electric-indigo/15 border border-neo-mint/30 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-neo-mint animate-bounce" />
              <span className="text-xs text-slate-200 font-medium">
                You have{' '}
                <strong className="text-neo-mint">{claimableRewards?.claimableTokens} $QUIZ</strong>{' '}
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
              className="px-3 py-1.5 rounded-xl bg-neo-mint text-deep-space font-heading font-black text-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-mint focus-visible:ring-offset-2 focus-visible:ring-offset-cyber-violet"
            >
              Claim All
            </motion.button>
          </div>
        )}
      </div>
    </Modal>
  );
}
