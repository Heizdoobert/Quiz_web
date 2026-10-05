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
    totalTokensMinted: '0',
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
        claimError={null}
        explorerUrl="https://basescan.org"
        mintingBadge={null}
        isWrongChain={false}
        isGasless={false}
        formatTokens={formatTokens}
        handleClaimTokens={vi.fn()}
      />
    );
    expect(screen.getByText(/Tokens claimed successfully/i)).toBeTruthy();
    expect(screen.getByText('View on BaseScan')).toBeTruthy();
  });

  it('handles claim button click', () => {
    const handleClaim = vi.fn();
    render(
      <RewardsTokensTab
        rewards={mockRewards}
        claimStep="idle"
        claimError={null}
        explorerUrl={null}
        mintingBadge={null}
        isWrongChain={false}
        isGasless={false}
        formatTokens={formatTokens}
        handleClaimTokens={handleClaim}
      />
    );
    
    const claimBtn = screen.getByText('Claim 1000 TKN');
    fireEvent.click(claimBtn);
    expect(handleClaim).toHaveBeenCalled();
  });

  it('disables button on wrong chain', () => {
    render(
      <RewardsTokensTab
        rewards={mockRewards}
        claimStep="idle"
        claimError={null}
        explorerUrl={null}
        mintingBadge={null}
        isWrongChain={true}
        isGasless={false}
        formatTokens={formatTokens}
        handleClaimTokens={vi.fn()}
      />
    );
    
    const claimBtn = screen.getByRole('button');
    expect((claimBtn as HTMLButtonElement).disabled).toBe(true);
  });
});
