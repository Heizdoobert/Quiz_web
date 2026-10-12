import 'server-only';
import { supabaseAdmin } from '@/lib/sdk/supabase-admin';
import { DbError } from './errors';

// Only lib/db/* and sdk/remote_config/* may import this file (eslint.config.mjs); everything
// else calls the domain functions next to it.

// Public key: RLS applies.
export { supabase as pub } from '@/lib/sdk/supabase';

// Secret key: bypasses RLS.
export function admin() {
  if (!supabaseAdmin) throw new DbError('admin', { message: 'SUPABASE_SECRET_KEY is not set' });
  return supabaseAdmin;
}
