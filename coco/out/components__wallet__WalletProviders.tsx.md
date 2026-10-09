# components/wallet/WalletProviders.tsx
lines:107 exports:default
---
'use client';

import '@rainbow-me/rainbowkit/styles.css';
import {
  getDefaultConfig,
  RainbowKitProvider,
  RainbowKitAuthenticationProvider,
  darkTheme,
} from '@rainbow-me/rainbowkit';
import {
  base as baseWallet,
  rainbowWallet,
  metaMaskWallet,
  walletConnectWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { WagmiProvider } from 'wagmi';
import { mainnet, polygon, optimism, arbitrum, base, baseSepolia } from 'wagmi/chains';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { useEffect, useState, useMemo } from 'react';
import { useQuizAuth } from '@/hooks/shared/use-quiz-auth';
import { useSession } from '@/hooks/shared/use-session';
import { WalletHostContext } from './host-context';

const AuthPopup = dynamic(() => import('@/components/auth/AuthPopup'), {
  ssr: false,
});

// Configure Coinbase Wallet to support Coinbase Smart Wallet (passkeys / EIP-5792).
// In @rainbow-me/rainbowkit, static property assignment on the wallet factory
// is the documented API pattern (AcceptedCoinbaseWalletParameters interface).
// @ts-expect-error Type string vs Preference mismatch in new wallet-sdk
baseWallet.preference = 'all';

const isBuildPhase =
  process.env.NEXT_PHASE === 'phase-production-build' ||
  process.env.BUILDING === 'true';

const projectId =
  process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID ||
