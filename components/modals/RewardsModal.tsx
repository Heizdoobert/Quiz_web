'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useSwitchChain, useChainId } from 'wagmi';
import Modal from '@/components/Modal';
import {
  ClaimableRewards,
  RewardVoucher,
  BADGE_NAMES,
} from '@/lib/types';
import {
  getClaimableRewards,
  generateTokenVoucher,
  generateBadgeVoucher,
  confirmRewardClaim,
} from '@/lib/actions/reward-actions';
import { QuizTokenABI } from '@/lib/contracts/QuizTokenABI';
import { QuizBadgeNFTABI } from '@/lib/contracts/QuizBadgeNFTABI';
import { QUIZ_TOKEN_ADDRESS, QUIZ_BADGE_ADDRESS } from '@/lib/contracts/addresses';
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

type ClaimStep = 'idle' | 'signing' | 'submitting' | 'confirming' | 'done' | 'error';

const TARGET_CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '84532', 10);

export default function RewardsModal({ isOpen, onClose, walletAddress }: RewardsModalProps) {
  const [tab, setTab] = useState<'tokens' | 'badges'>('tokens');
  const [rewards, setRewards] = useState<ClaimableRewards | null>(null);
  const [loading, setLoading] = useState(false);
  const [claimStep, setClaimStep] = useState<ClaimStep>('idle');
  const [claimError, setClaimError] = useState<string | null>(null);
  const [currentNonce, setCurrentNonce] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [mintingBadge, setMintingBadge] = useState<number | null>(null);

  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();

  const {
    isSuccess: txConfirmed,
    isError: txReceiptError,
    error: receiptError,
  } = useWaitForTransactionReceipt({
    hash: txHash as `0x${string}` | undefined,
  });

  const loadRewards = useCallback(async () => {
    if (!walletAddress) return;
    setLoading(true);
    const data = await getClaimableRewards(walletAddress);
    setRewards(data);
    setLoading(false);
  }, [walletAddress]);

  useEffect(() => {
    if (isOpen && walletAddress) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadRewards();
      setClaimStep('idle');
      setClaimError(null);
      setTxHash(null);
      setMintingBadge(null);
    }
  }, [isOpen, walletAddress, loadRewards]);

  // Handle reverted transactions
  useEffect(() => {
    if (txReceiptError) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setClaimStep('error');
      setClaimError(receiptError?.message || 'Transaction reverted on-chain');
      setMintingBadge(null);
      setCurrentNonce(null);
    }
  }, [txReceiptError, receiptError]);

  // Confirm on-chain after tx is mined
  useEffect(() => {
    if (txConfirmed && currentNonce && walletAddress && txHash) {
      confirmRewardClaim(walletAddress, currentNonce, txHash)
        .then((res) => {
          if (res?.success) {
            setClaimStep('done');
            loadRewards(); // Refresh
          } else {
            setClaimStep('error');
            setClaimError('Failed to confirm reward claim with backend');
            setMintingBadge(null);
          }
          setCurrentNonce(null);
        })
        .catch((err) => {
          console.error('Claim confirmation failed:', err);
          setClaimStep('error');
          setClaimError('Failed to confirm reward claim');
          setMintingBadge(null);
          setCurrentNonce(null);
        });
    }
  }, [txConfirmed, currentNonce, walletAddress, txHash, loadRewards]);

  const isWrongChain = Boolean(walletAddress) && chainId !== TARGET_CHAIN_ID;

  const handleClaimTokens = async () => {
    if (!walletAddress || isWrongChain) return;
    setTxHash(null);
    setCurrentNonce(null);
    setClaimStep('signing');
    setClaimError(null);

    const voucher: RewardVoucher | { error: string } = await generateTokenVoucher(walletAddress);
    if ('error' in voucher) {
      setClaimError(voucher.error);
      setClaimStep('error');
      return;
    }

    setCurrentNonce(voucher.nonce);
    setClaimStep('submitting');

    try {
      const hash = await writeContractAsync({
        address: QUIZ_TOKEN_ADDRESS,
        abi: QuizTokenABI,
        functionName: 'claimTokens',
        args: [
          voucher.recipient as `0x${string}`,
          BigInt(voucher.amount),
          BigInt(voucher.nonce),
          BigInt(voucher.deadline),
          voucher.signature as `0x${string}`,
        ],
      });
      setTxHash(hash);
      setClaimStep('confirming');
    } catch (err) {
      console.error('Claim tx failed:', err);
      setClaimError('Transaction failed or was rejected');
      setClaimStep('error');
    }
  };

  const handleMintBadge = async (badgeType: number) => {
    if (!walletAddress || isWrongChain) return;
    setTxHash(null);
    setCurrentNonce(null);
    setMintingBadge(badgeType);
    setClaimStep('signing');
    setClaimError(null);

    const voucher = await generateBadgeVoucher(walletAddress, badgeType);
    if ('error' in voucher) {
      setClaimError(voucher.error);
      setClaimStep('error');
      setMintingBadge(null);
      return;
    }

    setCurrentNonce(voucher.nonce);
    setClaimStep('submitting');

    try {
      const hash = await writeContractAsync({
        address: QUIZ_BADGE_ADDRESS,
        abi: QuizBadgeNFTABI,
        functionName: 'mintBadge',
        args: [
          voucher.recipient as `0x${string}`,
          BigInt(voucher.badgeType ?? 0),
          BigInt(voucher.nonce),
          BigInt(voucher.deadline),
          voucher.signature as `0x${string}`,
        ],
      });
      setTxHash(hash);
      setClaimStep('confirming');
    } catch (err) {
      console.error('Badge mint tx failed:', err);
      setClaimError('Transaction failed or was rejected');
      setClaimStep('error');
      setMintingBadge(null);
    }
  };

  const formatTokens = (weiStr: string): string => {
    const wei = BigInt(weiStr || '0');
    return (wei / (BigInt(10) ** BigInt(18))).toString();
  };

  const explorerUrl = txHash
    ? `https://sepolia.basescan.org/tx/${txHash}`
    : null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Rewards & Badges" icon={<Gift className="w-5 h-5 text-[#FFD166]" />} maxWidth="max-w-lg">
      {/* Chain warning */}
      {isWrongChain && (
        <div className="mb-4 p-3 bg-[#FF4757]/15 border border-[#FF4757]/40 rounded-xl text-[#FF4757] text-sm flex items-center justify-between">
          <span className="font-medium">Switch to Base Sepolia to claim rewards</span>
          <button
            type="button"
            onClick={() => switchChain({ chainId: TARGET_CHAIN_ID })}
            className="px-3 py-1 bg-[#FF4757] hover:bg-[#FF4757]/90 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
          >
            Switch
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1.5 mb-4 bg-[#0A1128]/80 border border-[#2D305A] rounded-xl p-1.5">
        <button
          type="button"
          onClick={() => setTab('tokens')}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFCC] ${
            tab === 'tokens'
              ? 'bg-[#6C5CE7] text-white shadow-md'
              : 'text-slate-400 hover:text-[#00FFCC]'
          }`}
        >
          <Coins className="w-4 h-4" /> $QUIZ Tokens
        </button>
        <button
          type="button"
          onClick={() => setTab('badges')}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFCC] ${
            tab === 'badges'
              ? 'bg-[#6C5CE7] text-white shadow-md'
              : 'text-slate-400 hover:text-[#00FFCC]'
          }`}
        >
          <Award className="w-4 h-4" /> Badges
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 text-[#00FFCC] animate-spin" />
        </div>
      ) : !walletAddress ? (
        <p className="text-slate-400 text-center py-8">Connect your wallet to view rewards</p>
      ) : !rewards ? (
        <p className="text-slate-400 text-center py-8">No rewards data</p>
      ) : tab === 'tokens' ? (
        /* Tokens Tab */
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-[#0A1128]/70 border border-[#2D305A] rounded-xl text-center">
              <p className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Earned</p>
              <p className="text-lg font-black text-[#00FFCC] font-heading">{formatTokens(rewards.totalEarned)}</p>
            </div>
            <div className="p-3 bg-[#0A1128]/70 border border-[#2D305A] rounded-xl text-center">
              <p className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Claimed</p>
              <p className="text-lg font-bold text-slate-300 font-heading">{formatTokens(rewards.totalClaimed)}</p>
            </div>
            <div className="p-3 bg-[#0A1128]/70 border border-[#2D305A] rounded-xl text-center">
              <p className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Available</p>
              <p className="text-lg font-black text-[#FFD166] font-heading">{formatTokens(rewards.claimableTokens)}</p>
            </div>
          </div>

          <p className="text-xs text-slate-400 text-center">
            Earn <span className="text-[#00FFCC] font-bold">10 $QUIZ</span> for every correct answer
          </p>

          {claimStep === 'done' && explorerUrl && mintingBadge === null ? (
            <div className="p-3 bg-[#00FFCC]/15 border border-[#00FFCC]/40 rounded-xl text-center">
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
            <div className="p-3 bg-[#FF4757]/15 border border-[#FF4757]/40 rounded-xl text-center">
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
            whileHover={{ scale: 1.015 }}
            whileTap={{ scale: 0.985 }}
            transition={{ type: 'spring', stiffness: 450, damping: 25 }}
            className="w-full py-3 bg-gradient-to-r from-[#00FFCC] to-[#6C5CE7] hover:opacity-95 disabled:bg-[#25284D] disabled:from-transparent disabled:to-transparent disabled:text-slate-500 text-[#0A1128] font-black rounded-xl transition-all shadow-lg shadow-[#00FFCC]/20 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed font-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFCC]"
          >
            {claimStep === 'signing' && <Loader2 className="w-4 h-4 animate-spin text-[#0A1128]" />}
            {claimStep === 'submitting' && <Loader2 className="w-4 h-4 animate-spin text-[#0A1128]" />}
            {claimStep === 'confirming' && <Loader2 className="w-4 h-4 animate-spin text-[#0A1128]" />}
            {claimStep === 'idle' || claimStep === 'done' || claimStep === 'error'
              ? `Claim ${formatTokens(rewards.claimableTokens)} $QUIZ`
              : claimStep === 'signing'
                ? 'Generating voucher...'
                : claimStep === 'submitting'
                  ? 'Confirm in wallet...'
                  : 'Confirming on-chain...'}
          </motion.button>
        </div>
      ) : (
        /* Badges Tab */
        <div className="grid grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((badgeType) => {
            const isClaimed = rewards.alreadyClaimedBadges.includes(badgeType);
            const isEligible = rewards.eligibleBadges.includes(badgeType);
            const isMinting = mintingBadge === badgeType && claimStep !== 'idle' && claimStep !== 'done' && claimStep !== 'error';

            return (
              <div
                key={badgeType}
                className={`p-4 rounded-xl border text-center transition-all ${
                  isClaimed
                    ? 'bg-[#00FFCC]/10 border-[#00FFCC]/40'
                    : isEligible
                      ? 'bg-[#FFD166]/10 border-[#FFD166]/40 shadow-sm shadow-[#FFD166]/10'
                      : 'bg-[#0A1128]/50 border-[#2D305A]/50 opacity-60'
                }`}
              >
                <div className="mb-2.5 flex justify-center">{BADGE_COMPONENTS[badgeType]}</div>
                <p className="text-sm font-bold text-white mb-1">{BADGE_NAMES[badgeType]}</p>
                <p className="text-xs text-slate-400 mb-3">
                  {isClaimed ? (
                    <span className="text-[#00FFCC] font-semibold inline-flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Claimed
                    </span>
                  ) : isEligible ? (
                    <span className="text-[#FFD166] font-semibold inline-flex items-center gap-1">
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
                    className="w-full py-2 bg-gradient-to-r from-[#FFD166] to-[#FF4757] hover:opacity-95 disabled:bg-[#25284D] disabled:from-transparent disabled:to-transparent text-[#0A1128] text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer shadow font-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD166]"
                  >
                    {isMinting ? <Loader2 className="w-3 h-3 animate-spin text-[#0A1128]" /> : null}
                    {isMinting ? 'Minting...' : 'Mint Badge'}
                  </motion.button>
                )}
              </div>
            );
          })}

          {claimStep === 'done' && explorerUrl && mintingBadge !== null && (
            <div className="col-span-2 p-3 bg-[#00FFCC]/15 border border-[#00FFCC]/40 rounded-xl text-center">
              <p className="text-[#00FFCC] font-bold mb-1 inline-flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#00FFCC]" /> Badge minted successfully!
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
          )}

          {claimStep === 'error' && mintingBadge !== null && (
            <div className="col-span-2 p-3 bg-[#FF4757]/15 border border-[#FF4757]/40 rounded-xl text-center">
              <p className="text-[#FF4757] text-sm font-medium">{claimError}</p>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
