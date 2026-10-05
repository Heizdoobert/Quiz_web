# components/modals/ProfileModal.tsx
lines:198 exports:default
---
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
