import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import Header from '../components/layout/Header';
import ContestBrowser from '../components/lists/ContestBrowser';
import RewardsModal from '../components/modals/RewardsModal';
import { NO_WALLET_DISCLOSURE } from '../lib/constants/rewards-copy';

vi.mock('@rainbow-me/rainbowkit', () => ({
  ConnectButton: ({ label }: { label?: string }) => <button type="button">{label}</button>,
}));

vi.mock('../hooks/shared/use-session', () => ({ useSession: vi.fn() }));
import { useSession } from '../hooks/shared/use-session';

vi.mock('../hooks/modals/use-rewards-modal', () => ({ useRewardsModal: vi.fn() }));
import { useRewardsModal } from '../hooks/modals/use-rewards-modal';

vi.mock('../lib/actions/question-list-actions', () => ({
  getLiveLists: vi.fn().mockResolvedValue([
    { id: 'l1', title: 'DeFi basics', questionCount: 5, perQuestionReward: '1000000000000000000' },
  ]),
  getMyContestEntries: vi.fn().mockResolvedValue([]),
  getClaimableContests: vi.fn().mockResolvedValue([]),
  getContestAnalytics: vi.fn().mockResolvedValue({ success: true, data: { participation_count: 0, completion_rate: 0, avg_score: 0 } }),
}));

const EMAIL_ACCOUNT = { id: 'acc-1', wallet: null };
const WALLET_ACCOUNT = { id: 'acc-2', wallet: '0xabc' };
const THIRTY_QUIZ = (BigInt(30) * BigInt(10) ** BigInt(18)).toString();

function signedInAs(account: typeof EMAIL_ACCOUNT | typeof WALLET_ACCOUNT) {
  (useSession as ReturnType<typeof vi.fn>).mockReturnValue({ account, refresh: vi.fn(), requireSignIn: vi.fn() });
}

describe('no-wallet rewards disclosure', () => {
  beforeEach(() => vi.clearAllMocks());

  it('header shows the disclosure and held amount for an account without a wallet', () => {
    signedInAs(EMAIL_ACCOUNT);
    render(<Header heldTokens={THIRTY_QUIZ} sweepsAt="2027-03-01T00:00:00.000Z" />);
    expect(screen.getByText(NO_WALLET_DISCLOSURE)).toBeTruthy();
    expect(screen.getByText('30 $QUIZ')).toBeTruthy();
    expect(screen.getByText('Add wallet')).toBeTruthy();
  });

  it('header shows no disclosure for a wallet account', () => {
    signedInAs(WALLET_ACCOUNT);
    render(<Header />);
    expect(screen.queryByText(NO_WALLET_DISCLOSURE)).toBeNull();
    expect(screen.getByText('Connect')).toBeTruthy();
  });

  it('RewardsModal shows held $QUIZ, the disclosure and "Add wallet" instead of a claim button', () => {
    (useRewardsModal as ReturnType<typeof vi.fn>).mockReturnValue({
      tab: 'tokens',
      setTab: vi.fn(),
      rewards: { claimableTokens: '0', heldTokens: THIRTY_QUIZ, sweepsAt: null, eligibleBadges: [], alreadyClaimedBadges: [], totalEarned: THIRTY_QUIZ, totalClaimed: '0' },
      hasNoWallet: true,
      loading: false,
      claimStep: 'idle',
      claimError: null,
      mintingBadge: null,
      isWrongChain: false,
      isGasless: false,
      handleSwitchChain: vi.fn(),
      handleClaimTokens: vi.fn(),
      handleMintBadge: vi.fn(),
      formatTokens: () => '0',
      explorerUrl: null,
      targetChainName: 'Base Sepolia',
    });
    render(<RewardsModal isOpen onClose={vi.fn()} walletAddress={null} />);
    expect(screen.getByText(NO_WALLET_DISCLOSURE)).toBeTruthy();
    expect(screen.getByText('30 $QUIZ')).toBeTruthy();
    expect(screen.getByText('Add wallet')).toBeTruthy();
    expect(screen.queryByText(/^Claim /)).toBeNull();
  });

  it('contest list asks an account without a wallet to add one instead of Play', async () => {
    signedInAs(EMAIL_ACCOUNT);
    render(<ContestBrowser />);
    await waitFor(() => expect(screen.getByText('Add a wallet to join contests')).toBeTruthy());
    expect(screen.queryByText('Play')).toBeNull();
  });

  it('contest list shows Play for a wallet account', async () => {
    signedInAs(WALLET_ACCOUNT);
    render(<ContestBrowser />);
    await waitFor(() => expect(screen.getByText('Play')).toBeTruthy());
  });
});
