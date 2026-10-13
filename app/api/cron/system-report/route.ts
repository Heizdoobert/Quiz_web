import { sendSystemReport } from '@/lib/services/system-report';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

function isAuthorized(req: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    // When CRON_SECRET is not configured, deny all requests for security
    return false;
  }

  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token === cronSecret) {
      return true;
    }
  }

  try {
    const url = new URL(req.url);
    const secretParam = url.searchParams.get('secret');
    if (secretParam === cronSecret) {
      return true;
    }
  } catch {
    // URL parsing fallback
  }

  return false;
}

async function handleCron(req: Request) {
  if (!isAuthorized(req)) {
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
