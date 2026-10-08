# components/lists/dashboard/ListCard.tsx
lines:217 exports:ListCard
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
import { logger } from '@/lib/logger';

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-slate-500/15 text-slate-300 border-slate-500/40',
  submitted: 'bg-crypto-gold/15 text-crypto-gold border-crypto-gold/40',
  approved: 'bg-electric-indigo/15 text-electric-indigo border-electric-indigo/40',
  live: 'bg-neo-mint/15 text-neo-mint border-neo-mint/40',
  rejected: 'bg-pop-coral/15 text-pop-coral border-pop-coral/40',
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
