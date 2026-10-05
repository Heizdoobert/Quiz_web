# components/modals/RewardsModal.tsx
lines:134 exports:default
---
'use client';

import React from 'react';
import Modal from '@/components/Modal';
import { useRewardsModal } from '@/hooks/modals/use-rewards-modal';
import NoWalletNotice from '@/components/rewards/NoWalletNotice';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Gift, Coins, Award, Loader2, Sparkles } from 'lucide-react';
import { RewardsTokensTab } from './rewards/RewardsTokensTab';
import { RewardsBadgesTab } from './rewards/RewardsBadgesTab';

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
    explorerUrl,
    targetChainName,
  } = useRewardsModal({ isOpen, walletAddress });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Rewards & Badges" icon={<Gift className="w-5 h-5 text-[#FFD166]" />} maxWidth="max-w-lg">
      {/* Chain warning */}
