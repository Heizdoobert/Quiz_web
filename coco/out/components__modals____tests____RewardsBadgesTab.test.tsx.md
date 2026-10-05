# components/modals/__tests__/RewardsBadgesTab.test.tsx
lines:69 exports:
---
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { RewardsBadgesTab } from '../rewards/RewardsBadgesTab';
import { ClaimableRewards } from '@/lib/types';

describe('RewardsBadgesTab', () => {
  const mockRewards: ClaimableRewards = {
    totalEarned: '0',
    totalClaimed: '0',
    claimableTokens: '0',
    eligibleBadges: [1],
    alreadyClaimedBadges: [0],
  };

  it('renders badges in correct states', () => {
    render(
      <RewardsBadgesTab
        rewards={mockRewards}
        claimStep="idle"
        claimError={null}
        explorerUrl={null}
        mintingBadge={null}
        isWrongChain={false}
        isGasless={false}
        handleMintBadge={vi.fn()}
      />
    );
    expect(screen.getByText('Claimed')).toBeTruthy();
    expect(screen.getByText('Eligible')).toBeTruthy();
    expect(screen.getAllByText('Locked').length).toBe(2);
    expect(screen.getByText('Mint Badge')).toBeTruthy();
  });

  it('disables mint button on wrong chain', () => {
    render(
      <RewardsBadgesTab
        rewards={mockRewards}
        claimStep="idle"
        claimError={null}
        explorerUrl={null}
