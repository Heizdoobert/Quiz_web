# components/quiz/QuizLayout.tsx
lines:190 exports:default
---
'use client';

import React from 'react';
import { ClientQuestion, LeaderboardEntry } from '@/lib/types';
import { useQuizLogic } from '@/hooks/quiz/use-quiz-logic';
import { useSession } from '@/hooks/shared/use-session';
import Header from '../layout/Header';
import CategoryBar from './CategoryBar';
import QuizCard from './QuizCard';
import Sidebar from '../layout/Sidebar';
import LeaderboardPanel from '../leaderboard/LeaderboardPanel';
import QuestionForm from './QuestionForm';
import AdZone from '../ads/AdZone';
import StickyBannerAd from '../ads/StickyBannerAd';
import SeoFaqSection from '../seo/SeoFaqSection';
import { QuizModals } from './QuizModals';

interface QuizLayoutProps {
  initialQuestion?: ClientQuestion | null;
  initialLeaderboard?: LeaderboardEntry[];
  initialCategory?: string;
}

export default function QuizLayout({
  initialQuestion = null,
  initialLeaderboard = [],
  initialCategory,
}: QuizLayoutProps = {}) {
  const {
    address,
    selectedCategory,
    currentQuestion,
    isFlipped,
    isSubmitting,
    result,
    showStickyAd,
    setShowStickyAd,
    stats,
    history,
    timerMode,
