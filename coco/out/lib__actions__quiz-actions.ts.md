# lib/actions/quiz-actions.ts
lines:91 exports:getAnswerHistory,submitAnswer,getUserStats
---
'use server';

import { questionForAnswer } from '@/lib/db/questions';
import { insertResult } from '@/lib/db/results';
import { awardAchievements } from '@/lib/db/achievements';
import { getSessionAccount, type SessionAccount } from '@/lib/services/session';
import { allowAttemptFromIp } from '@/lib/services/rate-limit';
import { isUuid } from '@/lib/utils/validation';
import { historyForAccount, statsForAccount } from '@/lib/utils/stats';
import { AnswerSubmissionResult, UserStats, HistoryItem } from '@/lib/types';
import { logger } from '@/lib/logger';

const HOUR = 3600;
// Every answer shows its key, guests included (docs/specs/trivia-guest-access.md), so this caps
// how fast a script can read the question bank from one address. Generous for shared networks.
const ANSWERS_PER_IP_PER_HOUR = 120;

// The session account's most recent answers, newest first, so history and answeredIds
// survive a reload. Never anyone else's.
export async function getAnswerHistory(authAccount?: SessionAccount): Promise<HistoryItem[]> {
  try {
    const account = authAccount ?? (await getSessionAccount());
    return account ? await historyForAccount(account.id) : [];
  } catch (err) {
    logger.error('getAnswerHistory exception:', err);
    return [];
  }
}

export async function submitAnswer(params: {
  questionId: string;
  answerIndex: number;
}, mobileAccount?: SessionAccount): Promise<AnswerSubmissionResult> {
  const failed = (notSavedReason: NonNullable<AnswerSubmissionResult['notSavedReason']>): AnswerSubmissionResult => ({
    isCorrect: false,
    correctIndex: 0,
    explanation: null,
    recorded: false,
    notSavedReason,
  });
