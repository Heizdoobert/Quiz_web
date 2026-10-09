import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import ProfileModal from '../components/modals/ProfileModal';
import { UserStats } from '../lib/types';

describe('ProfileModal', () => {
  const stats: UserStats = {
    score: 100,
    totalAnswered: 10,
    accuracy: 90,
    streak: 3,
    bestStreak: 5,
  };

  it('renders the Creator Dashboard link', () => {
    render(<ProfileModal isOpen={true} onClose={() => {}} stats={stats} />);

    expect(screen.getByText('Creator Dashboard & Backups')).toBeDefined();
  });

  it('shows the score stats and rank, with nothing wallet or reward related', () => {
    render(<ProfileModal isOpen={true} onClose={() => {}} stats={stats} />);

    expect(screen.getByText('100')).toBeDefined();
    expect(screen.getByText('90%')).toBeDefined();
    expect(screen.getByText('Cadet')).toBeDefined();
    expect(screen.queryByText(/wallet|\$QUIZ|On-Chain/i)).toBeNull();
  });
});
