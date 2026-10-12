import type { QuickQuizClient } from '../client';
import type { Group } from '../types';

export class GroupsResource {
  constructor(private readonly client: QuickQuizClient) {}

  /**
   * Create a new group. Requires authentication.
   */
  async create(
    nameOrParams: string | { name: string; description?: string },
    maybeDescription?: string
  ): Promise<Group> {
    const payload =
      typeof nameOrParams === 'string'
        ? { name: nameOrParams, description: maybeDescription }
        : nameOrParams;

    return this.client.request<Group>('/v1/groups', {
      method: 'POST',
      body: payload,
    });
  }

  /**
   * List groups that the current user belongs to. Requires authentication.
   */
  async list(): Promise<Group[]> {
    return this.client.request<Group[]>('/v1/groups', {
      method: 'GET',
    });
  }

  /**
   * Join an existing group by ID. Requires authentication.
   */
  async join(groupIdOrParams: string | { groupId: string }): Promise<{ ok: boolean }> {
    const groupId =
      typeof groupIdOrParams === 'string'
        ? groupIdOrParams
        : groupIdOrParams.groupId;

    return this.client.request<{ ok: boolean }>(
      `/v1/groups/${encodeURIComponent(groupId)}/join`,
      {
        method: 'POST',
      }
    );
  }

  /**
   * Leave a group by ID. Requires authentication.
   */
  async leave(groupIdOrParams: string | { groupId: string }): Promise<{ ok: boolean }> {
    const groupId =
      typeof groupIdOrParams === 'string'
        ? groupIdOrParams
        : groupIdOrParams.groupId;

    return this.client.request<{ ok: boolean }>(
      `/v1/groups/${encodeURIComponent(groupId)}/leave`,
      {
        method: 'POST',
      }
    );
  }
}
