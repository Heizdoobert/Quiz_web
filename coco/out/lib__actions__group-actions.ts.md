# lib/actions/group-actions.ts
lines:126 exports:createGroup,joinGroup,leaveGroup,getUserGroups
---
'use server';

import { supabase } from '@/lib/supabase/supabase';
import { supabaseAdmin } from '@/lib/supabase/supabase-admin';
import { getSessionAccount, SessionAccount } from '@/lib/services/session';
import { Group } from '@/lib/types';
import { isUuid } from '@/lib/utils/validation';
import { logger } from '@/lib/logger';
const MAX_NAME = 50;
const MAX_DESCRIPTION = 200;

// Group writes act for the signed-in account only and go through the secret key;
// the public key can no longer write groups or memberships.
async function signedIn(): Promise<{ error: string } | { account: SessionAccount; db: NonNullable<typeof supabaseAdmin> }> {
  const account = await getSessionAccount();
  if (!account) return { error: 'Sign in to manage groups.' };
  if (!supabaseAdmin) return { error: 'Groups are unavailable right now.' };
  return { account, db: supabaseAdmin };
}

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
    const auth = await signedIn();
    if ('error' in auth) return { success: false, error: auth.error };

    const { data: group, error } = await auth.db
      .from('groups')
      .insert({
