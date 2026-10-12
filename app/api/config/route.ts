import { getRemoteConfig } from '@/sdk/remote_config';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// Shared by web and mobile. A CDN keeps a good answer for 60 seconds, so a dashboard edit
// shows up within a minute. A failure is never cached and never carries the database error;
// that goes to the server log, and clients fall back to their built-in defaults.
export async function GET() {
  try {
    return Response.json(
      { config: await getRemoteConfig() },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } },
    );
  } catch (err) {
    logger.error('remote_config_failed', err);
  }
  return Response.json({ error: 'unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
}
