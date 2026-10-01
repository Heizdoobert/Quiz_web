# components/lists/MyListsDashboard.tsx
lines:674 exports:default
---
'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useAccount, useChainId, usePublicClient, useSwitchChain, useWriteContract, useReadContract } from 'wagmi';
import {
  createList,
  updateList,
  deleteList,
  getMyLists,
  getListDetail,
  addListQuestion,
  updateListQuestion,
  deleteListQuestion,
  submitListForReview,
  startContest,
  recordContestRefund,
} from '@/lib/actions/question-list-actions';
import { MIN_LIST_QUESTIONS, REQUIRED_CONFIRMATIONS } from '@/lib/list-constants';
import { getContestId, CONTEST_DURATION_SECONDS } from '@/lib/contest';
import { ContestEscrowABI } from '@/lib/contracts/ContestEscrowABI';
import { QuizTokenABI } from '@/lib/contracts/QuizTokenABI';
import { CONTEST_ESCROW_ADDRESS, QUIZ_TOKEN_ADDRESS, TARGET_CHAIN_ID, TARGET_CHAIN_NAME } from '@/lib/contracts/addresses';
import { useSession } from '@/hooks/shared/use-session';

const SIGN_IN_ERROR = 'Sign the message in your wallet to manage your lists.';
import { Question, QuestionListWithMeta } from '@/lib/types';
import ListQuestionEditor, { QuestionFormValues } from '@/components/lists/ListQuestionEditor';
import {
  Plus,
  Trash2,
  Pencil,
  Send,
  Rocket,
  ChevronDown,
  ChevronUp,
  ListChecks,
  Loader2,
  RefreshCw,
} from 'lucide-react';

