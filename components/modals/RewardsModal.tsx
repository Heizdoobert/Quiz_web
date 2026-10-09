'use client';

import React from 'react';
import Modal from '@/components/ui/Modal';
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
    <Modal isOpen={isOpen} onClose={onClose} title="Rewards & Badges" icon={<Gift className="w-5 h-5 text-crypto-gold" />} maxWidth="max-w-lg">
      {/* Chain warning */}
      {isWrongChain && (
        <div className="mb-5 p-4 bg-pop-coral/15 border border-pop-coral/40 rounded-xl text-pop-coral text-sm flex items-center justify-between">
          <span className="font-medium">Switch to {targetChainName} to claim rewards</span>
          <button
            type="button"
            onClick={handleSwitchChain}
            className="px-3 py-1 bg-pop-coral hover:bg-pop-coral/90 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
          >
            Switch
          </button>
        </div>
      )}

      {/* Gasless / Sponsored badge */}
      {isGasless && !isWrongChain && (
        <div className="mb-4 p-2.5 bg-neo-mint/10 border border-neo-mint/30 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-neo-mint" />
            <span className="text-xs font-bold text-neo-mint">Gasless Transactions Active</span>
          </div>
          <span className="text-[10px] font-black uppercase tracking-wider text-deep-space bg-neo-mint px-2 py-0.5 rounded-full">
            Free Gas
          </span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1.5 mb-4 bg-deep-space/80 border border-cyber-border rounded-xl p-1.5">
        <button
          type="button"
          onClick={() => setTab('tokens')}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-mint ${
            tab === 'tokens'
              ? 'bg-electric-indigo text-white shadow-md'
              : 'text-slate-400 hover:text-neo-mint'
          }`}
        >
          <Coins className="w-4 h-4" /> $QUIZ Tokens
        </button>
        <button
          type="button"
          onClick={() => setTab('badges')}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-mint ${
            tab === 'badges'
              ? 'bg-electric-indigo text-white shadow-md'
              : 'text-slate-400 hover:text-neo-mint'
          }`}
        >
          <Award className="w-4 h-4" /> Badges
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 text-neo-mint animate-spin" />
        </div>
      ) : hasNoWallet ? (
        <div className="space-y-5 py-2">
          <NoWalletNotice heldTokens={rewards?.heldTokens} sweepsAt={rewards?.sweepsAt} />
          <div className="flex justify-center">
            <ConnectButton label="Add wallet" showBalance={false} />
          </div>
        </div>
      ) : !walletAddress ? (
        <p className="text-slate-400 text-center py-8">Connect your wallet to view rewards</p>
      ) : !rewards ? (
        <p className="text-slate-400 text-center py-8">No rewards data</p>
      ) : tab === 'tokens' ? (
        <RewardsTokensTab
          rewards={rewards}
          claimStep={claimStep}
          claimError={claimError}
          explorerUrl={explorerUrl}
          mintingBadge={mintingBadge}
          isWrongChain={isWrongChain}
          isGasless={isGasless}
          formatTokens={formatTokens}
          handleClaimTokens={handleClaimTokens}
        />
      ) : (
        <RewardsBadgesTab
          rewards={rewards}
          claimStep={claimStep}
          claimError={claimError}
          explorerUrl={explorerUrl}
          mintingBadge={mintingBadge}
          isWrongChain={isWrongChain}
          isGasless={isGasless}
          handleMintBadge={handleMintBadge}
        />
      )}
    </Modal>
  );
}
