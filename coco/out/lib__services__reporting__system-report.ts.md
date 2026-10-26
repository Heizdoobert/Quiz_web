# lib/services/reporting/system-report.ts
lines:181 exports:SystemMetrics,FormattedReport,collectSystemMetrics,formatSystemReport,sendSystemReport
---
import { ping } from '@/lib/db/questions';
import { getSystemCounts } from '@/lib/db/metrics';
import { sendEmail, type SendEmailResult } from '@/lib/services/api/sendgrid';

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
