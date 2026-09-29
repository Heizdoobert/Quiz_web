import { createClient } from '@supabase/supabase-js';

const rawUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  '';
const rawAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  '';

// Fallback to valid URL and key format so module evaluation doesn't throw during imports or builds
const supabaseUrl =
  rawUrl.startsWith('http://') || rawUrl.startsWith('https://')
    ? rawUrl
    : 'https://placeholder.supabase.co';

const supabaseAnonKey =
  rawAnonKey && rawAnonKey !== 'YOUR_SUPABASE_ANON_KEY'
    ? rawAnonKey
    : 'placeholder-anon-key';

// persistSession/autoRefreshToken off: this client only ever runs server-side
// (every importer is 'server-only' or a server action), and email-code sign-in
// (lib/actions/auth-actions.ts) must not leave a Supabase Auth session behind —
// the account's identity is the quiz_session cookie, not a Supabase token.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
