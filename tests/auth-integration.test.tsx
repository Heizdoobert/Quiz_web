import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { SessionProvider, useSession } from '../hooks/shared/use-session';
import { getSessionInfo } from '../lib/actions/auth-actions';

vi.mock('../lib/actions/auth-actions', () => ({
  getSessionInfo: vi.fn(),
}));

vi.mock('../components/auth/AuthPopup', () => ({
  default: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
    isOpen ? (
      <div data-testid="sign-in-modal">
        <button type="button" onClick={onClose}>
          Cancel
        </button>
      </div>
    ) : null,
}));

const ACCOUNT = { id: 'acct-1', wallet: '0x' + 'a'.repeat(40) };

function TestConsumer({ onResult }: { onResult: (ok: boolean) => void }) {
  const { account, requireSignIn, refresh } = useSession();
  return (
    <div>
      <span data-testid="account">{account ? account.id : 'none'}</span>
      <button type="button" onClick={() => void requireSignIn().then(onResult)}>
        Require sign in
      </button>
      <button type="button" onClick={() => void refresh()}>
        Refresh
      </button>
    </div>
  );
}

describe('SessionProvider / useSession', () => {
  const getSessionInfoMock = getSessionInfo as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('requireSignIn resolves true immediately when already signed in', async () => {
    getSessionInfoMock.mockResolvedValue(ACCOUNT);
    const onResult = vi.fn();

    render(
      <SessionProvider>
        <TestConsumer onResult={onResult} />
      </SessionProvider>
    );

    await waitFor(() => expect(screen.getByTestId('account').textContent).toBe('acct-1'));
    fireEvent.click(screen.getByText('Require sign in'));

    await waitFor(() => expect(onResult).toHaveBeenCalledWith(true));
    expect(screen.queryByTestId('sign-in-modal')).toBeNull();
  });

  it('opens SignInModal when signed out, and resolves true once a session appears', async () => {
    getSessionInfoMock.mockResolvedValue(null);
    const onResult = vi.fn();

    render(
      <SessionProvider>
        <TestConsumer onResult={onResult} />
      </SessionProvider>
    );

    await waitFor(() => expect(screen.getByTestId('account').textContent).toBe('none'));
    fireEvent.click(screen.getByText('Require sign in'));

    await waitFor(() => expect(screen.getByTestId('sign-in-modal')).toBeDefined());
    expect(onResult).not.toHaveBeenCalled();

    // Simulate the wallet's auto sign-in completing elsewhere and Providers.tsx
    // reacting by calling refresh() — here done directly via the test consumer.
    getSessionInfoMock.mockResolvedValue(ACCOUNT);
    fireEvent.click(screen.getByText('Refresh'));

    await waitFor(() => expect(onResult).toHaveBeenCalledWith(true));
    expect(screen.queryByTestId('sign-in-modal')).toBeNull();
  });

  it('resolves false and closes the modal when the player cancels sign-in', async () => {
    getSessionInfoMock.mockResolvedValue(null);
    const onResult = vi.fn();

    render(
      <SessionProvider>
        <TestConsumer onResult={onResult} />
      </SessionProvider>
    );

    await waitFor(() => expect(screen.getByTestId('account').textContent).toBe('none'));
    fireEvent.click(screen.getByText('Require sign in'));
    await waitFor(() => expect(screen.getByTestId('sign-in-modal')).toBeDefined());

    fireEvent.click(screen.getByText('Cancel'));

    await waitFor(() => expect(onResult).toHaveBeenCalledWith(false));
    expect(screen.queryByTestId('sign-in-modal')).toBeNull();
  });
});
