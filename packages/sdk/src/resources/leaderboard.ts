import type { QuickQuizClient } from '../client';
import type { LeaderboardEntry, PaginationParams } from '../types';

export class LeaderboardResource {
  constructor(private readonly client: QuickQuizClient) {}

  /**
   * Get the global top player leaderboard.
   */
  async global(params?: PaginationParams): Promise<LeaderboardEntry[]> {
    return this.client.request<LeaderboardEntry[]>('/v1/leaderboard', {
      method: 'GET',
      query: {
        limit: params?.limit,
        offset: params?.offset,
      },
    });
  }

  /**
   * Get the leaderboard for a specific group. Requires authentication and membership in the group.
   */
  async group(
    groupIdOrParams: string | ({ groupId: string } & PaginationParams),
    maybeParams?: PaginationParams
  ): Promise<LeaderboardEntry[]> {
    const groupId = typeof groupIdOrParams === 'string' ? groupIdOrParams : groupIdOrParams.groupId;
    const limit = typeof groupIdOrParams === 'string' ? maybeParams?.limit : groupIdOrParams.limit;
    const offset = typeof groupIdOrParams === 'string' ? maybeParams?.offset : groupIdOrParams.offset;

    return this.client.request<LeaderboardEntry[]>(
      `/v1/leaderboard/group/${encodeURIComponent(groupId)}`,
      {
        method: 'GET',
        query: {
          limit,
          offset,
        },
      }
    );
  }
}
