import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import ListQuestionEditor from '../components/lists/ListQuestionEditor';
import TimerSettingsModal from '../components/modals/TimerSettingsModal';
import { RewardsTokensTab } from '../components/modals/rewards/RewardsTokensTab';
import type { ClaimableRewards } from '../lib/types';

describe('list question editor', () => {
  it('names every input and announces a failed submit', async () => {
    const onSubmit = vi.fn().mockResolvedValue({ success: false, error: 'Explanation is too short.' });
    render(<ListQuestionEditor submitLabel="Add question" onSubmit={onSubmit} onDone={vi.fn()} />);

    expect(screen.getByLabelText(/Question Prompt/)).toBeTruthy();
    expect(screen.getByLabelText('Category')).toBeTruthy();
    expect(screen.getByLabelText(/Explanation/)).toBeTruthy();
    for (const letter of ['A', 'B', 'C', 'D']) {
      expect(screen.getByLabelText(`Option ${letter} text`)).toBeTruthy();
      expect(screen.getByLabelText(`Mark option ${letter} as correct`)).toBeTruthy();
    }

    fireEvent.change(screen.getByLabelText(/Question Prompt/), { target: { value: 'What is CSS?' } });
    for (const letter of ['A', 'B', 'C', 'D']) {
      fireEvent.change(screen.getByLabelText(`Option ${letter} text`), { target: { value: letter } });
    }
    fireEvent.change(screen.getByLabelText(/Explanation/), { target: { value: 'short' } });
    fireEvent.click(screen.getByText('Add question'));

    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Explanation is too short.'));
  });
});

describe('timer settings modal', () => {
  it('labels the mode and time-limit controls', () => {
    render(
      <TimerSettingsModal isOpen onClose={vi.fn()} currentMode="per-question" currentDuration={30} onSave={vi.fn()} />
    );
    expect(screen.getByLabelText('Timer Mode')).toBeTruthy();
    expect(screen.getByLabelText(/Time Limit/)).toBeTruthy();
  });
});

describe('rewards tokens tab', () => {
  it('announces a claim error', () => {
    const rewards = {
      totalEarned: '10',
      totalClaimed: '0',
      claimableTokens: '10',
      eligibleBadges: [],
      alreadyClaimedBadges: [],
    } as ClaimableRewards;
    render(
      <RewardsTokensTab
        rewards={rewards}
        claimStep="error"
        claimError="Claim failed."
        explorerUrl={null}
        mintingBadge={null}
        isWrongChain={false}
        isGasless={false}
        formatTokens={(v) => v}
        handleClaimTokens={vi.fn()}
      />
    );
    expect(screen.getByRole('alert').textContent).toContain('Claim failed.');
  });
});
