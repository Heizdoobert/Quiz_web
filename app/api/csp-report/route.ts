import { logger } from '@/lib/logger';

const MAX_REPORT_BYTES = 8 * 1024;

// Receives Content-Security-Policy-Report-Only violation reports (see next.config.js) and
// writes them to the server log. It stores nothing and answers 204 whatever it is sent.
export async function POST(request: Request) {
  try {
    const body = await request.text();
    if (body.length <= MAX_REPORT_BYTES) {
      const parsed = JSON.parse(body) as { 'csp-report'?: Record<string, unknown> };
      const report = parsed['csp-report'] ?? {};
      logger.warn('csp_violation', {
        directive: report['violated-directive'],
        blocked: report['blocked-uri'],
        document: report['document-uri'],
        source: report['source-file'],
      });
    }
  } catch {
    // A malformed report is not worth a log line.
  }
  return new Response(null, { status: 204 });
}
