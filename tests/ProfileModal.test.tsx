import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import ProfileModal from '../components/modals/ProfileModal';
import { UserStats, ClaimableRewards } from '../lib/types';

describe('ProfileModal', () => {
  it('renders the Creator Dashboard link', () => {
    const stats: UserStats = {
      score: 100,
      totalAnswered: 10,
      accuracy: 90,
      streak: 3,
      bestStreak: 5,
    };

    const claimableRewards: ClaimableRewards = {
      claimableTokens: '0',
      eligibleBadges: [],
      alreadyClaimedBadges: [],
      totalEarned: '0',
      totalClaimed: '0',
    };

    render(
      <ProfileModal
        isOpen={true}
        onClose={() => {}}
        onOpenRewards={() => {}}
        address="0x123"
        claimableRewards={claimableRewards}
        stats={stats}
      />
    );

    expect(screen.getByText('Creator Dashboard & Backups')).toBeDefined();
  });
});
