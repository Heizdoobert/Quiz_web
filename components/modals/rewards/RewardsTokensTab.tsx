import React from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, Loader2, Sparkles } from 'lucide-react';
import { ClaimableRewards } from '@/lib/types';
import useSound from 'use-sound';

export function RewardsTokensTab({
  rewards,
  claimStep,
  claimError,
  explorerUrl,
  mintingBadge,
  isWrongChain,
  isGasless,
  formatTokens,
  handleClaimTokens,
}: {
  rewards: ClaimableRewards;
  claimStep: string;
  claimError: string | null;
  explorerUrl: string | null;
  mintingBadge: number | null;
  isWrongChain: boolean;
  isGasless: boolean;
  formatTokens: (val: string) => string;
  handleClaimTokens: () => void;
}) {
  const [playCorrect] = useSound('/sounds/correct.mp3', { volume: 0.6 });

  React.useEffect(() => {
    if (claimStep === 'done') {
      playCorrect();
    }
  }, [claimStep, playCorrect]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <div className="p-4 bg-deep-space/70 border border-cyber-border rounded-xl text-center">
          <p className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Earned</p>
          <p className="text-lg font-black text-neo-mint font-heading">{formatTokens(rewards.totalEarned)}</p>
        </div>
        <div className="p-4 bg-deep-space/70 border border-cyber-border rounded-xl text-center">
          <p className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Claimed</p>
          <p className="text-lg font-bold text-slate-300 font-heading">{formatTokens(rewards.totalClaimed)}</p>
        </div>
        <div className="p-4 bg-deep-space/70 border border-cyber-border rounded-xl text-center">
          <p className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Available</p>
          <p className="text-lg font-black text-crypto-gold font-heading">{formatTokens(rewards.claimableTokens)}</p>
        </div>
      </div>

      <p className="text-xs text-slate-400 text-center">
        Earn <span className="text-neo-mint font-bold">10 $QUIZ</span> for every correct answer
      </p>

      {claimStep === 'done' && explorerUrl && mintingBadge === null ? (
        <div className="p-4 bg-neo-mint/15 border border-neo-mint/40 rounded-xl text-center">
          <p className="text-neo-mint font-bold mb-1 inline-flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-neo-mint" /> Tokens claimed successfully!
          </p>
          <br />
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-crypto-gold hover:underline text-xs inline-flex items-center gap-1 font-semibold"
          >
            View on BaseScan <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      ) : claimStep === 'error' ? (
        <div className="p-4 bg-pop-coral/15 border border-pop-coral/40 rounded-xl text-center">
          <p className="text-pop-coral text-sm font-medium">{claimError}</p>
        </div>
      ) : null}

      <motion.button
        type="button"
        onClick={handleClaimTokens}
        disabled={
          isWrongChain ||
          BigInt(rewards.claimableTokens || '0') <= BigInt(0) ||
          (claimStep !== 'idle' && claimStep !== 'done' && claimStep !== 'error')
        }
        whileHover={{ scale: 1.015, filter: 'brightness(1.1)' }}
        whileTap={{ scale: 0.985 }}
        transition={{ type: 'spring', stiffness: 450, damping: 25 }}
        className="w-full py-3 bg-linear-to-r from-neo-mint to-electric-indigo disabled:bg-cyber-violet-light disabled:from-transparent disabled:to-transparent disabled:text-slate-500 text-deep-space font-black rounded-xl transition-[color,background-color,border-color,opacity,box-shadow] shadow-lg shadow-neo-mint/20 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed font-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-mint"
      >
        {claimStep === 'signing' && <Loader2 className="w-4 h-4 animate-spin text-deep-space" />}
        {claimStep === 'submitting' && <Loader2 className="w-4 h-4 animate-spin text-deep-space" />}
        {claimStep === 'confirming' && <Loader2 className="w-4 h-4 animate-spin text-deep-space" />}
        {claimStep === 'idle' || claimStep === 'done' || claimStep === 'error'
          ? `Claim ${formatTokens(rewards.claimableTokens)} $QUIZ${isGasless ? ' (Gasless)' : ''}`
          : claimStep === 'signing'
            ? 'Generating voucher...'
            : claimStep === 'submitting'
              ? 'Confirm in wallet...'
              : 'Confirming on-chain...'}
      </motion.button>
    </div>
  );
}
