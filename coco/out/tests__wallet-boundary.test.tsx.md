# tests/wallet-boundary.test.tsx
lines:74 exports:
---
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
