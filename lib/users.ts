import 'server-only';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Creates the users row a signed-in wallet needs (quiz_results, groups and
// questions all reference it by foreign key). Never call this with an address
// that hasn't been proven by a session or a SIWE signature just verified.
export async function ensureUserRow(walletAddress: string): Promise<void> {
  if (!supabaseAdmin) {
    console.error('ensureUserRow: SUPABASE_SECRET_KEY is not set');
    return;
  }
  const normalized = walletAddress.toLowerCase();
  const { error } = await supabaseAdmin.from('users').upsert(
    {
      wallet_address: normalized,
      display_name: `${normalized.slice(0, 6)}...${normalized.slice(-4)}`,
    },
    { onConflict: 'wallet_address', ignoreDuplicates: true }
  );
  if (error) console.error('ensureUserRow error:', error);
}
