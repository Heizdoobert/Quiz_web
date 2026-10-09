'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { getUserQuizzes, exportUserData } from '@/lib/actions/profile-actions';
import { ClientQuestion } from '@/lib/types';
import { downloadJson } from '@/lib/utils/format';
import { useSession } from '@/hooks/shared/use-session';
import Header from '@/components/layout/Header';
import CreatorDashboardHeader from '@/components/profile/CreatorDashboardHeader';
import CreatorQuizCard from '@/components/profile/CreatorQuizCard';
import CreatorEmptyState from '@/components/profile/CreatorEmptyState';
import CreatorSkeleton from '@/components/profile/CreatorSkeleton';
import CreatorErrorState from '@/components/profile/CreatorErrorState';
import AccessDeniedView from '@/components/profile/AccessDeniedView';
import { QuestionAnalyticsPanel } from '@/components/profile/QuestionAnalyticsPanel';
import AuthorSuggestions from '@/components/community/AuthorSuggestions';
import { AlertCircle } from 'lucide-react';

export default function ProfilePage() {
  const { account, requireSignIn: ensureSession } = useSession();
  const [quizzes, setQuizzes] = useState<ClientQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  useEffect(() => {
    let isCancelled = false;

    // A guest has nothing to look up, so show the dashboard empty instead of spinning forever.
    if (!account) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
      setQuizzes([]);
      setFetchError(null);
      return;
    }
    setLoading(true);
    setFetchError(null);

    async function load() {
      try {
        const res = await getUserQuizzes();
        if (!isCancelled) {
          if (res.success) {
            setQuizzes(res.quizzes);
            setFetchError(null);
          } else {
            setFetchError(res.error);
            setQuizzes([]);
          }
          setLoading(false);
        }
      } catch (err) {
        if (!isCancelled) {
          setFetchError(err instanceof Error ? err.message : 'Failed to load quizzes.');
          setQuizzes([]);
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      isCancelled = true;
    };
  }, [account, reloadTrigger]);

  const handleRetry = useCallback(() => {
    setLoading(true);
    setFetchError(null);
    setReloadTrigger((prev) => prev + 1);
  }, []);

  const handleExport = async () => {
    if (!account || exporting) return;
    setExporting(true);
    setExportSuccess(false);
    setActionError(null);

    try {
      if (!(await ensureSession())) {
        setActionError('Sign in to export your data.');
        return;
      }
      const res = await exportUserData();
      if (res.success) {
        const label = account.id.slice(0, 8);
        downloadJson(`quick-quiz-backup-${label}.json`, res.data);
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
    <div className="min-h-screen bg-deep-space text-slate-100 flex flex-col selection:bg-neo-mint selection:text-deep-space">
      <Header />

      <main
        key={account?.id || 'disconnected'}
        className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28 pb-16"
      >
        {!account ? (
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
                className="mb-6 p-4 rounded-xl bg-pop-coral/10 border border-pop-coral/30 text-pop-coral flex items-center justify-between gap-3 text-sm shadow-sm"
              >
                <div className="flex items-center gap-2.5">
                  <AlertCircle className="w-5 h-5 shrink-0" aria-hidden="true" />
                  <span>{actionError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActionError(null)}
                  className="text-xs uppercase font-heading font-bold text-slate-300 hover:text-white px-2 py-1 rounded-md hover:bg-pop-coral/20 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pop-coral"
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
              <section aria-labelledby="created-quizzes-heading">
                <h2 id="created-quizzes-heading" className="sr-only">
                  Your Created Questions
                </h2>
                <ul
                  role="list"
                  aria-label="Your created questions"
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5"
                >
                  {quizzes.map((quiz) => (
                    <CreatorQuizCard key={quiz.id} quiz={quiz} />
                  ))}
                </ul>
              </section>
            )}

                         <QuestionAnalyticsPanel />
            <AuthorSuggestions accountId={account.id} />
          </>
        )}
      </main>
    </div>
  );
}
