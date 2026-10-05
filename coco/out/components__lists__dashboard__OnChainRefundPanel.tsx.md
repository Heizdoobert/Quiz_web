# components/lists/dashboard/OnChainRefundPanel.tsx
lines:84 exports:OnChainRefundPanel
---
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
