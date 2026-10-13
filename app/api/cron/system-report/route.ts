import { sendSystemReport } from '@/lib/services/system-report';
import { logger } from '@/lib/logger';
import { isCronAuthorized } from '@/lib/services/cron-auth';

export const dynamic = 'force-dynamic';

async function handleCron(req: Request) {
  if (!isCronAuthorized(req)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await sendSystemReport();
    return Response.json({
      success: true,
      timestamp: result.metrics.timestamp,
      metrics: result.metrics,
      messageId: result.messageId,
    });
  } catch (err) {
    logger.error('system_report_cron_failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    return Response.json(
      { success: false, error: 'Failed to execute system report cron' },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  return handleCron(req);
}

export async function POST(req: Request) {
  return handleCron(req);
}
