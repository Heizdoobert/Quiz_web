# app/layout.tsx
lines:184 exports:viewport,metadata,default
---
import type { Metadata, Viewport } from 'next';
import { JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/Providers';
import AdZone from '@/components/ads/AdZone';
import { FAQ_DATA } from '@/lib/constants/seo-data';
import { getSiteUrl } from '@/lib/utils/site-url';

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

const baseUrl = getSiteUrl();

const isPreview = process.env.VERCEL_ENV === 'preview' || process.env.NEXT_PUBLIC_APP_ENV === 'preview';

export const viewport: Viewport = {
  themeColor: '#00FFCC',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: 'Quick Quiz — Web3 Crypto Trivia & Learn-to-Earn Rewards',
    template: '%s | Quick Quiz',
  },
  description:
    'Challenge your crypto knowledge across DeFi, Layer 1s, and Smart Contracts. Earn on-chain $QUIZ tokens and NFT achievement badges on Base network.',
  keywords: [
    'crypto trivia',
    'web3 quiz',
    'learn to earn crypto',
    'base blockchain quiz',
    'base sepolia rewards',
    'blockchain trivia game',
