import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { useQuizLogic } from '../hooks/quiz/use-quiz-logic';
import { SessionProvider, useSession } from '../hooks/shared/use-session';
import { useQuizAuth } from '../hooks/shared/use-quiz-auth';
import { useAccount } from 'wagmi';
import { getSessionInfo, getSignedInWallet, signOutWallet } from '../lib/actions/auth-actions';
import { getUserStats, getAnswerHistory } from '../lib/actions/quiz-actions';
import { getClaimableRewards } from '../lib/actions/reward-actions';

vi.mock('wagmi', () => ({
  useAccount: vi.fn(),
}));

vi.mock('../lib/actions/auth-actions', () => ({
  getSessionInfo: vi.fn(),
  getSignedInWallet: vi.fn(),
  signOutWallet: vi.fn(),
  getAuthNonce: vi.fn().mockResolvedValue('test-nonce'),
}));

vi.mock('../lib/actions/quiz-actions', () => ({
  getUserStats: vi.fn(),
  getAnswerHistory: vi.fn(),
  submitAnswer: vi.fn(),
}));

vi.mock('../lib/actions/reward-actions', () => ({
  getClaimableRewards: vi.fn(),
}));

vi.mock('../lib/actions/question-actions', () => ({
  fetchRandomQuestion: vi.fn().mockResolvedValue(null),
  get5050EliminatedIndices: vi.fn().mockResolvedValue([]),
}));

vi.mock('../lib/actions/leaderboard-actions', () => ({
  getGlobalLeaderboard: vi.fn().mockResolvedValue([]),
  getGroupLeaderboard: vi.fn().mockResolvedValue([]),
}));

vi.mock('../lib/audio', () => ({
  soundEngine: {
    playFlip: vi.fn(),
    playCorrect: vi.fn(),
    playWrong: vi.fn(),
    playTick: vi.fn(),
    playPowerup: vi.fn(),
  },
}));

vi.mock('../components/auth/SignInModal', () => ({
  default: () => null,
}));

const WALLET_A = '0x1111111111111111111111111111111111111111';
const WALLET_B = '0x2222222222222222222222222222222222222222';

const STATS_A = {
  score: 15,
  streak: 3,
  bestStreak: 7,
  accuracy: 85,
  totalAnswered: 20,
};

const STATS_B = {
  score: 42,
  streak: 5,
  bestStreak: 12,
  accuracy: 90,
  totalAnswered: 50,
};

const HISTORY_A = [
  { questionId: 'q-a1', prompt: 'Prompt A1', isCorrect: true },
  { questionId: 'q-a2', prompt: 'Prompt A2', isCorrect: false },
];

const HISTORY_B = [
  { questionId: 'q-b1', prompt: 'Prompt B1', isCorrect: true },
];

const REWARDS_A = {
  heldTokens: '100',
  claimableTokens: '50',
  eligibleBadges: [0],
  sweepsAt: null,
};

