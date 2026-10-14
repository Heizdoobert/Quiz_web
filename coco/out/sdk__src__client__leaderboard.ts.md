# sdk/src/client/leaderboard.ts
lines:103 exports:getGlobalLeaderboard,globalLeaderboard,getGroupLeaderboard,groupLeaderboard,LeaderboardResource
---
import { isClient, getDefaultClient, type ClientLike } from './http';
import type { QuickQuizClient } from './client';
import type { LeaderboardEntry, PaginationParams } from '../types';

/**
 * Get the global top player leaderboard.
 */
export async function getGlobalLeaderboard(
  clientOrParams?: ClientLike | (PaginationParams & { client?: ClientLike }),
  maybeParams?: PaginationParams
): Promise<LeaderboardEntry[]> {
  let client: ClientLike;
  let params: PaginationParams | undefined;

  if (isClient(clientOrParams)) {
    client = clientOrParams;
    params = maybeParams;
  } else {
    params = clientOrParams;
    client = clientOrParams?.client ?? getDefaultClient();
  }

  return client.request<LeaderboardEntry[]>('/v1/leaderboard', {
    method: 'GET',
    query: {
      limit: params?.limit,
      offset: params?.offset,
    },
  });
}

export const globalLeaderboard = getGlobalLeaderboard;

/**
 * Get the leaderboard for a specific group. Requires authentication and membership in the group.
 */
export async function getGroupLeaderboard(
  clientOrGroupId: ClientLike | string | ({ groupId: string; client?: ClientLike } & PaginationParams),
  groupIdOrParams?: string | ({ groupId: string } & PaginationParams) | PaginationParams,
  maybeParams?: PaginationParams
