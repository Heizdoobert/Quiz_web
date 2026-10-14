# lib/db/auth.ts
lines:20 exports:auth,createConfirmedUser
---
import 'server-only';
import { supabase } from '@/lib/sdk/supabase';
import { supabaseAdmin } from '@/lib/sdk/supabase-admin';

// Supabase Auth, not Postgres: results keep Supabase's { data, error } shape because
// callers turn auth errors (taken username, wrong password, bad code) into messages.
export function auth() {
  return supabase.auth;
}

// A confirmed auth user made with the secret key, or null when no secret key is configured.
export async function createConfirmedUser(email: string, password: string, username: string) {
  if (!supabaseAdmin?.auth?.admin?.createUser) return null;
  return supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username },
  });
}
