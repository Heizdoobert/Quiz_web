import React from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, Loader2, Sparkles } from 'lucide-react';
import { ClaimableRewards } from '@/lib/types';

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
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <div className="p-4 bg-[#0A1128]/70 border border-[#2D305A] rounded-xl text-center">
          <p className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Earned</p>
          <p className="text-lg font-black text-[#00FFCC] font-heading">{formatTokens(rewards.totalEarned)}</p>
        </div>
        <div className="p-4 bg-[#0A1128]/70 border border-[#2D305A] rounded-xl text-center">
          <p className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Claimed</p>
          <p className="text-lg font-bold text-slate-300 font-heading">{formatTokens(rewards.totalClaimed)}</p>
        </div>
        <div className="p-4 bg-[#0A1128]/70 border border-[#2D305A] rounded-xl text-center">
          <p className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Available</p>
          <p className="text-lg font-black text-[#FFD166] font-heading">{formatTokens(rewards.claimableTokens)}</p>
        </div>
      </div>

      <p className="text-xs text-slate-400 text-center">
        Earn <span className="text-[#00FFCC] font-bold">10 $QUIZ</span> for every correct answer
      </p>

      {claimStep === 'done' && explorerUrl && mintingBadge === null ? (
        <div className="p-4 bg-[#00FFCC]/15 border border-[#00FFCC]/40 rounded-xl text-center">
          <p className="text-[#00FFCC] font-bold mb-1 inline-flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-[#00FFCC]" /> Tokens claimed successfully!
          </p>
          <br />
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#FFD166] hover:underline text-xs inline-flex items-center gap-1 font-semibold"
          >
            View on BaseScan <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      ) : claimStep === 'error' ? (
        <div className="p-4 bg-[#FF4757]/15 border border-[#FF4757]/40 rounded-xl text-center">
          <p className="text-[#FF4757] text-sm font-medium">{claimError}</p>
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
        className="w-full py-3 bg-gradient-to-r from-[#00FFCC] to-[#6C5CE7] disabled:bg-[#25284D] disabled:from-transparent disabled:to-transparent disabled:text-slate-500 text-[#0A1128] font-black rounded-xl transition-[color,background-color,border-color,opacity,box-shadow] shadow-lg shadow-[#00FFCC]/20 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed font-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFCC]"
      >
        {claimStep === 'signing' && <Loader2 className="w-4 h-4 animate-spin text-[#0A1128]" />}
        {claimStep === 'submitting' && <Loader2 className="w-4 h-4 animate-spin text-[#0A1128]" />}
        {claimStep === 'confirming' && <Loader2 className="w-4 h-4 animate-spin text-[#0A1128]" />}
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
