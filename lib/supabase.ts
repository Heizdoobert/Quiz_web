import { createClient } from '@supabase/supabase-js';

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const rawAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Fallback to valid URL and key format so module evaluation doesn't throw during imports or builds
const supabaseUrl =
  rawUrl.startsWith('http://') || rawUrl.startsWith('https://')
    ? rawUrl
    : 'https://placeholder.supabase.co';

const supabaseAnonKey =
  rawAnonKey && rawAnonKey !== 'YOUR_SUPABASE_ANON_KEY'
    ? rawAnonKey
    : 'placeholder-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
