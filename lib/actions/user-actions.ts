'use server';

import { supabase } from '@/lib/supabase';
import { getSessionWallet } from '@/lib/wallet-session';
import { ensureAccountForWallet } from '@/lib/users';
import { User } from '@/lib/types';

// Reads the users row, creating it first if the caller is the session wallet itself
// (sign-in already creates it, but a wallet that was signed in before this ran needs
// it created too). Never inserts for an address that isn't the current session's.
export async function getOrCreateUser(walletAddress: string): Promise<User | null> {
  if (!walletAddress) return null;
  const normalized = walletAddress.toLowerCase();

  try {
    if (normalized === (await getSessionWallet())) {
      await ensureAccountForWallet(normalized);
    }

    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('wallet_address', normalized)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching user:', fetchError);
      return { wallet_address: normalized, display_name: null, created_at: new Date().toISOString() };
    }

    return (existingUser as User) ?? { wallet_address: normalized, display_name: null, created_at: new Date().toISOString() };
  } catch (err) {
    console.error('getOrCreateUser exception:', err);
    return { wallet_address: normalized, display_name: null, created_at: new Date().toISOString() };
  }
}
