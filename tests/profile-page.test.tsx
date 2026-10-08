import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import ProfilePage from '../app/profile/page';

// Hoist mock setup
vi.mock('../hooks/shared/use-session', () => ({
  useSession: vi.fn(),
}));

import { useSession } from '../hooks/shared/use-session';
import { getUserQuizzes } from '../lib/actions/profile-actions';

// Mock Header
vi.mock('../components/layout/Header', () => ({
  default: () => <div data-testid="header-mock" />
}));

// Mock actions
vi.mock('../lib/actions/profile-actions', () => ({
  getUserQuizzes: vi.fn(),
  exportUserData: vi.fn(),
  getQuestionAnalytics: vi.fn().mockResolvedValue({ success: true, data: [] }),
}));

vi.mock('../lib/actions/community-actions', () => ({
  getSuggestionsForAuthor: vi.fn().mockResolvedValue([]),
  resolveSuggestion: vi.fn().mockResolvedValue({ ok: true }),
}));

import { getSuggestionsForAuthor, resolveSuggestion } from '../lib/actions/community-actions';

function mockSignedInAs(wallet: string | null) {
  (useSession as import("vitest").Mock).mockReturnValue({
    account: { id: 'acct-1', wallet },
    refresh: vi.fn(),
    requireSignIn: async () => true,
  });
}

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Access Denied when signed out', () => {
    (useSession as import("vitest").Mock).mockReturnValue({
      account: null,
      refresh: vi.fn(),
      requireSignIn: async () => true,
    });

    render(<ProfilePage />);

    expect(screen.getByText('Access Denied')).toBeDefined();
  });

  it('renders empty state for a wallet account with no quizzes', async () => {
    mockSignedInAs('0x123');
    (getUserQuizzes as import("vitest").Mock).mockResolvedValue({ success: true, quizzes: [] });

    render(<ProfilePage />);

    const emptyState = await screen.findByText('No Quizzes Created');
    expect(emptyState).toBeDefined();
  });

  it('renders empty state for a signed-in email account with no wallet, without spinning forever', async () => {
    mockSignedInAs(null);

    render(<ProfilePage />);

    const emptyState = await screen.findByText('No Quizzes Created');
    expect(emptyState).toBeDefined();
    expect(getUserQuizzes as import("vitest").Mock).not.toHaveBeenCalled();
  });

  it('renders quizzes and backup button when quizzes are present', async () => {
    mockSignedInAs('0x123');
    (getUserQuizzes as import("vitest").Mock).mockResolvedValue({ success: true, quizzes: [{ id: '1', prompt: 'First Quiz' }] });

    render(<ProfilePage />);

    const quizText = await screen.findByText('First Quiz');
    expect(quizText).toBeDefined();

    expect(screen.getByText('Backup Data')).toBeDefined();
  });

  it('renders error recovery state with retry button when fetching quizzes fails', async () => {
    mockSignedInAs('0x123');
    (getUserQuizzes as import("vitest").Mock).mockResolvedValue({
      success: false,
      error: 'Network timeout loading quizzes',
      code: 'FETCH_FAILED',
    });

    render(<ProfilePage />);

    const errorHeading = await screen.findByText('Failed to Load Quizzes');
    expect(errorHeading).toBeDefined();
    expect(screen.getByText('Network timeout loading quizzes')).toBeDefined();
    expect(screen.getByRole('button', { name: /retry/i })).toBeDefined();
    expect(screen.queryByText('No Quizzes Created')).toBeNull();
  });

  it('recovers and displays quizzes when user clicks retry button', async () => {
    mockSignedInAs('0x123');
    const mockGetUserQuizzes = getUserQuizzes as import("vitest").Mock;

    mockGetUserQuizzes
      .mockResolvedValueOnce({
        success: false,
        error: 'Network glitch',
        code: 'FETCH_FAILED',
      })
      .mockResolvedValueOnce({
        success: true,
        quizzes: [{ id: '99', prompt: 'Recovered Quiz' }],
        count: 1,
      });

    render(<ProfilePage />);

    const retryBtn = await screen.findByRole('button', { name: /retry/i });
    expect(retryBtn).toBeDefined();

    fireEvent.click(retryBtn);

    const recoveredQuiz = await screen.findByText('Recovered Quiz');
    expect(recoveredQuiz).toBeDefined();
    expect(screen.queryByText('Failed to Load Quizzes')).toBeNull();
  });

  it('triggers backup data download on export button click', async () => {
    mockSignedInAs('0x123');
    (getUserQuizzes as import("vitest").Mock).mockResolvedValue({
      success: true,
      quizzes: [{ id: '1', prompt: 'Sample Quiz' }],
      count: 1,
    });

    const { exportUserData } = await import('../lib/actions/profile-actions');
    (exportUserData as import("vitest").Mock).mockResolvedValueOnce({
      success: true,
      data: {
        walletAddress: '0x123',
        exportedAt: new Date().toISOString(),
        version: '1.0',
        quizzes: [],
        stats: [],
      },
    });

    // Mock DOM URL methods
    const createObjectURLMock = vi.fn().mockReturnValue('blob:mock-url');
    const revokeObjectURLMock = vi.fn();
    window.URL.createObjectURL = createObjectURLMock;
    window.URL.revokeObjectURL = revokeObjectURLMock;

    render(<ProfilePage />);

    const backupBtn = await screen.findByRole('button', { name: /backup.*data/i });
    fireEvent.click(backupBtn);

    const successIndicator = await screen.findByText('Backup Downloaded');
    expect(successIndicator).toBeDefined();
    expect(createObjectURLMock).toHaveBeenCalled();
  });

  it('displays error banner when export fails and allows user to dismiss it', async () => {
    mockSignedInAs('0x123');
    (getUserQuizzes as import("vitest").Mock).mockResolvedValue({
      success: true,
      quizzes: [{ id: '1', prompt: 'Sample Quiz' }],
      count: 1,
    });

    const { exportUserData } = await import('../lib/actions/profile-actions');
    (exportUserData as import("vitest").Mock).mockResolvedValueOnce({
      success: false,
      error: 'Export rate limit reached',
      code: 'EXPORT_FAILED',
    });

    render(<ProfilePage />);

    const backupBtn = await screen.findByRole('button', { name: /backup.*data/i });
    fireEvent.click(backupBtn);

    const errorAlert = await screen.findByText('Export rate limit reached');
    expect(errorAlert).toBeDefined();

    // Dismiss error
    const dismissBtn = screen.getByRole('button', { name: /dismiss/i });
    fireEvent.click(dismissBtn);

    expect(screen.queryByText('Export rate limit reached')).toBeNull();
  });

  it('fetches new quizzes and resets state when the signed-in account changes', async () => {
    const mockGetUserQuizzes = getUserQuizzes as import("vitest").Mock;

    mockSignedInAs('0x1111111111111111111111111111111111111111');
    mockGetUserQuizzes.mockResolvedValueOnce({
      success: true,
      quizzes: [{ id: 'q1', prompt: 'First Account Quiz' }],
      count: 1,
    });

    const { rerender } = render(<ProfilePage />);
    expect(await screen.findByText('First Account Quiz')).toBeDefined();

    mockGetUserQuizzes.mockResolvedValueOnce({
      success: true,
      quizzes: [{ id: 'q2', prompt: 'Second Account Quiz' }],
      count: 1,
    });

    mockSignedInAs('0x2222222222222222222222222222222222222222');
    rerender(<ProfilePage />);

    expect(await screen.findByText('Second Account Quiz')).toBeDefined();
    expect(screen.queryByText('First Account Quiz')).toBeNull();
  });

  it('renders suggestions for author questions and allows marking them done', async () => {
    mockSignedInAs('0x123');
    (getUserQuizzes as import("vitest").Mock).mockResolvedValue({ success: true, quizzes: [] });
    (getSuggestionsForAuthor as import("vitest").Mock).mockResolvedValue([
      {
        id: 'sugg-1',
        questionId: 'q-1',
        prompt: 'What is DeFi?',
        body: 'Typo in option 2',
        senderName: 'Carol',
        createdAt: new Date().toISOString(),
        resolvedAt: null,
      },
    ]);
    (resolveSuggestion as import("vitest").Mock).mockResolvedValue({ ok: true });

    render(<ProfilePage />);

    expect(await screen.findByText('Suggestions for your questions')).toBeDefined();
    expect(screen.getByText('What is DeFi?')).toBeDefined();
    expect(screen.getByText('Typo in option 2')).toBeDefined();
    expect(screen.getByText(/Carol/)).toBeDefined();

    const markDoneBtn = screen.getByRole('button', { name: /mark done/i });
    fireEvent.click(markDoneBtn);

    await waitFor(() => {
      expect(resolveSuggestion).toHaveBeenCalledWith('sugg-1');
      expect(screen.queryByText('Typo in option 2')).toBeNull();
    });
  });
});

