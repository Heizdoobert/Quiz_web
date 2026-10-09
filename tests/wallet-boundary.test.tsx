import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { WalletBoundary } from '../components/WalletBoundary';
import Header from '../components/layout/Header';
import { WalletHostContext } from '../components/wallet/host-context';

let pathname = '/';
vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));
vi.mock('../components/wallet/WalletProviders', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="wallet-stack">{children}</div>
  ),
}));
vi.mock('../components/wallet/WalletConnect', () => ({
  default: ({ label }: { label: string }) => <div data-testid="wallet-connect">{label}</div>,
}));
vi.mock('../hooks/shared/use-session', () => ({
  useSession: () => ({ account: null }),
}));
vi.mock('../components/discovery/SearchBox', () => ({ default: () => null }));

describe('WalletBoundary', () => {
  beforeEach(() => {
    pathname = '/';
  });

  it.each(['/', '/q/abc', '/contest', '/my-lists', '/review', '/profile', '/some-new-route'])(
    'mounts the wallet stack on %s',
    async (path) => {
      pathname = path;
      render(
        <WalletBoundary>
          <p>page</p>
        </WalletBoundary>
      );
      const stack = await screen.findByTestId('wallet-stack');
      expect(stack.textContent).toContain('page');
    }
  );

  it.each(['/topics', '/topics/defi', '/search'])('skips the wallet stack on %s', (path) => {
    pathname = path;
    render(
      <WalletBoundary>
        <p>page</p>
      </WalletBoundary>
    );
    expect(screen.getByText('page')).toBeTruthy();
    expect(screen.queryByTestId('wallet-stack')).toBeNull();
  });
});

describe('Header connect button', () => {
  it('shows a plain button without loading the wallet stack, then loads it on click', async () => {
    render(<Header />);
    expect(screen.queryByTestId('wallet-connect')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Connect' }));
    expect((await screen.findByTestId('wallet-connect')).textContent).toBe('Connect');
  });

  it('renders the wallet connect button right away below the wallet stack', async () => {
    render(
      <WalletHostContext.Provider value={true}>
        <Header />
      </WalletHostContext.Provider>
    );
    expect(await screen.findByTestId('wallet-connect')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Connect' })).toBeNull();
  });
});
