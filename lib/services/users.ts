import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/supabase-admin';
import { logger } from '@/lib/logger';

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
