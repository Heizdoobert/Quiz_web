'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useSwitchChain, useChainId } from 'wagmi';
import { ClaimableRewards, RewardVoucher } from '@/lib/types';
import {
  getClaimableRewards,
  generateTokenVoucher,
  generateBadgeVoucher,
  confirmRewardClaim,
} from '@/lib/actions/reward-actions';
import { QuizTokenABI } from '@/lib/contracts/QuizTokenABI';
import { QuizBadgeNFTABI } from '@/lib/contracts/QuizBadgeNFTABI';
import { QUIZ_TOKEN_ADDRESS, QUIZ_BADGE_ADDRESS } from '@/lib/contracts/addresses';

export type ClaimStep = 'idle' | 'signing' | 'submitting' | 'confirming' | 'done' | 'error';

const TARGET_CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '84532', 10);

interface UseRewardsModalOptions {
  isOpen: boolean;
  walletAddress: string | null;
}

export function useRewardsModal({ isOpen, walletAddress }: UseRewardsModalOptions) {
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

  const handleSwitchChain = () => switchChain({ chainId: TARGET_CHAIN_ID });

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

  const explorerUrl = txHash ? `https://sepolia.basescan.org/tx/${txHash}` : null;

  return {
    tab,
    setTab,
    rewards,
    loading,
    claimStep,
    claimError,
    mintingBadge,
    isWrongChain,
    handleSwitchChain,
    handleClaimTokens,
    handleMintBadge,
    formatTokens,
    explorerUrl,
  };
}
