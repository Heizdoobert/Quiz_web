import 'server-only';
import { createClient } from '@supabase/supabase-js';

// Secret-key client for writes that RLS no longer allows from the public key
// (quiz_results inserts, see lib/sql/restrict-quiz-results-insert.sql).
// It bypasses RLS, so only server actions may import it.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const secretKey = process.env.SUPABASE_SECRET_KEY || '';

export const supabaseAdmin =
  url && secretKey
    ? createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } })
    : null;
