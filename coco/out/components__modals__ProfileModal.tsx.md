# components/modals/ProfileModal.tsx
lines:278 exports:default
---
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Modal from '../Modal';
import { useProfileModal } from '@/hooks/modals/use-profile-modal';
import Link from 'next/link';
import { UserStats, ClaimableRewards, BADGE_NAMES, BADGE_ICONS } from '@/lib/types';
import { TARGET_CHAIN_NAME, TARGET_EXPLORER_URL } from '@/lib/contracts/addresses';
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
