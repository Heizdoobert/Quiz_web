'use server';

import { supabase } from '@/lib/supabase';
import { Group } from '@/lib/types';

export async function createGroup(params: {
  name: string;
  description?: string;
  ownerWallet: string;
}): Promise<{ success: boolean; group?: Group; error?: string }> {
  try {
    if (!params?.ownerWallet) {
      return { success: false, error: 'Owner wallet required.' };
    }
    if (!params.name?.trim()) {
      return { success: false, error: 'Group name is required.' };
    }

    const normalized = params.ownerWallet.toLowerCase();
    const { data: group, error } = await supabase
      .from('groups')
      .insert({
        name: params.name.trim(),
        description: params.description?.trim() || null,
        owner_wallet: normalized,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // Automatically add owner as a member
    await supabase.from('group_members').insert({
      group_id: group.id,
      wallet_address: normalized,
    });

    return { success: true, group: group as Group };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: message };
  }
}

export async function joinGroup(
  groupId: string,
  walletAddress: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!walletAddress || !groupId) {
      return { success: false, error: 'Wallet and group required.' };
    }
    const normalized = walletAddress.toLowerCase();
    const { error } = await supabase.from('group_members').insert({
      group_id: groupId,
      wallet_address: normalized,
    });
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: message };
  }
}

export async function leaveGroup(
  groupId: string,
  walletAddress: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!walletAddress || !groupId) {
      return { success: false, error: 'Wallet and group required.' };
    }
    const normalized = walletAddress.toLowerCase();
    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('wallet_address', normalized);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: message };
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
