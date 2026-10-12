import type { QuickQuizClient } from '../client';
import type {
  GetUserQuizzesFilter,
  QuestionAnalytics,
  UserBackupData,
  UserQuizzesResult,
} from '../types';

export class ProfileResource {
  constructor(private readonly client: QuickQuizClient) {}

  /**
   * Get questions authored by the current user with optional filtering and pagination. Requires authentication.
   */
  async quizzes(filter?: GetUserQuizzesFilter): Promise<UserQuizzesResult> {
    return this.client.request<UserQuizzesResult>('/v1/profile/quizzes', {
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
   */
  async export(): Promise<UserBackupData> {
    return this.client.request<UserBackupData>('/v1/profile/export', {
      method: 'GET',
    });
  }

  /**
   * Get analytics on questions authored by the current user. Requires authentication.
   */
  async analytics(): Promise<QuestionAnalytics[]> {
    return this.client.request<QuestionAnalytics[]>('/v1/profile/analytics', {
      method: 'GET',
    });
  }
}
