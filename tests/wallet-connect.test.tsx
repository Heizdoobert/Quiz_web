import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React from 'react';
import WalletConnect from '../components/wallet/WalletConnect';
import { WalletHostContext } from '../components/wallet/host-context';

const openConnectModal = vi.fn();
let modalAvailable = true;
vi.mock('@rainbow-me/rainbowkit', () => ({
  ConnectButton: ({ label }: { label: string }) => <button>{label}</button>,
  useConnectModal: () => ({ openConnectModal: modalAvailable ? openConnectModal : undefined }),
}));
vi.mock('../components/wallet/WalletProviders', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="wallet-stack">{children}</div>
  ),
}));

describe('WalletConnect', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    openConnectModal.mockClear();
    modalAvailable = true;
  });
  afterEach(() => vi.useRealTimers());

  it('renders only the connect button when the wallet stack is already mounted', () => {
    render(
      <WalletHostContext.Provider value={true}>
        <WalletConnect label="Connect" />
      </WalletHostContext.Provider>
    );
    expect(screen.getByText('Connect')).toBeTruthy();
    expect(screen.queryByTestId('wallet-stack')).toBeNull();
    act(() => void vi.advanceTimersByTime(1000));
    expect(openConnectModal).not.toHaveBeenCalled();
  });

  it('brings up its own wallet stack and opens the connect modal once', () => {
    const { rerender } = render(<WalletConnect label="Connect" />);
    expect(screen.getByTestId('wallet-stack')).toBeTruthy();
    expect(openConnectModal).not.toHaveBeenCalled();
    act(() => void vi.advanceTimersByTime(300));
    expect(openConnectModal).toHaveBeenCalledTimes(1);
    rerender(<WalletConnect label="Connect" />);
    act(() => void vi.advanceTimersByTime(1000));
    expect(openConnectModal).toHaveBeenCalledTimes(1);
  });

  it('waits while the modal is not available yet', () => {
    modalAvailable = false;
    render(<WalletConnect label="Connect" />);
    act(() => void vi.advanceTimersByTime(1000));
    expect(openConnectModal).not.toHaveBeenCalled();
  });
});
