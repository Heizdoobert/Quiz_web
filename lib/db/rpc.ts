import 'server-only';
import { admin } from './client';
import { unwrap } from './errors';

// Postgres functions (lib/sql/, supabase/migrations/). Later tasks add to this file.

// True when the attempt is allowed (supabase/migrations/17-auth-rate-limit.sql).
export async function rateLimitHit(key: string, max: number, windowSeconds: number): Promise<boolean> {
  const allowed = unwrap(
    'rpc.rate_limit_hit',
    await admin().rpc('rate_limit_hit', { p_key: key, p_max: max, p_window_seconds: windowSeconds })
  );
  return allowed !== false;
}
