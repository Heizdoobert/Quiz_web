'use server';

import { questionForAnswer } from '@/lib/db/questions';
import { insertResult } from '@/lib/db/results';
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
  try {
    if (!isUuid(params.questionId)) return failed('error');
    if (!(await allowAttemptFromIp('submit-answer-ip', ANSWERS_PER_IP_PER_HOUR, HOUR))) return failed('rate-limited');
    // correct_index and explanation are only readable with the secret key.
    const qData = await questionForAnswer(params.questionId);
    if (!qData) return failed('error');
    const account = mobileAccount ?? await getSessionAccount();
    // Only verified questions are answerable; anything else reveals nothing.
    if (qData.status !== 'verified') return failed('error');

    const isCorrect = params.answerIndex === qData.correct_index;
    const revealed = { isCorrect, correctIndex: qData.correct_index, explanation: qData.explanation };

    // Only a signed-in account's answers count; guests still see the result.
    if (!account) return { ...revealed, recorded: false, notSavedReason: 'signed-out' };
    // Nobody scores on a question they wrote.
    if (qData.created_by_user === account.id) {
      return { ...revealed, recorded: false, notSavedReason: 'own-question' };
    }

    // A failed write still shows the answer; only the score is lost.
    try {
      const outcome = await insertResult({
        user_id: account.id,
        question_id: params.questionId,
        answer_index: params.answerIndex,
        is_correct: isCorrect,
      });
      return outcome === 'recorded'
        ? { ...revealed, recorded: true }
        : { ...revealed, recorded: false, notSavedReason: 'already-answered' };
    } catch (err) {
      logger.error('submitAnswer insert error:', err);
      return { ...revealed, recorded: false, notSavedReason: 'error' };
    }
  } catch (err) {
    logger.error('submitAnswer error:', err);
    return failed('error');
  }
}

export async function getUserStats(authAccount?: SessionAccount): Promise<UserStats> {
  const account = authAccount ?? (await getSessionAccount());
  if (!account) return { score: 0, streak: 0, bestStreak: 0, accuracy: 0, totalAnswered: 0 };
  return statsForAccount(account.id);
}
