# hooks/quiz/use-quiz-logic.ts
lines:358 exports:ActiveModal,useQuizLogic
---
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAccount } from 'wagmi';
import {
  AnswerSubmissionResult,
  ClientQuestion,
  LeaderboardEntry,
  UserStats,
  ClaimableRewards,
  HistoryItem,
} from '@/lib/types';
import { fetchRandomQuestion, get5050EliminatedIndices } from '@/lib/actions/question-actions';
import { getAnswerHistory, getUserStats, submitAnswer } from '@/lib/actions/quiz-actions';
import { getGlobalLeaderboard, getGroupLeaderboard } from '@/lib/actions/leaderboard-actions';
import { getClaimableRewards } from '@/lib/actions/reward-actions';
import { soundEngine } from '@/lib/audio';
import { useSession } from '@/hooks/shared/use-session';

export type ActiveModal =
  | 'intro'
  | 'timer'
  | 'group'
  | 'review'
  | 'rewards'
  | 'profile'
  | 'dispute'
  | null;

interface UseQuizLogicOptions {
  initialQuestion?: ClientQuestion | null;
  initialLeaderboard?: LeaderboardEntry[];
  initialCategory?: string;
}

export function useQuizLogic({
  initialQuestion = null,
  initialLeaderboard = [],
  initialCategory = 'All',
}: UseQuizLogicOptions = {}) {
