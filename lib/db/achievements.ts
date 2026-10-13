import 'server-only';
import { admin } from './client';
import { unwrap } from './errors';

// supabase/migrations/20261201000000_achievements.sql. Secret key only.

// Slugs unlocked by this call (none when nothing new).
export async function awardAchievements(accountId: string): Promise<string[]> {
  return unwrap('rpc.award_achievements', await admin().rpc('award_achievements', { p_user: accountId })) ?? [];
}
