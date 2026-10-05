import React from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, Loader2, Sparkles, Check, Lock, Target, Trophy, Flame, Award } from 'lucide-react';
import { BADGE_NAMES, ClaimableRewards } from '@/lib/types';

const BADGE_COMPONENTS: Record<number, React.ReactNode> = {
  0: <Trophy className="w-8 h-8 text-crypto-gold mx-auto" />,
  1: <Flame className="w-8 h-8 text-pop-coral mx-auto" />,
  2: <Award className="w-8 h-8 text-neo-mint mx-auto" />,
  3: <Sparkles className="w-8 h-8 text-electric-indigo mx-auto" />,
};

export function RewardsBadgesTab({
  rewards,
  claimStep,
  claimError,
  explorerUrl,
  mintingBadge,
  isWrongChain,
  isGasless,
  handleMintBadge,
}: {
  rewards: ClaimableRewards;
  claimStep: string;
  claimError: string | null;
  explorerUrl: string | null;
  mintingBadge: number | null;
  isWrongChain: boolean;
  isGasless: boolean;
  handleMintBadge: (badgeType: number) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {[0, 1, 2, 3].map((badgeType) => {
        const isClaimed = rewards.alreadyClaimedBadges.includes(badgeType);
        const isEligible = rewards.eligibleBadges.includes(badgeType);
        const isMinting = mintingBadge === badgeType && claimStep !== 'idle' && claimStep !== 'done' && claimStep !== 'error';

        return (
          <div
            key={badgeType}
            className={`p-5 rounded-xl border text-center transition-all ${
              isClaimed
                ? 'bg-neo-mint/10 border-neo-mint/40'
                : isEligible
                  ? 'bg-crypto-gold/10 border-crypto-gold/40'
                  : 'bg-deep-space/50 border-cyber-border/50 opacity-60'
            }`}
          >
            <div className="mb-2.5 flex justify-center">{BADGE_COMPONENTS[badgeType]}</div>
            <p className="text-sm font-bold text-white mb-1">{BADGE_NAMES[badgeType]}</p>
            <p className="text-xs text-slate-400 mb-3">
              {isClaimed ? (
                <span className="text-neo-mint font-semibold inline-flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Claimed
                </span>
              ) : isEligible ? (
                <span className="text-crypto-gold font-semibold inline-flex items-center gap-1">
                  <Target className="w-3.5 h-3.5" /> Eligible
                </span>
              ) : (
                <span className="text-slate-400 inline-flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5" /> Locked
                </span>
              )}
            </p>
            {isEligible && !isClaimed && (
              <motion.button
                type="button"
                onClick={() => handleMintBadge(badgeType)}
                disabled={isWrongChain || isMinting}
                whileHover={{ scale: isMinting ? 1 : 1.02 }}
                whileTap={{ scale: isMinting ? 1 : 0.98 }}
                transition={{ type: 'spring', stiffness: 450, damping: 25 }}
                className="w-full py-2 bg-gradient-to-r from-crypto-gold to-pop-coral hover:opacity-95 disabled:bg-cyber-violet-light disabled:from-transparent disabled:to-transparent text-deep-space text-xs font-black rounded-lg transition-[color,background-color,border-color,opacity,box-shadow] flex items-center justify-center gap-1 cursor-pointer shadow font-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crypto-gold"
              >
                {isMinting ? <Loader2 className="w-3 h-3 animate-spin text-deep-space" /> : null}
                {isMinting ? 'Minting...' : isGasless ? 'Mint (Gasless)' : 'Mint Badge'}
              </motion.button>
            )}
          </div>
        );
      })}

      {claimStep === 'done' && explorerUrl && mintingBadge !== null && (
        <div className="col-span-2 p-4 bg-neo-mint/15 border border-neo-mint/40 rounded-xl text-center">
          <p className="text-neo-mint font-bold mb-1 inline-flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-neo-mint" /> Badge minted successfully!
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
      )}

      {claimStep === 'error' && mintingBadge !== null && (
        <div className="col-span-2 p-4 bg-pop-coral/15 border border-pop-coral/40 rounded-xl text-center">
          <p className="text-pop-coral text-sm font-medium">{claimError}</p>
        </div>
      )}
    </div>
  );
}
