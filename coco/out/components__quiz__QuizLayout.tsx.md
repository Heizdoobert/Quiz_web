# components/quiz/QuizLayout.tsx
lines:224 exports:default
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
import dynamic from 'next/dynamic';
import SeoFaqSection from '../seo/SeoFaqSection';

const IntroModal = dynamic(() => import('../modals/IntroModal'), { ssr: false });
const TimerSettingsModal = dynamic(() => import('../modals/TimerSettingsModal'), { ssr: false });
const GroupModal = dynamic(() => import('../modals/GroupModal'), { ssr: false });
const ReviewModal = dynamic(() => import('../modals/ReviewModal'), { ssr: false });
const RewardsModal = dynamic(() => import('../modals/RewardsModal'), { ssr: false });
const ProfileModal = dynamic(() => import('../modals/ProfileModal'), { ssr: false });
const DisputeModal = dynamic(() => import('../modals/DisputeModal'), { ssr: false });

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
