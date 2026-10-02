'use client';

import '@rainbow-me/rainbowkit/styles.css';
import {
  getDefaultConfig,
  RainbowKitProvider,
  RainbowKitAuthenticationProvider,
  darkTheme,
} from '@rainbow-me/rainbowkit';
import {
  coinbaseWallet,
  rainbowWallet,
  metaMaskWallet,
  walletConnectWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { WagmiProvider } from 'wagmi';
import { mainnet, polygon, optimism, arbitrum, base, baseSepolia } from 'wagmi/chains';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { MotionConfig } from 'framer-motion';
import { useEffect, useState, useMemo } from 'react';
import { useQuizAuth } from '@/hooks/shared/use-quiz-auth';
import { SessionProvider, useSession } from '@/hooks/shared/use-session';

// Configure Coinbase Wallet to support Coinbase Smart Wallet (passkeys / EIP-5792).
// In @rainbow-me/rainbowkit, static property assignment on the wallet factory
// is the documented API pattern (AcceptedCoinbaseWalletParameters interface).
coinbaseWallet.preference = 'all';

const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID;
if (!projectId) {
  throw new Error(
    'Missing NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID. Get one at https://cloud.walletconnect.com. See .env.example.'
  );
}

const config = getDefaultConfig({
  appName: 'Quick Quiz',
  projectId,
  chains: [mainnet, polygon, optimism, arbitrum, base, baseSepolia],
  ssr: true,
  wallets: [
    {
      groupName: 'Recommended',
      wallets: [coinbaseWallet],
    },
    {
      groupName: 'Popular',
      wallets: [rainbowWallet, metaMaskWallet, walletConnectWallet],
    },
  ],
});

function RainbowAuthWrapper({ children }: { children: React.ReactNode }) {
  const { account, refresh, clearSession } = useSession();
  const authOptions = useMemo(
    () => ({
      sessionAccount: account,
      onSyncSession: refresh,
      onSignOut: clearSession,
    }),
    [account, refresh, clearSession]
  );
  const { adapter, status } = useQuizAuth(authOptions);

  // The wallet's sign-in/out lives in RainbowKit's auth status; the session
  // cookie changes alongside it (auth-actions.ts), so re-read it here too.
  useEffect(() => {
    void refresh();
  }, [status, refresh]);

  return (
    <RainbowKitAuthenticationProvider adapter={adapter} status={status}>
      <RainbowKitProvider theme={darkTheme()}>{children}</RainbowKitProvider>
    </RainbowKitAuthenticationProvider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <MotionConfig reducedMotion="user">
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <SessionProvider>
            <RainbowAuthWrapper>{children}</RainbowAuthWrapper>
          </SessionProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </MotionConfig>
  );
}
