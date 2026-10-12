'use server';

import { addMember, groupsForAccount, insertGroup, removeMember } from '@/lib/db/groups';
import { getSessionAccount } from '@/lib/services/session';
import { Group } from '@/lib/types';
import { isUuid } from '@/lib/utils/validation';
import { logger } from '@/lib/logger';
const MAX_NAME = 50;
const MAX_DESCRIPTION = 200;

export async function createGroup(params: {
  name: string;
  description?: string;
}): Promise<{ success: boolean; group?: Group; error?: string }> {
  try {
    const name = params?.name?.trim() || '';
    const description = params?.description?.trim() || '';
    if (!name) return { success: false, error: 'Group name is required.' };
    if (name.length > MAX_NAME) {
      return { success: false, error: `Group name must be at most ${MAX_NAME} characters.` };
    }
    if (description.length > MAX_DESCRIPTION) {
      return { success: false, error: `Description must be at most ${MAX_DESCRIPTION} characters.` };
    }
    const account = await getSessionAccount();
    if (!account) return { success: false, error: 'Sign in to manage groups.' };

    let group: unknown;
    try {
      group = await insertGroup({ name, description: description || null, owner_user: account.id });
    } catch (err) {
      logger.error('createGroup insert error:', err);
      return { success: false, error: 'Failed to create group.' };
    }
    if (group === 'taken') return { success: false, error: 'That group name is taken.' };

    // Automatically add owner as a member
    try {
      await addMember((group as Group).id, account.id);
    } catch (err) {
      logger.error('createGroup owner membership error:', err);
    }

    return { success: true, group: group as Group };
  } catch (err) {
    logger.error('createGroup error:', err);
    return { success: false, error: 'Failed to create group.' };
  }
}

export async function joinGroup(groupId: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!isUuid(groupId)) return { success: false, error: 'Group not found.' };
    const account = await getSessionAccount();
    if (!account) return { success: false, error: 'Sign in to manage groups.' };

    let outcome: Awaited<ReturnType<typeof addMember>>;
    try {
      outcome = await addMember(groupId, account.id);
    } catch (err) {
      logger.error('joinGroup insert error:', err);
      return { success: false, error: 'Failed to join group.' };
    }
    if (outcome === 'already-member') return { success: false, error: 'You are already in this group.' };
    if (outcome === 'no-group') return { success: false, error: 'Group not found.' };
    return { success: true };
  } catch (err) {
    logger.error('joinGroup error:', err);
    return { success: false, error: 'Failed to join group.' };
  }
}

export async function leaveGroup(groupId: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!isUuid(groupId)) return { success: false, error: 'Group not found.' };
    const account = await getSessionAccount();
    if (!account) return { success: false, error: 'Sign in to manage groups.' };

    try {
      await removeMember(groupId, account.id);
    } catch (err) {
      logger.error('leaveGroup delete error:', err);
      return { success: false, error: 'Failed to leave group.' };
    }
    return { success: true };
  } catch (err) {
    logger.error('leaveGroup error:', err);
    return { success: false, error: 'Failed to leave group.' };
  }
}

export async function getUserGroups(): Promise<Group[]> {
  try {
    const account = await getSessionAccount();
    if (!account) return [];
    return (await groupsForAccount(account.id)) as Group[];
  } catch (err) {
    logger.error('getUserGroups error:', err);
    return [];
  }
}
