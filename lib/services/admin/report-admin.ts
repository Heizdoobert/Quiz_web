import 'server-only';
import { ActionResult } from '@/lib/types';
import { authorize } from '@/lib/services/auth/authorize';
import { SessionAccount } from '@/lib/services/auth/session';
import { collectSystemMetrics, sendSystemReport, type SystemMetrics } from '@/lib/services/reporting/system-report';

export interface ReportStatus {
  configured: boolean;
  recipientEmail?: string;
  cronSchedule: string;
  cronSecretConfigured: boolean;
  metrics: SystemMetrics;
}

export interface TriggerReportResult {
  sent: boolean;
  messageId?: string;
  metrics: SystemMetrics;
}

export async function getReportStatus(authAccount?: SessionAccount): Promise<ActionResult<ReportStatus>> {
  const auth = await authorize('analytics.read', authAccount);
  if (!auth.success) return auth;

  const hasSendGrid = Boolean(process.env.SENDGRID_API_KEY);
  const recipientEmail = process.env.PRODUCT_REPORT_EMAIL;
  const configured = Boolean(hasSendGrid && recipientEmail);
  const cronSecretConfigured = Boolean(process.env.CRON_SECRET);

  const metrics = await collectSystemMetrics();

  return {
    success: true,
    data: {
      configured,
      recipientEmail: recipientEmail || undefined,
      cronSchedule: '0 0 * * *',
      cronSecretConfigured,
      metrics,
    },
  };
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function triggerSystemReport(
  authAccount?: SessionAccount,
  recipientEmail?: string
): Promise<ActionResult<TriggerReportResult>> {
  const auth = await authorize('analytics.read', authAccount);
  if (!auth.success) return auth;

  if (recipientEmail !== undefined && !EMAIL_REGEX.test(recipientEmail)) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Invalid recipient email address',
      },
    };
  }

  try {
    const result = await sendSystemReport(recipientEmail);
    return {
      success: true,
      data: {
        sent: result.success,
        messageId: result.messageId,
        metrics: result.metrics,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_FAILED',
        message: err instanceof Error ? err.message : 'Failed to send system report',
      },
    };
  }
}
