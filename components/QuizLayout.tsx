'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAccount } from 'wagmi';
import {
  AnswerSubmissionResult,
  ClientQuestion,
  LeaderboardEntry,
  UserStats,
} from '@/lib/types';
import { getOrCreateUser } from '@/lib/actions/user-actions';
import {
  fetchRandomQuestion,
  get5050EliminatedIndices,
} from '@/lib/actions/question-actions';
import { getUserStats, submitAnswer } from '@/lib/actions/quiz-actions';
import {
  getGlobalLeaderboard,
  getGroupLeaderboard,
} from '@/lib/actions/leaderboard-actions';
import Header from './Header';
import CategoryBar from './CategoryBar';
import QuizCard from './QuizCard';
import Sidebar from './Sidebar';
import LeaderboardPanel from './LeaderboardPanel';
import QuestionForm from './QuestionForm';
import AdZone from './AdZone';
import StickyBannerAd from './StickyBannerAd';
import IntroModal from './modals/IntroModal';
import TimerSettingsModal from './modals/TimerSettingsModal';
import GroupModal from './modals/GroupModal';
import ReviewModal, { HistoryItem } from './modals/ReviewModal';
import RewardsModal from './modals/RewardsModal';
import { getClaimableRewards } from '@/lib/actions/reward-actions';
import { ClaimableRewards } from '@/lib/types';
import { soundEngine } from '@/lib/audio';

interface QuizLayoutProps {
  initialQuestion?: ClientQuestion | null;
  initialLeaderboard?: LeaderboardEntry[];
}

