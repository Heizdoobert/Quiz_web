import 'server-only';
import { supabaseAdmin } from '@/lib/supabase-admin';

// The account id for a wallet, creating the account if the wallet has none.
// Never call this with an address that hasn't been proven by a session or a
// SIWE signature just verified.
export async function ensureAccountForWallet(walletAddress: string): Promise<string | null> {
  if (!supabaseAdmin) {
    console.error('ensureAccountForWallet: SUPABASE_SECRET_KEY is not set');
    return null;
  }
  const wallet = walletAddress.toLowerCase();
  const { error: upsertError } = await supabaseAdmin.from('users').upsert(
    {
      wallet_address: wallet,
      display_name: `${wallet.slice(0, 6)}...${wallet.slice(-4)}`,
      wallet_linked_at: new Date().toISOString(),
    },
    { onConflict: 'wallet_address', ignoreDuplicates: true }
  );
  if (upsertError) {
    console.error('ensureAccountForWallet upsert error:', upsertError);
    return null;
  }
  const { data, error } = await supabaseAdmin.from('users').select('id').eq('wallet_address', wallet).single();
  if (error || !data) {
    console.error('ensureAccountForWallet lookup error:', error);
    return null;
  }
  return data.id;
}
