'use server';

import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getSessionWallet } from '@/lib/wallet-session';
import { Group } from '@/lib/types';
import { isUuid } from '@/lib/validation';
const MAX_NAME = 50;
const MAX_DESCRIPTION = 200;

// Group writes act for the signed-in wallet only and go through the secret key;
// the public key can no longer write groups or memberships.
async function signedInWriter() {
  const wallet = await getSessionWallet();
  if (!wallet) return { error: 'Sign in with your wallet first.' } as const;
  if (!supabaseAdmin) return { error: 'Groups are unavailable right now.' } as const;
  return { wallet, db: supabaseAdmin } as const;
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
    const writer = await signedInWriter();
    if ('error' in writer) return { success: false, error: writer.error };

    const { data: group, error } = await writer.db
      .from('groups')
      .insert({ name, description: description || null, owner_wallet: writer.wallet })
      .select()
      .single();
    if (error) {
      if (error.code === '23505') return { success: false, error: 'That group name is taken.' };
      console.error('createGroup insert error:', error);
      return { success: false, error: 'Failed to create group.' };
    }

    // Automatically add owner as a member
    const { error: memberErr } = await writer.db
      .from('group_members')
      .insert({ group_id: group.id, wallet_address: writer.wallet });
    if (memberErr) console.error('createGroup owner membership error:', memberErr);

    return { success: true, group: group as Group };
  } catch (err) {
    console.error('createGroup error:', err);
    return { success: false, error: 'Failed to create group.' };
  }
}

export async function joinGroup(groupId: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!isUuid(groupId)) return { success: false, error: 'Group not found.' };
    const writer = await signedInWriter();
    if ('error' in writer) return { success: false, error: writer.error };

    const { error } = await writer.db
      .from('group_members')
      .insert({ group_id: groupId, wallet_address: writer.wallet });
    if (error) {
      if (error.code === '23505') return { success: false, error: 'You are already in this group.' };
      if (error.code === '23503') return { success: false, error: 'Group not found.' };
      console.error('joinGroup insert error:', error);
      return { success: false, error: 'Failed to join group.' };
    }
    return { success: true };
  } catch (err) {
    console.error('joinGroup error:', err);
    return { success: false, error: 'Failed to join group.' };
  }
}

export async function leaveGroup(groupId: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!isUuid(groupId)) return { success: false, error: 'Group not found.' };
    const writer = await signedInWriter();
    if ('error' in writer) return { success: false, error: writer.error };

    const { error } = await writer.db
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('wallet_address', writer.wallet);
    if (error) {
      console.error('leaveGroup delete error:', error);
      return { success: false, error: 'Failed to leave group.' };
    }
    return { success: true };
  } catch (err) {
    console.error('leaveGroup error:', err);
    return { success: false, error: 'Failed to leave group.' };
  }
}

export async function getUserGroups(walletAddress: string): Promise<Group[]> {
  try {
    if (!walletAddress) return [];
    const normalized = walletAddress.toLowerCase();
    const { data, error } = await supabase
      .from('group_members')
      .select('group_id, groups(*)')
      .eq('wallet_address', normalized);

    if (error || !data) return [];
    return data.map((d) => d.groups as unknown as Group).filter(Boolean);
  } catch (err) {
    console.error('getUserGroups error:', err);
    return [];
  }
}
