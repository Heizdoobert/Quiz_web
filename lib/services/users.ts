import 'server-only';
import { supabase } from '@/lib/supabase/supabase';
import { supabaseAdmin } from '@/lib/supabase/supabase-admin';
import { logger } from '@/lib/logger';

// The account id for a wallet, creating the account if the wallet has none.
// Never call this with an address that hasn't been proven by a session or a
// SIWE signature just verified.
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
