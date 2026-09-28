import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import ProfilePage from '../app/profile/page';

// Hoist mock setup
vi.mock('wagmi', () => {
  const useAccountMock = vi.fn();
  return {
    useAccount: useAccountMock,
  };
});

import { useAccount } from 'wagmi';
import { getUserQuizzes } from '../lib/actions/profile-actions';

// Mock Header
vi.mock('../components/layout/Header', () => ({
  default: () => <div data-testid="header-mock" />
}));

// Mock actions
vi.mock('../lib/actions/profile-actions', () => ({
  getUserQuizzes: vi.fn(),
  exportUserData: vi.fn(),
}));



describe('ProfilePage', () => {
  it('renders Access Denied when wallet is disconnected', () => {
    (useAccount as import("vitest").Mock).mockReturnValue({ isConnected: false, address: undefined });

    render(<ProfilePage />);

    expect(screen.getByText('Access Denied')).toBeDefined();
  });

  it('renders loading state then empty state for connected wallet with no quizzes', async () => {
    (useAccount as import("vitest").Mock).mockReturnValue({ isConnected: true, address: '0x123' });
    (getUserQuizzes as import("vitest").Mock).mockResolvedValue({ success: true, quizzes: [] });

    render(<ProfilePage />);

    const emptyState = await screen.findByText('No Quizzes Created');
    expect(emptyState).toBeDefined();
  });

  it('renders quizzes and backup button when quizzes are present', async () => {
    (useAccount as import("vitest").Mock).mockReturnValue({ isConnected: true, address: '0x123' });
    (getUserQuizzes as import("vitest").Mock).mockResolvedValue({ success: true, quizzes: [{ id: '1', prompt: 'First Quiz' }] });

    render(<ProfilePage />);

    const quizText = await screen.findByText('First Quiz');
    expect(quizText).toBeDefined();

    expect(screen.getByText('Backup Data')).toBeDefined();
  });

  it('renders error recovery state with retry button when fetching quizzes fails', async () => {
    (useAccount as import("vitest").Mock).mockReturnValue({ isConnected: true, address: '0x123' });
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
    (useAccount as import("vitest").Mock).mockReturnValue({ isConnected: true, address: '0x123' });
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
    (useAccount as import("vitest").Mock).mockReturnValue({ isConnected: true, address: '0x123' });
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
    (useAccount as import("vitest").Mock).mockReturnValue({ isConnected: true, address: '0x123' });
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

  it('fetches new quizzes and resets state when wallet address changes', async () => {
    const mockUseAccount = useAccount as import("vitest").Mock;
    const mockGetUserQuizzes = getUserQuizzes as import("vitest").Mock;

    mockUseAccount.mockReturnValue({ isConnected: true, address: '0x1111111111111111111111111111111111111111' });
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

    mockUseAccount.mockReturnValue({ isConnected: true, address: '0x2222222222222222222222222222222222222222' });
    rerender(<ProfilePage />);

    expect(await screen.findByText('Second Account Quiz')).toBeDefined();
    expect(screen.queryByText('First Account Quiz')).toBeNull();
  });
});