export default function QuizLayout({
  initialQuestion = null,
  initialLeaderboard = [],
}: QuizLayoutProps = {}) {
  const { address, isConnected } = useAccount();

  // Quiz state
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [currentQuestion, setCurrentQuestion] = useState<ClientQuestion | null>(initialQuestion);
  const [answeredIds, setAnsweredIds] = useState<string[]>([]);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<AnswerSubmissionResult | null>(null);
  const [showStickyAd, setShowStickyAd] = useState(true);

  // Stats & History
  const [stats, setStats] = useState<UserStats>({
    score: 0,
    streak: 0,
    bestStreak: 0,
    accuracy: 0,
    totalAnswered: 0,
  });
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Timer settings
  const [timerMode, setTimerMode] = useState<'per-question' | 'total' | 'stopwatch'>('per-question');
  const [timerDuration, setTimerDuration] = useState(30);
  const [timeLeft, setTimeLeft] = useState(30);
  const timeLeftRef = useRef(timeLeft);

  useEffect(() => {
    timeLeftRef.current = timeLeft;
  }, [timeLeft]);

  // Powerups (once per quiz session)
  const [fiftyFiftyUsed, setFiftyFiftyUsed] = useState(false);
  const [skipUsed, setSkipUsed] = useState(false);
  const [eliminatedIndices, setEliminatedIndices] = useState<number[]>([]);

  // Leaderboard data
  const [globalLeaderboard, setGlobalLeaderboard] = useState<LeaderboardEntry[]>(initialLeaderboard);
  const [groupLeaderboard, setGroupLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  // Modals
  const [activeModal, setActiveModal] = useState<
    'intro' | 'timer' | 'group' | 'review' | 'rewards' | 'profile' | null
  >(null);

  // Rewards
  const [claimableRewards, setClaimableRewards] = useState<ClaimableRewards | null>(null);

  const refreshStats = useCallback(async () => {
    if (!address) return;
    const userStats = await getUserStats(address);
    setStats(userStats);
  }, [address]);

  const refreshRewards = useCallback(async () => {
    if (!address) return;
    const data = await getClaimableRewards(address);
    setClaimableRewards(data);
  }, [address]);

  const loadLeaderboards = useCallback(
    async (overrideGroupId?: string) => {
      const gid = overrideGroupId ?? selectedGroupId;
      setLeaderboardLoading(true);
      const global = await getGlobalLeaderboard(10);
      setGlobalLeaderboard(global);
      if (gid) {
        const group = await getGroupLeaderboard(gid, 10);
        setGroupLeaderboard(group);
      }
      setLeaderboardLoading(false);
    },
    [selectedGroupId]
  );

  const loadNextQuestion = useCallback(
    async (overrideAnsweredIds?: string[]) => {
      setIsFlipped(false);
      setResult(null);
      setEliminatedIndices([]);
      setTimeLeft(timerDuration);
      soundEngine.playFlip();

      const idsToExclude = Array.isArray(overrideAnsweredIds)
        ? overrideAnsweredIds
        : answeredIds;
      const q = await fetchRandomQuestion(idsToExclude, selectedCategory);
      setCurrentQuestion(q);
    },
    [answeredIds, timerDuration, selectedCategory]
  );

  const handleSelectCategory = useCallback(
    async (catId: string) => {
      setSelectedCategory(catId);
      setEliminatedIndices([]);
      setIsFlipped(false);
      setResult(null);
      setTimeLeft(timerDuration);
      soundEngine.playFlip();
      const q = await fetchRandomQuestion([], catId);
      setCurrentQuestion(q);
    },
    [timerDuration]
  );

  const handleAnswerSubmit = useCallback(
    async (answerIndex: number) => {
      if (!currentQuestion || isSubmitting || isFlipped) return;

      setIsSubmitting(true);
      const res = await submitAnswer({
        questionId: currentQuestion.id,
        answerIndex,
        walletAddress: address || '0x0000000000000000000000000000000000000000',
      });

      setResult(res);
      setIsFlipped(true);
      setIsSubmitting(false);

      if (res.isCorrect) {
        soundEngine.playCorrect();
      } else {
        soundEngine.playWrong();
      }

      // Record to history and answered IDs
      setAnsweredIds((prev) => [...prev, currentQuestion.id]);
      setHistory((prev) => [
        {
          questionId: currentQuestion.id,
          prompt: currentQuestion.prompt,
          isCorrect: res.isCorrect,
        },
        ...prev,
      ]);

      // Optimistically update local session stats
      setStats((prev) => {
        const nextTotal = prev.totalAnswered + 1;
        const nextScore = res.isCorrect ? prev.score + 1 : prev.score;
        const nextStreak = res.isCorrect ? prev.streak + 1 : 0;
        const nextBest = Math.max(prev.bestStreak, nextStreak);
        const nextAcc = Math.round((nextScore / nextTotal) * 100);
        return {
          score: nextScore,
          streak: nextStreak,
          bestStreak: nextBest,
          accuracy: nextAcc,
          totalAnswered: nextTotal,
        };
      });

      // Refresh leaderboards
      loadLeaderboards();
      refreshRewards();
    },
    [currentQuestion, isSubmitting, isFlipped, address, loadLeaderboards, refreshRewards]
  );

  // Initial user sync & stats fetch
  useEffect(() => {
    if (isConnected && address) {
      getOrCreateUser(address).then(() => {
        refreshStats();
        refreshRewards();
      });
    }
  }, [isConnected, address, refreshStats, refreshRewards]);

  // Only fetch initial question and leaderboards if not supplied via SSR
  useEffect(() => {
    let ignore = false;
    async function initData() {
      if (!initialQuestion) {
        const q = await fetchRandomQuestion();
        if (!ignore) setCurrentQuestion(q);
      }
      if (initialLeaderboard.length === 0) {
        const global = await getGlobalLeaderboard(10);
        if (!ignore) setGlobalLeaderboard(global);
      }
    }
    initData();
    return () => {
      ignore = true;
    };
  }, [initialQuestion, initialLeaderboard.length]);

  // Timer Countdown effect
  useEffect(() => {
    if (!currentQuestion || isFlipped || isSubmitting) return;

    if (timerMode === 'per-question') {
      const interval = setInterval(() => {
        if (timeLeftRef.current <= 1) {
          clearInterval(interval);
          setTimeLeft(0);
          handleAnswerSubmit(-1); // Timeout treated as wrong
        } else {
          setTimeLeft((prev) => {
            const nextTime = prev - 1;
            if (nextTime <= 5 && nextTime > 0) {
              soundEngine.playTick();
            }
            return nextTime;
          });
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [currentQuestion, isFlipped, isSubmitting, timerMode, handleAnswerSubmit]);

  const handle5050 = async () => {
    if (fiftyFiftyUsed || !currentQuestion) return;
    setFiftyFiftyUsed(true);
    soundEngine.playPowerup();
    const eliminated = await get5050EliminatedIndices(currentQuestion.id);
    setEliminatedIndices(eliminated);
  };

  const handleSkip = () => {
    if (skipUsed || !currentQuestion) return;
    setSkipUsed(true);
    soundEngine.playPowerup();
    const updatedIds = [...answeredIds, currentQuestion.id];
    setAnsweredIds(updatedIds);
    loadNextQuestion(updatedIds);
  };

  return (
    <>
      <Header
        onOpenRewards={() => setActiveModal('rewards')}
        onOpenProfile={() => setActiveModal('profile')}
        hasClaimable={BigInt(claimableRewards?.claimableTokens || '0') > BigInt(0) || (claimableRewards?.eligibleBadges?.length ?? 0) > 0}
        isConnected={isConnected}
      />
      <div className={`w-full flex justify-center pt-6 px-4 transition-[padding] duration-300 ${showStickyAd ? 'pb-[calc(70px+env(safe-area-inset-bottom))] sm:pb-[84px]' : 'pb-6'}`}>
      <div className="w-full max-w-[1540px] flex gap-6 justify-center items-start">
        {/* Left Skyscraper Ad (Desktop Only) */}
        <AdZone variant="skyscraper" slot="left-sky" />

        {/* Center Main Content Area */}
        <div className="flex-1 max-w-6xl w-full flex flex-col items-center">
          {/* Top Banner Ad */}
          <AdZone variant="banner" slot="top-banner" />

          {/* 3-Column Responsive Core App Grid */}
          <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Stats & History Sidebar (3 cols) */}
            <div className="lg:col-span-3 w-full order-2 lg:order-1">
              <Sidebar
                stats={stats}
                history={history}
                onOpenReview={() => setActiveModal('review')}
                claimableTokens={claimableRewards?.claimableTokens}
                onOpenRewards={() => setActiveModal('rewards')}
              />
            </div>

            {/* Center Column: Quiz Card & Custom Question Form (6 cols) */}
            <div className="lg:col-span-6 w-full flex flex-col items-center order-1 lg:order-2 space-y-4">
              <CategoryBar
                selectedCategory={selectedCategory}
                onSelectCategory={handleSelectCategory}
              />
              <QuizCard
                question={currentQuestion}
                isFlipped={isFlipped}
                timeLeft={timeLeft}
                result={result}
                onSelectAnswer={handleAnswerSubmit}
                onNextQuestion={loadNextQuestion}
                onOpenTimerSettings={() => setActiveModal('timer')}
                onUse5050={handle5050}
                onUseSkip={handleSkip}
                fiftyFiftyUsed={fiftyFiftyUsed}
                skipUsed={skipUsed}
                eliminatedIndices={eliminatedIndices}
                isSubmitting={isSubmitting}
                onAddQuestionClick={() => {
                  const form = document.getElementById('custom-form');
                  form?.scrollIntoView({ behavior: 'smooth' });
                }}
              />

              <div id="custom-form" className="w-full mt-4">
                <QuestionForm
                  walletAddress={address || null}
                  onQuestionAdded={loadNextQuestion}
                />
              </div>
            </div>

            {/* Right Column: Leaderboards (3 cols) */}
            <div className="lg:col-span-3 w-full order-3">
              <LeaderboardPanel
                globalEntries={globalLeaderboard}
                groupEntries={groupLeaderboard}
                loading={leaderboardLoading}
                onOpenGroupModal={() => setActiveModal('group')}
              />
            </div>
          </div>

          {/* Bottom Banner Ad */}
          <AdZone variant="banner" slot="bottom-banner" />
        </div>

        {/* Right Skyscraper Ad (Desktop Only) */}
        <AdZone variant="skyscraper" slot="right-sky" />
      </div>

      {/* Modals rendered via Portals */}
      <IntroModal
        isOpen={activeModal === 'intro'}
        onClose={() => setActiveModal(null)}
      />
      <TimerSettingsModal
        isOpen={activeModal === 'timer'}
        onClose={() => setActiveModal(null)}
        currentMode={timerMode}
        currentDuration={timerDuration}
        onSave={(mode, duration) => {
          setTimerMode(mode);
          setTimerDuration(duration);
          setTimeLeft(duration);
        }}
      />
      <GroupModal
        isOpen={activeModal === 'group'}
        onClose={() => setActiveModal(null)}
        walletAddress={address || null}
        onSelectGroup={(groupId) => {
          setSelectedGroupId(groupId);
          loadLeaderboards(groupId);
        }}
      />
      <ReviewModal
        isOpen={activeModal === 'review'}
        onClose={() => setActiveModal(null)}
        history={history}
      />
      <RewardsModal
        isOpen={activeModal === 'rewards'}
        onClose={() => {
          setActiveModal(null);
          refreshRewards();
        }}
        walletAddress={address || null}
      />
    </div>

    {/* Sticky Bottom Banner Ad with Isolated Tap Targets */}
    {showStickyAd && (
      <StickyBannerAd
        position="bottom"
        onDismiss={() => setShowStickyAd(false)}
      />
    )}
    </>
  );
}
