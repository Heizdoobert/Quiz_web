import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useSwitchChain, useChainId } from 'wagmi';
import { useWriteContracts, useCapabilities, useCallsStatus } from 'wagmi/experimental';
import { Trophy } from 'lucide-react';
import { claimListReward } from '@/lib/actions/question-list-actions';
import { confirmRewardClaim } from '@/lib/actions/reward-actions';
import { RewardVoucher } from '@/lib/types';
import { ContestEscrowABI } from '@/lib/contracts/ContestEscrowABI';
import { CONTEST_ESCROW_ADDRESS, TARGET_CHAIN_ID, TARGET_CHAIN_NAME } from '@/lib/contracts/addresses';
import { ContestPlayClaimButton, ClaimStep } from './ContestPlayClaimButton';

function formatTokens(weiStr: string): string {
  const wei = BigInt(weiStr || '0');
  return (wei / (BigInt(10) ** BigInt(18))).toString();
}

export function ContestPlayResult({
  listId,
  result,
  totalQuestions,
  onExit,
  walletAddress,
}: {
  listId: string;
  result: { correctCount: number; rewardAmount: string; claimed?: boolean };
  totalQuestions: number;
  onExit: () => void;
  walletAddress: string | null | undefined;
}) {
  const [claimStep, setClaimStep] = useState<ClaimStep>(result.claimed ? 'done' : 'idle');
  const [claimError, setClaimError] = useState<string | null>(null);
  const [currentNonce, setCurrentNonce] = useState<string | null>(null);
  
  const [callId, setCallId] = useState<string | null>(null);
  const [eoaTxHash, setEoaTxHash] = useState<`0x${string}` | null>(null);
  const confirmingNonceRef = useRef<string | null>(null);

  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { address } = useAccount();

  // EIP-5792 gasless calls
  const { writeContractsAsync } = useWriteContracts();
  const { data: capabilities } = useCapabilities();

  // Traditional EOA calls
  const { writeContractAsync } = useWriteContract();
  const { isSuccess: isEoaConfirmed, isError: isEoaReceiptError, error: eoaReceiptError } = useWaitForTransactionReceipt({ hash: eoaTxHash ?? undefined });

  const { data: callsStatus, isError: isCallsStatusError, error: callsStatusError } = useCallsStatus({
    id: callId as string,
    query: {
      enabled: Boolean(callId),
      refetchInterval: (query) =>
        query.state.data?.status === 'success' || query.state.data?.status === 'failure'
          ? false
          : 1000,
    },
  });

  const chainCapabilities = capabilities?.[chainId] ?? (capabilities as Record<string, { paymasterService?: { supported?: boolean } }> | undefined)?.[`0x${chainId.toString(16)}`];
  const isPaymasterSupported = Boolean(chainCapabilities?.paymasterService?.supported);
  const paymasterUrl = process.env.NEXT_PUBLIC_PAYMASTER_URL;

  const capabilitiesConfig = useMemo(() => {
    if (isPaymasterSupported && paymasterUrl) {
      return { paymasterService: { url: paymasterUrl } };
    }
    return undefined;
  }, [isPaymasterSupported, paymasterUrl]);

  const isGasless = Boolean(isPaymasterSupported && paymasterUrl);

  // Handle failed or reverted call bundle (EIP-5792)
  useEffect(() => {
    if (callsStatus?.status === 'failure' || isCallsStatusError) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setClaimStep('error');
      setClaimError(callsStatusError?.message || 'Transaction reverted or failed on-chain');
      setCurrentNonce(null);
      setCallId(null);
    }
  }, [callsStatus?.status, isCallsStatusError, callsStatusError]);

  // Handle reverted EOA transactions
  useEffect(() => {
    if (isEoaReceiptError) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setClaimStep('error');
      setClaimError(eoaReceiptError?.message || 'Transaction reverted on-chain');
      setCurrentNonce(null);
      setEoaTxHash(null);
    }
  }, [isEoaReceiptError, eoaReceiptError]);

  const confirmClaim = React.useCallback(async (nonce: string, txHashString: string) => {
    try {
      const res = await confirmRewardClaim(nonce, txHashString);
      if (res?.success) {
        setClaimStep('done');
      } else {
        setClaimStep('error');
        setClaimError('Failed to confirm reward claim with backend');
      }
    } catch {
      setClaimStep('error');
      setClaimError('Failed to confirm reward claim');
    } finally {
      setCurrentNonce(null);
      setCallId(null);
      setEoaTxHash(null);
    }
  }, []);

  // Confirm on-chain after calls bundle is mined (EIP-5792 gasless path)
  useEffect(() => {
    if (callsStatus?.status === 'success' && currentNonce && callId) {
      const receiptHash = callsStatus.receipts?.[0]?.transactionHash;
      if (!receiptHash) return;

      if (confirmingNonceRef.current === currentNonce) return;
      confirmingNonceRef.current = currentNonce;

      confirmClaim(currentNonce, receiptHash);
    }
  }, [callsStatus, currentNonce, callId, confirmClaim]);

  // Confirm on-chain after transaction is mined (EOA standard path)
  useEffect(() => {
    if (isEoaConfirmed && currentNonce && eoaTxHash) {
      if (confirmingNonceRef.current === currentNonce) return;
      confirmingNonceRef.current = currentNonce;

      confirmClaim(currentNonce, eoaTxHash);
    }
  }, [isEoaConfirmed, currentNonce, eoaTxHash, confirmClaim]);

  const isWrongChain = chainId !== TARGET_CHAIN_ID;

  const handleClaim = async () => {
    setClaimError(null);
    if (walletAddress && address && address.toLowerCase() !== walletAddress.toLowerCase()) {
      setClaimError(`Switch your connected wallet to ${walletAddress} to claim this reward.`);
      setClaimStep('error');
      return;
    }
    setClaimStep('signing');
    const voucher: RewardVoucher | { error: string } = await claimListReward(listId);
    if ('error' in voucher) {
      setClaimError(voucher.error);
      setClaimStep('error');
      return;
    }
    setCurrentNonce(voucher.nonce);
    setClaimStep('submitting');
    try {
      if (isGasless) {
        const res = await writeContractsAsync({
          contracts: [
            {
              address: CONTEST_ESCROW_ADDRESS,
              abi: ContestEscrowABI,
              functionName: 'claimReward',
              args: [
                voucher.contestId as `0x${string}`,
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
        setCallId(res.id);
      } else {
        const hash = await writeContractAsync({
          address: CONTEST_ESCROW_ADDRESS,
          abi: ContestEscrowABI,
          functionName: 'claimReward',
          args: [
            voucher.contestId as `0x${string}`,
            voucher.recipient as `0x${string}`,
            BigInt(voucher.amount),
            BigInt(voucher.nonce),
            BigInt(voucher.deadline),
            voucher.signature as `0x${string}`,
          ],
        });
        setEoaTxHash(hash);
      }
      setClaimStep('confirming');
    } catch (err) {
      console.error('Claim tx failed:', err);
      setClaimError('Transaction failed or was rejected');
      setClaimStep('error');
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6 text-center space-y-4">
      <Trophy className="w-10 h-10 text-[#FFD166] mx-auto" />
      <h2 className="text-xl font-black text-white">Contest Complete!</h2>
      <p className="text-slate-300 text-sm">
        {result.correctCount} / {totalQuestions} correct
      </p>
      <p className="text-2xl font-black text-[#00FFCC]">{formatTokens(result.rewardAmount)} QUIZ</p>

      <ContestPlayClaimButton
        isWrongChain={isWrongChain}
        claimStep={claimStep}
        claimError={claimError}
        isGasless={isGasless}
        rewardAmount={result.rewardAmount}
        onSwitchChain={() => switchChain({ chainId: TARGET_CHAIN_ID })}
        onClaim={handleClaim}
        targetChainName={TARGET_CHAIN_NAME}
      />

      <button onClick={onExit} className="block mx-auto text-sm text-slate-400 hover:text-white cursor-pointer">
        Back to contests
      </button>
    </div>
  );
}
