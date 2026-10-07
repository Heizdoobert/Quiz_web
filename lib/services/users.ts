import 'server-only';
import { supabase } from '@/lib/supabase/supabase';
import { supabaseAdmin } from '@/lib/supabase/supabase-admin';
import { logger } from '@/lib/logger';

// The account id for a wallet, creating the account if the wallet has none.
// Never call this with an address that hasn't been proven by a session or a
// SIWE signature just verified.
export async function ensureAccountForWallet(walletAddress: string): Promise<string | null> {
  if (!supabaseAdmin) {
    logger.error('ensureAccountForWallet: SUPABASE_SECRET_KEY is not set', new Error('ensureAccountForWallet: SUPABASE_SECRET_KEY is not set'));
    return null;
  }
  const wallet = walletAddress.toLowerCase();
  const { error: upsertError } = await supabaseAdmin.from('users').upsert(
    {
      wallet_address: wallet, display_name: `${wallet.slice(0, 6)}...${wallet.slice(-4)}`,
      wallet_linked_at: new Date().toISOString(),
    },
    { onConflict: 'wallet_address', ignoreDuplicates: true }
  );
  if (upsertError) {
    logger.error('ensureAccountForWallet upsert error:', upsertError);
    return null;
  }
  const { data, error } = await supabaseAdmin.from('users').select('id').eq('wallet_address', wallet).single();
  if (error || !data) {
    logger.error('ensureAccountForWallet lookup error:', error);
    return null;
  }
  return data.id;
}

// The account id for a Supabase Auth user (email sign-in), creating the account
// if this is its first verified code. Never call this without a verified OTP.
export async function ensureAccountForAuthUser(
  authUserId: string,
  displayName?: string
): Promise<string | null> {
  if (!supabaseAdmin) {
    logger.error('ensureAccountForAuthUser: SUPABASE_SECRET_KEY is not set', new Error('ensureAccountForAuthUser: SUPABASE_SECRET_KEY is not set'));
    return null;
  }
  const { error: upsertError } = await supabaseAdmin.from('users').upsert(
    {
      auth_user_id: authUserId, display_name: displayName || `Player-${authUserId.slice(0, 4)}`,
    },
    { onConflict: 'auth_user_id', ignoreDuplicates: true }
  );
  if (upsertError) {
    logger.error('ensureAccountForAuthUser upsert error:', upsertError);
    return null;
  }
  const { data, error } = await supabaseAdmin.from('users').select('id').eq('auth_user_id', authUserId).single();
  if (error || !data) {
    logger.error('ensureAccountForAuthUser lookup error:', error);
    return null;
  }
  return data.id;
}

// Attach a wallet to an existing account (add-wallet flow). Never call this
// without a session confirming the account has no wallet yet and a verified
// SIWE signature for the new address.
export async function linkWalletToAccount(
  accountId: string,
  walletAddress: string
): Promise<'ok' | 'in_use' | 'error'> {
  if (!supabaseAdmin) {
    logger.error('linkWalletToAccount: SUPABASE_SECRET_KEY is not set', new Error('linkWalletToAccount: SUPABASE_SECRET_KEY is not set'));
    return 'error';
  }
  const wallet = walletAddress.toLowerCase();
  const { data: existing, error: lookupError } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('wallet_address', wallet)
    .maybeSingle();
  if (lookupError) {
    logger.error('linkWalletToAccount lookup error:', lookupError);
    return 'error';
  }
  if (existing) return existing.id === accountId ? 'ok' : 'in_use';

  const { error: updateError } = await supabaseAdmin
    .from('users')
    .update({ wallet_address: wallet, wallet_linked_at: new Date().toISOString() })
    .eq('id', accountId);
  if (updateError) {
    logger.error('linkWalletToAccount update error:', updateError);
    return (updateError as { code?: string }).code === '23505' ? 'in_use' : 'error';
  }
  return 'ok';
}

// Read-only lookup for a caller that still only has a wallet, not a session
// (reward-actions, until Task 9). Public key: `id` is readable by anon.
export async function accountIdForWallet(walletAddress: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('wallet_address', walletAddress.toLowerCase())
    .maybeSingle();
  if (error) {
    logger.error('accountIdForWallet error:', error);
    return null;
  }
  return data?.id ?? null;
}
