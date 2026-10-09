import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import QuizLayout from '../components/quiz/QuizLayout';
import LeaderboardPanel from '../components/leaderboard/LeaderboardPanel';

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
vi.mock('../components/modals/ProfileModal', () => ({ default: () => null }));
vi.mock('../components/modals/DisputeModal', () => ({ default: () => null }));
vi.mock('../components/quiz/QuestionForm', () => ({ default: () => <div data-testid="question-form" /> }));
vi.mock('../components/quiz/QuizCard', () => ({
  default: ({ onOpenDispute }: { onOpenDispute?: () => void }) => (
    <div data-testid="quiz-card" data-has-dispute={onOpenDispute ? 'yes' : 'no'} />
  ),
}));

const QUIZ_LOGIC_BASE = {
  selectedCategory: 'All',
  currentQuestion: null,
  isFlipped: false,
  isSubmitting: false,
  result: null,
  showStickyAd: false,
  setShowStickyAd: vi.fn(),
  stats: null,
  history: [],
  timerMode: 'off',
  timerDuration: 30,
  timeLeft: 30,
  fiftyFiftyUsed: false,
  skipUsed: false,
  eliminatedIndices: [],
  globalLeaderboard: [],
  groupLeaderboard: [],
  leaderboardLoading: false,
  activeModal: null,
  openModal: vi.fn(),
  closeModal: vi.fn(),
  loadNextQuestion: vi.fn(),
  handleSelectCategory: vi.fn(),
  handleAnswerSubmit: vi.fn(),
  handle5050: vi.fn(),
  handleSkip: vi.fn(),
  handleSelectGroup: vi.fn(),
  handleSaveTimerSettings: vi.fn(),
  isUnlocked: true,
  handleUnlock: vi.fn(),
};

function mockAccount(account: { id: string } | null) {
  (useSession as import('vitest').Mock).mockReturnValue({
    account,
    refresh: vi.fn(),
    requireSignIn: vi.fn().mockResolvedValue(true),
  });
}

describe('QuizLayout guest gating', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useQuizLogic as import('vitest').Mock).mockReturnValue(QUIZ_LOGIC_BASE);
  });

  it('shows a sign-in empty state instead of QuestionForm for a guest', () => {
    mockAccount(null);
    render(<QuizLayout />);

    expect(screen.getByText('No questions yet. Sign in to add the first one.')).toBeDefined();
    expect(screen.queryByTestId('question-form')).toBeNull();
  });

  it('renders QuestionForm for a signed-in account', () => {
    mockAccount({ id: 'acct-1' });
    render(<QuizLayout />);

    expect(screen.getByTestId('question-form')).toBeDefined();
    expect(screen.queryByText('No questions yet. Sign in to add the first one.')).toBeNull();
  });

  it('passes no dispute handler to QuizCard for a guest', () => {
    mockAccount(null);
    render(<QuizLayout />);

    expect(screen.getByTestId('quiz-card').dataset.hasDispute).toBe('no');
  });

  it('passes a dispute handler to QuizCard for a signed-in account', () => {
    mockAccount({ id: 'acct-1' });
    render(<QuizLayout />);

    expect(screen.getByTestId('quiz-card').dataset.hasDispute).toBe('yes');
  });
});

describe('LeaderboardPanel guest gating', () => {
  beforeEach(() => vi.clearAllMocks());

  it('hides the group button for a guest', () => {
    mockAccount(null);
    render(
      <LeaderboardPanel globalEntries={[]} groupEntries={[]} loading={false} onOpenGroupModal={vi.fn()} />
    );
    expect(screen.queryByTitle('Create or Join Groups')).toBeNull();
  });

  it('shows the group button for a signed-in account', () => {
    mockAccount({ id: 'acct-1' });
    render(
      <LeaderboardPanel globalEntries={[]} groupEntries={[]} loading={false} onOpenGroupModal={vi.fn()} />
    );
    expect(screen.getByTitle('Create or Join Groups')).toBeDefined();
  });
});
