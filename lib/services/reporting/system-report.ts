import { ping } from '@/lib/db/questions';
import { getSystemCounts } from '@/lib/db/metrics';
import { sendEmail, type SendEmailResult } from '../sendgrid';

export interface SystemMetrics {
  timestamp: string;
  environment: string;
  dbStatus: 'healthy' | 'degraded';
  dbError?: string;
  totalUsers?: number;
  totalQuestions?: number;
  totalQuizResults?: number;
}

export interface FormattedReport {
  subject: string;
  text: string;
  html: string;
}

export async function collectSystemMetrics(): Promise<SystemMetrics> {
  const timestamp = new Date().toISOString();
  const environment = process.env.NODE_ENV || 'development';

  let dbStatus: 'healthy' | 'degraded' = 'healthy';
  let dbError: string | undefined;

  try {
    await ping(3000);
  } catch (err) {
    dbStatus = 'degraded';
    dbError = err instanceof Error ? err.message : String(err);
  }

  let totalUsers: number | undefined;
  let totalQuestions: number | undefined;
  let totalQuizResults: number | undefined;

  if (dbStatus === 'healthy') {
    try {
      const counts = await getSystemCounts();
      totalUsers = counts.totalUsers;
      totalQuestions = counts.totalQuestions;
      totalQuizResults = counts.totalQuizResults;
    } catch (err) {
      if (!dbError) {
        dbError = err instanceof Error ? err.message : String(err);
      }
    }
  }

  return {
    timestamp,
    environment,
    dbStatus,
    dbError,
    totalUsers,
    totalQuestions,
    totalQuizResults,
  };
}

export function formatSystemReport(metrics: SystemMetrics): FormattedReport {
  const statusLabel = metrics.dbStatus === 'healthy' ? 'HEALTHY' : 'DEGRADED';
  const dateStr = metrics.timestamp.split('T')[0];
  const subject = `[QuickQuiz System Report] ${dateStr} - ${statusLabel}`;

  const textLines = [
    `QuickQuiz System Report`,
    `========================`,
    `Timestamp: ${metrics.timestamp}`,
    `Environment: ${metrics.environment}`,
    `Database: ${metrics.dbStatus}`,
  ];

  if (metrics.dbError) {
    textLines.push(`Database Error: ${metrics.dbError}`);
  }

  if (metrics.totalUsers !== undefined) {
    textLines.push(`Total Users: ${metrics.totalUsers}`);
  }
  if (metrics.totalQuestions !== undefined) {
    textLines.push(`Total Questions: ${metrics.totalQuestions}`);
  }
  if (metrics.totalQuizResults !== undefined) {
    textLines.push(`Total Quiz Results: ${metrics.totalQuizResults}`);
  }

  const text = textLines.join('\n');

  const statusColor = metrics.dbStatus === 'healthy' ? '#10b981' : '#ef4444';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; background-color: #f8fafc; padding: 20px; }
    .card { background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; max-width: 600px; margin: 0 auto; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .header { border-bottom: 1px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 20px; }
    .header h2 { margin: 0; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600; color: #ffffff; background-color: ${statusColor}; }
    .metric { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
    .label { color: #64748b; font-weight: 500; }
    .value { font-weight: 600; color: #0f172a; }
    .footer { margin-top: 24px; font-size: 12px; color: #94a3b8; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <h2>QuickQuiz System Digest</h2>
        <span class="badge">${metrics.dbStatus}</span>
      </div>
      <p style="margin: 4px 0 0; color: #64748b; font-size: 14px;">${metrics.timestamp}</p>
    </div>
    <div class="metric">
      <span class="label">Environment</span>
      <span class="value">${metrics.environment}</span>
    </div>
    <div class="metric">
      <span class="label">Database Health</span>
      <span class="value">${metrics.dbStatus}</span>
    </div>
    ${metrics.totalUsers !== undefined ? `
    <div class="metric">
      <span class="label">Total Users</span>
      <span class="value">${metrics.totalUsers}</span>
    </div>` : ''}
    ${metrics.totalQuestions !== undefined ? `
    <div class="metric">
      <span class="label">Total Questions</span>
      <span class="value">${metrics.totalQuestions}</span>
    </div>` : ''}
    ${metrics.totalQuizResults !== undefined ? `
    <div class="metric">
      <span class="label">Total Quiz Results</span>
      <span class="value">${metrics.totalQuizResults}</span>
    </div>` : ''}
    ${metrics.dbError ? `
    <div style="margin-top: 16px; padding: 12px; background: #fee2e2; border-radius: 6px; color: #b91c1c; font-size: 14px;">
      <strong>Error:</strong> ${metrics.dbError}
    </div>` : ''}
    <div class="footer">
      Automated report sent to product operations.
    </div>
  </div>
</body>
</html>
  `.trim();

  return { subject, text, html };
}

export async function sendSystemReport(
  recipientEmail?: string
): Promise<{ success: boolean; metrics: SystemMetrics; messageId?: string }> {
  const targetEmail = recipientEmail || process.env.PRODUCT_REPORT_EMAIL;
  if (!targetEmail) {
    throw new Error('PRODUCT_REPORT_EMAIL is not configured');
  }

  const metrics = await collectSystemMetrics();
  const report = formatSystemReport(metrics);

  const sendResult: SendEmailResult = await sendEmail({
    to: targetEmail,
    subject: report.subject,
    text: report.text,
    html: report.html,
  });

  return {
    success: sendResult.success,
    metrics,
    messageId: sendResult.messageId,
  };
}
