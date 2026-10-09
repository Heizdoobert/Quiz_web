'use client';

import React from 'react';
import Modal from '@/components/ui/Modal';
import { getPlayerTier } from '@/hooks/modals/use-profile-modal';
import Link from 'next/link';
import { UserStats } from '@/lib/types';
import { User, Trophy, Flame, Award, Sparkles } from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: UserStats;
}

export default function ProfileModal({ isOpen, onClose, stats }: ProfileModalProps) {
  const tier = getPlayerTier(stats.totalAnswered, stats.score);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Player Profile"
      icon={<User className="w-5 h-5 text-electric-indigo" />}
      maxWidth="max-w-xl"
    >
      <div className="space-y-7">
        {/* Rank */}
        <div className="p-5 rounded-2xl bg-deep-space/90 border border-cyber-border flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-linear-to-tr from-electric-indigo to-neo-mint flex items-center justify-center text-deep-space shadow-lg">
            <User className="w-6 h-6" />
          </div>
          <span
            style={{ color: tier.color }}
            className="text-sm font-heading font-black tracking-wider uppercase"
          >
            {tier.title}
          </span>
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
      </div>
    </Modal>
  );
}
