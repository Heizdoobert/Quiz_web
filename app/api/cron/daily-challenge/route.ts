import { pickDailyChallenge } from '@/lib/db/daily-challenge';
import { isCronAuthorized } from '@/lib/services/auth/cron-auth';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

async function handleCron(req: Request) {
  if (!isCronAuthorized(req)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // The challenge date is the UTC date; the database function is idempotent, so a retry is safe.
  const date = new Date().toISOString().slice(0, 10);
  try {
    const picked = await pickDailyChallenge(date);
    return Response.json({ success: true, date, picked });
  } catch (err) {
    logger.error('daily_challenge_cron_failed', { error: err instanceof Error ? err.message : String(err) });
    return Response.json({ success: false, error: 'Failed to pick the daily challenge' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  return handleCron(req);
}

export async function POST(req: Request) {
  return handleCron(req);
}
