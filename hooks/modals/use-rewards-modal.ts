'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSwitchChain, useChainId } from 'wagmi';
import { useWriteContracts, useCapabilities, useCallsStatus } from 'wagmi/experimental';
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
  const [callId, setCallId] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [mintingBadge, setMintingBadge] = useState<number | null>(null);

  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { writeContractsAsync } = useWriteContracts();
  const { data: capabilities } = useCapabilities();

  const {
    data: callsStatus,
    isError: isCallsStatusError,
    error: callsStatusError,
  } = useCallsStatus({
    id: callId as string,
    query: {
      enabled: Boolean(callId),
      refetchInterval: (query) =>
        query.state.data?.status === 'success' || query.state.data?.status === 'failure'
          ? false
          : 1000,
    },
  });

  const chainCapabilities =
    capabilities?.[chainId] ??
    (capabilities as Record<string, { paymasterService?: { supported?: boolean } }> | undefined)?.[
      `0x${chainId.toString(16)}`
    ];
  const isPaymasterSupported = Boolean(chainCapabilities?.paymasterService?.supported);
  const paymasterUrl = process.env.NEXT_PUBLIC_PAYMASTER_URL;

  const capabilitiesConfig = useMemo(() => {
    if (isPaymasterSupported && paymasterUrl) {
      return {
        paymasterService: {
          url: paymasterUrl,
        },
      };
    }
    return undefined;
  }, [isPaymasterSupported, paymasterUrl]);

  const isGasless = Boolean(isPaymasterSupported && paymasterUrl);

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
      setCallId(null);
      setTxHash(null);
      setMintingBadge(null);
    }
  }, [isOpen, walletAddress, loadRewards]);

  // Handle failed or reverted call bundle
  useEffect(() => {
    if (callsStatus?.status === 'failure' || isCallsStatusError) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setClaimStep('error');
      setClaimError(callsStatusError?.message || 'Transaction reverted or failed on-chain');
      setMintingBadge(null);
      setCurrentNonce(null);
      setCallId(null);
    }
  }, [callsStatus?.status, isCallsStatusError, callsStatusError]);

  // Confirm on-chain after calls bundle is mined
  useEffect(() => {
    if (callsStatus?.status === 'success' && currentNonce && walletAddress && callId) {
      const receiptHash = callsStatus.receipts?.[0]?.transactionHash;
      const finalHash = receiptHash || (callId.startsWith('0x') ? callId : null);

      confirmRewardClaim(walletAddress, currentNonce, finalHash || callId)
        .then((res) => {
          if (res?.success) {
            if (finalHash) {
              setTxHash(finalHash);
            }
            setClaimStep('done');
            loadRewards(); // Refresh
          } else {
            setClaimStep('error');
            setClaimError('Failed to confirm reward claim with backend');
            setMintingBadge(null);
          }
          setCurrentNonce(null);
          setCallId(null);
        })
        .catch((err) => {
          console.error('Claim confirmation failed:', err);
          setClaimStep('error');
          setClaimError('Failed to confirm reward claim');
          setMintingBadge(null);
          setCurrentNonce(null);
          setCallId(null);
        });
    }
  }, [callsStatus, currentNonce, walletAddress, callId, loadRewards]);

  const isWrongChain = Boolean(walletAddress) && chainId !== TARGET_CHAIN_ID;

  const handleSwitchChain = () => switchChain({ chainId: TARGET_CHAIN_ID });

  const handleClaimTokens = async () => {
    if (!walletAddress || isWrongChain) return;
    setTxHash(null);
    setCallId(null);
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
      const result = await writeContractsAsync({
        contracts: [
          {
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
          },
        ],
        capabilities: capabilitiesConfig,
      });
      setCallId(result.id);
      setClaimStep('confirming');
    } catch (err) {
      console.error('Claim tx failed:', err);
      setClaimError('Transaction failed or was rejected');
      setClaimStep('error');
      setCurrentNonce(null);
    }
  };

  const handleMintBadge = async (badgeType: number) => {
    if (!walletAddress || isWrongChain) return;
    setTxHash(null);
    setCallId(null);
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
      const result = await writeContractsAsync({
        contracts: [
          {
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
          },
        ],
        capabilities: capabilitiesConfig,
      });
      setCallId(result.id);
      setClaimStep('confirming');
    } catch (err) {
      console.error('Badge mint tx failed:', err);
      setClaimError('Transaction failed or was rejected');
      setClaimStep('error');
      setMintingBadge(null);
      setCurrentNonce(null);
    }
  };

  const formatTokens = (weiStr: string): string => {
    const wei = BigInt(weiStr || '0');
    return (wei / (BigInt(10) ** BigInt(18))).toString();
  };

  const receiptTxHash = callsStatus?.receipts?.[0]?.transactionHash;
  const resolvedTxHash = txHash || receiptTxHash || (callId?.startsWith('0x') ? callId : null);
  const explorerUrl = resolvedTxHash ? `https://sepolia.basescan.org/tx/${resolvedTxHash}` : null;

  return {
    tab,
    setTab,
    rewards,
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
  };
}
