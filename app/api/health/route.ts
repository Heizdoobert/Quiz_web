import { supabase } from '@/lib/supabase/supabase';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const TIMEOUT_MS = 3000;

// Liveness for uptime monitors: 200 only when the database answers. The body never carries
// the underlying error; that goes to the server log.
export async function GET() {
  try {
    const { error } = await supabase
      .from('questions')
      .select('id')
      .limit(1)
      .abortSignal(AbortSignal.timeout(TIMEOUT_MS));
    if (!error) return Response.json({ status: 'ok' });
    logger.error('health_check_failed', { message: error.message });
  } catch (err) {
    logger.error('health_check_failed', { message: err instanceof Error ? err.message : String(err) });
  }
  return Response.json({ status: 'unavailable' }, { status: 503 });
}
