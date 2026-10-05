# tests/no-wallet-rewards-ui.test.tsx
lines:91 exports:
---
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
