# components/lists/dashboard/ListCard.tsx
lines:216 exports:ListCard
---
import React, { useCallback, useEffect, useState } from 'react';
import { usePublicClient } from 'wagmi';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { QuestionListWithMeta, Question } from '@/lib/types';
import { MIN_LIST_QUESTIONS, REQUIRED_CONFIRMATIONS } from '@/lib/constants/list-constants';
import { deleteList, submitListForReview, getListDetail, addListQuestion } from '@/lib/actions/question-list-actions';
import { ContestEscrowABI } from '@/lib/contracts/ContestEscrowABI';
import { CONTEST_ESCROW_ADDRESS, TARGET_CHAIN_ID } from '@/lib/contracts/addresses';
import { useSession } from '@/hooks/shared/use-session';
import ListQuestionEditor from '@/components/lists/ListQuestionEditor';
import { ContestActionPanel } from './ContestActionPanel';
import { OnChainRefundPanel } from './OnChainRefundPanel';
import { ListQuestionManager } from './ListQuestionManager';
import { ListCardDraftPanel } from './ListCardDraftPanel';
import { ListCardEditDetailsPanel } from './ListCardEditDetailsPanel';

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-slate-500/15 text-slate-300 border-slate-500/40',
  submitted: 'bg-[#FFD166]/15 text-[#FFD166] border-[#FFD166]/40',
  approved: 'bg-[#6C5CE7]/15 text-[#6C5CE7] border-[#6C5CE7]/40',
  live: 'bg-[#00FFCC]/15 text-[#00FFCC] border-[#00FFCC]/40',
  rejected: 'bg-[#FF4757]/15 text-[#FF4757] border-[#FF4757]/40',
};

const SIGN_IN_ERROR = 'Sign the message in your wallet to manage your lists.';

export function ListCard({
  list,
  expanded,
  onToggle,
  onChanged,
}: {
  list: QuestionListWithMeta;
  expanded: boolean;
  onToggle: () => void;
  onChanged: () => void;
}) {
  const { requireSignIn: ensureSession } = useSession();
  const asSignedIn = async <T,>(action: () => Promise<T>): Promise<T | { success: false; error: string }> =>
    (await ensureSession()) ? action() : { success: false, error: SIGN_IN_ERROR };
