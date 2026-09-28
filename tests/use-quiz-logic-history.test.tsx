import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useQuizLogic } from '../hooks/quiz/use-quiz-logic';

const WALLET = '0x' + 'a'.repeat(40);

vi.mock('wagmi', () => ({ useAccount: () => ({ address: '0x' + 'a'.repeat(40), isConnected: true }) }));
vi.mock('../hooks/shared/use-wallet-session', () => ({ useWalletSession: () => vi.fn().mockResolvedValue(true) }));
vi.mock('../lib/audio', () => ({
  soundEngine: { playFlip: vi.fn(), playCorrect: vi.fn(), playWrong: vi.fn(), playTick: vi.fn(), playPowerup: vi.fn() },
}));
vi.mock('../lib/actions/user-actions', () => ({ getOrCreateUser: vi.fn().mockResolvedValue({ wallet_address: '0x' + 'a'.repeat(40) }) }));
vi.mock('../lib/actions/question-actions', () => ({
  fetchRandomQuestion: vi.fn().mockResolvedValue(null),
  get5050EliminatedIndices: vi.fn(),
}));
vi.mock('../lib/actions/leaderboard-actions', () => ({
  getGlobalLeaderboard: vi.fn().mockResolvedValue([]),
  getGroupLeaderboard: vi.fn().mockResolvedValue([]),
}));
vi.mock('../lib/actions/reward-actions', () => ({ getClaimableRewards: vi.fn().mockResolvedValue(null) }));

const getUserStats = vi.fn().mockResolvedValue({ score: 0, streak: 0, bestStreak: 0, accuracy: 0, totalAnswered: 0 });
const getAnswerHistory = vi.fn();
const submitAnswer = vi.fn();
vi.mock('../lib/actions/quiz-actions', () => ({
  getUserStats: (...args: unknown[]) => getUserStats(...args),
  getAnswerHistory: (...args: unknown[]) => getAnswerHistory(...args),
  submitAnswer: (...args: unknown[]) => submitAnswer(...args),
}));

describe('useQuizLogic history restore', () => {
  beforeEach(() => {
    getAnswerHistory.mockReset();
  });

  it('loads saved history and folds it into answeredIds on connect', async () => {
    getAnswerHistory.mockResolvedValue([
      { questionId: 'q1', prompt: 'What is Base?', isCorrect: true },
      { questionId: 'q2', prompt: 'What is gas?', isCorrect: false },
    ]);

    const { result } = renderHook(() => useQuizLogic());

    await waitFor(() => expect(result.current.history).toHaveLength(2));
    expect(getAnswerHistory).toHaveBeenCalledWith(WALLET);
    expect(result.current.history[0].questionId).toBe('q1');
  });

  it('leaves history empty when nothing was saved', async () => {
    getAnswerHistory.mockResolvedValue([]);

    const { result } = renderHook(() => useQuizLogic());

    await waitFor(() => expect(getAnswerHistory).toHaveBeenCalled());
    expect(result.current.history).toEqual([]);
  });
});
