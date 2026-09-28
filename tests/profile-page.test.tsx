import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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
    (useAccount as any).mockReturnValue({ isConnected: false, address: undefined });

    render(<ProfilePage />);

    expect(screen.getByText('Access Denied')).toBeDefined();
  });

  it('renders loading state then empty state for connected wallet with no quizzes', async () => {
    (useAccount as any).mockReturnValue({ isConnected: true, address: '0x123' });
    (getUserQuizzes as any).mockResolvedValue({ success: true, quizzes: [] });

    render(<ProfilePage />);

    const emptyState = await screen.findByText('No Quizzes Created');
    expect(emptyState).toBeDefined();
  });

  it('renders quizzes and backup button when quizzes are present', async () => {
    (useAccount as any).mockReturnValue({ isConnected: true, address: '0x123' });
    (getUserQuizzes as any).mockResolvedValue({ success: true, quizzes: [{ id: '1', prompt: 'First Quiz' }] });

    render(<ProfilePage />);

    const quizText = await screen.findByText('First Quiz');
    expect(quizText).toBeDefined();

    expect(screen.getByText('Backup Data')).toBeDefined();
  });
});
