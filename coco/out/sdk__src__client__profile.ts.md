# sdk/src/client/profile.ts
lines:94 exports:getUserQuizzes,exportUserData,exportProfileData,getQuestionAnalytics,ProfileResource
---
import { isClient, getDefaultClient, type ClientLike } from './http';
import type { QuickQuizClient } from './client';
import type {
  GetUserQuizzesFilter,
  QuestionAnalytics,
  UserBackupData,
  UserQuizzesResult,
} from '../types';

/**
 * Get questions authored by the current user with optional filtering and pagination. Requires authentication.
 */
export async function getUserQuizzes(
  clientOrFilter?: ClientLike | (GetUserQuizzesFilter & { client?: ClientLike }),
  maybeFilter?: GetUserQuizzesFilter
): Promise<UserQuizzesResult> {
  let client: ClientLike;
  let filter: GetUserQuizzesFilter | undefined;

  if (isClient(clientOrFilter)) {
    client = clientOrFilter;
    filter = maybeFilter;
  } else {
    filter = clientOrFilter;
    client = clientOrFilter?.client ?? getDefaultClient();
  }

  return client.request<UserQuizzesResult>('/v1/profile/quizzes', {
    method: 'GET',
    query: {
      limit: filter?.limit,
      offset: filter?.offset,
      category: filter?.category,
      status: filter?.status,
    },
  });
}

/**
 * Export complete user account data (created quizzes and quiz history). Requires authentication.
