import { ping } from '@/lib/db/questions';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const TIMEOUT_MS = 3000;

// Liveness for uptime monitors: 200 only when the database answers. The body never carries
// the underlying error; that goes to the server log.
export async function GET() {
  try {
    await ping(TIMEOUT_MS);
    return Response.json({ status: 'ok' });
  } catch (err) {
    logger.error('health_check_failed', { message: err instanceof Error ? err.message : String(err) });
  }
  return Response.json({ status: 'unavailable' }, { status: 503 });
}
