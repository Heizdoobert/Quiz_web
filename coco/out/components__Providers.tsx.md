# components/Providers.tsx
lines:106 exports:Providers
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
import { MotionConfig } from 'framer-motion';
import { useEffect, useState, useMemo } from 'react';
import { useQuizAuth } from '@/hooks/shared/use-quiz-auth';
import { SessionProvider, useSession } from '@/hooks/shared/use-session';

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
  (isBuildPhase ? 'placeholder_project_id' : '');

if (!projectId) {
  throw new Error(
    'Missing NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID. Get one at https://cloud.walletconnect.com. See .env.example.'