describe('Wallet and Auth State Synchronization (R1 & Acceptance Criteria)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (useAccount as ReturnType<typeof vi.fn>).mockReturnValue({
      address: undefined,
      isConnected: false,
      status: 'disconnected',
    });
    (getSessionInfo as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (getSignedInWallet as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (getUserStats as ReturnType<typeof vi.fn>).mockResolvedValue({
      score: 0,
      streak: 0,
      bestStreak: 0,
      accuracy: 0,
      totalAnswered: 0,
    });
    (getAnswerHistory as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (getClaimableRewards as ReturnType<typeof vi.fn>).mockResolvedValue(null);
  });

  it('connecting a wallet validates and reflects session state in profile and quiz context', async () => {
    // Backend has session for WALLET_A
    (getSessionInfo as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'acc-wallet-a',
      wallet: WALLET_A,
    });
    (useAccount as ReturnType<typeof vi.fn>).mockReturnValue({
      address: WALLET_A,
      isConnected: true,
      status: 'connected',
    });
    (getUserStats as ReturnType<typeof vi.fn>).mockResolvedValue(STATS_A);
    (getAnswerHistory as ReturnType<typeof vi.fn>).mockResolvedValue(HISTORY_A);
    (getClaimableRewards as ReturnType<typeof vi.fn>).mockResolvedValue(REWARDS_A);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SessionProvider>{children}</SessionProvider>
    );

    const { result } = renderHook(() => useQuizLogic(), { wrapper });

    await waitFor(() => {
      expect(result.current.stats.score).toBe(15);
      expect(result.current.history).toHaveLength(2);
      expect(result.current.hasClaimableRewards).toBe(true);
    });
  });

  it('disconnecting a wallet cleanly resets local user session state and profile context', async () => {
    // 1. Start connected with Wallet A
    (getSessionInfo as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'acc-wallet-a',
      wallet: WALLET_A,
    });
    (useAccount as ReturnType<typeof vi.fn>).mockReturnValue({
      address: WALLET_A,
      isConnected: true,
      status: 'connected',
    });
    (getUserStats as ReturnType<typeof vi.fn>).mockResolvedValue(STATS_A);
    (getAnswerHistory as ReturnType<typeof vi.fn>).mockResolvedValue(HISTORY_A);
    (getClaimableRewards as ReturnType<typeof vi.fn>).mockResolvedValue(REWARDS_A);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SessionProvider>{children}</SessionProvider>
    );

    function useCombined() {
      const session = useSession();
      const quiz = useQuizLogic();
      return { session, quiz };
    }

    const { result } = renderHook(() => useCombined(), { wrapper });

    await waitFor(() => {
      expect(result.current.session.account?.wallet).toBe(WALLET_A);
      expect(result.current.quiz.stats.score).toBe(15);
      expect(result.current.quiz.history).toHaveLength(2);
      expect(result.current.quiz.claimableRewards).not.toBeNull();
    });

    // 2. Disconnect wallet: clear session state
    await act(async () => {
      result.current.session.clearSession();
    });

    await waitFor(() => {
      expect(result.current.session.account).toBeNull();
      expect(result.current.quiz.stats.score).toBe(0);
      expect(result.current.quiz.stats.totalAnswered).toBe(0);
      expect(result.current.quiz.history).toEqual([]);
      expect(result.current.quiz.claimableRewards).toBeNull();
      expect(result.current.quiz.hasClaimableRewards).toBe(false);
    });
  });

  it('switching accounts updates active user session and UI profile context cleanly', async () => {
    // 1. Initial Account A
    (getSessionInfo as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'acc-wallet-a',
      wallet: WALLET_A,
    });
    (useAccount as ReturnType<typeof vi.fn>).mockReturnValue({
      address: WALLET_A,
      isConnected: true,
      status: 'connected',
    });
    (getUserStats as ReturnType<typeof vi.fn>).mockResolvedValue(STATS_A);
    (getAnswerHistory as ReturnType<typeof vi.fn>).mockResolvedValue(HISTORY_A);
    (getClaimableRewards as ReturnType<typeof vi.fn>).mockResolvedValue(REWARDS_A);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SessionProvider>{children}</SessionProvider>
    );

    function useCombined() {
      const session = useSession();
      const quiz = useQuizLogic();
      return { session, quiz };
    }

    const { result } = renderHook(() => useCombined(), { wrapper });

    await waitFor(() => {
      expect(result.current.session.account?.id).toBe('acc-wallet-a');
      expect(result.current.quiz.stats.score).toBe(15);
    });

    // 2. Switch to Account B
    (getSessionInfo as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'acc-wallet-b',
      wallet: WALLET_B,
    });
    (useAccount as ReturnType<typeof vi.fn>).mockReturnValue({
      address: WALLET_B,
      isConnected: true,
      status: 'connected',
    });
    (getUserStats as ReturnType<typeof vi.fn>).mockResolvedValue(STATS_B);
    (getAnswerHistory as ReturnType<typeof vi.fn>).mockResolvedValue(HISTORY_B);
    (getClaimableRewards as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await act(async () => {
      await result.current.session.refresh();
    });

    await waitFor(() => {
      expect(result.current.session.account?.id).toBe('acc-wallet-b');
      expect(result.current.session.account?.wallet).toBe(WALLET_B);
      expect(result.current.quiz.stats.score).toBe(42);
      expect(result.current.quiz.history).toHaveLength(1);
      expect(result.current.quiz.history[0].questionId).toBe('q-b1');
      expect(result.current.quiz.claimableRewards).toBeNull();
    });
  });

  it('session expiry resets local user state and profile context without unhandled rejection', async () => {
    (getSessionInfo as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'acc-wallet-a',
      wallet: WALLET_A,
    });
    (useAccount as ReturnType<typeof vi.fn>).mockReturnValue({
      address: WALLET_A,
      isConnected: true,
      status: 'connected',
    });
    (getUserStats as ReturnType<typeof vi.fn>).mockResolvedValue(STATS_A);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SessionProvider>{children}</SessionProvider>
    );

    function useCombined() {
      const session = useSession();
      const quiz = useQuizLogic();
      return { session, quiz };
    }

    const { result } = renderHook(() => useCombined(), { wrapper });

    await waitFor(() => {
      expect(result.current.session.account?.id).toBe('acc-wallet-a');
    });

    // Simulate session expiry on server
    (getSessionInfo as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await act(async () => {
      await result.current.session.refresh();
    });

    await waitFor(() => {
      expect(result.current.session.account).toBeNull();
      expect(result.current.quiz.stats.score).toBe(0);
      expect(result.current.quiz.history).toEqual([]);
    });
  });

  it('refresh handles server rejection without throwing unhandled promise rejections', async () => {
    (getSessionInfo as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network drop'));

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SessionProvider>{children}</SessionProvider>
    );

    const { result } = renderHook(() => useSession(), { wrapper });

    let refreshedInfo: unknown = 'initial';
    await act(async () => {
      refreshedInfo = await result.current.refresh();
    });

    expect(refreshedInfo).toBeNull();
    expect(result.current.account).toBeNull();
  });

  it('clearSession invalidates in-flight refresh to prevent account resurrection', async () => {
    let resolveSlowFetch!: (val: { id: string; wallet: string }) => void;
    const slowFetchPromise = new Promise<{ id: string; wallet: string }>((resolve) => {
      resolveSlowFetch = resolve;
    });

    (getSessionInfo as ReturnType<typeof vi.fn>).mockReturnValue(slowFetchPromise);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SessionProvider>{children}</SessionProvider>
    );

    const { result } = renderHook(() => useSession(), { wrapper });

    // In-flight refresh is running (from initial mount)
    // Clear session while refresh is still awaiting network
    act(() => {
      result.current.clearSession();
    });

    expect(result.current.account).toBeNull();

    // Now slow network request finishes
    await act(async () => {
      resolveSlowFetch({ id: 'acc-stale', wallet: WALLET_A });
      await slowFetchPromise;
    });

    // Account MUST remain null and not be resurrected by stale promise
    expect(result.current.account).toBeNull();
  });

  it('useQuizLogic ignores in-flight stats when account switches or disconnects', async () => {
    let resolveStatsA!: (stats: typeof STATS_A) => void;
    const slowStatsPromise = new Promise<typeof STATS_A>((resolve) => {
      resolveStatsA = resolve;
    });

    (getSessionInfo as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'acc-wallet-a',
      wallet: WALLET_A,
    });
    (useAccount as ReturnType<typeof vi.fn>).mockReturnValue({
      address: WALLET_A,
      isConnected: true,
      status: 'connected',
    });
    // Stats for A will take a while to resolve
    (getUserStats as ReturnType<typeof vi.fn>).mockReturnValue(slowStatsPromise);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SessionProvider>{children}</SessionProvider>
    );

    function useCombined() {
      const session = useSession();
      const quiz = useQuizLogic();
      return { session, quiz };
    }

    const { result } = renderHook(() => useCombined(), { wrapper });

    await waitFor(() => {
      expect(result.current.session.account?.id).toBe('acc-wallet-a');
    });

    // Now disconnect before A's stats finish loading
    await act(async () => {
      result.current.session.clearSession();
    });

    expect(result.current.session.account).toBeNull();
    expect(result.current.quiz.stats.score).toBe(0);

    // Resolve A's slow stats
    await act(async () => {
      resolveStatsA(STATS_A);
      await slowStatsPromise;
    });

    // Stats MUST remain 0, not overwritten by stale response for A
    expect(result.current.quiz.stats.score).toBe(0);
    expect(result.current.quiz.stats.totalAnswered).toBe(0);
  });

  it('end-to-end integration: wallet disconnect through useQuizAuth cascades to SessionProvider and resets useQuizLogic stats', async () => {
    const accountMock = vi.fn();
    (useAccount as ReturnType<typeof vi.fn>).mockImplementation(accountMock);

    // 1. Initially connected with active session
    accountMock.mockReturnValue({
      address: WALLET_A,
      isConnected: true,
      status: 'connected',
    });
    (getSessionInfo as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'acc-wallet-a',
      wallet: WALLET_A,
    });
    (getSignedInWallet as ReturnType<typeof vi.fn>).mockResolvedValue(WALLET_A.toLowerCase());
    (getUserStats as ReturnType<typeof vi.fn>).mockResolvedValue(STATS_A);
    (getAnswerHistory as ReturnType<typeof vi.fn>).mockResolvedValue(HISTORY_A);
    (getClaimableRewards as ReturnType<typeof vi.fn>).mockResolvedValue(REWARDS_A);
    (signOutWallet as ReturnType<typeof vi.fn>).mockImplementation(async () => {
      (getSessionInfo as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (getSignedInWallet as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    });

    // Integration wrapper matching Providers.tsx structure
    function IntegrationBridge({ children }: { children: React.ReactNode }) {
      const { refresh, clearSession } = useSession();
      useQuizAuth({
        onSyncSession: refresh,
        onSignOut: clearSession,
      });
      return <>{children}</>;
    }

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SessionProvider>
        <IntegrationBridge>{children}</IntegrationBridge>
      </SessionProvider>
    );

    function useCombined() {
      const session = useSession();
      const quiz = useQuizLogic();
      return { session, quiz };
    }

    const { result, rerender } = renderHook(() => useCombined(), { wrapper });

    await waitFor(() => {
      expect(result.current.session.account?.id).toBe('acc-wallet-a');
      expect(result.current.quiz.stats.score).toBe(15);
      expect(result.current.quiz.history).toHaveLength(2);
      expect(result.current.quiz.claimableRewards).not.toBeNull();
    });

    // 2. Disconnect in Wagmi provider (without manually calling clearSession!)
    accountMock.mockReturnValue({
      address: undefined,
      isConnected: false,
      status: 'disconnected',
    });
    rerender();

    // 3. Verify automatic cascade from useQuizAuth -> signOutWallet & clearSession -> useQuizLogic reset
    await waitFor(() => {
      expect(signOutWallet).toHaveBeenCalled();
      expect(result.current.session.account).toBeNull();
      expect(result.current.quiz.stats.score).toBe(0);
      expect(result.current.quiz.history).toEqual([]);
      expect(result.current.quiz.claimableRewards).toBeNull();
      expect(result.current.quiz.hasClaimableRewards).toBe(false);
    });
  });

  it('multiple concurrent requireSignIn calls all settle when sign-in completes or clearSession is called', async () => {
    (getSessionInfo as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SessionProvider>{children}</SessionProvider>
    );

    const { result } = renderHook(() => useSession(), { wrapper });

    // Initial session is unauthenticated
    await waitFor(() => {
      expect(result.current.account).toBeNull();
    });

    // Case 1: Two callers invoke requireSignIn concurrently
    let p1Settled = false;
    let p2Settled = false;

    const p1 = result.current.requireSignIn().then((res) => {
      p1Settled = true;
      return res;
    });
    const p2 = result.current.requireSignIn().then((res) => {
      p2Settled = true;
      return res;
    });

    // Flush microtasks so requireSignIn's internal check completes and registers resolvers
    await act(async () => {
      await Promise.resolve();
    });

    // Now user successfully signs in
    (getSessionInfo as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'acc-multi',
      wallet: WALLET_A,
    });

    await act(async () => {
      await result.current.refresh();
    });

    const [res1, res2] = await Promise.all([p1, p2]);
    expect(res1).toBe(true);
    expect(res2).toBe(true);
    expect(p1Settled).toBe(true);
    expect(p2Settled).toBe(true);

    // Case 2: Concurrent callers settle false on clearSession
    (getSessionInfo as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    await act(async () => {
      result.current.clearSession();
    });

    let p3Settled = false;
    let p4Settled = false;
    const p3 = result.current.requireSignIn().then((res) => {
      p3Settled = true;
      return res;
    });
    const p4 = result.current.requireSignIn().then((res) => {
      p4Settled = true;
      return res;
    });

    // Flush microtasks so resolvers are registered before clearing
    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      result.current.clearSession();
    });

    const [res3, res4] = await Promise.all([p3, p4]);
    expect(res3).toBe(false);
    expect(res4).toBe(false);
    expect(p3Settled).toBe(true);
    expect(p4Settled).toBe(true);
  });
});
