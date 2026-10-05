# components/modals/__tests__/RewardsTokensTab.test.tsx
lines:93 exports:
---
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { RewardsTokensTab } from '../rewards/RewardsTokensTab';
import { ClaimableRewards } from '@/lib/types';

describe('RewardsTokensTab', () => {
  const mockRewards: ClaimableRewards = {
    totalEarned: '2000',
    totalClaimed: '1000',
    claimableTokens: '1000',
    eligibleBadges: [],
    alreadyClaimedBadges: [],
  };

  const formatTokens = (val: string) => `${val} TKN`;

  it('renders token amounts correctly', () => {
    render(
      <RewardsTokensTab
        rewards={mockRewards}
        claimStep="idle"
        claimError={null}
        explorerUrl={null}
        mintingBadge={null}
        isWrongChain={false}
        isGasless={true}
        formatTokens={formatTokens}
        handleClaimTokens={vi.fn()}
      />
    );
    expect(screen.getByText('2000 TKN')).toBeTruthy();
    expect(screen.getByText('1000 TKN')).toBeTruthy();
    expect(screen.getByText('Claim 1000 TKN (Gasless)')).toBeTruthy();
  });

  it('renders done state', () => {
    render(
      <RewardsTokensTab
        rewards={mockRewards}
        claimStep="done"
