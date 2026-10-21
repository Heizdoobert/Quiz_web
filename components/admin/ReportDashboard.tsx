'use client';

import { useState, useTransition } from 'react';
import { triggerReportAction } from '@/lib/actions/admin';
import type { ReportStatus } from '@/lib/services/admin/report-admin';

export default function ReportDashboard({ initial }: { initial: ReportStatus }) {
  const [status, setStatus] = useState<ReportStatus>(initial);
  const [customEmail, setCustomEmail] = useState<string>('');
  const [feedback, setFeedback] = useState<string>('');
  const [isError, setIsError] = useState<boolean>(false);
  const [pending, startTransition] = useTransition();

  const metrics = status.metrics;

  function runTrigger() {
    setFeedback('');
    setIsError(false);
    startTransition(async () => {
      const emailToUse = customEmail.trim() || undefined;
      const res = await triggerReportAction(emailToUse);
      if (res.success) {
        setFeedback(
          `Report email sent successfully! (messageId: ${res.data.messageId ?? 'delivered'})`
        );
        setIsError(false);
        setStatus((prev) => ({ ...prev, metrics: res.data.metrics }));
      } else {
        setFeedback(res.error.message);
        setIsError(true);
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-lg border border-cyber-border bg-cyber-violet/20">
        <h2 className="text-lg font-heading font-bold text-white mb-2">Cronjob Status & Schedule</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-slate-400">Schedule: </span>
            <code className="text-neo-mint font-mono">{status.cronSchedule} (Daily midnight UTC)</code>
          </div>
          <div>
            <span className="text-slate-400">Delivery Status: </span>
            {status.configured ? (
              <span className="text-neo-mint font-semibold">Configured</span>
            ) : (
              <span className="text-pop-coral font-semibold">Missing SendGrid / Email Config</span>
            )}
          </div>
          <div>
            <span className="text-slate-400">Recipient Email: </span>
            <span className="text-slate-200">{status.recipientEmail ?? 'None configured'}</span>
          </div>
          <div>
            <span className="text-slate-400">CRON_SECRET: </span>
            {status.cronSecretConfigured ? (
              <span className="text-neo-mint">Active</span>
            ) : (
              <span className="text-pop-coral">Not configured</span>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 rounded-lg border border-cyber-border bg-cyber-violet/20">
        <h2 className="text-lg font-heading font-bold text-white mb-2">Current System Health</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm mb-4">
          <div className="p-3 bg-cyber-violet/40 rounded border border-cyber-border">
            <span className="text-slate-400 block text-xs">Database</span>
            <span
              className={`font-bold ${
                metrics.dbStatus === 'healthy' ? 'text-neo-mint' : 'text-pop-coral'
              }`}
            >
              {metrics.dbStatus.toUpperCase()}
            </span>
            {metrics.dbError && <p className="text-xs text-pop-coral mt-1">{metrics.dbError}</p>}
          </div>

          <div className="p-3 bg-cyber-violet/40 rounded border border-cyber-border">
            <span className="text-slate-400 block text-xs">Total Users</span>
            <span className="text-xl font-bold text-white">
              {metrics.totalUsers?.toLocaleString() ?? '—'}
            </span>
          </div>

          <div className="p-3 bg-cyber-violet/40 rounded border border-cyber-border">
            <span className="text-slate-400 block text-xs">Total Questions</span>
            <span className="text-xl font-bold text-white">
              {metrics.totalQuestions?.toLocaleString() ?? '—'}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-cyber-border">
          <input
            type="email"
            value={customEmail}
            onChange={(e) => setCustomEmail(e.target.value)}
            placeholder="Custom recipient email (optional)"
            className="px-3 py-2 rounded bg-cyber-violet/60 border border-cyber-border text-white text-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-mint min-w-[280px]"
          />
          <button
            type="button"
            disabled={pending || !status.configured}
            onClick={runTrigger}
            className="px-4 py-2 rounded-lg bg-neo-mint text-black font-heading font-bold text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-mint"
          >
            {pending ? 'Sending...' : 'Trigger Report Now'}
          </button>
          {!status.configured && (
            <span className="text-xs text-slate-400">
              Set SENDGRID_API_KEY and PRODUCT_REPORT_EMAIL to enable dispatch.
            </span>
          )}
        </div>

        {feedback && (
          <p
            role="status"
            className={`mt-4 text-sm font-semibold ${
              isError ? 'text-pop-coral' : 'text-neo-mint'
            }`}
          >
            {feedback}
          </p>
        )}
      </div>
    </div>
  );
}
