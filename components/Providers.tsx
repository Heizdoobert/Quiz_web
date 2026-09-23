'use client';

import '@rainbow-me/rainbowkit/styles.css';
import { getDefaultConfig, RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
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
import { useState } from 'react';

// Configure Coinbase Wallet to support Coinbase Smart Wallet (passkeys / EIP-5792).
// In @rainbow-me/rainbowkit, static property assignment on the wallet factory
// is the documented API pattern (AcceptedCoinbaseWalletParameters interface).
coinbaseWallet.preference = 'all';

const projectId =
  process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID ||
  '00000000000000000000000000000000';

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

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <MotionConfig reducedMotion="user">
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider theme={darkTheme()}>{children}</RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </MotionConfig>
  );
}
