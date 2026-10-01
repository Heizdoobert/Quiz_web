# components/layout/Header.tsx
lines:119 exports:default
---
'use client';

import React from 'react';
import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Gift, Zap, Volume2, VolumeX, User, Trophy, Info } from 'lucide-react';
import { useSoundToggle } from '@/hooks/shared/use-sound-toggle';
import { useSession } from '@/hooks/shared/use-session';
import SearchBox from '@/components/discovery/SearchBox';
import NoWalletNotice from '@/components/rewards/NoWalletNotice';

interface HeaderProps {
  onOpenRewards?: () => void;
  onOpenProfile?: () => void;
  hasClaimable?: boolean;
  heldTokens?: string;
  sweepsAt?: string | null;
}

export default function Header({
  onOpenRewards,
  onOpenProfile,
  hasClaimable,
  heldTokens,
  sweepsAt,
}: HeaderProps) {
  const { isMuted, handleToggleSound } = useSoundToggle();
  const { account } = useSession();

  return (
    <header className="glass flex justify-between items-center px-4 sm:px-8 py-3.5 border-b border-[#2D305A] sticky top-0 z-30 shadow-lg">
      <Link
        href="/"
        className="flex items-center gap-2.5 min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFCC] rounded-xl group transition-transform active:scale-95"
        aria-label="Quick Quiz Home"
      >
        <div className="shrink-0 p-1.5 rounded-xl bg-[#00FFCC]/15 border border-[#00FFCC]/40 text-[#00FFCC] group-hover:scale-105 transition-transform">
          <Zap className="w-5 h-5 animate-pulse" />
        </div>
        <span className="text-lg sm:text-2xl truncate font-black font-heading tracking-wider bg-gradient-to-r from-[#00FFCC] to-[#6C5CE7] bg-clip-text text-transparent">
