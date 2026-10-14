# lib/actions/group-actions.ts
lines:101 exports:createGroup,joinGroup,leaveGroup,getUserGroups
---
'use server';

import { addMember, groupsForAccount, insertGroup, removeMember } from '@/lib/db/groups';
import { getSessionAccount, type SessionAccount } from '@/lib/services/session';
import { Group } from '@/lib/types';
import { isUuid } from '@/lib/utils/validation';
import { logger } from '@/lib/logger';
const MAX_NAME = 50;
const MAX_DESCRIPTION = 200;

export async function createGroup(params: {
  name: string;
  description?: string;
}, authAccount?: SessionAccount): Promise<{ success: boolean; group?: Group; error?: string }> {
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
    const account = authAccount ?? (await getSessionAccount());
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
