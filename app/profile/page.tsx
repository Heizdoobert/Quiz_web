'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { getUserQuizzes, exportUserData } from '@/lib/actions/profile-actions';
import { Question } from '@/lib/types';
import Header from '@/components/layout/Header';
import CreatorDashboardHeader from '@/components/profile/CreatorDashboardHeader';
import CreatorQuizCard from '@/components/profile/CreatorQuizCard';
import CreatorEmptyState from '@/components/profile/CreatorEmptyState';
import CreatorSkeleton from '@/components/profile/CreatorSkeleton';
import CreatorErrorState from '@/components/profile/CreatorErrorState';
import AccessDeniedView from '@/components/profile/AccessDeniedView';
import { AlertCircle } from 'lucide-react';

export default function ProfilePage() {
  const { address, isConnected } = useAccount();
  const [quizzes, setQuizzes] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  useEffect(() => {
    let isCancelled = false;

    if (!isConnected || !address) {
      return;
    }

    async function load() {
      try {
        const res = await getUserQuizzes(address as string);
        if (!isCancelled) {
          if (res.success) {
            setQuizzes(res.quizzes);
            setFetchError(null);
          } else {
            setFetchError(res.error);
          }
          setLoading(false);
        }
      } catch (err) {
        if (!isCancelled) {
          setFetchError(err instanceof Error ? err.message : 'Failed to load quizzes.');
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      isCancelled = true;
    };
  }, [address, isConnected, reloadTrigger]);

  const handleRetry = useCallback(() => {
    setLoading(true);
    setFetchError(null);
    setReloadTrigger((prev) => prev + 1);
  }, []);

  const handleExport = async () => {
    if (!address || exporting) return;
    setExporting(true);
    setExportSuccess(false);
    setActionError(null);

    try {
      const res = await exportUserData(address);
      if (res.success) {
        const jsonString = JSON.stringify(res.data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `quick-quiz-backup-${address.slice(0, 6)}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Safe delay before revoking blob URL to prevent premature cancellation in browsers
        setTimeout(() => {
          URL.revokeObjectURL(url);
        }, 1000);

        setExportSuccess(true);
        setTimeout(() => setExportSuccess(false), 4000);
      } else {
        setActionError(res.error);
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'An error occurred during export.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A1128] text-slate-100 flex flex-col selection:bg-[#00FFCC] selection:text-[#0A1128]">
      <Header />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28 pb-16">
        {!isConnected || !address ? (
          <AccessDeniedView />
        ) : (
          <>
            <CreatorDashboardHeader
              quizCount={quizzes.length}
              exporting={exporting}
              exportSuccess={exportSuccess}
              onExport={handleExport}
            />

            {/* Action/Export Error Banner */}
            {actionError && (
              <div
                role="alert"
                className="mb-6 p-4 rounded-xl bg-[#FF4757]/10 border border-[#FF4757]/30 text-[#FF4757] flex items-center justify-between gap-3 text-sm shadow-sm"
              >
                <div className="flex items-center gap-2.5">
                  <AlertCircle className="w-5 h-5 shrink-0" aria-hidden="true" />
                  <span>{actionError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActionError(null)}
                  className="text-xs uppercase font-heading font-bold text-slate-300 hover:text-white px-2 py-1 rounded-md hover:bg-[#FF4757]/20 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#FF4757]"
                  aria-label="Dismiss error"
                >
                  Dismiss
                </button>
              </div>
            )}

            {loading ? (
              <CreatorSkeleton />
            ) : fetchError ? (
              <CreatorErrorState
                error={fetchError}
                onRetry={handleRetry}
                retrying={loading}
              />
            ) : quizzes.length === 0 ? (
              <CreatorEmptyState />
            ) : (
              <ul
                role="list"
                aria-label="Your created questions"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5"
              >
                {quizzes.map((quiz) => (
                  <CreatorQuizCard key={quiz.id} quiz={quiz} />
                ))}
              </ul>
            )}
          </>
        )}
      </main>
    </div>
  );
}
