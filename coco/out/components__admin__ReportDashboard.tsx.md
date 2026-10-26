# components/admin/ReportDashboard.tsx
lines:133 exports:default
---
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
