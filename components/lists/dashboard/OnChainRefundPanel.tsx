import React, { useState } from 'react';
import { useChainId, usePublicClient, useSwitchChain, useWriteContract } from 'wagmi';
import { Loader2, RefreshCw } from 'lucide-react';
import { recordContestRefund } from '@/lib/actions/question-list-actions';
import { ContestEscrowABI } from '@/lib/contracts/ContestEscrowABI';
import { CONTEST_ESCROW_ADDRESS, TARGET_CHAIN_ID, TARGET_CHAIN_NAME } from '@/lib/contracts/addresses';

export function OnChainRefundPanel({
  listId,
  listStatus,
  onChainContestId,
  onChainState,
  now,
  onChanged,
  setError,
}: {
  listId: string;
  listStatus: string;
  onChainContestId: string | null;
  onChainState: { active: boolean; remainingPool: string; expiresAt: number } | null;
  now: number;
  onChanged: () => void;
  setError: (err: string | null) => void;
}) {
  const [refunding, setRefunding] = useState(false);
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient({ chainId: TARGET_CHAIN_ID });

  if (listStatus !== 'live' && listStatus !== 'expired') return null;
  if (!onChainState || !onChainContestId) return null;

  const handleRefund = async () => {
    if (chainId !== TARGET_CHAIN_ID) {
      setError(`Switch to ${TARGET_CHAIN_NAME} to refund.`);
      switchChain({ chainId: TARGET_CHAIN_ID });
      return;
    }
    setRefunding(true);
    setError(null);
    try {
      const hash = await writeContractAsync({
        address: CONTEST_ESCROW_ADDRESS,
        abi: ContestEscrowABI,
        functionName: 'refundRemaining',
        args: [onChainContestId as `0x${string}`],
      });
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
      }
      await recordContestRefund(listId, hash);
      onChanged();
    } catch (err) {
      console.error(err);
      setError('Refund transaction failed or was rejected.');
    }
    setRefunding(false);
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-[#1A1B35] border border-[#2D305A] rounded-xl">
      <div>
        <p className="text-xs text-slate-300">Remaining Pool: <span className="font-bold text-[#FFD166]">{(Number(onChainState.remainingPool) / 1e18).toString()} QUIZ</span></p>
        <p className="text-[10px] text-slate-500">
          {onChainState.expiresAt * 1000 > now 
            ? `Expires ${new Date(onChainState.expiresAt * 1000).toLocaleString()}` 
            : 'Expired'}
        </p>
      </div>
      {onChainState.active && onChainState.expiresAt * 1000 <= now && BigInt(onChainState.remainingPool) > BigInt(0) && (
        <button
          type="button"
          onClick={handleRefund}
          disabled={refunding}
          className="px-3 py-1.5 bg-[#FF4757]/15 hover:bg-[#FF4757]/30 text-[#FF4757] rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-40"
        >
          {refunding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Refund Remaining
        </button>
      )}
    </div>
  );
}
