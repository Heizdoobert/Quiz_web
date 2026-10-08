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
        <div key={stat.question_id} className="bg-cyber-violet/40 p-4 rounded-xl border border-cyber-border">
          <h4 className="font-medium text-white mb-3 text-sm line-clamp-2">{stat.prompt}</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-neon-cyan" />
              <div>
                <p className="text-xs text-slate-400">Plays</p>
                <p className="font-bold text-white">{stat.play_count}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-neo-mint" />
              <div>
                <p className="text-xs text-slate-400">Accuracy</p>
                <p className="font-bold text-white">{Number(stat.accuracy_rate).toFixed(1)}%</p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
