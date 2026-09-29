'use client';

import React from 'react';
import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Gift, Zap, Volume2, VolumeX, User, Trophy } from 'lucide-react';
import { useSoundToggle } from '@/hooks/shared/use-sound-toggle';
import { useSession } from '@/hooks/shared/use-session';

interface HeaderProps {
  onOpenRewards?: () => void;
  onOpenProfile?: () => void;
  hasClaimable?: boolean;
}

export default function Header({
  onOpenRewards,
  onOpenProfile,
  hasClaimable,
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
        <div className="shrink-0 p-1.5 rounded-xl bg-[#00FFCC]/15 border border-[#00FFCC]/40 text-[#00FFCC] shadow-[0_0_12px_rgba(0,255,204,0.2)] group-hover:scale-105 transition-transform">
          <Zap className="w-5 h-5 animate-pulse" />
        </div>
        <span className="text-lg sm:text-2xl truncate font-black font-heading tracking-wider bg-gradient-to-r from-[#00FFCC] to-[#6C5CE7] bg-clip-text text-transparent">
          Quick Quiz
        </span>
      </Link>
      {/* min-h reserves the Connect button's height; it mounts after hydration and shifted the page */}
      <div className="flex shrink-0 min-h-10 items-center gap-2.5 sm:gap-3">
        {/* Sound FX Toggle Button */}
        <button
          type="button"
          onClick={handleToggleSound}
          className={`p-2 rounded-xl border transition-all cursor-pointer active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFCC] ${
            isMuted
              ? 'bg-[#25284D]/50 border-[#3A3E70]/60 text-slate-500 hover:text-slate-300'
              : 'bg-[#25284D] border-[#3A3E70] text-[#00FFCC] hover:border-[#00FFCC]/60'
          }`}
          title={isMuted ? 'Unmute Sound Effects' : 'Mute Sound Effects'}
          aria-label={isMuted ? 'Unmute Sound Effects' : 'Mute Sound Effects'}
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>

        {/* Question Lists / Contests */}
        <Link
          href="/my-lists"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#25284D] hover:bg-[#2E3260] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFCC] border border-[#3A3E70] text-[#00FFCC] font-bold font-heading text-xs transition-all shadow-sm hover:scale-105"
          aria-label="Question Lists & Contests"
        >
          <Trophy className="w-4 h-4" />
          <span className="hidden sm:inline">Contests</span>
        </Link>

        {/* Profile Button */}
        {account && onOpenProfile && (
          <button
            type="button"
            onClick={onOpenProfile}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#25284D] hover:bg-[#2E3260] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFCC] border border-[#3A3E70] text-slate-200 hover:text-white font-bold font-heading text-xs transition-all shadow-sm hover:scale-105 cursor-pointer"
            aria-label="Player Profile"
          >
            <User className="w-4 h-4 text-[#6C5CE7]" />
            <span className="hidden sm:inline">Profile</span>
          </button>
        )}

        {/* Rewards Button */}
        {account && onOpenRewards && (
          <button
            type="button"
            onClick={onOpenRewards}
            className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#25284D] hover:bg-[#2E3260] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFCC] border border-[#3A3E70] text-[#FFD166] font-bold font-heading text-xs transition-all hover:scale-105 cursor-pointer"
            aria-label="Rewards"
          >
            <Gift className="w-4 h-4 text-[#FFD166]" />
            <span className="hidden sm:inline">Rewards</span>
            {hasClaimable && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#00FFCC] rounded-full animate-ping" />
            )}
          </button>
        )}

        <ConnectButton label={account && !account.wallet ? 'Add wallet' : 'Connect'} showBalance={false} />
      </div>
    </header>
  );
}
