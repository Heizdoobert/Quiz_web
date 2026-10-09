'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';

// Loaded on demand so routes that skip it do not ship wagmi, viem and RainbowKit.
const WalletProviders = dynamic(() => import('@/components/wallet/WalletProviders'));

// Routes that render no wallet UI and call no wagmi hook. Everything else gets the wallet
// stack, so a new route works by default and only opts out here.
const NO_WALLET_ROUTES = /^\/(topics|search)(\/|$)/;

export function WalletBoundary({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (NO_WALLET_ROUTES.test(pathname)) return <>{children}</>;
  return <WalletProviders>{children}</WalletProviders>;
}
