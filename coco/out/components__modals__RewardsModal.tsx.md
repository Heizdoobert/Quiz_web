# components/modals/RewardsModal.tsx
lines:263 exports:default
---
'use client';

import React from 'react';
import Modal from '@/components/Modal';
import { BADGE_NAMES } from '@/lib/types';
import { useRewardsModal } from '@/hooks/modals/use-rewards-modal';
import NoWalletNotice from '@/components/rewards/NoWalletNotice';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { motion } from 'framer-motion';
import { Gift, Coins, Award, ExternalLink, Loader2, Trophy, Flame, Sparkles, Check, Lock, Target } from 'lucide-react';

const BADGE_COMPONENTS: Record<number, React.ReactNode> = {
  0: <Trophy className="w-8 h-8 text-[#FFD166] mx-auto" />,
  1: <Flame className="w-8 h-8 text-[#FF4757] mx-auto" />,
  2: <Award className="w-8 h-8 text-[#00FFCC] mx-auto" />,
  3: <Sparkles className="w-8 h-8 text-[#6C5CE7] mx-auto" />,
};

interface RewardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddress: string | null;
}

export default function RewardsModal({ isOpen, onClose, walletAddress }: RewardsModalProps) {
  const {
    tab,
    setTab,
    rewards,
    hasNoWallet,
    loading,
    claimStep,
    claimError,
    mintingBadge,
    isWrongChain,
    isGasless,
    handleSwitchChain,
    handleClaimTokens,
    handleMintBadge,
    formatTokens,
