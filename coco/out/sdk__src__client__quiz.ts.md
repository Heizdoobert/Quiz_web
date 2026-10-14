# sdk/src/client/quiz.ts
lines:102 exports:submitQuizAnswer,submitAnswer,getAnswerHistory,getQuizHistory,getUserStats,getQuizStats,QuizResource
---
import { isClient, getDefaultClient, type ClientLike } from './http';
import type { QuickQuizClient } from './client';
import type { AnswerSubmissionResult, HistoryItem, UserStats } from '../types';

/**
 * Submit an answer to a question. Requires authentication.
 */
export async function submitQuizAnswer(
  clientOrQuestion: ClientLike | string | { questionId: string; answerIndex: number; client?: ClientLike },
  questionIdOrParams?: string | { questionId: string; answerIndex: number } | number,
  maybeAnswerIndex?: number
): Promise<AnswerSubmissionResult> {
  let client: ClientLike;
  let payload: { questionId: string; answerIndex: number };

  if (isClient(clientOrQuestion)) {
    client = clientOrQuestion;
    if (typeof questionIdOrParams === 'string') {
      payload = { questionId: questionIdOrParams, answerIndex: maybeAnswerIndex ?? 0 };
    } else {
      payload = questionIdOrParams as { questionId: string; answerIndex: number };
    }
  } else if (typeof clientOrQuestion === 'string') {
    client = getDefaultClient();
    payload = {
      questionId: clientOrQuestion,
      answerIndex: typeof questionIdOrParams === 'number' ? questionIdOrParams : (maybeAnswerIndex ?? 0),
    };
  } else {
    client = clientOrQuestion.client ?? getDefaultClient();
    payload = { questionId: clientOrQuestion.questionId, answerIndex: clientOrQuestion.answerIndex };
  }

  return client.request<AnswerSubmissionResult>('/v1/quiz/answer', {
    method: 'POST',
    body: payload,
  });
}

export const submitAnswer = submitQuizAnswer;
