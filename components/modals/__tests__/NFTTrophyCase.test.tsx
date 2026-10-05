import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { NFTTrophyCase } from '../profile/NFTTrophyCase';
import { ClaimableRewards } from '@/lib/types';

describe('NFTTrophyCase', () => {
  it('renders all badges in locked state when claimableRewards is null', () => {
    render(
      <NFTTrophyCase claimableRewards={null} onOpenRewards={vi.fn()} onClose={vi.fn()} />
    );
    // 4 locked badges
    const lockedLabels = screen.getAllByText('Locked');
    expect(lockedLabels.length).toBe(4);
    expect(screen.getByText('0 / 4 Minted')).toBeTruthy();
  });

  it('renders minted and eligible badges correctly', () => {
    const mockRewards: ClaimableRewards = {
      eligibleBadges: [1],
      alreadyClaimedBadges: [0],
      totalTokensMinted: '0',
    };

    render(
      <NFTTrophyCase claimableRewards={mockRewards} onOpenRewards={vi.fn()} onClose={vi.fn()} />
    );

    expect(screen.getByText('1 / 4 Minted')).toBeTruthy();
    expect(screen.getByText('Minted')).toBeTruthy();
    expect(screen.getByText('Mint Now')).toBeTruthy();
    expect(screen.getAllByText('Locked').length).toBe(2);
  });

  it('handles Mint Now click', () => {
    const mockRewards: ClaimableRewards = {
      eligibleBadges: [2],
      alreadyClaimedBadges: [],
      totalTokensMinted: '0',
    };

    const openMock = vi.fn();
    const closeMock = vi.fn();

    render(
      <NFTTrophyCase claimableRewards={mockRewards} onOpenRewards={openMock} onClose={closeMock} />
    );

    const mintBtn = screen.getByText('Mint Now');
    fireEvent.click(mintBtn);

    expect(closeMock).toHaveBeenCalled();
    expect(openMock).toHaveBeenCalled();
  });
});
