import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  'https://placeholder.supabase.co';
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  'placeholder-anon-key';

// persistSession/autoRefreshToken off: this client only ever runs server-side
// (every importer is 'server-only' or a server action), and email-code sign-in
// (lib/actions/auth-actions.ts) must not leave a Supabase Auth session behind —
// the account's identity is the quiz_session cookie, not a Supabase token.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
