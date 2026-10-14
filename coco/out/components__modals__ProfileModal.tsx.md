# components/modals/ProfileModal.tsx
lines:93 exports:default
---
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

