# sdk/src/client/groups.ts
lines:146 exports:createGroup,listGroups,joinGroup,leaveGroup,GroupsResource
---
import { isClient, getDefaultClient, type ClientLike } from './http';
import type { QuickQuizClient } from './client';
import type { Group } from '../types';

/**
 * Create a new group. Requires authentication.
 */
export async function createGroup(
  clientOrName: ClientLike | string | { name: string; description?: string; client?: ClientLike },
  nameOrParams?: string | { name: string; description?: string },
  maybeDescription?: string
): Promise<Group> {
  let client: ClientLike;
  let payload: { name: string; description?: string };

  if (isClient(clientOrName)) {
    client = clientOrName;
    if (typeof nameOrParams === 'string') {
      payload = { name: nameOrParams, description: maybeDescription };
    } else {
      payload = nameOrParams ?? { name: '' };
    }
  } else if (typeof clientOrName === 'string') {
    client = getDefaultClient();
    payload = {
      name: clientOrName,
      description: typeof nameOrParams === 'string' ? nameOrParams : undefined,
    };
  } else {
    client = clientOrName.client ?? getDefaultClient();
    payload = { name: clientOrName.name, description: clientOrName.description };
  }

  return client.request<Group>('/v1/groups', {
    method: 'POST',
    body: payload,
  });
}

/**
