import type { QuickQuizClient } from '../client';
import type { AnswerSubmissionResult, HistoryItem, UserStats } from '../types';

export class QuizResource {
  constructor(private readonly client: QuickQuizClient) {}

  /**
   * Submit an answer to a question. Requires authentication.
   */
  async submitAnswer(
    questionIdOrParams: string | { questionId: string; answerIndex: number },
    maybeAnswerIndex?: number
  ): Promise<AnswerSubmissionResult> {
    const payload =
      typeof questionIdOrParams === 'string'
        ? { questionId: questionIdOrParams, answerIndex: maybeAnswerIndex ?? 0 }
        : questionIdOrParams;

    return this.client.request<AnswerSubmissionResult>('/v1/quiz/answer', {
      method: 'POST',
      body: payload,
    });
  }

  /**
   * Get recent answered questions history for the current user. Requires authentication.
   */
  async history(): Promise<HistoryItem[]> {
    return this.client.request<HistoryItem[]>('/v1/quiz/history', {
      method: 'GET',
    });
  }

  /**
   * Get stats for the current user (score, streaks, accuracy, total answered). Requires authentication.
   */
  async stats(): Promise<UserStats> {
    return this.client.request<UserStats>('/v1/quiz/stats', {
      method: 'GET',
    });
  }
}
