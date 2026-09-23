'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAccount } from 'wagmi';
import {
  AnswerSubmissionResult,
  ClientQuestion,
  LeaderboardEntry,
  UserStats,
  ClaimableRewards,
} from '@/lib/types';
import { getOrCreateUser } from '@/lib/actions/user-actions';
import { fetchRandomQuestion, get5050EliminatedIndices } from '@/lib/actions/question-actions';
import { getUserStats, submitAnswer } from '@/lib/actions/quiz-actions';
import { getGlobalLeaderboard, getGroupLeaderboard } from '@/lib/actions/leaderboard-actions';
import { getClaimableRewards } from '@/lib/actions/reward-actions';
import { HistoryItem } from '@/components/modals/ReviewModal';
import { soundEngine } from '@/lib/audio';

export type ActiveModal =
  | 'intro'
  | 'timer'
  | 'group'
  | 'review'
  | 'rewards'
  | 'profile'
  | 'dispute'
  | null;

interface UseQuizLogicOptions {
  initialQuestion?: ClientQuestion | null;
  initialLeaderboard?: LeaderboardEntry[];
}

export function useQuizLogic({
  initialQuestion = null,
  initialLeaderboard = [],
}: UseQuizLogicOptions = {}) {
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

  // Ad / Affiliate Sponsor Gate
  const [isUnlocked, setIsUnlocked] = useState(false);

  const handleUnlock = useCallback(() => {
    const sponsorUrl = process.env.NEXT_PUBLIC_SPONSOR_AD_URL || 'https://coinzilla.com';
    if (typeof window !== 'undefined') {
      window.open(sponsorUrl, '_blank', 'noopener,noreferrer');
    }
    setIsUnlocked(true);
    soundEngine.playPowerup();
  }, []);

  // Leaderboard data
  const [globalLeaderboard, setGlobalLeaderboard] = useState<LeaderboardEntry[]>(initialLeaderboard);
  const [groupLeaderboard, setGroupLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  // Modals
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const openModal = (modal: Exclude<ActiveModal, null>) => setActiveModal(modal);
  const closeModal = () => setActiveModal(null);

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
      const global = await getGlobalLeaderboard(50);
      setGlobalLeaderboard(global);
      if (gid) {
        const group = await getGroupLeaderboard(gid, 50);
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
      setIsUnlocked(false);
      setTimeLeft(timerDuration);
      soundEngine.playFlip();

      const idsToExclude = Array.isArray(overrideAnsweredIds) ? overrideAnsweredIds : answeredIds;
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
      setIsUnlocked(false);
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
        const global = await getGlobalLeaderboard(50);
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
    if (!currentQuestion || isFlipped || isSubmitting || !isUnlocked) return;

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
  }, [currentQuestion, isFlipped, isSubmitting, isUnlocked, timerMode, handleAnswerSubmit]);

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

  const handleSelectGroup = (groupId: string) => {
    setSelectedGroupId(groupId);
    loadLeaderboards(groupId);
  };

  const handleSaveTimerSettings = (mode: typeof timerMode, duration: number) => {
    setTimerMode(mode);
    setTimerDuration(duration);
    setTimeLeft(duration);
  };

  const handleCloseRewards = () => {
    closeModal();
    refreshRewards();
  };

  const hasClaimableRewards =
    BigInt(claimableRewards?.claimableTokens || '0') > BigInt(0) ||
    (claimableRewards?.eligibleBadges?.length ?? 0) > 0;

  return {
    address,
    isConnected,
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
    timerDuration,
    timeLeft,
    fiftyFiftyUsed,
    skipUsed,
    eliminatedIndices,
    globalLeaderboard,
    groupLeaderboard,
    leaderboardLoading,
    activeModal,
    openModal,
    closeModal,
    claimableRewards,
    hasClaimableRewards,
    refreshRewards,
    loadLeaderboards,
    loadNextQuestion,
    handleSelectCategory,
    handleAnswerSubmit,
    handle5050,
    handleSkip,
    handleSelectGroup,
    handleSaveTimerSettings,
    handleCloseRewards,
    isUnlocked,
    handleUnlock,
  };
}
