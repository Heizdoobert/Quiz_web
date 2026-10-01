# tests/quiz-layout-guest-access.test.tsx
lines:156 exports:
---
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import QuizLayout from '../components/quiz/QuizLayout';
import LeaderboardPanel from '../components/leaderboard/LeaderboardPanel';
import ListsNav from '../components/lists/ListsNav';

vi.mock('@rainbow-me/rainbowkit', () => ({ ConnectButton: () => <div /> }));

vi.mock('../hooks/shared/use-session', () => ({ useSession: vi.fn() }));
import { useSession } from '../hooks/shared/use-session';

vi.mock('../hooks/quiz/use-quiz-logic', () => ({ useQuizLogic: vi.fn() }));
import { useQuizLogic } from '../hooks/quiz/use-quiz-logic';

vi.mock('../components/layout/Header', () => ({ default: () => <div /> }));
vi.mock('../components/quiz/CategoryBar', () => ({ default: () => <div /> }));
vi.mock('../components/layout/Sidebar', () => ({ default: () => <div /> }));
vi.mock('../components/ads/AdZone', () => ({ default: () => <div /> }));
vi.mock('../components/ads/StickyBannerAd', () => ({ default: () => <div /> }));
vi.mock('../components/seo/SeoFaqSection', () => ({ default: () => <div /> }));
vi.mock('../components/modals/IntroModal', () => ({ default: () => null }));
vi.mock('../components/modals/TimerSettingsModal', () => ({ default: () => null }));
vi.mock('../components/modals/GroupModal', () => ({ default: () => null }));
vi.mock('../components/modals/ReviewModal', () => ({ default: () => null }));
vi.mock('../components/modals/RewardsModal', () => ({ default: () => null }));
vi.mock('../components/modals/ProfileModal', () => ({ default: () => null }));
vi.mock('../components/modals/DisputeModal', () => ({ default: () => null }));
vi.mock('../components/quiz/QuestionForm', () => ({ default: () => <div data-testid="question-form" /> }));
vi.mock('../components/quiz/QuizCard', () => ({
  default: ({ onOpenDispute }: { onOpenDispute?: () => void }) => (
    <div data-testid="quiz-card" data-has-dispute={onOpenDispute ? 'yes' : 'no'} />
  ),
}));

const QUIZ_LOGIC_BASE = {
  address: null,
  selectedCategory: 'All',
  currentQuestion: null,
  isFlipped: false,
