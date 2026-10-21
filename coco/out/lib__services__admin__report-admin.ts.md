# lib/services/admin/report-admin.ts
lines:82 exports:ReportStatus,TriggerReportResult,getReportStatus,triggerSystemReport
---
import 'server-only';
import { ActionResult } from '@/lib/types';
import { authorize } from '../authorize';
import { SessionAccount } from '../session';
import { collectSystemMetrics, sendSystemReport, type SystemMetrics } from '../system-report';

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
