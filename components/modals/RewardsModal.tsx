'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useSwitchChain, useChainId } from 'wagmi';
import Modal from '@/components/Modal';
import {
  ClaimableRewards,
  RewardVoucher,
  BADGE_NAMES,
  BADGE_ICONS,
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
import { Gift, Coins, Award, ExternalLink, Loader2 } from 'lucide-react';

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
    <Modal isOpen={isOpen} onClose={onClose} title="Rewards" icon={<Gift className="w-5 h-5 text-amber-400" />} maxWidth="max-w-lg">
      {/* Chain warning */}
      {isWrongChain && (
        <div className="mb-4 p-3 bg-amber-900/30 border border-amber-700/50 rounded-lg text-amber-300 text-sm flex items-center justify-between">
          <span>Switch to Base Sepolia to claim rewards</span>
          <button
            onClick={() => switchChain({ chainId: TARGET_CHAIN_ID })}
            className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-medium transition-colors"
          >
            Switch
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-slate-900/50 rounded-lg p-1">
        <button
          onClick={() => setTab('tokens')}
          className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
            tab === 'tokens'
              ? 'bg-blue-600 text-white'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Coins className="w-4 h-4" /> $QUIZ Tokens
        </button>
        <button
          onClick={() => setTab('badges')}
          className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
            tab === 'badges'
              ? 'bg-blue-600 text-white'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Award className="w-4 h-4" /> Badges
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
        </div>
      ) : !walletAddress ? (
        <p className="text-slate-400 text-center py-8">Connect your wallet to view rewards</p>
      ) : !rewards ? (
        <p className="text-slate-400 text-center py-8">No rewards data</p>
      ) : tab === 'tokens' ? (
        /* Tokens Tab */
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-slate-900/70 border border-slate-700/80 rounded-xl text-center">
              <p className="text-[10px] uppercase text-slate-400 font-semibold">Earned</p>
              <p className="text-lg font-bold text-green-400">{formatTokens(rewards.totalEarned)}</p>
            </div>
            <div className="p-3 bg-slate-900/70 border border-slate-700/80 rounded-xl text-center">
              <p className="text-[10px] uppercase text-slate-400 font-semibold">Claimed</p>
              <p className="text-lg font-bold text-slate-300">{formatTokens(rewards.totalClaimed)}</p>
            </div>
            <div className="p-3 bg-slate-900/70 border border-slate-700/80 rounded-xl text-center">
              <p className="text-[10px] uppercase text-slate-400 font-semibold">Available</p>
              <p className="text-lg font-bold text-amber-400">{formatTokens(rewards.claimableTokens)}</p>
            </div>
          </div>

          <p className="text-xs text-slate-500 text-center">Earn 10 $QUIZ for every correct answer</p>

          {claimStep === 'done' && explorerUrl && mintingBadge === null ? (
            <div className="p-3 bg-green-900/30 border border-green-700/50 rounded-lg text-center">
              <p className="text-green-400 font-medium mb-1">🎉 Tokens claimed!</p>
              <a
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 text-xs inline-flex items-center gap-1"
              >
                View on BaseScan <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          ) : claimStep === 'error' ? (
            <div className="p-3 bg-red-900/30 border border-red-700/50 rounded-lg text-center">
              <p className="text-red-400 text-sm">{claimError}</p>
            </div>
          ) : null}

          <button
            onClick={handleClaimTokens}
            disabled={
              isWrongChain ||
              BigInt(rewards.claimableTokens || '0') <= BigInt(0) ||
              (claimStep !== 'idle' && claimStep !== 'done' && claimStep !== 'error')
            }
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {claimStep === 'signing' && <Loader2 className="w-4 h-4 animate-spin" />}
            {claimStep === 'submitting' && <Loader2 className="w-4 h-4 animate-spin" />}
            {claimStep === 'confirming' && <Loader2 className="w-4 h-4 animate-spin" />}
            {claimStep === 'idle' || claimStep === 'done' || claimStep === 'error'
              ? `Claim ${formatTokens(rewards.claimableTokens)} $QUIZ`
              : claimStep === 'signing'
                ? 'Generating voucher...'
                : claimStep === 'submitting'
                  ? 'Confirm in wallet...'
                  : 'Confirming on-chain...'}
          </button>
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
                className={`p-4 rounded-xl border text-center ${
                  isClaimed
                    ? 'bg-green-900/20 border-green-700/50'
                    : isEligible
                      ? 'bg-amber-900/20 border-amber-700/50'
                      : 'bg-slate-900/50 border-slate-700/50 opacity-60'
                }`}
              >
                <div className="text-3xl mb-2">{BADGE_ICONS[badgeType]}</div>
                <p className="text-sm font-medium text-white mb-1">{BADGE_NAMES[badgeType]}</p>
                <p className="text-xs text-slate-400 mb-3">
                  {isClaimed ? '✅ Claimed' : isEligible ? '🎯 Eligible' : '🔒 Locked'}
                </p>
                {isEligible && !isClaimed && (
                  <button
                    onClick={() => handleMintBadge(badgeType)}
                    disabled={isWrongChain || isMinting}
                    className="w-full py-1.5 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-700 text-white text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1"
                  >
                    {isMinting ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                    {isMinting ? 'Minting...' : 'Mint Badge'}
                  </button>
                )}
              </div>
            );
          })}

          {claimStep === 'done' && explorerUrl && mintingBadge !== null && (
            <div className="col-span-2 p-3 bg-green-900/30 border border-green-700/50 rounded-lg text-center">
              <p className="text-green-400 font-medium mb-1">🎉 Badge minted!</p>
              <a
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 text-xs inline-flex items-center gap-1"
              >
                View on BaseScan <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {claimStep === 'error' && mintingBadge !== null && (
            <div className="col-span-2 p-3 bg-red-900/30 border border-red-700/50 rounded-lg text-center">
              <p className="text-red-400 text-sm">{claimError}</p>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
