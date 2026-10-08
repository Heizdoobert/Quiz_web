import 'server-only';
import { createHash } from 'node:crypto';
import { headers } from 'next/headers';
import { logger } from '@/lib/logger';
import { supabaseAdmin } from '@/lib/supabase/supabase-admin';

// Counts attempts per key in Postgres (supabase/migrations/17-auth-rate-limit.sql), so the
// limit holds across serverless instances. The identifier is hashed so addresses and
// usernames are not stored in the attempts table.
//
// ponytail: fails open if the counter is unreachable (or the migration is not applied yet),
// because refusing every sign-in on a counter outage is worse than a missed limit; Supabase
// Auth's own limits still apply behind this. Add a fail-closed mode if that trade flips.
export async function allowAttempt(
  scope: string,
  identifier: string,
  max: number,
  windowSeconds: number
): Promise<boolean> {
  try {
    if (!supabaseAdmin) return true;
    const digest = createHash('sha256').update(identifier.trim().toLowerCase()).digest('hex');
    const { data, error } = await supabaseAdmin.rpc('rate_limit_hit', {
      p_key: `${scope}:${digest}`,
      p_max: max,
      p_window_seconds: windowSeconds,
    });
    if (error) throw error;
    if (data === false) {
      logger.warn('auth_rate_limited', { scope });
      return false;
    }
    return true;
  } catch (err) {
    logger.error('rate_limit_check_failed', err, { scope });
    return true;
  }
}

// First hop of x-forwarded-for, which the hosting proxy sets. null when absent, and callers
// then skip the per-IP limit rather than put every unknown caller in one shared bucket.
export async function clientIp(): Promise<string | null> {
  const forwarded = (await headers()).get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || null;
}

export async function allowAttemptFromIp(scope: string, max: number, windowSeconds: number): Promise<boolean> {
  const ip = await clientIp();
  return ip ? allowAttempt(scope, ip, max, windowSeconds) : true;
}
