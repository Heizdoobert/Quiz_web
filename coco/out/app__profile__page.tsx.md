# app/profile/page.tsx
lines:181 exports:default
---
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { getUserQuizzes, exportUserData } from '@/lib/actions/profile-actions';
import { ClientQuestion } from '@/lib/types';
import { downloadJson } from '@/lib/utils';
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

    // Created-quiz lookup is still wallet-keyed (out of Task 11's scope); an email-only
    // account has nothing to look up, so show the dashboard empty instead of spinning forever.
    if (!account?.wallet) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
      setQuizzes([]);
      setFetchError(null);
      return;
    }
