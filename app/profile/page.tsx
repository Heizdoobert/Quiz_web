'use client';

import React, { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { ShieldAlert, FileQuestion, Download, Loader2, ArrowLeft } from 'lucide-react';
import { getUserQuizzes, exportUserData } from '@/lib/actions/profile-actions';
import { Question } from '@/lib/types';
import Link from 'next/link';
import Header from '@/components/layout/Header';

export default function ProfilePage() {
  const { address, isConnected } = useAccount();
  const [quizzes, setQuizzes] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!isConnected || !address) {
      const timer = setTimeout(() => setLoading(false), 0);
      return () => clearTimeout(timer);
    }

    async function loadQuizzes() {
      setLoading(true);
      const res = await getUserQuizzes(address as string);
      if (res.success && res.quizzes) {
        setQuizzes(res.quizzes);
      }
      setLoading(false);
    }

    loadQuizzes();
  }, [address, isConnected]);

  const handleExport = async () => {
    if (!address) return;
    setExporting(true);
    try {
      const res = await exportUserData(address);
      if (res.success && res.data) {
        const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `quick-quiz-backup-${address.slice(0, 6)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setExporting(false);
    }
  };

  if (!isConnected || !address) {
    return (
      <div className="min-h-screen bg-[#0F1023]">
        <Header />
        <main className="max-w-4xl mx-auto px-4 pt-32 pb-24">
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center border border-[#2D305A] rounded-2xl bg-[#1A1B35]/50">
            <ShieldAlert className="w-16 h-16 text-rose-500 mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
            <p className="text-slate-400 max-w-sm mb-6">
              Please connect your wallet to view your creator dashboard.
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F1023] flex items-center justify-center" data-testid="loader-icon">
        <Loader2 className="w-8 h-8 text-[#6C5CE7] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F1023]">
      <Header />
      <main className="max-w-4xl mx-auto px-4 pt-32 pb-24">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4 text-sm font-medium">
              <ArrowLeft className="w-4 h-4" />
              Back to App
            </Link>
            <h1 className="text-3xl font-black text-white tracking-tight">Creator Dashboard</h1>
            <p className="text-slate-400 mt-1">Manage and export your quizzes</p>
          </div>
          <button 
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#25284D] hover:bg-[#2E3260] text-white font-bold transition-all border border-[#3A3E70] disabled:opacity-50"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Backup Data
          </button>
        </div>

        {quizzes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center rounded-2xl border border-[#2D305A] bg-[#1A1B35]/50">
            <FileQuestion className="w-16 h-16 text-slate-600 mb-4" />
            <h3 className="text-xl font-bold text-slate-300 mb-2">No Quizzes Created</h3>
            <p className="text-slate-500 max-w-sm mb-6">You haven&apos;t created any quizzes yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quizzes.map((quiz) => (
              <div key={quiz.id} className="p-5 rounded-2xl border border-[#2D305A] bg-[#1A1B35]/50 flex flex-col justify-between">
                <p className="text-white font-medium mb-4 line-clamp-3 leading-relaxed">{quiz.prompt}</p>
                <div className="text-xs text-slate-500 font-medium bg-[#0F1023] px-3 py-1.5 rounded-lg w-fit border border-[#2D305A]">
                  {quiz.options?.length || 0} Options
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
