# hooks/quiz/use-quiz-logic.ts
lines:344 exports:ActiveModal,useQuizLogic
---
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AnswerSubmissionResult,
  ClientQuestion,
  LeaderboardEntry,
  UserStats,
  HistoryItem,
} from '@/lib/types';
import { fetchRandomQuestion, get5050EliminatedIndices } from '@/lib/actions/question-actions';
import { getAnswerHistory, getUserStats, submitAnswer } from '@/lib/actions/quiz-actions';
import { getGlobalLeaderboard, getGroupLeaderboard } from '@/lib/actions/leaderboard-actions';
import { soundEngine } from '@/lib/client/audio';
import { useSession } from '@/hooks/shared/use-session';

export type ActiveModal =
  | 'intro'
  | 'timer'
  | 'group'
  | 'review'
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
  const { account } = useSession();
  const accountRef = useRef(account);

