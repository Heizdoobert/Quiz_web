# sdk/src/client/community.ts
lines:287 exports:rateQuestion,addComment,commentQuestion,deleteComment,resolveSuggestion,getQuestionDiscussion,getDiscussion,getSuggestions,CommunityResource
---
import { isClient, getDefaultClient, type ClientLike } from './http';
import type { QuickQuizClient } from './client';
import type { DiscussionView, SuggestionView } from '../types';

/**
 * Submit a 1-5 star rating for a question. Requires authentication and prior answer.
 */
export async function rateQuestion(
  clientOrQuestionId: ClientLike | string | { questionId: string; rating: number; client?: ClientLike },
  questionIdOrParams?: string | { questionId: string; rating: number } | number,
  maybeRating?: number
): Promise<{ ok: boolean }> {
  let client: ClientLike;
  let questionId = '';
  let rating = 0;

  if (isClient(clientOrQuestionId)) {
    client = clientOrQuestionId;
    if (typeof questionIdOrParams === 'string') {
      questionId = questionIdOrParams;
      rating = maybeRating ?? 0;
    } else if (questionIdOrParams) {
      questionId = (questionIdOrParams as { questionId: string }).questionId;
      rating = (questionIdOrParams as { rating: number }).rating;
    }
  } else if (typeof clientOrQuestionId === 'string') {
    client = getDefaultClient();
    questionId = clientOrQuestionId;
    rating = typeof questionIdOrParams === 'number' ? questionIdOrParams : (maybeRating ?? 0);
  } else {
    client = clientOrQuestionId.client ?? getDefaultClient();
    questionId = clientOrQuestionId.questionId;
    rating = clientOrQuestionId.rating;
  }

  return client.request<{ ok: boolean }>(
    `/v1/questions/${encodeURIComponent(questionId)}/rate`,
    {
      method: 'POST',
      body: { rating },
