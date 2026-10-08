# components/profile/QuestionAnalyticsPanel.tsx
lines:63 exports:QuestionAnalyticsPanel
---
'use client';

import React, { useEffect, useState } from 'react';
import { getQuestionAnalytics, QuestionAnalytics } from '@/lib/actions/profile-actions';
import { Loader2,Users, Target } from 'lucide-react';

export function QuestionAnalyticsPanel() {
  const [analytics, setAnalytics] = useState<QuestionAnalytics[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await getQuestionAnalytics();
      if (res.success && res.data) {
        setAnalytics(res.data);
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="w-8 h-8 text-neo-mint animate-spin" />
      </div>
    );
  }

  if (analytics.length === 0) {
    return (
      <div className="text-center p-8 bg-cyber-violet/20 border border-cyber-border rounded-xl">
        <p className="text-slate-400">No question data available yet. Create some questions and wait for players to answer them!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {analytics.map((stat) => (
