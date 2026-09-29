'use server';

import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { User } from '@/lib/types';

export async function getOrCreateUser(walletAddress: string): Promise<User | null> {
  if (!walletAddress) return null;
  const normalized = walletAddress.toLowerCase();
  const db = supabaseAdmin || supabase;

  try {
    const { data: existingUser, error: fetchError } = await db
      .from('users')
      .select('*')
      .eq('wallet_address', normalized)
      .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching user:', fetchError);
      return { wallet_address: normalized, display_name: null, created_at: new Date().toISOString() };
    }

    if (existingUser) {
      return existingUser as User;
    }

    const newUser = {
      wallet_address: normalized,
      display_name: `${normalized.slice(0, 6)}...${normalized.slice(-4)}`,
      created_at: new Date().toISOString(),
    };

    const { data: inserted, error: insertError } = await db
      .from('users')
      .insert(newUser)
      .select()
      .single();

    if (insertError) {
      console.warn('Could not persist new user, using fallback:', insertError.message);
      return newUser;
    }

    return inserted as User;
  } catch (err) {
    console.error('getOrCreateUser exception:', err);
    return { wallet_address: normalized, display_name: null, created_at: new Date().toISOString() };
  }
}
